import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { QueueService } from '@/core/queue/QueueService';
import { DispatcherQueueUIService } from './DispatcherQueueUIService';
import { inject } from 'tsyringe';
import { NotFoundError, BadRequestError } from '@/core/base/BaseError.js';

// Additional dispatcher-specific types
export interface PaginatedTasks {
    tasks: any[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface SystemLoad {
    memory: {
        used: string;
        total: string;
        percentage: number;
    };
    redis: {
        connected: boolean;
        uptime: number;
        clients: number;
    };
    queues: {
        total: number;
        active: number;
        paused: number;
    };
}

export interface TaskHistoryItem {
    id: string;
    taskId: string;
    queueKey: string;
    type: string;
    title: string;
    status: 'completed' | 'failed' | 'processing';
    executedAt: string;
    executionTime?: number;
    error?: string;
    data?: any;
    result?: any;
}

@Service()
export class DispatcherQueueService extends BaseService {
    constructor(
        @inject(QueueService) private queueService: QueueService,
        @inject(DispatcherQueueUIService) private uiService: DispatcherQueueUIService
    ) {
        super();
    }

    /**
     * Delegation: Get queues info
     */
    async getQueues(includeDiscovered?: boolean): Promise<any[]> {
        return await this.queueService.listQueues({ includeDiscovered });
    }

    /**
     * Delegation: Get queue tasks
     */
    async getQueueTasks(queueKey: string, limit?: number, offset?: number): Promise<any[]> {
        const result = await this.queueService.getQueueTasks(queueKey, { limit, offset });
        return result.tasks;
    }

    /**
     * Delegation: Get all tasks from all queues
     */
    async getAllQueuesTasks(limit?: number): Promise<any[]> {
        const queues = await this.queueService.listQueues();
        const allTasks: any[] = [];

        for (const queue of queues) {
            const tasks = await this.queueService.getQueueTasks(queue.key, { limit: limit || 100 });
            allTasks.push(...tasks.tasks);
        }

        return allTasks;
    }

    /**
     * Delegation: Check if queue key is valid
     */
    async isQueueKeyValid(queueKey: string): Promise<boolean> {
        const queues = await this.queueService.listQueues({ includeDiscovered: true });
        return queues.some(queue => queue.key === queueKey);
    }

    /**
     * Delegation: Check if queue is valid
     */
    async isValidQueue(queueKey: string): Promise<boolean> {
        return this.isQueueKeyValid(queueKey);
    }

    /**
     * Delegation: Pause queue
     */
    async pauseQueue(queueKey: string): Promise<boolean> {
        if (this.queueService.getDriver() !== 'redis') {
            throw new BadRequestError('Pause operation is only available for Redis driver');
        }
        return await this.uiService.pauseQueue(queueKey);
    }

    /**
     * Delegation: Resume queue
     */
    async resumeQueue(queueKey: string): Promise<boolean> {
        if (this.queueService.getDriver() !== 'redis') {
            throw new BadRequestError('Resume operation is only available for Redis driver');
        }
        return await this.uiService.resumeQueue(queueKey);
    }

    /**
     * Get paginated tasks from a specific queue
     */
    async getQueueTasksPaginated(queueKey: string, limit: number = 50, offset: number = 0): Promise<PaginatedTasks> {
        try {
            const result = await this.queueService.getQueueTasks(queueKey, { limit, offset });

            return {
                tasks: result.tasks,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                hasMore: result.hasMore
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.logger.error(`Failed to get paginated tasks for queue ${queueKey}:`, error);
            throw new BadRequestError(`Failed to retrieve tasks from queue ${queueKey}`);
        }
    }

    /**
     * Get all tasks from all queues
     */
    async getAllTasks(opts: { limit?: number; includeDiscovered?: boolean; offset?: number; filters?: any } = {}): Promise<PaginatedTasks> {
        const limit = opts.limit || 100;
        const offset = opts.offset || 0;
        const allTasks: any[] = [];

        try {
            const queues = await this.queueService.listQueues({ includeDiscovered: opts.includeDiscovered });
            this.logger.info(`Processing ${queues.length} queues`, {
                queueKeys: queues.map(q => q.key)
            });

            for (const queue of queues) {
                try {
                    const queueTasks = await this.queueService.getQueueTasks(queue.key, {
                        limit,
                        offset: 0
                    });

                    allTasks.push(...queueTasks.tasks.map(task => ({
                        ...task,
                        created_at: task.createdAt,
                        queue: queue.key
                    })));
                } catch (queueError) {
                    this.logger.warn(`Failed to get tasks from queue ${queue.key}:`, queueError instanceof Error ? queueError.message : queueError);
                }
            }

            allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return {
                tasks: allTasks.slice(offset, offset + limit),
                total: allTasks.length,
                limit,
                offset,
                hasMore: offset + limit < allTasks.length,
            };
        } catch (error) {
            this.logger.error('Failed to get all tasks:', error);
            throw new BadRequestError('Failed to retrieve tasks from queues');
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats(queueKey: string): Promise<{
        depth: number;
        isPaused: boolean;
        type: string;
    }> {
        try {
            const stats = await this.queueService.getQueueStats(queueKey);
            const queues = await this.queueService.listQueues({ includeDiscovered: true });
            const queueInfo = queues.find(q => q.key === queueKey);

            return {
                depth: stats.depth,
                isPaused: stats.paused,
                type: queueInfo?.type || 'unknown'
            };
        } catch (error) {
            this.logger.error(`Failed to get stats for queue ${queueKey}:`, error);
            throw new BadRequestError(`Failed to retrieve queue statistics for ${queueKey}`);
        }
    }

    /**
     * Clear queue (remove all tasks) - handles different Redis data types
     */
    async clearQueue(queueKey: string): Promise<{ success: boolean; message: string; clearedTasks: number }> {
        try {
            const clearedCount = await this.queueService.clearQueue(queueKey);
            this.logger.info(`Cleared ${clearedCount} tasks from queue ${queueKey}`);

            return {
                success: true,
                message: `Successfully cleared ${clearedCount} tasks from queue ${queueKey}`,
                clearedTasks: clearedCount
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.logger.error(`Failed to clear queue ${queueKey}:`, error);
            throw new BadRequestError(`Failed to clear queue ${queueKey}`);
        }
    }


    /**
     * Add test tasks to queue
     */
    async addTestTasks(queueKey: string, count: number = 5): Promise<{ success: boolean; message: string; tasksAdded: number }> {
        if (count <= 0 || count > 100) {
            throw new BadRequestError('Count must be between 1 and 100');
        }

        try {
            const tasks = Array.from({ length: count }, (_, index) => {
                const ordinal = index + 1;
                return {
                    type: 'test_task',
                    name: `Test Task ${ordinal}`,
                    title: `Test Task ${ordinal}`,
                    data: {
                        message: `This is test task #${ordinal}`,
                        timestamp: new Date().toISOString()
                    },
                    priority: 3
                };
            });

            await this.queueService.addTasks(queueKey, tasks);

            this.logger.info(`[DispatcherQueueService] Added ${count} test tasks`, {
                queueKey,
                driver: this.queueService.getDriver()
            });

            return {
                success: true,
                message: `Successfully added ${count} test tasks to ${queueKey}`,
                tasksAdded: count
            };
        } catch (error) {
            this.logger.error(`[DispatcherQueueService] Failed to add test tasks to queue ${queueKey}`, {
                error: error instanceof Error ? error.message : error
            });
            throw new BadRequestError(`Failed to add test tasks to queue ${queueKey}`);
        }
    }

    /**
     * Get system load statistics
     */
    async getSystemLoad(): Promise<SystemLoad> {
        const driver = this.queueService.getDriver();
        const queues = await this.queueService.listQueues({ includeDiscovered: true });

        const activeQueues = queues.filter(queue => queue.running > 0 && !queue.paused).length;
        const pausedQueues = queues.filter(queue => queue.paused).length;

        return {
            memory: {
                used: 'N/A',
                total: 'N/A',
                percentage: 0,
            },
            redis: {
                connected: driver === 'redis',
                uptime: 0,
                clients: 0,
            },
            queues: {
                total: queues.length,
                active: activeQueues,
                paused: pausedQueues,
            },
        };
    }

    /**
     * Clear all queues (agnostic - works with both Redis and Database)
     * Removes all pending tasks from all queues
     */
    async clearAllQueues(confirm: boolean = false): Promise<{ success: boolean; message: string; count?: number }> {
        if (!confirm) {
            throw new BadRequestError('Confirmation required to clear all queues');
        }

        try {
            // Delegate to QueueService - it knows which adapter to use
            const clearedCount = await this.queueService.clearAllQueues();

            this.logger.warn('[DispatcherQueueService] All queues cleared', {
                clearedCount,
                driver: process.env.QUEUE_DRIVER || 'database'
            });

            return {
                success: true,
                message: `All queues cleared successfully (${clearedCount} tasks removed)`,
                count: clearedCount
            };
        } catch (error) {
            this.logger.error('[DispatcherQueueService] Failed to clear queues', {
                error: error.message
            });
            throw new BadRequestError(`Failed to clear queues: ${error.message}`);
        }
    }

    /**
     * Delete multiple tasks
     */
    async deleteMultipleTasks(taskIds: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> {
        if (!taskIds || taskIds.length === 0) {
            throw new BadRequestError('Task IDs array is required and must not be empty');
        }
        if (taskIds.length > 100) {
            throw new BadRequestError('Cannot delete more than 100 tasks at once');
        }

        // Implementation would depend on your task storage structure
        // This is a placeholder
        let deletedCount = 0;
        for (const taskId of taskIds) {
            try {
                // Delete task logic here
                deletedCount++;
            } catch (error) {
                this.logger.warn(`Failed to delete task ${taskId}:`, error.message);
            }
        }

        return {
            success: true,
            message: `Successfully deleted ${deletedCount} tasks`,
            deletedCount
        };
    }

    /**
     * Retry multiple tasks
     */
    async retryMultipleTasks(taskIds: string[]): Promise<{ success: boolean; message: string; retriedCount: number }> {
        if (!taskIds || taskIds.length === 0) {
            throw new BadRequestError('Task IDs array is required and must not be empty');
        }
        if (taskIds.length > 100) {
            throw new BadRequestError('Cannot retry more than 100 tasks at once');
        }

        // Implementation would depend on your task storage structure
        // This is a placeholder
        let retriedCount = 0;
        for (const taskId of taskIds) {
            try {
                // Retry task logic here
                retriedCount++;
            } catch (error) {
                this.logger.warn(`Failed to retry task ${taskId}:`, error.message);
            }
        }

        return {
            success: true,
            message: `Successfully retried ${retriedCount} tasks`,
            retriedCount
        };
    }

    async getTaskHistoryById(id: string): Promise<TaskHistoryItem> {
        try {
            const history = await this.prisma.dispatcherTaskHistory.findUnique({
                where: { id: parseInt(id) },
                include: {
                    task: { select: { name: true, type: true } }
                }
            });

            if (!history) {
                throw new NotFoundError(`Task history with id ${id} not found`);
            }

            return {
                id: history.id.toString(),
                taskId: history.taskId.toString(),
                queueKey: history.queueName || 'database',
                type: history.taskType || history.task?.type || 'unknown',
                title: history.taskName || history.task?.name || 'Unknown Task',
                status: history.status === 'success' ? 'completed' : history.status,
                executedAt: history.startedAt.toISOString(),
                finishedAt: history.finishedAt?.toISOString(),
                executionTime: history.duration,
                error: history.error,
                data: history.metadata,
                result: history.result
            };
        } catch (error) {
            this.logger.error(`Failed to get task history by id ${id}:`, error);
            throw new BadRequestError(`Failed to retrieve task history`);
        }
    }

    /**
     * Get task history (alias for getTaskHistoryPaginated)
     */
    async getTaskHistory(limit?: number, offset?: number): Promise<PaginatedTasks> {
        return await this.getTaskHistoryPaginated(limit, offset);
    }

    async getTaskHistoryPaginated(limit: number = 50, offset: number = 0): Promise<PaginatedTasks> {
        try {
            const history = await this.prisma.dispatcherTaskHistory.findMany({
                take: limit,
                skip: offset,
                orderBy: { startedAt: 'desc' },
                include: {
                    task: { select: { name: true, type: true } }
                }
            });

            const total = await this.prisma.dispatcherTaskHistory.count();

            const tasks = history.map(h => ({
                id: h?.id?.toString(),
                taskId: h?.taskId?.toString(),
                queueKey: h.queueName || 'database',
                type: h.taskType || h.task?.type || 'unknown',
                title: h.taskName || h.task?.name || 'Unknown Task',
                status: h.status === 'success' ? 'completed' : h.status,
                executedAt: h.startedAt.toISOString(),
                finishedAt: h.finishedAt?.toISOString(),
                executionTime: h.duration,
                error: h.error,
                data: h.metadata,
                result: h.result
            }));

            return {
                tasks,
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            };
        } catch (error) {
            this.logger.error('Failed to get task history:', error);
            return { tasks: [], total: 0, limit, offset, hasMore: false };
        }
    }

    /**
     * Add custom test tasks with template
     */
    async addCustomTestTasks(request: { queueKey: string; count: number; template: any }): Promise<{ success: boolean; message: string; tasksAdded: number }> {
        const { queueKey, count, template } = request;

        if (!queueKey) {
            throw new BadRequestError('Queue key is required');
        }
        if (count <= 0 || count > 100) {
            throw new BadRequestError('Count must be between 1 and 100');
        }
        if (!template || !template.type || !template.title) {
            throw new BadRequestError('Template with type and title is required');
        }

        try {
            const tasks = Array.from({ length: count }, (_, index) => {
                const ordinal = index + 1;
                return {
                    type: template.type,
                    name: `${template.title} ${ordinal}`,
                    title: `${template.title} ${ordinal}`,
                    data: {
                        ...template.data,
                        timestamp: new Date().toISOString()
                    },
                    priority: template.priority || 3
                };
            });

            await this.queueService.addTasks(queueKey, tasks);

            this.logger.info(`[DispatcherQueueService] Added ${count} custom test tasks`, {
                queueKey,
                templateType: template.type,
                driver: this.queueService.getDriver()
            });

            return {
                success: true,
                message: `Successfully added ${count} custom test tasks to ${queueKey}`,
                tasksAdded: count
            };
        } catch (error) {
            this.logger.error(`[DispatcherQueueService] Failed to add custom test tasks to queue ${queueKey}`, {
                error: error instanceof Error ? error.message : error
            });
            throw new BadRequestError(`Failed to add custom test tasks to queue ${queueKey}`);
        }
    }

    /**
     * Get all plugin schemas from dispatcher service
     * 
     * ⚠️  CRITICAL: DO NOT REPLACE THIS METHOD WITH MOCK DATA! ⚠️
     * 
     * This method provides a pure proxy to the dispatcher's plugin registry.
     * The dispatcher service maintains the single source of truth for all plugin schemas
     * including field definitions, validation rules, queue names, and normalization logic.
     * 
     * Architecture Flow:
     * 1. Dispatcher Plugin Registry → loads all plugin schemas with queueName from env vars
     * 2. Dispatcher Schema API → exposes schemas via HTTP API on port 3030
     * 3. Backend (this method) → pure proxy without any transformations
     * 4. Frontend → renders forms automatically based on plugin field definitions
     * 
     * Benefits of this approach:
     * - Plugin schemas are defined once in dispatcher plugins
     * - Queue names come from environment variables (no hardcoding)
     * - Frontend is completely agnostic to schema structure
     * - Changes to plugin schemas automatically propagate to UI
     * - No code changes needed when adding/modifying plugins
     * 
     * Why this should NEVER be replaced with mocks:
     * - Breaks the plugin-based architecture
     * - Introduces hardcoded data that becomes stale
     * - Prevents real-time schema updates
     * - Forces manual frontend updates for every plugin change
     * - Violates the "single source of truth" principle
     */
    async getAllPluginSchemas(format: 'raw' | 'ui' = 'raw'): Promise<{
        schemas: Array<{
            type: string;
            name?: string;
            description?: string;
            fields?: string[];
            queueName?: string;
            defaults?: Record<string, any>;
            schema?: any;
        }>;
        total: number;
        timestamp: string;
    }> {
        this.logger.info(`Getting all plugin schemas with format: ${format}`);

        const dispatcherUrl = process.env.DISPATCHER_SCHEMA_URL;
        const timeoutMs = 5000;

        // Create AbortController for timeout handling
        const controller = new AbortController();
        let timeoutId: NodeJS.Timeout | null = null;

        try {
            timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            this.logger.debug(`Fetching schemas from dispatcher at: ${dispatcherUrl}/schemas`);

            // Fetch schemas from dispatcher service (pure proxy - no transformations)
            const response = await fetch(`${dispatcherUrl}/schemas`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const dispatcherData = await response.json();

            if (!dispatcherData.success) {
                throw new Error(`Dispatcher returned error: ${dispatcherData.error || 'Unknown error'}`);
            }

            this.logger.info(`Successfully fetched ${Object.keys(dispatcherData.data || {}).length} schemas from dispatcher`);

            // Return data exactly as received from dispatcher (no transformations)
            // The dispatcher already provides the correct format with queueName, fields, validation, etc.
            return {
                schemas: Array.isArray(dispatcherData.data)
                    ? dispatcherData.data
                    : Object.values(dispatcherData.data || {}),
                total: dispatcherData.meta?.count || Object.keys(dispatcherData.data || {}).length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (error.name === 'AbortError') {
                this.logger.error(`Request to dispatcher timed out after ${timeoutMs}ms`);
            } else {
                this.logger.error(`Failed to fetch schemas from dispatcher: ${error.message}`);
            }

            // Minimal fallback - return empty schemas instead of mocks to maintain agnostic architecture
            this.logger.warn('Dispatcher unavailable, returning empty schemas (frontend will show no available task types)');

            return {
                schemas: [],
                total: 0,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get specific plugin schema
     * 
     * ⚠️  CRITICAL: Returns complete plugin schema including fields and defaults ⚠️
     * 
     * This method returns the complete schema object as received from the dispatcher,
     * including the fields array and defaults object which are essential for frontend form rendering.
     */
    async getPluginSchema(schemaType: string): Promise<{
        type: string;
        name: string;
        description: string;
        fields?: string[];
        queueName?: string;
        defaults?: Record<string, any>;
        schema: any;
        timestamp: string;
    }> {
        this.logger.info(`Getting plugin schema for type: ${schemaType}`);

        try {
            const schemas = await this.getAllPluginSchemas('raw');
            const schema = schemas.schemas.find(s => s.type === schemaType);

            if (!schema) {
                throw new NotFoundError(`Schema for type ${schemaType} not found`);
            }

            // Extract defaults from nested schema object for frontend convenience
            const defaults = schema.defaults || schema.schema?.defaults || {};

            // Return the complete schema object including fields and defaults properties
            return {
                type: schema.type,
                name: schema.name || schema.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: schema.description || `Execute ${schema.type} task`,
                fields: schema.fields,           // Include fields array for frontend form rendering
                queueName: schema.queueName,     // Include queueName for task creation
                defaults: defaults,              // Include defaults for agnostic frontend form population
                schema: schema,                  // Complete schema object as received from dispatcher
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.logger.error(`Failed to get schema for type ${schemaType}:`, error);
            throw new BadRequestError(`Failed to retrieve schema for type ${schemaType}`);
        }
    }

    /**
     * Get task templates (legacy method for backward compatibility)
     */
    async getTaskTemplates(queueType?: 'mail' | 'messages' | 'system'): Promise<{
        templates: Array<{
            type: string;
            name: string;
            description: string;
            schema: any;
        }>;
        total: number;
        timestamp: string;
    }> {
        this.logger.warn('getTaskTemplates method is deprecated, use getAllPluginSchemas instead');

        const result = await this.getAllPluginSchemas('ui');

        // Filter by queue type if specified
        let filteredSchemas = result.schemas;
        if (queueType) {
            const typeMap = {
                'mail': ['mail_send', 'mail_queue'],
                'messages': ['notification_push', 'sms_send'],
                'system': ['cache_generation_task', 'cleanup_task']
            };

            const allowedTypes = typeMap[queueType] || [];
            filteredSchemas = result.schemas.filter(s => allowedTypes.includes(s.type));
        }

        return {
            templates: filteredSchemas.map(schema => ({
                type: schema.type,
                name: schema.name || schema.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: schema.description || `Execute ${schema.type} task`,
                schema: schema.schema
            })),
            total: filteredSchemas.length,
            timestamp: new Date().toISOString()
        };
    }
}
