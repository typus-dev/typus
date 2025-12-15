import { BaseService } from '@/core/base/BaseService';
import { QueueService } from '../QueueService';
import { TaskHandlerRegistry } from '../handlers';
import { container } from 'tsyringe';
import { QueueEventBus } from '../events/QueueEventBus';
import { ContextManager } from '@/core/context/ContextManager';
import { TASK_WORKER_USER } from '@/constants/system';
import { ConfigService } from '@/modules/system/services/ConfigService';

/**
 * Task Worker for STARTER profile
 * Processes tasks from database queue using handlers
 * Runs every 10 seconds, processes up to 10 tasks per cycle
 */
export class TaskWorker extends BaseService {
  private queueService: QueueService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isProcessing: boolean = false;
  private queueEventBus: QueueEventBus;
  private configService: ConfigService;
  private startTime: number = 0;

  constructor() {
    super();
    this.queueService = container.resolve(QueueService);
    this.queueEventBus = container.resolve(QueueEventBus);
    this.configService = container.resolve(ConfigService);

    // Initialize handler registry
    TaskHandlerRegistry.initialize();
  }

  /**
   * Lazy resolve NotificationsService to avoid circular dependencies
   */
  private async getNotificationsService() {
    try {
      const { NotificationsService } = await import('@/modules/notification/services/NotificationsService');
      return container.resolve(NotificationsService);
    } catch (error) {
      this.logger.warn('Failed to resolve NotificationsService', { error });
      return null;
    }
  }

  /**
   * Start task worker
   * Begins periodic task processing every 10 seconds
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Already running', { source: 'system', what: 'QUEUE:status' });
      return;
    }

    this.logger.info('Starting task worker (STARTER profile)...', { source: 'system', what: 'QUEUE:status' });

    this.isRunning = true;
    this.startTime = Date.now();

    // Recover orphaned tasks on startup
    this._recoverOrphanedTasks().catch(error => {
      this.logger.error('Failed to recover orphaned tasks', { source: 'system', error });
    });

    // Run immediately on start
      this._processQueueLoop().catch(error => {
        this.logger.error('Error in initial processing loop', { source: 'system', error });
      });

    // Then run every 10 seconds
    this.intervalId = setInterval(() => {
      this._processQueueLoop().catch(error => {
        this.logger.error('Error in processing loop', { source: 'system', error });
      });

      // Also check for orphaned/timeout tasks periodically
      this._recoverOrphanedTasks().catch(error => {
        this.logger.error('Error in recovery check', { source: 'system', error });
      });
    }, 10000); // 10 seconds

    this.logger.info('Task worker started (interval: 10s, batch: 3 tasks)', { source: 'system', what: 'QUEUE:status' });
  }

  /**
   * Stop task worker
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Not running', { source: 'system', what: 'QUEUE:status' });
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.logger.info('Task worker stopped', { source: 'system', what: 'QUEUE:status' });
  }

  /**
   * Main processing loop
   * Fetches and processes pending tasks from queue
   */
  private async _processQueueLoop(): Promise<void> {
    // Skip if already processing
    if (this.isProcessing) {
      this.logger.debug('Already processing tasks, skipping cycle', { source: 'system' });
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.debug('Running processing loop...', { source: 'system' });

      // Fetch pending tasks (up to 3 per cycle)
      const tasks = await this._fetchPendingTasks(3);

      if (tasks.length === 0) {
        this.logger.debug('No pending tasks to process', { source: 'system' });
        return;
      }

      this.logger.info(`Processing ${tasks.length} tasks`, { source: 'system', what: 'QUEUE:process' });

      // Process tasks in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        tasks.map(task => this._processTask(task))
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const task = tasks[index];
          this.logger.error(`Failed to process task ${task.id}`, {
            source: 'system',
            what: 'QUEUE:process',
            error: result.reason?.message || String(result.reason),
            taskId: task.data?.task_id || task.id,
            taskType: task.taskType
          });
        }
      });

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      this.logger.debug(`Processed ${tasks.length} tasks (${successful} success, ${failed} failed)`, { source: 'system' });
    } catch (error) {
      this.logger.error('Error in processing loop', { source: 'system', error: error.message });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch pending tasks from database queue
   *
   * @param limit - Maximum number of tasks to fetch
   * @returns Array of pending tasks
   */
  private async _fetchPendingTasks(limit: number = 10): Promise<any[]> {
    try {
      const tasks = await this.prisma.dispatcherQueueTask.findMany({
        where: {
          status: 'pending'
          // Note: We'll filter by attempts < maxAttempts in _processTask
          // Prisma doesn't support field-to-field comparison in WHERE clause
        },
        orderBy: [
          { priority: 'desc' }, // Higher priority first
          { createdAt: 'asc' }  // Older tasks first (FIFO)
        ],
        take: limit
      });

      this.logger.debug(`[TaskWorker] Fetched ${tasks.length} pending tasks from database`);

      // Filter tasks where attempts < maxAttempts
      const filtered = tasks.filter(task => task.attempts < task.maxAttempts);

      this.logger.debug(`[TaskWorker] Filtered to ${filtered.length} tasks (attempts < maxAttempts)`);

      return filtered;
    } catch (error) {
      this.logger.error('[TaskWorker] Failed to fetch pending tasks', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Process a single task
   *
   * @param task - Task from dispatcher.queue_tasks
   */
  private async _processTask(task: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Mark task as processing
      await this.prisma.dispatcherQueueTask.update({
        where: { id: task.id },
        data: {
          status: 'processing',
          attempts: { increment: 1 }
        }
      });

      this.logger.info(`[TaskWorker] Processing task`, {
        taskId: task.data?.task_id || task.id,
        taskType: task.type,
        taskName: task.name,
        attempt: task.attempts + 1
      });

      // Emit WebSocket event for task starting (processing status)
      try {
        const historyId = task.historyId || task.data?.historyId;
        await this.queueEventBus.emitTaskHistoryUpdate([{
          historyId: historyId,
          taskType: task.type,
          status: 'processing',
          queueKey: task.queue,
          result: task.data
        }], 1);
      } catch (err) {
        this.logger.debug('[TaskWorker] Failed to emit task processing event', { error: err });
      }

      // Get handler for task type
      const handler = TaskHandlerRegistry.getHandler(task.type);

      // Determine which user context to use for task execution
      // Priority: task.data.userId (creator) > TASK_WORKER_USER (system)
      let taskUser = TASK_WORKER_USER;

      if (task.data?.userId) {
        try {
          // Load user from database with roles
          const dbUser = await this.prisma.authUser.findUnique({
            where: { id: task.data.userId },
            include: {
              userRoles: {
                include: {
                  role: true
                }
              }
            }
          });

          if (dbUser) {
            // Build user object with roles for DSL access control
            taskUser = {
              id: dbUser.id,
              email: dbUser.email,
              roles: dbUser.userRoles.map(ur => ur.role.name),
              isTaskWorker: false,
              abilityRules: [] // Will be built by DSL based on roles
            };

            this.logger.info(`[TaskWorker] Task will execute under user context`, {
              userId: taskUser.id,
              userEmail: taskUser.email,
              userRoles: taskUser.roles,
              taskId: task.data?.task_id || task.id,
              taskType: task.type
            });
          } else {
            this.logger.warn(`[TaskWorker] User ${task.data.userId} not found, falling back to TASK_WORKER_USER`, {
              taskId: task.id
            });
          }
        } catch (error) {
          this.logger.error(`[TaskWorker] Failed to load user ${task.data.userId}, using TASK_WORKER_USER`, {
            error: error.message,
            taskId: task.id
          });
        }
      }

      // Execute task in AsyncLocalStorage context with determined user
      // This allows all services (ConfigService, etc.) to access user via getCurrentUser()
      const result = await ContextManager.getInstance().runAsync(async () => {
        const context = ContextManager.getInstance().getCurrentContext();
        if (context) {
          context.set('user', taskUser);
          context.set('userId', String(taskUser.id));
        }
        return handler.execute(task.data);
      });

      // Calculate duration
      const duration = Date.now() - startTime;

      // Use transaction to ensure atomicity: save history AND delete task together
      // This prevents data loss if process crashes between operations
      await this.prisma.$transaction(async (tx) => {
        // Save to task history (or update existing if historyId provided)
        if (task.historyId || task.data?.historyId) {
          // Update existing history record (for flux/kontext jobs)
          const historyId = task.historyId || task.data.historyId;
          await tx.dispatcherTaskHistory.update({
            where: { id: historyId },
            data: {
              status: 'success',
              finishedAt: new Date(),
              duration: duration,
              result: result as any,
              metadata: result as any
            }
          });
        } else {
          // Create new history record (for other jobs)
          await tx.dispatcherTaskHistory.create({
            data: {
              taskId: task.data?.task_id || task.id,
              parentId: task.data?.task_id || null,
              taskName: task.name || 'Unknown Task',
              taskType: task.type || 'unknown',
              queueName: task.queue || 'default',
              status: 'success',
              startedAt: new Date(Date.now() - duration), // Calculate start time
              finishedAt: new Date(),
              duration: duration,
              result: result as any,
              metadata: result as any
            }
          });
        }

        // Update parent task in dispatcher.tasks (increment run_count, update status)
        this.logger.info(`[TaskWorker] Checking for parent task`, {
          hasData: !!task.data,
          taskId: task.data?.task_id,
          dataKeys: task.data ? Object.keys(task.data) : []
        });

        if (task.data?.task_id) {
          const parentTask = await tx.dispatcherTask.update({
            where: { id: task.data.task_id },
            data: {
              runCount: { increment: 1 },
              lastStatus: 'success',
              lastRun: new Date(),
              lastError: null
            }
          });

          this.logger.info(`[TaskWorker] Updated parent task ${task.data.task_id}`, {
            runCount: '+1',
            lastStatus: 'success'
          });

          // Send notification if task was manually triggered
          if (task.data.manual && task.data.manual_user_id) {
            try {
              const notificationsService = await this.getNotificationsService();
              if (notificationsService) {
                await notificationsService.send(task.data.manual_user_id, 'task_completed', {
                  title: 'Task Completed',
                  message: `Task "${parentTask.name}" completed successfully`,
                  taskId: parentTask.id,
                  taskName: parentTask.name,
                  taskType: parentTask.type,
                  type: 'success'
                }, ['internal', 'realtime']);
              }
            } catch (error) {
              this.logger.warn('Failed to send task completion notification', {
                error,
                userId: task.data.manual_user_id,
                taskId: parentTask.id
              });
            }
          }
        } else if (task.data?.manual && task.data?.manual_user_id) {
          // Send notification for tasks WITHOUT parent task (e.g., cache_generation_task)
          try {
            const notificationsService = await this.getNotificationsService();
            if (notificationsService) {
              await notificationsService.send(task.data.manual_user_id, 'task_completed', {
                title: 'Task Completed',
                message: `Task "${task.name}" completed successfully`,
                taskId: task.data?.task_id || task.id,
                taskName: task.name,
                taskType: task.type,
                type: 'success'
              }, ['internal', 'realtime']);
              this.logger.info('[TaskWorker] Sent notification for manual task without parent', {
                userId: task.data.manual_user_id,
                taskId: task.data?.task_id || task.id,
                taskType: task.type
              });
            }
          } catch (error) {
            this.logger.warn('Failed to send task completion notification', {
              error,
              userId: task.data.manual_user_id,
              taskId: task.id
            });
          }
        }

        // Delete task from queue (completed tasks should not remain in queue)
        await tx.dispatcherQueueTask.delete({
          where: { id: task.id }
        });
      });

      this.logger.info(`[TaskWorker] Task completed successfully and removed from queue`, {
        taskId: task.data?.task_id || task.id,
        taskType: task.type,
        duration: `${duration}ms`
      });

      // Emit realtime events: history update + queues snapshot
      try {
        const historyId = task.historyId || task.data?.historyId;
        await this.queueEventBus.emitTaskHistoryUpdate([
          {
            historyId: historyId,
            taskType: task.type,
            status: 'completed',
            finishedAt: new Date().toISOString(),
            queueKey: task.queue,
            result: result
          }
        ], 1);
        const queues = await this.queueService.listQueues({ includeDiscovered: true });
        await this.queueEventBus.emitQueueUpdate(queues);
      } catch (e) {
        this.logger.debug('[TaskWorker] Event emission failed after success', {
          error: e instanceof Error ? e.message : e
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`[TaskWorker] Task execution failed`, {
        error: error.message,
        taskId: task.data?.task_id || task.id,
        taskType: task.type,
        attempt: task.attempts + 1
      });

      // Check if should retry
      if (task.attempts + 1 < task.maxAttempts) {
        // Reset to pending for retry - don't save to history yet
        await this.prisma.dispatcherQueueTask.update({
          where: { id: task.id },
          data: {
            status: 'pending',
            error: error.message?.substring(0, 500) || 'Unknown error' // Truncate to DB column size
          }
        });

        this.logger.info(`[TaskWorker] Task will be retried`, {
          taskId: task.data?.task_id || task.id,
          attempt: task.attempts + 1,
          maxAttempts: task.maxAttempts
        });
      } else {
        // Max attempts reached - ALWAYS save to history and delete from queue
        // Simplified logic: no more keepFailedJobs parameter
        await this.prisma.$transaction(async (tx) => {
          // Save to history (update existing if historyId provided, create otherwise)
          if (task.historyId || task.data?.historyId) {
            // Update existing history record (for flux/kontext jobs)
            const historyId = task.historyId || task.data?.historyId;
            this.logger.info(`[TaskWorker] Updating existing history record`, {
              historyId: historyId,
              taskId: task.data?.task_id || task.id,
              taskType: task.type
            });

            await tx.dispatcherTaskHistory.update({
              where: { id: historyId },
              data: {
                status: 'error',
                finishedAt: new Date(),
                duration: duration,
                error: error.message?.substring(0, 255) || 'Unknown error',
                metadata: { error: error.message } as any
              }
            });
          } else {
            // Create new history record
            this.logger.info(`[TaskWorker] Creating new history record for failed task`, {
              taskId: task.data?.task_id || task.id,
              taskType: task.type
            });

            await tx.dispatcherTaskHistory.create({
              data: {
                taskId: task.data?.task_id || task.id,
                parentId: task.data?.task_id || null,
                taskName: task.name || 'Unknown Task',
                taskType: task.type || 'unknown',
                queueName: task.queue || 'default',
                status: 'error',
                startedAt: new Date(Date.now() - duration),
                finishedAt: new Date(),
                duration: duration,
                error: error.message?.substring(0, 255) || 'Unknown error',
                metadata: { error: error.message } as any
              }
            });
          }

          // Update parent task in dispatcher.tasks
          if (task.data?.task_id) {
            const parentTask = await tx.dispatcherTask.update({
              where: { id: task.data.task_id },
              data: {
                runCount: { increment: 1 },
                lastStatus: 'error',
                lastRun: new Date(),
                lastError: error.message?.substring(0, 255) || 'Unknown error'
              }
            });

            this.logger.info(`[TaskWorker] Updated parent task ${task.data.task_id}`, {
              runCount: '+1',
              lastStatus: 'error'
            });

            // Send notification if task was manually triggered
            if (task.data.manual && task.data.manual_user_id) {
              try {
                const notificationsService = await this.getNotificationsService();
                if (notificationsService) {
                  await notificationsService.send(task.data.manual_user_id, 'task_failed', {
                    title: 'Task Failed',
                    message: `Task "${parentTask.name}" failed after ${task.attempts + 1} attempts: ${error.message?.substring(0, 100)}`,
                    taskId: parentTask.id,
                    taskName: parentTask.name,
                    taskType: parentTask.type,
                    error: error.message,
                    type: 'error'
                  }, ['internal', 'realtime']);
                }
              } catch (notifError) {
                this.logger.warn('Failed to send task failure notification', {
                  error: notifError,
                  userId: task.data.manual_user_id,
                  taskId: parentTask.id
                });
              }
            }
          } else if (task.data?.manual && task.data?.manual_user_id) {
            // Send notification for tasks WITHOUT parent task
            try {
              const notificationsService = await this.getNotificationsService();
              if (notificationsService) {
                await notificationsService.send(task.data.manual_user_id, 'task_failed', {
                  title: 'Task Failed',
                  message: `Task "${task.name}" failed after ${task.attempts + 1} attempts: ${error.message?.substring(0, 100)}`,
                  taskId: task.data?.task_id || task.id,
                  taskName: task.name,
                  taskType: task.type,
                  error: error.message,
                  type: 'error'
                }, ['internal', 'realtime']);
              }
            } catch (notifError) {
              this.logger.warn('Failed to send task failure notification', {
                error: notifError,
                userId: task.data.manual_user_id,
                taskId: task.id
              });
            }
          }

          // ALWAYS delete failed task from queue
          await tx.dispatcherQueueTask.delete({
            where: { id: task.id }
          });
        });

        this.logger.error(`Task failed and removed from queue after ${task.attempts + 1} attempts`, {
          taskId: task.data?.task_id || task.id,
          taskType: task.type
        });

        // Emit realtime failure update
        try {
          const historyId = task.historyId || task.data?.historyId;
          await this.queueEventBus.emitTaskHistoryUpdate([
            {
              historyId: historyId,
              taskType: task.type,
              status: 'error',
              finishedAt: new Date().toISOString(),
              queueKey: task.queue,
              error: error.message?.substring(0, 255),
              result: {
                error: error.message
              }
            }
          ], 1);
          const queues = await this.queueService.listQueues({ includeDiscovered: true });
          await this.queueEventBus.emitQueueUpdate(queues);
        } catch (e) {
          this.logger.debug('Event emission failed after failure', {
            error: e instanceof Error ? e.message : e
          });
        }
      }
    }
  }

  /**
   * Save task execution to history
   *
   * @param task - Task object
   * @param status - Execution status ('success' | 'error')
   * @param metadata - Additional metadata
   * @param duration - Execution duration in ms
   */
  private async _saveToHistory(
    task: any,
    status: string,
    metadata: any,
    duration: number
  ): Promise<void> {
    try {
      await this.prisma.dispatcherTaskHistory.create({
        data: {
          taskId: task.data?.task_id || task.id,
          status,
          startedAt: new Date(),
          duration,
          metadata: {
            ...metadata,
            queueTaskId: task.id,
            attempts: task.attempts + 1
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to save task history', {
        error: error.message,
        taskId: task.id
      });
    }
  }

  /**
   * Recover orphaned tasks on startup
   *
   * Orphaned tasks are tasks stuck in 'processing' status after container restart.
   * This method resets them to 'pending' for retry.
   *
   * Logic:
   * - On startup (first 30 seconds): Reset ALL 'processing' tasks
   * - After startup: Reset only 'processing' tasks older than 2 minutes
   * - SKIP 'waiting' tasks (they're waiting for webhooks, not orphaned)
   */
  private async _recoverOrphanedTasks(): Promise<void> {
    try {
      this.logger.info('[TaskWorker] Checking for orphaned tasks...');

      const isStartup = Date.now() - this.startTime < 30000; // First 30 seconds

      // Build where condition based on startup vs periodic check
      const whereCondition: any = {
        status: 'processing'
      };

      if (!isStartup) {
        // After startup: Only recover tasks older than 2 minutes
        whereCondition.updatedAt = {
          lt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes threshold
        };
      }

      // Find orphaned 'processing' tasks
      const orphanedTasks = await this.prisma.dispatcherQueueTask.findMany({
        where: whereCondition
      });

      if (orphanedTasks.length === 0) {
        this.logger.info('[TaskWorker] No orphaned tasks found');
        return;
      }

      const recoveryType = isStartup ? 'startup recovery' : 'periodic check';
      this.logger.warn(
        `[TaskWorker] Found ${orphanedTasks.length} orphaned tasks (${recoveryType})`,
        { source: 'system', what: 'QUEUE:recovery' }
      );

      // Reset tasks to 'pending' for retry
      for (const task of orphanedTasks) {
        await this.prisma.dispatcherQueueTask.update({
          where: { id: task.id },
          data: {
            status: 'pending',
            error: isStartup
              ? 'Task orphaned after container restart'
              : 'Task appears stuck, resetting for retry'
          }
        });

        this.logger.info(`[TaskWorker] Reset orphaned task to pending`, {
          source: 'system',
          what: 'QUEUE:recovery',
          taskId: task.data?.task_id || task.id,
          taskType: task.type,
          taskName: task.name,
          attempts: task.attempts,
          recoveryType
        });
      }

    } catch (error) {
      this.logger.error('[TaskWorker] Failed to recover orphaned tasks', {
        source: 'system',
        error: error.message
      });
    }
  }

}
