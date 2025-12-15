import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import {
  IQueueAdapter,
  QueueDriver,
  QueueInfo,
  QueueListOptions,
  QueueTasksQueryOptions,
  QueueTask,
  QueueTaskQueryResult,
  QueueStats
} from '../interfaces';
import { determineQueueType, formatQueueName, getQueueColor, getKnownQueueKeys } from '../utils/queuePresentation';

/**
 * Database queue adapter for STARTER profile
 * Uses MySQL table 'dispatcher.queue_tasks' for task queueing
 */
@Service()
export class DatabaseQueueAdapter extends BaseService implements IQueueAdapter {
  public readonly driver: QueueDriver = 'database';

  constructor() {
    super();
  }

  private async getQueueAggregates(): Promise<Map<string, { pending: number; processing: number; failed: number }>> {
    const aggregates = await this.prisma.dispatcherQueueTask.groupBy({
      by: ['queue', 'status'],
      _count: { _all: true }
    });

    const map = new Map<string, { pending: number; processing: number; failed: number }>();

    for (const aggregate of aggregates) {
      const key = aggregate.queue;
      const status = aggregate.status;
      const count = aggregate._count?._all ?? 0;

      if (!map.has(key)) {
        map.set(key, { pending: 0, processing: 0, failed: 0 });
      }

      const entry = map.get(key)!;

      switch (status) {
        case 'pending':
          entry.pending = count;
          break;
        case 'processing':
          entry.processing = count;
          break;
        case 'failed':
          entry.failed = count;
          break;
        default:
          break;
      }
    }

    return map;
  }

  private mapDatabaseTaskToQueueTask(task: any): QueueTask {
    return {
      id: task.id.toString(),
      queue: task.queue,
      type: task.type,
      title: task.name,
      status: task.status,
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : new Date(task.createdAt).toISOString(),
      updatedAt: task.updatedAt ? (task.updatedAt instanceof Date ? task.updatedAt.toISOString() : new Date(task.updatedAt).toISOString()) : undefined,
      priority: task.priority,
      retries: task.attempts,
      maxAttempts: task.maxAttempts,
      payload: task.data,
      metadata: {
        error: task.error,
        processedAt: task.processedAt ? (task.processedAt instanceof Date ? task.processedAt.toISOString() : new Date(task.processedAt).toISOString()) : undefined
      }
    };
  }

  /**
   * Add task to database queue
   *
   * @param queue - Queue name (stored in 'queue' column)
   * @param task - Task data object
   */
  async addTask(queue: string, task: any): Promise<void> {
    try {
      await this.prisma.dispatcherQueueTask.create({
        data: {
          queue,
          type: task.type || 'unknown',
          name: task.name || task.title || `Task ${task.type}`,
          data: task.data || task,
          priority: task.priority || 0,
          status: 'pending',
          attempts: 0,
          maxAttempts: task.maxAttempts || 3,
          createdAt: new Date()
        }
      });

      this.logger.debug(`Task added to queue ${queue}`, {
        what: 'DB:insert',
        taskType: task.type || 'unknown',
        queue
      });
    } catch (error) {
      this.logger.error(`Failed to add task to queue ${queue}`, {
        error: error.message,
        queue,
        taskType: task.type
      });
      throw error;
    }
  }

  /**
   * Get queue length by counting pending tasks
   *
   * @param queue - Queue name
   * @returns Number of pending tasks
   */
  async getQueueLength(queue: string): Promise<number> {
    try {
      const aggregates = await this.getQueueAggregates();
      const entry = aggregates.get(queue);
      return entry ? entry.pending : 0;
    } catch (error) {
      this.logger.error(`Failed to get queue length for ${queue}`, {
        error: error instanceof Error ? error.message : error,
        queue
      });
      return 0;
    }
  }

  /**
   * Pop next task from database queue
   * Note: This is a polling-based implementation (not blocking like Redis BRPOP)
   *
   * @param queue - Queue name
   * @param timeout - Not used in database implementation (kept for interface compatibility)
   * @returns Task data or null if no tasks
   */
  async popTask(queue: string, timeout?: number): Promise<any | null> {
    try {
      // Find oldest pending task with highest priority
      const task = await this.prisma.dispatcherQueueTask.findFirst({
        where: {
          queue,
          status: 'pending'
        },
        orderBy: [
          { priority: 'desc' }, // Higher priority first
          { createdAt: 'asc' }   // Older tasks first (FIFO)
        ]
      });

      if (!task) {
        return null;
      }

      // Mark task as processing
      await this.prisma.dispatcherQueueTask.update({
        where: { id: task.id },
        data: {
          status: 'processing',
          attempts: { increment: 1 }
        }
      });

      // Return task data in format compatible with Redis tasks
      return {
        id: task.id,
        type: task.type,
        name: task.name,
        data: task.data,
        priority: task.priority,
        timestamp: task.createdAt.getTime()
      };
    } catch (error) {
      this.logger.error(`Failed to pop task from queue ${queue}`, {
        error: error.message,
        queue
      });
      throw error;
    }
  }

  /**
   * Get all tasks from database queue with optional filtering
   *
   * @param options - Query options (limit, offset, status filter)
   * @returns Array of tasks
   */
  async getAllTasks(options: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any[]> {
    try {
      const { limit = 50, offset = 0, status } = options;

      const tasks = await this.prisma.dispatcherQueueTask.findMany({
        where: status ? { status } : undefined,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      this.logger.debug('Retrieved tasks via legacy API', {
        limit,
        offset,
        status,
        count: tasks.length
      });

      return tasks.map(task => ({
        id: task.id,
        queue: task.queue,
        type: task.type,
        name: task.name,
        data: task.data,
        priority: task.priority,
        status: task.status,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        processedAt: task.processedAt
      }));
    } catch (error) {
      this.logger.error('Failed to get all tasks', {
        error: error instanceof Error ? error.message : error
      });
      return [];
    }
  }

  /**
   * Delete task from database queue
   * Used to clean up completed/failed tasks (queue should only contain pending tasks)
   *
   * @param taskId - Task ID to delete
   */
  async deleteTask(taskId: string | number): Promise<void> {
    try {
      await this.prisma.dispatcherQueueTask.delete({
        where: { id: Number(taskId) }
      });

      this.logger.debug(`Task deleted from queue`, {
        what: 'DB:delete',
        taskId
      });
    } catch (error) {
      this.logger.error(`Failed to delete task`, {
        error: error.message,
        taskId
      });
      throw error;
    }
  }

  /**
   * Clear all tasks from database queue
   * If queueName is provided, only clear tasks from that queue
   * If queueName is not provided, clear ALL tasks from all queues
   *
   * @param queueName - Optional queue name to clear
   * @returns Number of tasks cleared
   */
  async clearQueue(queueName?: string): Promise<number> {
    try {
      const result = await this.prisma.dispatcherQueueTask.deleteMany({
        where: queueName ? { queue: queueName } : undefined
      });

      this.logger.info(`Cleared ${result.count} tasks from queue`, {
        what: 'DB:delete',
        queueName: queueName || 'ALL QUEUES',
        clearedCount: result.count
      });

      return result.count;
    } catch (error) {
      this.logger.error(`Failed to clear queue`, {
        error: error.message,
        queueName
      });
      throw error;
    }
  }

  async listQueues(options?: QueueListOptions): Promise<QueueInfo[]> {
    const includeDiscovered = options?.includeDiscovered ?? true;

    const aggregates = await this.getQueueAggregates();

    // Read queue names from database config (queue.*)
    const queueConfigs = await this.prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'queue.',
          not: 'queue.driver' // Exclude queue.driver config
        }
      },
      select: { key: true, value: true }
    });

    const configValues = new Map<string, string>();
    queueConfigs.forEach(config => {
      if (config.key !== 'queue.keep_failed_jobs') {
        configValues.set(config.key, config.value);
      }
    });

    const known = getKnownQueueKeys(this.driver, configValues).map(entry => entry.key);
    const knownSet = new Set(known);

    const queuesFromDb = await this.prisma.dispatcherQueueTask.findMany({
      select: { queue: true },
      distinct: ['queue']
    });

    const queueKeys = new Set<string>();
    known.forEach(key => queueKeys.add(key));
    if (includeDiscovered) {
      queuesFromDb.forEach(entry => {
        if (entry.queue) {
          queueKeys.add(entry.queue);
        }
      });
    }

    const queues: QueueInfo[] = [];

    queueKeys.forEach(key => {
      const stats = aggregates.get(key) || { pending: 0, processing: 0, failed: 0 };
      const depth = stats.pending + stats.processing;

      queues.push({
        key,
        name: formatQueueName(key),
        type: determineQueueType(key),
        color: getQueueColor(key),
        depth,
        failed: stats.failed,
        running: stats.processing,
        paused: false,
        isKnown: knownSet.has(key),
        driver: this.driver,
        metadata: {
          pending: stats.pending,
          processing: stats.processing
        }
      });
    });

    return queues.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getQueueTasks(queue: string, options?: QueueTasksQueryOptions): Promise<QueueTaskQueryResult> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.dispatcherQueueTask.findMany({
        where: { queue },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      }),
      this.prisma.dispatcherQueueTask.count({ where: { queue } })
    ]);

    const mappedTasks = tasks.map(task => this.mapDatabaseTaskToQueueTask(task));

    return {
      queue,
      tasks: mappedTasks,
      total,
      limit,
      offset,
      hasMore: offset + mappedTasks.length < total
    };
  }

  async getQueueStats(queue: string): Promise<QueueStats> {
    const aggregates = await this.getQueueAggregates();
    const stats = aggregates.get(queue) || { pending: 0, processing: 0, failed: 0 };

    return {
      depth: stats.pending + stats.processing,
      failed: stats.failed,
      running: stats.processing,
      paused: false,
      driver: this.driver,
      metadata: {
        pending: stats.pending,
        processing: stats.processing
      }
    };
  }
}
