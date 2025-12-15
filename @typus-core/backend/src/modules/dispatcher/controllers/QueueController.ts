import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { DispatcherQueueService } from '../services/DispatcherQueueService';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';
import { BadRequestError, NotFoundError } from '@/core/base/BaseError.js';

@Controller({ path: 'queues' })
export class QueueController extends BaseController {
  constructor(
    @inject(DispatcherQueueService) private dispatcherQueueService: DispatcherQueueService
  ) {
    super();
  }

  
  // UNIFIED ENDPOINTS WITH PAGINATION
  async getAllQueues(req: Request, res: Response) {
    try {
      const { includeDiscovered = 'false' } = req.query;
      const includeDiscoveredFlag = includeDiscovered === 'true';

      const queues = await this.dispatcherQueueService.getQueues(includeDiscoveredFlag);
      
      return {
        success: true,
        data: {
          queues,
          includeDiscovered: includeDiscoveredFlag,
          total: queues.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get queues:', error);
      throw new BadRequestError('Failed to retrieve queue information');
    }
  }

  async getAllTasks(req: Request, res: Response) {
    try {
      const { 
        queue, 
        limit = '50', 
        offset = '0',
        includeDiscovered = 'false',
        type,
        status,
        dateFrom,
        dateTo
      } = req.query;

      const opts = {
        includeDiscovered: includeDiscovered === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        filters: {
          queue: queue as string,
          type: type as string,
          status: status as string,
          dateFrom: dateFrom as string,
          dateTo: dateTo as string
        }
      };

      // Remove undefined values from filters
      Object.keys(opts.filters).forEach(key => {
        if (opts.filters[key] === undefined) {
          delete opts.filters[key];
        }
      });

      const result = await this.dispatcherQueueService.getAllTasks(opts);
      
      return {
        success: true,
        data: {
          ...result,
          filters: opts.filters,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get all tasks:', error);
      throw new BadRequestError('Failed to retrieve tasks');
    }
  }

  async getQueueTasks(req: Request, res: Response) {
    try {
      const { queueKey } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      const result = await this.dispatcherQueueService.getQueueTasksPaginated(
        queueKey, 
        parseInt(limit as string),
        parseInt(offset as string)
      );

      return {
        success: true,
        data: {
          queue: queueKey,
          ...result,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to get queue tasks:', error);
      throw new BadRequestError('Failed to retrieve queue tasks');
    }
  }

  async getQueueStats(req: Request, res: Response) {
    try {
      const { queueKey } = req.params;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      const stats = await this.dispatcherQueueService.getQueueStats(queueKey);

      return {
        success: true,
        data: {
          queue: queueKey,
          stats,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to get queue stats:', error);
      throw new BadRequestError('Failed to retrieve queue statistics');
    }
  }

  async pauseQueue(req: Request, res: Response) {
    try {
      const { queueKey } = req.params;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      const success = await this.dispatcherQueueService.pauseQueue(queueKey);

      if (!success) {
        throw new BadRequestError('Failed to pause queue');
      }

      return {
        success: true,
        message: `Queue ${queueKey} has been paused`,
        data: {
          queue: queueKey,
          action: 'paused',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to pause queue:', error);
      throw new BadRequestError('Failed to pause queue');
    }
  }

  async resumeQueue(req: Request, res: Response) {
    try {
      const { queueKey } = req.params;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      const success = await this.dispatcherQueueService.resumeQueue(queueKey);

      if (!success) {
        throw new BadRequestError('Failed to resume queue');
      }

      return {
        success: true,
        message: `Queue ${queueKey} has been resumed`,
        data: {
          queue: queueKey,
          action: 'resumed',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to resume queue:', error);
      throw new BadRequestError('Failed to resume queue');
    }
  }

  async clearQueue(req: Request, res: Response) {
    try {
      const { queueKey } = req.params;
      const { confirm } = req.body;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      if (!confirm) {
        throw new BadRequestError('Confirmation required to clear queue');
      }

      // Use agnostic queue service (works with both Redis and Database)
      const cleared = await this.dispatcherQueueService.clearQueue(queueKey);

      return {
        success: true,
        message: `Queue ${queueKey} has been cleared`,
        data: {
          queue: queueKey,
          action: 'cleared',
          clearedTasks: cleared.clearedTasks,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to clear queue:', error);
      throw new BadRequestError('Failed to clear queue');
    }
  }

  async getQueueHealth(req: Request, res: Response) {
    try {
      const queues = await this.dispatcherQueueService.getQueues(true);

      const totalTasks = queues.reduce((sum, queue) => sum + (queue.depth || 0), 0);
      const totalErrors = queues.reduce((sum, queue) => sum + (queue.failed || 0), 0);
      const pausedQueues = queues.filter(queue => queue.paused).length;

      const health = {
        status: totalErrors > 100 ? 'unhealthy' : pausedQueues > 0 ? 'degraded' : 'healthy',
        totalQueues: queues.length,
        totalTasks,
        totalErrors,
        pausedQueues,
        queues: queues.map(queue => ({
          name: queue.name,
          key: queue.key,
          status: queue.paused ? 'paused' : 'active',
          tasks: queue.depth,
          errors: queue.failed
        }))
      };

      return {
        success: true,
        data: {
          health,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get queue health:', error);
      throw new BadRequestError('Failed to retrieve queue health information');
    }
  }

  async addTestTasks(req: Request, res: Response) {
    try {
      const { queueKey } = req.params;
      const { count } = req.body;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      if (!count || typeof count !== 'number') {
        throw new BadRequestError('Count is required and must be a number');
      }

      if (count <= 0 || count > 100) {
        throw new BadRequestError('Count must be between 1 and 100');
      }

      const result = await this.dispatcherQueueService.addTestTasks(queueKey, count);

      return {
        success: true,
        message: `Added ${result.tasksAdded} test tasks to queue ${queueKey}`,
        data: {
          queue: queueKey,
          added: result.tasksAdded,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to add test tasks:', error);
      throw new BadRequestError(`Failed to add test tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addCustomTestTasks(req: Request, res: Response) {
    try {
      const { queueKey, count, template } = req.body;

      if (!queueKey) {
        throw new BadRequestError('Queue key is required');
      }

      if (!count || typeof count !== 'number') {
        throw new BadRequestError('Count is required and must be a number');
      }

      if (count <= 0 || count > 100) {
        throw new BadRequestError('Count must be between 1 and 100');
      }

      if (!template || !template.type || !template.title) {
        throw new BadRequestError('Template with type and title is required');
      }

      const request = {
        queueKey,
        count,
        template
      };

      const result = await this.dispatcherQueueService.addCustomTestTasks(request);

      return {
        success: true,
        message: `Added ${result.tasksAdded} custom test tasks to queue ${queueKey}`,
        data: {
          queue: queueKey,
          added: result.tasksAdded,
          template: template,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to add custom test tasks:', error);
      throw new BadRequestError(`Failed to add custom test tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTaskHistory(req: Request, res: Response) {
    try {
      const { limit = '50', offset = '0' } = req.query;
      
      const result = await this.dispatcherQueueService.getTaskHistoryPaginated(
        parseInt(limit as string),
        parseInt(offset as string)
      );

      return {
        success: true,
        data: {
          ...result,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get task history:', error);
      throw new BadRequestError('Failed to retrieve task history');
    }
  }

  async getTaskHistoryById(req: Request, res: Response) {
  const { id } = req.params;
  const history = await this.dispatcherQueueService.getTaskHistoryById(id);
  
  return {
    success: true,
    data: history
  };
}

  // BATCH OPERATIONS
  async deleteMultipleTasks(req: Request, res: Response) {
    try {
      const { taskIds } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new BadRequestError('Task IDs array is required and must not be empty');
      }

      if (taskIds.length > 100) {
        throw new BadRequestError('Cannot delete more than 100 tasks at once');
      }

      const result = await this.dispatcherQueueService.deleteMultipleTasks(taskIds);

      return {
        success: true,
        message: `Batch delete completed: ${result.deletedCount} tasks processed`,
        data: {
          deletedCount: result.deletedCount,
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      this.logger.error('Failed to delete multiple tasks:', error);
      throw new BadRequestError('Failed to delete multiple tasks');
    }
  }

  async retryMultipleTasks(req: Request, res: Response) {
    try {
      const { taskIds } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new BadRequestError('Task IDs array is required and must not be empty');
      }

      if (taskIds.length > 100) {
        throw new BadRequestError('Cannot retry more than 100 tasks at once');
      }

      const result = await this.dispatcherQueueService.retryMultipleTasks(taskIds);

      return {
        success: true,
        message: `Batch retry completed: ${result.retriedCount} tasks processed`,
        data: {
          retriedCount: result.retriedCount,
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      this.logger.error('Failed to retry multiple tasks:', error);
      throw new BadRequestError('Failed to retry multiple tasks');
    }
  }

  // Removed legacy Redis diagnostics endpoints from controller

  async getSystemLoad(req: Request, res: Response) {
    try {
      // Fetch service-calculated load (kept for potential future use)
      await this.dispatcherQueueService.getSystemLoad();

      // Build frontend-compatible payload based on unified queue info
      const queues = await this.dispatcherQueueService.getQueues(true);
      const totalQueues = queues.length;
      const totalTasks = queues.reduce((sum, q) => sum + (q.depth || 0), 0);
      const totalFailedTasks = queues.reduce((sum, q) => sum + (q.failed || 0), 0);
      const knownQueues = queues.filter(q => q.isKnown).length;
      const unknownQueues = totalQueues - knownQueues;
      const discoveredQueues = queues
        .filter(q => !q.isKnown)
        .map(q => ({ key: q.key, taskCount: q.depth }));

      const systemLoad = {
        totalQueues,
        totalTasks,
        totalFailedTasks,
        redisMemory: 'Unknown',
        discoveredQueues,
        knownQueues,
        unknownQueues
      };

      return {
        success: true,
        data: {
          systemLoad,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get system load:', error);
      throw new BadRequestError('Failed to retrieve system load information');
    }
  }

  /**
   * Clear all queues (agnostic - works with both Redis and Database drivers)
   */
  async clearAllQueues(req: Request, res: Response) {
    try {
      const { confirm, doubleConfirm } = req.body;

      if (!confirm || !doubleConfirm) {
        throw new BadRequestError('Both confirm and doubleConfirm are required for this destructive operation');
      }

      if (confirm !== 'CLEAR_ALL_QUEUES' || doubleConfirm !== 'I_UNDERSTAND_THIS_IS_DESTRUCTIVE') {
        throw new BadRequestError('Invalid confirmation tokens. This operation requires explicit confirmation.');
      }

      // Use agnostic queue service (works with both Redis and Database)
      // Clear ALL queues by not providing queueName parameter
      const result = await this.dispatcherQueueService.clearAllQueues(true);
      const clearedCount = result.count ?? 0;

      this.logger.warn(`All queues cleared by user request (${clearedCount} tasks removed)`, {
        driver: process.env.QUEUE_DRIVER || 'database'
      });

      return {
        success: true,
        message: result.message,
        data: {
          // New fields used by updated UI
          success: result.success,
          clearedTasks: clearedCount,
          message: result.message,
          driver: process.env.QUEUE_DRIVER || 'database',
          timestamp: new Date().toISOString(),
          // Compatibility for existing frontend expectations
          cleared: clearedCount,
          failed: 0,
          clearedKeys: []
        }
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      this.logger.error('Failed to clear all queues:', error);
      throw new BadRequestError(`Failed to clear queues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Removed legacy Redis tasks aggregation endpoint

  // UNIFIED SCHEMA/TEMPLATE ENDPOINTS
  async getAllSchemas(req: Request, res: Response) {
    try {
      const { format = 'raw' } = req.query;

      // Validate format parameter
      if (format !== 'raw' && format !== 'ui') {
        throw new BadRequestError('Format must be either "raw" or "ui"');
      }

      this.logger.info(`Getting all schemas with format: ${format}`);
      const result = await this.dispatcherQueueService.getAllPluginSchemas(format as 'raw' | 'ui');

      const response = {
        success: true,
        data: result
      };

      this.logger.info('Sending response to frontend:', {
        format,
        responseSuccess: response.success,
        schemasCount: response.data.schemas?.length || 0
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to get all schemas:', {
        error: error.message,
        stack: error.stack
      });
      throw new BadRequestError('Failed to retrieve plugin schemas');
    }
  }

  async getSchema(req: Request, res: Response) {
    try {
      const { schemaType } = req.params;

      if (!schemaType) {
        throw new BadRequestError('Schema type is required');
      }

      const schema = await this.dispatcherQueueService.getPluginSchema(schemaType);

      return {
        success: true,
        data: schema
      };
    } catch (error) {
      this.logger.error(`Failed to get schema for type ${req.params.schemaType}:`, error);
      throw new BadRequestError(`Failed to retrieve schema: ${error.message}`);
    }
  }


}
