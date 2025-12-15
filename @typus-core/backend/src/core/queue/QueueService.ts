import { BaseService } from '@/core/base/BaseService';
import { Service } from '@/core/decorators/component';
import {
  IQueueAdapter,
  QueueInfo,
  QueueListOptions,
  QueueTaskQueryResult,
  QueueTasksQueryOptions,
  QueueStats
} from './interfaces';
import { QueueAdapterFactory } from './adapters';
import { QueueEventBus } from './events/QueueEventBus';
import { container } from 'tsyringe';

/**
 * Queue Service
 * Uses adapter pattern to support both Redis (FULL) and Database (STARTER) queues
 *
 * This service provides a unified interface for queueing tasks regardless of the underlying
 * queue implementation. The actual queue implementation is determined by the queue.driver
 * config value (or QUEUE_DRIVER environment variable as fallback).
 *
 * The word "Agnostic" is implied - this is the default queue service.
 */
@Service()
export class QueueService extends BaseService {
  private adapter: IQueueAdapter | null = null;

  constructor() {
    super();
  }

  private async getAdapter(): Promise<IQueueAdapter> {
    if (!this.adapter) {
      this.adapter = await QueueAdapterFactory.getInstance();
    }
    return this.adapter;
  }

  async getDriver() {
    const adapter = await this.getAdapter();
    return adapter.driver;
  }

  async listQueues(options?: QueueListOptions): Promise<QueueInfo[]> {
    try {
      const adapter = await this.getAdapter();
      return await adapter.listQueues(options);
    } catch (error) {
      this.logger.error('[QueueService] Failed to list queues', {
        error: error instanceof Error ? error.message : error
      });
      return [];
    }
  }

  async getQueueTasks(queueName: string, options?: QueueTasksQueryOptions): Promise<QueueTaskQueryResult> {
    try {
      const adapter = await this.getAdapter();
      return await adapter.getQueueTasks(queueName, options);
    } catch (error) {
      this.logger.error('[QueueService] Failed to get queue tasks', {
        queueName,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async getQueueStats(queueName: string): Promise<QueueStats> {
    try {
      const adapter = await this.getAdapter();
      return await adapter.getQueueStats(queueName);
    } catch (error) {
      this.logger.error('[QueueService] Failed to get queue stats', {
        queueName,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Add task to queue
   *
   * @param queueName - Queue name (e.g., 'redis_cache_queue', 'redis_email_queue')
   * @param taskData - Task data object
   *
   * @example
   * await queueService.addTask('redis_cache_queue', {
   *   type: 'cache_generation_task',
   *   name: 'Generate cache for /about',
   *   data: { url: '/about', force: true },
   *   priority: 5
   * });
   */
  async addTask(queueName: string, taskData: any): Promise<void> {
    try {
      const adapter = await this.getAdapter();
      await adapter.addTask(queueName, taskData);

      this.logger.debug(`[QueueService] Task added to queue ${queueName}`, {
        taskType: taskData.type || 'unknown',
        taskId: taskData.id || taskData.task_id || 'generated',
        driver: adapter.driver
      });

      // Realtime: notify about tasks added and refresh queues snapshot
      try {
        const bus = container.resolve(QueueEventBus);
        await bus.emitTasksAdded(queueName, [taskData], 1);
        const queues = await adapter.listQueues({ includeDiscovered: true });
        await bus.emitQueueUpdate(queues);
      } catch (e) {
        this.logger.debug('[QueueService] Event emission failed after addTask', {
          error: e instanceof Error ? e.message : e
        });
      }
    } catch (error) {
      this.logger.error(`[QueueService] Failed to add task to queue ${queueName}`, {
        error: error.message,
        taskType: taskData.type
      });
      throw error;
    }
  }

  /**
   * Add multiple tasks to queue at once
   *
   * @param queueName - Queue name
   * @param tasks - Array of task data objects
   */
  async addTasks(queueName: string, tasks: any[]): Promise<void> {
    try {
      const adapter = await this.getAdapter();
      // Add tasks one by one (both adapters support single task addition)
      for (const task of tasks) {
        await adapter.addTask(queueName, task);
      }

      this.logger.debug(`[QueueService] ${tasks.length} tasks added to queue ${queueName}`, {
        count: tasks.length,
        driver: adapter.driver
      });

      try {
        const bus = container.resolve(QueueEventBus);
        await bus.emitTasksAdded(queueName, tasks, tasks.length);
        const queues = await adapter.listQueues({ includeDiscovered: true });
        await bus.emitQueueUpdate(queues);
      } catch (e) {
        this.logger.debug('[QueueService] Event emission failed after addTasks', {
          error: e instanceof Error ? e.message : e
        });
      }
    } catch (error) {
      this.logger.error(`[QueueService] Failed to add tasks to queue ${queueName}`, {
        error: error.message,
        count: tasks.length
      });
      throw error;
    }
  }

  /**
   * Get queue length
   *
   * @param queueName - Queue name
   * @returns Number of pending tasks
   */
  async getQueueLength(queueName: string): Promise<number> {
    try {
      const adapter = await this.getAdapter();
      if (adapter.getQueueLength) {
        return await adapter.getQueueLength(queueName);
      }
      return 0;
    } catch (error) {
      this.logger.error(`[QueueService] Failed to get queue length for ${queueName}`, {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Pop next task from queue
   * Note: For database adapter, this is polling-based (not blocking)
   *
   * @param queueName - Queue name
   * @param timeout - Timeout in seconds (only used by Redis adapter)
   * @returns Task data or null if no tasks available
   */
  async popTask(queueName: string, timeout: number = 5): Promise<any | null> {
    try {
      const adapter = await this.getAdapter();
      if (adapter.popTask) {
        return await adapter.popTask(queueName, timeout);
      }
      return null;
    } catch (error) {
      this.logger.error(`[QueueService] Failed to pop task from queue ${queueName}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all tasks from queue with optional filtering
   * Used by queue management UI and monitoring
   *
   * @param options - Query options (limit, offset, status filter)
   * @returns Array of tasks
   *
   * @example
   * const tasks = await queueService.getAllTasks({
   *   limit: 50,
   *   offset: 0,
   *   status: 'pending'
   * });
   */
  async getAllTasks(options: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any[]> {
    try {
      const adapter = await this.getAdapter();
      if (adapter.getAllTasks) {
        return await adapter.getAllTasks(options);
      }

      this.logger.warn('[QueueService] getAllTasks not supported by current adapter');
      return [];
    } catch (error) {
      this.logger.error('[QueueService] Failed to get all tasks', {
        error: error instanceof Error ? error.message : error
      });
      return [];
    }
  }

  /**
   * Clear all tasks from queue(s)
   * If queueName is provided, only clear tasks from that specific queue
   * If queueName is not provided, clear ALL tasks from all queues
   *
   * @param queueName - Optional queue name to clear
   * @returns Number of tasks cleared
   *
   * @example
   * // Clear specific queue
   * const cleared = await queueService.clearQueue('redis_cache_queue');
   *
   * // Clear all queues
   * const cleared = await queueService.clearQueue();
   */
  async clearQueue(queueName?: string): Promise<number> {
    try {
      const adapter = await this.getAdapter();
      if (adapter.clearQueue) {
        const cleared = await adapter.clearQueue(queueName);

        this.logger.info(`[QueueService] Cleared ${cleared} tasks from queue`, {
          queueName: queueName || 'ALL QUEUES',
          clearedCount: cleared,
          driver: adapter.driver
        });

        try {
          const bus = container.resolve(QueueEventBus);
          await bus.emitQueuesCleared(cleared);
          const queues = await adapter.listQueues({ includeDiscovered: true });
          await bus.emitQueueUpdate(queues);
        } catch (e) {
          this.logger.debug('[QueueService] Event emission failed after clearQueue', {
            error: e instanceof Error ? e.message : e
          });
        }

        return cleared;
      }

      this.logger.warn('[QueueService] clearQueue not supported by current adapter');
      return 0;
    } catch (error) {
      this.logger.error('[QueueService] Failed to clear queue', {
        error: error instanceof Error ? error.message : error,
        queueName
      });
      throw error;
    }
  }

  /**
   * Clear all queues (alias for clearQueue with no arguments)
   * Removes all pending tasks from all queues
   *
   * @returns Number of tasks cleared
   *
   * @example
   * const cleared = await queueService.clearAllQueues();
   */
  async clearAllQueues(): Promise<number> {
    return this.clearQueue(); // No queueName = clear all
  }
}
