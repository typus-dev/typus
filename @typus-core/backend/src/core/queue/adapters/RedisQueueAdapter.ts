import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { inject } from 'tsyringe';
import { RedisService } from '@/core/redis/RedisService';
import {
  IQueueAdapter,
  QueueInfo,
  QueueTask,
  QueueDriver,
  QueueListOptions,
  QueueTasksQueryOptions,
  QueueTaskQueryResult,
  QueueStats
} from '../interfaces';
import {
  formatQueueName,
  determineQueueType,
  getQueueColor,
  getKnownQueueKeys,
  isQueueKeyCandidate
} from '../utils/queuePresentation';

/**
 * Redis queue adapter for FULL profile
 * Uses Redis LPUSH/BRPOP for fast, in-memory task queueing
 */
@Service()
export class RedisQueueAdapter extends BaseService implements IQueueAdapter {
  public readonly driver: QueueDriver = 'redis';
  private redis: any | null = null;

  constructor(@inject(RedisService) private redisService: RedisService) {
    super();
  }

  /**
   * Ensure Redis connection is established
   */
  private async _ensureRedisConnection(): Promise<Redis> {
    if (!this.redis) {
      this.redis = await this.redisService.getRedis();
    }
    return this.redis;
  }

  private async discoverQueueKeys(options: QueueListOptions = {}): Promise<string[]> {
    const includeDiscovered = options.includeDiscovered ?? true;
    const redis = await this._ensureRedisConnection();

    const keys = new Set<string>();
    const knownDefinitions = getKnownQueueKeys(this.driver);
    knownDefinitions.forEach(({ key }) => keys.add(key));

    if (!includeDiscovered) {
      return Array.from(keys);
    }

    let cursor = '0';
    let iterations = 0;

    do {
      const [nextCursor, foundKeys] = await redis.scan(cursor, 'MATCH', '*', 'COUNT', 500);
      cursor = nextCursor;
      iterations += 1;

      for (const key of foundKeys) {
        if (isQueueKeyCandidate(key)) {
          keys.add(key);
        }
      }
    } while (cursor !== '0' && iterations < 100);

    return Array.from(keys);
  }

  private async getFailedCount(queueKey: string): Promise<number> {
    try {
      const redis = await this._ensureRedisConnection();
      const failureKeys = [
        `${queueKey}:failed`,
        `${queueKey}:errors`,
        `${queueKey}:deadletter`
      ];

      let total = 0;
      for (const key of failureKeys) {
        const type = await redis.type(key);
        if (type === 'none') {
          continue;
        }
        try {
          switch (type) {
            case 'list':
              total += await redis.llen(key);
              break;
            case 'zset':
              total += await redis.zcard(key);
              break;
            case 'set':
              total += await redis.scard(key);
              break;
            default:
              break;
          }
        } catch (error) {
          this.logger.warn(`[RedisQueueAdapter] Failed to read failure key ${key}`, {
            error: error instanceof Error ? error.message : error
          });
        }
      }
      return total;
    } catch (error) {
      this.logger.warn('[RedisQueueAdapter] Failed to compute failed task count', {
        error: error instanceof Error ? error.message : error,
        queue: queueKey
      });
      return 0;
    }
  }

  private async isQueuePaused(queueKey: string): Promise<boolean> {
    try {
      const redis = await this._ensureRedisConnection();
      const paused = await redis.exists(`${queueKey}:paused`);
      return paused > 0;
    } catch {
      return false;
    }
  }

  private async isQueueWorking(queueKey: string): Promise<boolean> {
    try {
      const redis = await this._ensureRedisConnection();
      const heartbeatKey = `${queueKey}:worker`;
      const lastHeartbeat = await redis.get(heartbeatKey);

      if (!lastHeartbeat) {
        return false;
      }

      const lastTimestamp = parseInt(lastHeartbeat, 10);
      if (Number.isNaN(lastTimestamp)) {
        return false;
      }

      return Date.now() - lastTimestamp < 30_000;
    } catch (error) {
      this.logger.debug('[RedisQueueAdapter] Failed to determine queue worker status', {
        queue: queueKey,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  private normalizeRedisTask(queue: string, raw: any, fallbackId: string, redisType: string): QueueTask {
    const createdAt = raw?.created_at || raw?.createdAt || raw?.timestamp;

    return {
      id: raw?.id?.toString?.() || raw?.task_id?.toString?.() || fallbackId,
      queue,
      type: raw?.type || 'unknown',
      title: raw?.title || raw?.name,
      status: raw?.status || (redisType === 'zset' ? 'scheduled' : 'pending'),
      createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw?.updated_at ? new Date(raw.updated_at).toISOString() : undefined,
      priority: raw?.priority,
      retries: raw?._retries || raw?.retries,
      payload: raw?.data ?? raw,
      metadata: {
        redisType,
        scheduledAt: raw?._scheduledAt,
        scheduledTimestamp: raw?._scheduledTimestamp,
        raw
      }
    };
  }

  private async loadRawQueueTasks(queue: string, limit: number, offset: number): Promise<{ items: any[]; redisType: string; }> {
    const redis = await this._ensureRedisConnection();
    const redisType = await redis.type(queue);

    const items: any[] = [];

    switch (redisType) {
      case 'list': {
        const taskStrings = await redis.lrange(queue, offset, offset + limit - 1);
        for (const taskString of taskStrings) {
          try {
            items.push(JSON.parse(taskString));
          } catch (error) {
            this.logger.warn(`[RedisQueueAdapter] Failed to parse task from list ${queue}`, {
              error: error instanceof Error ? error.message : error
            });
          }
        }
        break;
      }
      case 'zset': {
        const zrangeResult = await redis.zrange(queue, offset, offset + limit - 1, 'WITHSCORES');
        for (let index = 0; index < zrangeResult.length; index += 2) {
          const taskData = zrangeResult[index];
          const score = zrangeResult[index + 1];
          try {
            const parsed = JSON.parse(taskData);
            parsed._scheduledTimestamp = parseInt(score, 10);
            parsed._scheduledAt = new Date(parseInt(score, 10)).toISOString();
            items.push(parsed);
          } catch (error) {
            this.logger.warn(`[RedisQueueAdapter] Failed to parse zset task for ${queue}`, {
              error: error instanceof Error ? error.message : error
            });
          }
        }
        break;
      }
      case 'set': {
        const members = await redis.smembers(queue);
        members.slice(offset, offset + limit).forEach(member => {
          try {
            items.push(JSON.parse(member));
          } catch {
            items.push({ member });
          }
        });
        break;
      }
      case 'stream': {
        const range = await redis.xrange(queue, '-', '+', 'COUNT', limit);
        for (const [, fields] of range) {
          const obj: Record<string, any> = {};
          for (let i = 0; i < fields.length; i += 2) {
            obj[fields[i]] = fields[i + 1];
          }
          items.push(obj);
        }
        break;
      }
      default:
        break;
    }

    return { items, redisType };
  }

  private async getQueueDepth(queue: string): Promise<number> {
    try {
      const redis = await this._ensureRedisConnection();
      const type = await redis.type(queue);
      if (type === 'none') {
        return 0;
      }

      switch (type) {
        case 'list':
          return await redis.llen(queue);
        case 'zset':
          return await redis.zcard(queue);
        case 'set':
          return await redis.scard(queue);
        case 'stream':
          return await redis.xlen(queue);
        default:
          return 0;
      }
    } catch (error) {
      this.logger.error('[RedisQueueAdapter] Failed to compute queue depth', {
        queue,
        error: error instanceof Error ? error.message : error
      });
      return 0;
    }
  }

  async listQueues(options?: QueueListOptions): Promise<QueueInfo[]> {
    const redis = await this._ensureRedisConnection();
    const keys = await this.discoverQueueKeys(options);

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

    const knownSet = new Set(getKnownQueueKeys(this.driver, configValues).map(def => def.key));

    const queues: QueueInfo[] = [];

    for (const key of keys) {
      try {
        const redisType = await redis.type(key);
        const depth = redisType === 'none' ? 0 : await this.getQueueDepth(key);
        const failed = redisType === 'none' ? 0 : await this.getFailedCount(key);
        const paused = redisType === 'none' ? false : await this.isQueuePaused(key);
        const working = redisType === 'none' ? false : await this.isQueueWorking(key);

        queues.push({
          key,
          name: formatQueueName(key),
          type: determineQueueType(key),
          color: getQueueColor(key),
          depth,
          failed,
          running: working ? Math.max(1, depth) : 0,
          paused,
          isKnown: knownSet.has(key),
          driver: this.driver,
          metadata: {
            redisType
          }
        });
      } catch (error) {
        this.logger.warn(`[RedisQueueAdapter] Failed to build queue info for ${key}`, {
          error: error instanceof Error ? error.message : error
        });
      }
    }

    return queues.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getQueueTasks(queue: string, options?: QueueTasksQueryOptions): Promise<QueueTaskQueryResult> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const { items, redisType } = await this.loadRawQueueTasks(queue, limit, offset);
    const total = await this.getQueueDepth(queue);

    const tasks: QueueTask[] = items.map((item, index) => this.normalizeRedisTask(
      queue,
      item,
      `${queue}:${offset + index}`,
      redisType
    ));

    return {
      queue,
      tasks,
      total,
      limit,
      offset,
      hasMore: offset + tasks.length < total
    };
  }

  async getQueueStats(queue: string): Promise<QueueStats> {
    const redis = await this._ensureRedisConnection();
    const redisType = await redis.type(queue);
    const depth = redisType === 'none' ? 0 : await this.getQueueDepth(queue);
    const failed = redisType === 'none' ? 0 : await this.getFailedCount(queue);
    const paused = redisType === 'none' ? false : await this.isQueuePaused(queue);
    const working = redisType === 'none' ? false : await this.isQueueWorking(queue);

    return {
      depth,
      failed,
      running: working ? Math.max(1, depth) : 0,
      paused,
      driver: this.driver,
      metadata: {
        redisType
      }
    };
  }

  /**
   * Add task to Redis queue using LPUSH
   *
   * @param queue - Queue name (e.g., 'redis_cache_queue')
   * @param task - Task data object
   */
  async addTask(queue: string, task: any): Promise<void> {
    try {
      const redis = await this._ensureRedisConnection();

      // Add timestamp if not present
      const taskWithTimestamp = {
        ...task,
        timestamp: task.timestamp || Date.now()
      };

      // Push task to the left side of the list (FIFO with BRPOP)
      await redis.lpush(queue, JSON.stringify(taskWithTimestamp));

      this.logger.debug(`[RedisQueueAdapter] Task added to queue ${queue}`, {
        taskType: task.type || 'unknown',
        taskId: task.id || task.task_id || 'generated',
        queue
      });
    } catch (error) {
      this.logger.error(`[RedisQueueAdapter] Failed to add task to queue ${queue}`, {
        error: error.message,
        queue,
        taskType: task.type
      });
      throw error;
    }
  }

  /**
   * Get queue length using LLEN
   *
   * @param queue - Queue name
   * @returns Number of pending tasks
   */
  async getQueueLength(queue: string): Promise<number> {
    return this.getQueueDepth(queue);
  }

  /**
   * Pop next task from queue using BRPOP (blocking)
   *
   * @param queue - Queue name
   * @param timeout - Timeout in seconds (default: 5)
   * @returns Task data or null if timeout
   */
  async popTask(queue: string, timeout: number = 5): Promise<any | null> {
    try {
      const redis = await this._ensureRedisConnection();
      const result = await redis.brpop(queue, timeout);

      if (result) {
        const [_, taskData] = result;
        return JSON.parse(taskData);
      }

      return null;
    } catch (error) {
      this.logger.error(`[RedisQueueAdapter] Failed to pop task from queue ${queue}`, {
        error: error.message,
        queue
      });
      throw error;
    }
  }

  /**
   * Get all tasks from Redis queue using LRANGE
   * Note: This retrieves tasks without removing them from the queue
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
      const queues = await this.listQueues();
      const results: any[] = [];

      for (const queue of queues) {
        const taskResult = await this.getQueueTasks(queue.key, { limit, offset });
        for (const task of taskResult.tasks) {
          if (status && task.status !== status) {
            continue;
          }
          results.push({
            ...task,
            queue: queue.key
          });
        }
      }

      this.logger.debug('[RedisQueueAdapter] Aggregated tasks across queues', {
        count: results.length,
        limit,
        offset,
        status
      });

      return results;
    } catch (error) {
      this.logger.error('[RedisQueueAdapter] Failed to aggregate tasks', {
        error: error instanceof Error ? error.message : error
      });
      return [];
    }
  }

  /**
   * Clear all tasks from Redis queue(s)
   * If queueName is provided, only clear tasks from that specific queue
   * If queueName is not provided, clear ALL tasks from all queues
   *
   * @param queueName - Optional queue name to clear
   * @returns Number of tasks cleared
   */
  async clearQueue(queueName?: string): Promise<number> {
    try {
      const redis = await this._ensureRedisConnection();
      let clearedCount = 0;

      if (queueName) {
        // Clear specific queue
        const length = await redis.llen(queueName);
        if (length > 0) {
          await redis.del(queueName);
          clearedCount = length;
        }

        this.logger.info(`[RedisQueueAdapter] Cleared ${clearedCount} tasks from queue ${queueName}`);
      } else {
        // Clear all queues - use SCAN instead of KEYS to avoid blocking Redis
        const queues: string[] = [];
        let cursor = '0';

        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'redis_*_queue', 'COUNT', 100);
          cursor = nextCursor;
          queues.push(...keys);
        } while (cursor !== '0');

        for (const queue of queues) {
          const length = await redis.llen(queue);
          if (length > 0) {
            await redis.del(queue);
            clearedCount += length;
          }
        }

        this.logger.info(`[RedisQueueAdapter] Cleared ${clearedCount} tasks from ${queues.length} queues`);
      }

      return clearedCount;
    } catch (error) {
      this.logger.error(`[RedisQueueAdapter] Failed to clear queue`, {
        error: error.message,
        queueName
      });
      throw error;
    }
  }
}
