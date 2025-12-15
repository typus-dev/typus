/**
 * Dispatcher Queue UI Service
 *
 * Provides Redis-specific UI methods for Dispatcher admin interface.
 * Works ONLY in FULL profile with Redis enabled.
 *
 * This service contains Redis-specific visualization logic that doesn't belong
 * in the agnostic Core layer. It handles multiple Redis data structures
 * (list, zset, set, stream) for comprehensive queue monitoring in the UI.
 *
 * For STARTER profile, use DispatcherQueueService which provides database-based
 * queue information.
 */

import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { RedisService } from '@/core/redis/RedisService';
import { ConfigService } from '@/modules/system/services/ConfigService';
import { inject } from 'tsyringe';

export interface QueueInfo {
    key: string;
    name: string;
    type: 'mail' | 'messages' | 'system';
    color: string;
    envKey: string;
    taskCount: number;
    isWorking: boolean;
    isPaused: boolean;
}

export interface QueueTaskData {
    id?: string;
    task_id?: string;
    type?: string;
    title?: string;
    name?: string;
    to?: string;
    phone?: string;
    data?: {
        url?: string;
        [key: string]: any;
    };
    timestamp?: string;
    createdAt?: string;
    priority?: number;
    _scheduledAt?: string;
    _scheduledTimestamp?: number;
    _retries?: number;
}

@Service()
export class DispatcherQueueUIService extends BaseService {
    private redis: any | null = null;

    constructor(
        @inject(RedisService) private redisService: RedisService,
        @inject(ConfigService) private configService: ConfigService
    ) {
        super();
    }

    private async ensureRedisConnection(): Promise<any> {
        if (!this.redis) {
            this.redis = await this.redisService.getRedis();
        }
        return this.redis;
    }

    /**
     * Get queue information with stats (fully dynamic discovery)
     * Redis-only method for FULL profile
     */
    async getQueues(includeDiscovered: boolean = true): Promise<QueueInfo[]> {
        const redis = await this.ensureRedisConnection();
        const queueInfos: QueueInfo[] = [];

        // Always discover all queues dynamically
        const discoveredKeys = await this.scanAllKeys();

        for (const key of discoveredKeys) {
            const taskCount = await this.getQueueDepth(key);
            const isPaused = await redis.exists(`${key}:paused`);
            const isWorking = await this.isQueueWorking(key);

            queueInfos.push({
                key,
                name: this.formatQueueName(key),
                type: this.determineQueueType(key),
                color: this.getQueueColor(key),
                envKey: '',
                taskCount,
                isWorking,
                isPaused: Boolean(isPaused),
            });
        }

        return queueInfos.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get queue depth (supports different Redis data types)
     */
    async getQueueDepth(queueKey: string): Promise<number> {
        const redis = await this.ensureRedisConnection();

        try {
            const keyType = await redis.type(queueKey);

            switch (keyType) {
                case 'list':
                    return await redis.llen(queueKey);
                case 'zset':
                    return await redis.zcard(queueKey);
                case 'set':
                    return await redis.scard(queueKey);
                case 'stream':
                    return await redis.xlen(queueKey);
                default:
                    return 0;
            }
        } catch (error) {
            this.logger.warn(`Failed to get depth for queue ${queueKey}:`, error);
            return 0;
        }
    }

    /**
     * Format queue name for display
     */
    formatQueueName(key: string): string {
        return key
            .replace(/^redis_/, '')
            .replace(/_queue$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Determine queue type based on name
     */
    determineQueueType(key: string): 'mail' | 'messages' | 'system' {
        const lowerKey = key.toLowerCase();

        if (lowerKey.includes('email') || lowerKey.includes('mail')) {
            return 'mail';
        }

        if (lowerKey.includes('telegram') || lowerKey.includes('notification') || lowerKey.includes('message')) {
            return 'messages';
        }

        return 'system';
    }

    /**
     * Get color based on queue type and name
     */
    getQueueColor(key: string): string {
        const type = this.determineQueueType(key);
        const lowerKey = key.toLowerCase();

        // Specific queue colors
        if (lowerKey.includes('email')) return '#2563eb';
        if (lowerKey.includes('telegram')) return '#0ea5e9';
        if (lowerKey.includes('notification')) return '#475569';
        if (lowerKey.includes('cache')) return '#16a34a';
        if (lowerKey.includes('backup')) return '#10b981';
        if (lowerKey.includes('report')) return '#f59e0b';
        if (lowerKey.includes('system')) return '#8b5cf6';

        // Default colors by type
        switch (type) {
            case 'mail': return '#3b82f6';
            case 'messages': return '#06b6d4';
            case 'system': return '#6366f1';
            default: return '#64748b';
        }
    }

    /**
     * Scan all Redis keys using worker-compatible discovery logic
     */
    async scanAllKeys(pattern: string = '*'): Promise<string[]> {
        try {
            const redis = await this.ensureRedisConnection();
            this.logger.info(`[DispatcherQueueUIService] Starting WORKER-COMPATIBLE queue discovery with pattern: ${pattern}`);

            // Step 1: Get ALL keys from Redis (like worker does)
            const allRedisKeys = new Set<string>();
            let cursor = '0';
            let scanCount = 0;

            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
                cursor = nextCursor;
                scanCount++;

                this.logger.debug(`[DispatcherQueueUIService] SCAN iteration ${scanCount}: found ${keys.length} keys, cursor: ${cursor}`);
                keys.forEach(key => allRedisKeys.add(key));
            } while (cursor !== '0' && scanCount < 100);

            const allKeys = Array.from(allRedisKeys);
            this.logger.info(`[DispatcherQueueUIService] Total Redis keys found: ${allKeys.length}`, { allKeys });

            // Step 2: Get plugin queues from database (system.config - PRIVATE)
            const knownPluginQueues = [
                await this.configService.getFromDb('queue.redis_notification', 'redis_notifications_queue'),
                await this.configService.getFromDb('queue.redis_telegram', 'redis_telegram_queue'),
                await this.configService.getFromDb('queue.redis_email', 'redis_email_queue'),
                await this.configService.getFromDb('queue.redis_system', 'redis_system_queue'),
                await this.configService.getFromDb('queue.redis_reports', 'redis_reports_queue'),
                await this.configService.getFromDb('queue.redis_cache', 'redis_cache_queue'),
                await this.configService.getFromDb('queue.redis_backup', 'redis_backup_queue'),
                await this.configService.getFromDb('queue.redis_social_media', 'redis_social_media_queue')
            ];

            this.logger.info(`[DispatcherQueueUIService] Known plugin queues (from database): ${knownPluginQueues.length}`, { knownPluginQueues });

            // Step 3: Combine ALL keys (Redis + Plugin) like worker does
            const combinedKeys = [...new Set([...allKeys, ...knownPluginQueues])];
            this.logger.info(`[DispatcherQueueUIService] Combined keys: ${combinedKeys.length}`, { combinedKeys });

            // Step 4: Apply MINIMAL filtering (only exclude obvious control keys)
            const filteredKeys = combinedKeys.filter(key => this.isValidQueueKey(key));

            this.logger.info(`[DispatcherQueueUIService] WORKER-COMPATIBLE discovery completed`, {
                totalScans: scanCount,
                redisKeys: allKeys.length,
                pluginKeys: knownPluginQueues.length,
                combinedKeys: combinedKeys.length,
                finalKeys: filteredKeys.length,
                finalQueues: filteredKeys
            });

            return filteredKeys.sort();
        } catch (error) {
            this.logger.error(`[DispatcherQueueUIService] Failed to scan Redis keys:`, error);
            return [];
        }
    }

    /**
     * Minimal filtering - only exclude obvious control keys
     */
    private isValidQueueKey(key: string): boolean {
        // Only filter out obvious control/system keys
        if (key.includes(':errors') ||
            key.includes(':paused') ||
            key.includes(':last_activity') ||
            key.includes(':worker') ||
            key.includes(':heartbeat') ||
            key.includes(':lock')) {
            return false;
        }

        // Include everything else (main queues + derivative queues)
        return true;
    }

    /**
     * Public method to check if queue is valid (for external use)
     * Validates queue key format AND checks if key exists in Redis
     */
    async isValidQueue(queueKey: string): Promise<boolean> {
        // First check key format
        if (!this.isValidQueueKey(queueKey)) {
            return false;
        }

        try {
            // Then check if key actually exists in Redis
            const redis = await this.ensureRedisConnection();
            const keyType = await redis.type(queueKey);
            return keyType !== 'none';
        } catch (error) {
            this.logger.error(`Failed to check queue validity for ${queueKey}:`, error);
            return false;
        }
    }

    /**
     * Check if queue worker is active
     */
    private async isQueueWorking(queueKey: string): Promise<boolean> {
        const redis = await this.ensureRedisConnection();
        try {
            const workerKey = `${queueKey}:worker`;
            const lastHeartbeat = await redis.get(workerKey);

            if (!lastHeartbeat) return false;

            const lastTime = parseInt(lastHeartbeat);
            const now = Date.now();

            return (now - lastTime) < 30000; // Active if heartbeat within 30 seconds
        } catch (error) {
            return false;
        }
    }

    /**
     * Get paginated tasks from a Redis queue (supports different Redis data types)
     *
     * This method handles multiple Redis data structures used by the queue system:
     * - Lists (list): Main queues for immediate execution using FIFO (lrange)
     * - Sorted Sets (zset): Delayed queues with timestamp-based scheduling (zrange)
     * - Sets (set): Unique task collections (srandmember)
     * - Streams (stream): Event-driven task processing (xrange)
     */
    async getQueueTasks(key: string, limit: number = 50, offset: number = 0): Promise<any[]> {
        try {
            const redis = await this.ensureRedisConnection();
            this.logger.debug(`Getting tasks from queue ${key}, limit: ${limit}, offset: ${offset}`);

            // First, determine the Redis data type to use appropriate commands
            const keyType = await redis.type(key);
            this.logger.debug(`Queue ${key} is of type: ${keyType}`);

            let rawTasks: string[] = [];

            switch (keyType) {
                case 'list':
                    const start = offset;
                    const end = offset + limit - 1;
                    rawTasks = await redis.lrange(key, start, end);
                    this.logger.debug(`Retrieved ${rawTasks.length} tasks from list ${key} (${start}-${end})`);
                    break;

                case 'zset':
                    const zrangeResult = await redis.zrange(key, offset, offset + limit - 1, 'WITHSCORES');
                    rawTasks = [];

                    for (let i = 0; i < zrangeResult.length; i += 2) {
                        const taskData = zrangeResult[i];
                        const score = zrangeResult[i + 1];

                        try {
                            const parsed = JSON.parse(taskData);
                            parsed._scheduledTimestamp = parseInt(score);
                            parsed._scheduledAt = new Date(parseInt(score)).toISOString();
                            rawTasks.push(JSON.stringify(parsed));
                        } catch (parseError) {
                            rawTasks.push(JSON.stringify({
                                _rawData: taskData,
                                _scheduledTimestamp: parseInt(score),
                                _scheduledAt: new Date(parseInt(score)).toISOString()
                            }));
                        }
                    }

                    this.logger.debug(`Retrieved ${rawTasks.length} tasks from sorted set ${key} (offset: ${offset})`);
                    break;

                case 'set':
                    const setTasks = await redis.srandmember(key, limit);
                    rawTasks = Array.isArray(setTasks) ? setTasks : [setTasks].filter(Boolean);
                    this.logger.debug(`Retrieved ${rawTasks.length} tasks from set ${key}`);
                    break;

                case 'stream':
                    const streamResult = await redis.xrange(key, '-', '+', 'COUNT', limit);
                    rawTasks = streamResult.map(([id, fields]) => {
                        const taskData: any = { _streamId: id };
                        for (let i = 0; i < fields.length; i += 2) {
                            taskData[fields[i]] = fields[i + 1];
                        }
                        return JSON.stringify(taskData);
                    });
                    this.logger.debug(`Retrieved ${rawTasks.length} tasks from stream ${key}`);
                    break;

                case 'none':
                    this.logger.debug(`Queue ${key} does not exist`);
                    return [];

                default:
                    this.logger.warn(`Unsupported Redis type '${keyType}' for queue ${key}`);
                    return [];
            }

            const tasks: any[] = [];

            for (let i = 0; i < rawTasks.length; i++) {
                try {
                    const taskData = JSON.parse(rawTasks[i]);

                    let status = 'queued';
                    if (keyType === 'zset' && taskData._scheduledTimestamp) {
                        status = taskData._scheduledTimestamp > Date.now() ? 'delayed' : 'ready';
                    }

                    tasks.push({
                        id: taskData.id || taskData.task_id || `${key}-${offset + i}`,
                        type: taskData.type || 'unknown',
                        title: taskData.title || taskData.name || this.generateTaskTitle(taskData),
                        createdAt: taskData.timestamp || taskData.createdAt || new Date().toISOString(),
                        scheduledAt: taskData._scheduledAt || null,
                        priority: taskData.priority || 3,
                        status: status,
                        retries: taskData._retries || 0,
                        queue: key,
                        queueType: keyType,
                        payload: taskData
                    });
                } catch (parseError) {
                    this.logger.warn(`Failed to parse task ${i} in queue ${key}, treating as raw data`);
                    tasks.push({
                        id: `${key}-raw-${offset + i}`,
                        type: 'raw',
                        title: `Raw Data #${offset + i + 1}`,
                        createdAt: new Date().toISOString(),
                        scheduledAt: null,
                        priority: 5,
                        status: 'queued',
                        retries: 0,
                        queue: key,
                        queueType: keyType,
                        payload: { rawData: rawTasks[i] }
                    });
                }
            }

            this.logger.debug(`Returning ${tasks.length} tasks from ${keyType} queue ${key}`);
            return tasks;
        } catch (error) {
            this.logger.error(`Failed to get tasks from queue ${key}:`, error);
            return [];
        }
    }

    /**
     * Generate task title based on task data (for display purposes only)
     */
    private generateTaskTitle(taskData: QueueTaskData): string {
        if (taskData.title) return taskData.title;
        if (taskData.name) return taskData.name;

        switch (taskData.type) {
            case 'email':
            case 'email_notification_task':
                return `Send email${taskData.to ? ` to ${taskData.to}` : ''}`;
            case 'telegram':
            case 'telegram_notification_task':
                return `Send Telegram message${taskData.phone ? ` to ${taskData.phone}` : ''}`;
            case 'notification':
            case 'internal_notification_task':
                return 'Send notification';
            case 'cache_generation_task':
                return `Generate cache${taskData.data?.url ? ` for ${taskData.data.url}` : ''}`;
            case 'database_backup_task':
                return 'Database backup';
            case 'system_health_task':
                return 'System health check';
            default:
                return `${taskData.type || 'Unknown'} task`;
        }
    }

    /**
     * Pause a queue
     */
    async pauseQueue(queueKey: string): Promise<boolean> {
        try {
            const redis = await this.ensureRedisConnection();
            const pauseKey = `${queueKey}:paused`;
            await redis.set(pauseKey, '1');
            this.logger.info(`Queue ${queueKey} paused`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to pause queue ${queueKey}:`, error);
            return false;
        }
    }

    /**
     * Resume a queue
     */
    async resumeQueue(queueKey: string): Promise<boolean> {
        try {
            const redis = await this.ensureRedisConnection();
            const pauseKey = `${queueKey}:paused`;
            await redis.del(pauseKey);
            this.logger.info(`Queue ${queueKey} resumed`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to resume queue ${queueKey}:`, error);
            return false;
        }
    }

    /**
     * Clear queue (remove all tasks)
     */
    async clearQueue(queueKey: string): Promise<number> {
        try {
            const redis = await this.ensureRedisConnection();

            // Get task count before clearing (redis.del() returns 0 or 1, not task count)
            const taskCount = await this.getQueueDepth(queueKey);

            // Delete the key
            await redis.del(queueKey);

            this.logger.info(`Cleared queue ${queueKey}, removed ${taskCount} tasks`);
            return taskCount;
        } catch (error) {
            this.logger.error(`Failed to clear queue ${queueKey}:`, error);
            return 0;
        }
    }

    /**
     * Remove specific task from queue
     */
    async removeTask(queueKey: string, taskData: any): Promise<number> {
        const redis = await this.ensureRedisConnection();
        const taskString = JSON.stringify(taskData);
        const removedCount = await redis.lrem(queueKey, 0, taskString);
        this.logger.debug(`Removed ${removedCount} instances of task from queue ${queueKey}`);
        return removedCount;
    }
}
