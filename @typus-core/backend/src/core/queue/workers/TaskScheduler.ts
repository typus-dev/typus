import { BaseService } from '@/core/base/BaseService';
import { QueueService } from '../QueueService';
import { ConfigService } from '@/modules/system/services/ConfigService';
import { container } from 'tsyringe';

/**
 * Task Scheduler for STARTER profile
 * Reads scheduled tasks from dispatcher.tasks and pushes them to queue
 * Runs every 30 seconds (similar to Dispatcher in FULL profile)
 */
export class TaskScheduler extends BaseService {
  private queueService: QueueService;
  private configService: ConfigService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.queueService = container.resolve(QueueService);
    this.configService = container.resolve(ConfigService);
  }

  /**
   * Start task scheduler
   * Begins periodic task scheduling every 30 seconds
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Already running', { source: 'system', what: 'QUEUE:status' });
      return;
    }

    this.logger.info('Starting task scheduler (STARTER profile)...', { source: 'system', what: 'QUEUE:status' });

    this.isRunning = true;

    // Run immediately on start
      this._scheduleTasksLoop().catch(error => {
        this.logger.error('Error in initial schedule loop', { source: 'system', error });
      });

    // Then run every 30 seconds
    this.intervalId = setInterval(() => {
      this._scheduleTasksLoop().catch(error => {
        this.logger.error('Error in schedule loop', { source: 'system', error });
      });
    }, 30000); // 30 seconds

    this.logger.info('Task scheduler started (interval: 30s)', { source: 'system', what: 'QUEUE:status' });
  }

  /**
   * Stop task scheduler
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
    this.logger.info('Task scheduler stopped', { source: 'system', what: 'QUEUE:status' });
  }

  /**
   * Main scheduling loop
   * Fetches ready tasks and pushes them to queue
   */
  private async _scheduleTasksLoop(): Promise<void> {
    try {
      this.logger.debug('Running schedule loop...', { source: 'system' });

      // Fetch tasks that are ready to run
      const tasks = await this._fetchReadyTasks();

      if (tasks.length === 0) {
        this.logger.debug('No tasks ready to run', { source: 'system' });
        return;
      }

      this.logger.info(`Found ${tasks.length} tasks ready to run`, { source: 'system', what: 'QUEUE:schedule' });

      // Queue each task
      for (const task of tasks) {
        try {
          await this._queueTask(task);
        } catch (error) {
          this.logger.error(`Failed to queue task ${task.id}`, {
            source: 'system',
            what: 'QUEUE:schedule',
            error: error.message,
            taskId: task.id,
            taskType: task.type
          });
        }
      }

      this.logger.debug(`Scheduled ${tasks.length} tasks`, { source: 'system' });
    } catch (error) {
      this.logger.error('Error in schedule loop', { source: 'system', error: error.message });
    }
  }

  /**
   * Fetch tasks that are ready to run
   * Includes tasks where next_run <= NOW() and isActive = true
   */
  private async _fetchReadyTasks(): Promise<any[]> {
    try {
      const now = new Date();

      const tasks = await this.prisma.dispatcherTask.findMany({
        where: {
          isActive: true,
          OR: [
            { nextRun: { lte: now } },
            { nextRun: null } // Tasks that have never run
          ]
        },
        orderBy: {
          nextRun: 'asc'
        },
        take: 50 // Limit to 50 tasks per cycle
      });

      return tasks;
    } catch (error) {
      this.logger.error('Failed to fetch ready tasks', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Queue a task for execution
   *
   * @param task - Task from dispatcher.tasks
   */
  private async _queueTask(task: any): Promise<void> {
    try {
      // Determine queue name based on task type (loads from database)
      const queueName = await this._getQueueNameForTask(task);

      // Prepare task data for queue
      // IMPORTANT: task_id must be inside data object, not at top level
      // because DatabaseQueueAdapter only stores task.data in the JSON column
      const queueTaskData = {
        type: task.type,
        name: task.name,
        data: {
          ...task.data,  // Spread original task data
          task_id: task.id  // Add task_id inside data so it gets preserved
        },
        priority: 0,
        source: 'scheduler'
      };

      // Add to queue
      this.logger.info(`[TaskScheduler] Queueing task with data`, {
        taskId: task.id,
        dataKeys: Object.keys(queueTaskData.data)
      });
      await this.queueService.addTask(queueName, queueTaskData);

      this.logger.info(`Task queued`, {
        source: 'system',
        what: 'QUEUE:schedule',
        taskId: task.id,
        taskType: task.type,
        taskName: task.name,
        queue: queueName
      });

      // Update task's last_run and next_run
      await this._updateTaskSchedule(task);
    } catch (error) {
      this.logger.error(`Failed to queue task`, {
        error: error.message,
        taskId: task.id,
        taskType: task.type
      });
      throw error;
    }
  }

  /**
   * Update task schedule after queueing
   *
   * @param task - Task to update
   */
  private async _updateTaskSchedule(task: any): Promise<void> {
    try {
      const now = new Date();
      let nextRun: Date | null = null;

      // Calculate next run time based on schedule type or period_sec
      if (task.periodSec) {
        // If period_sec is set, use it (regardless of schedule_type)
        nextRun = new Date(now.getTime() + task.periodSec * 1000);
        this.logger.debug(`Set next run based on periodSec`, {
          taskId: task.id,
          periodSec: task.periodSec,
          nextRun
        });
      } else if (task.scheduleType === 'cron' && task.cronExpr) {
        // TODO: Implement cron expression parsing
        // For now, set to 1 hour from now
        nextRun = new Date(now.getTime() + 3600 * 1000);
        this.logger.warn(`Cron parsing not implemented, using 1h interval for task ${task.id}`, { source: 'system' });
      }

      await this.prisma.dispatcherTask.update({
        where: { id: task.id },
        data: {
          lastRun: now,
          nextRun: nextRun,
          lastStatus: 'queued'
        }
      });

      this.logger.debug(`Updated task schedule`, {
        taskId: task.id,
        lastRun: now,
        nextRun
      });
    } catch (error) {
      this.logger.error(`Failed to update task schedule`, {
        error: error.message,
        taskId: task.id
      });
    }
  }

  /**
   * Get queue name for task type from database
   * Maps task types to queue names (stored in system.config - PRIVATE)
   *
   * @param task - Task object
   * @returns Queue name
   */
  private async _getQueueNameForTask(task: any): Promise<string> {
    // Load queue names from database only (system.config - PRIVATE)
    const emailQueue = await this.configService.getFromDb('queue.redis_email', 'redis_email_queue');
    const telegramQueue = await this.configService.getFromDb('queue.redis_telegram', 'redis_telegram_queue');
    const cacheQueue = await this.configService.getFromDb('queue.redis_cache', 'redis_cache_queue');
    const backupQueue = await this.configService.getFromDb('queue.redis_backup', 'redis_backup_queue');
    const systemQueue = await this.configService.getFromDb('queue.redis_system', 'redis_system_queue');

    const typeToQueue: Record<string, string> = {
      'email_notification_task': emailQueue,
      'telegram_notification_task': telegramQueue,
      'cache_generation_task': cacheQueue,
      'backup_task': backupQueue,
      'system_task': systemQueue
    };

    return typeToQueue[task.type] || systemQueue;
  }
}
