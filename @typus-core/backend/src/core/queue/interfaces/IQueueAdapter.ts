/**
 * Queue adapter interface
 * Provides abstraction over different queue implementations (Redis, Database)
 */

export type QueueDriver = 'redis' | 'database';

export interface QueueInfo {
  key: string;
  name: string;
  type: 'mail' | 'messages' | 'system' | 'unknown';
  color: string;
  depth: number;
  failed: number;
  running: number;
  paused: boolean;
  isKnown: boolean;
  driver: QueueDriver;
  metadata?: Record<string, any>;
}

export interface QueueTask {
  id: string;
  queue: string;
  type: string;
  title?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  priority?: number;
  retries?: number;
  maxAttempts?: number;
  payload?: any;
  metadata?: Record<string, any>;
}

export interface QueueStats {
  depth: number;
  failed: number;
  running: number;
  paused: boolean;
  driver: QueueDriver;
  metadata?: Record<string, any>;
}

export interface QueueListOptions {
  includeDiscovered?: boolean;
}

export interface QueueTasksQueryOptions {
  limit?: number;
  offset?: number;
}

export interface QueueTaskQueryResult {
  queue: string;
  tasks: QueueTask[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Queue adapter interface for agnostic task queueing
 * Implementations: RedisQueueAdapter (FULL), DatabaseQueueAdapter (STARTER)
 */
export interface IQueueAdapter {
  readonly driver: QueueDriver;

  listQueues(options?: QueueListOptions): Promise<QueueInfo[]>;

  getQueueTasks(queue: string, options?: QueueTasksQueryOptions): Promise<QueueTaskQueryResult>;

  getQueueStats(queue: string): Promise<QueueStats>;

  /**
   * Add a task to the specified queue
   *
   * @param queue - Queue name (e.g., 'redis_cache_queue', 'redis_email_queue')
   * @param task - Task data object containing type, data, priority, etc.
   * @returns Promise that resolves when task is queued
   *
   * @example
   * await adapter.addTask('redis_cache_queue', {
   *   type: 'cache_generation_task',
   *   name: 'Generate cache for /about',
   *   data: { url: '/about', force: true },
   *   priority: 5
   * });
   */
  addTask(queue: string, task: any): Promise<void>;

  /**
   * Get the number of pending tasks in a queue
   *
   * @param queue - Queue name
   * @returns Promise resolving to task count
   */
  getQueueLength?(queue: string): Promise<number>;

  /**
   * Pop next task from queue (for worker consumption)
   * Optional method, mainly used by workers
   *
   * @param queue - Queue name
   * @param timeout - Timeout in seconds for blocking pop
   * @returns Promise resolving to task data or null if timeout
   */
  popTask?(queue: string, timeout?: number): Promise<any | null>;

  /**
   * Get all tasks from queue with optional filtering
   * Used by queue management UI and monitoring
   *
   * @param options - Query options (limit, offset, status filter)
   * @returns Promise resolving to array of tasks
   *
   * @example
   * await adapter.getAllTasks({
   *   limit: 50,
   *   offset: 0,
   *   status: 'pending'
   * });
   */
  getAllTasks?(options: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any[]>;

  /**
   * Delete task from queue (cleanup after completion/failure)
   * Optional method - mainly for database adapter to clean up completed tasks
   *
   * @param taskId - Task ID to delete
   * @returns Promise that resolves when task is deleted
   *
   * @example
   * await adapter.deleteTask(123);
   */
  deleteTask?(taskId: string | number): Promise<void>;

  /**
   * Clear all tasks from a specific queue
   * Optional method - for queue management UI
   *
   * @param queueName - Queue name to clear (optional, if not provided clear all queues)
   * @returns Promise resolving to number of tasks cleared
   *
   * @example
   * const cleared = await adapter.clearQueue('redis_cache_queue');
   */
  clearQueue?(queueName?: string): Promise<number>;
}
