import { BaseModule } from '@/core/base/BaseModule.js';
import { DispatcherController } from './controllers/DispatcherController';
import { QueueController } from './controllers/QueueController';
import { DispatcherService } from './services/DispatcherService';
import { QueueManagerService } from './services/QueueManagerService';
import { DispatcherQueueService } from './services/DispatcherQueueService';
import { RedisService } from '@/core/redis/RedisService';
import { QueueService } from '@/core/queue/QueueService';
import { container } from 'tsyringe';

export class DispatcherModule extends BaseModule<DispatcherController, DispatcherService> {
  private static instance: DispatcherModule;
  private queueController: QueueController;
  private queueManagerService: QueueManagerService;

  constructor() {
    const basePath = 'dispatcher';
    super(basePath, DispatcherController, DispatcherService);
  }

  static getInstance(): DispatcherModule {
    return !DispatcherModule.instance ?
      DispatcherModule.instance = new DispatcherModule() :
      DispatcherModule.instance;
  }

  protected initialize(): void {
    this.logger.info(`[${this.moduleName}] module initializing...`);

    // Resolve services from DI container after BaseModule initialization
    // This is ACCEPTABLE pattern for modules with complex initialization
    this.queueManagerService = container.resolve(QueueManagerService);
    this.queueController = container.resolve(QueueController);

    // Validate that all required services were resolved successfully
    if (!this.queueManagerService) {
      this.logger.error('Failed to resolve QueueManagerService from DI container');
      throw new Error('QueueManagerService is required but could not be resolved from DI container');
    }

    if (!this.queueController) {
      this.logger.error('Failed to resolve QueueController from DI container');
      throw new Error('QueueController is required but could not be resolved from DI container');
    }

    // Initialize queue routes after services are ready
    this.initializeQueueRoutes();

    this.logger.info(`[${this.moduleName}] module initialized`);
  }

  private initializeQueueRoutes(): void {
    // Queue management routes
    // GET /api/dispatcher/queues - Get all queues info
    this.router.get('/queues', [
      this.auth()
    ], this.queueController.getAllQueues.bind(this.queueController));

    // GET /api/dispatcher/queues/health - Get queue health status
    this.router.get('/queues/health', [
      this.auth()
    ], this.queueController.getQueueHealth.bind(this.queueController));

    // GET /api/dispatcher/queues/all/tasks - Get tasks from all queues
    this.router.get('/queues/all/tasks', [
      this.auth()
    ], this.queueController.getAllTasks.bind(this.queueController));

    // GET /api/dispatcher/queues/:queueKey/tasks - Get tasks from specific queue
    this.router.get('/queues/:queueKey/tasks', [
      this.auth()
    ], this.queueController.getQueueTasks.bind(this.queueController));

    // GET /api/dispatcher/queues/:queueKey/stats - Get stats for specific queue
    this.router.get('/queues/:queueKey/stats', [
      this.auth()
    ], this.queueController.getQueueStats.bind(this.queueController));

    // POST /api/dispatcher/queues/:queueKey/pause - Pause queue
    this.router.post('/queues/:queueKey/pause', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.pauseQueue.bind(this.queueController));

    // POST /api/dispatcher/queues/:queueKey/resume - Resume queue
    this.router.post('/queues/:queueKey/resume', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.resumeQueue.bind(this.queueController));

    // DELETE /api/dispatcher/queues/:queueKey/clear - Clear queue
    this.router.delete('/queues/:queueKey/clear', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.clearQueue.bind(this.queueController));

    // POST /api/dispatcher/queues/:queueKey/test-tasks - Add test tasks to queue (legacy)
    this.router.post('/queues/:queueKey/test-tasks', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.addTestTasks.bind(this.queueController));

    // POST /api/dispatcher/queues/custom-test-tasks - Add custom test tasks with template
    this.router.post('/queues/custom-test-tasks', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.addCustomTestTasks.bind(this.queueController));



    // GET /api/dispatcher/queues/task-history - Get task execution history
    this.router.get('/queues/task-history', [
      this.auth()
    ], this.queueController.getTaskHistory.bind(this.queueController));


    this.router.get('/queues/task-history/:id', [
      this.auth()
    ], this.queueController.getTaskHistoryById.bind(this.queueController));


    // Removed legacy Redis scanning and all-redis endpoints from main API

    // GET /api/dispatcher/queues/system-load - Get system load statistics
    this.router.get('/queues/system-load', [
      this.auth()
    ], this.queueController.getSystemLoad.bind(this.queueController));

    // Removed legacy all-redis/tasks endpoint

    // DELETE /api/dispatcher/queues/clear-all - Clear all queues (DANGEROUS - agnostic: Redis/Database)
    this.router.delete('/queues/clear-all', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.clearAllQueues.bind(this.queueController));

    // BATCH TASK OPERATIONS
    // DELETE /api/dispatcher/queues/tasks/batch - Delete multiple tasks
    this.router.delete('/queues/tasks/batch', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.deleteMultipleTasks.bind(this.queueController));

    // POST /api/dispatcher/queues/tasks/batch/retry - Retry multiple tasks
    this.router.post('/queues/tasks/batch/retry', [
      this.auth(),
      this.roles(['admin'])
    ], this.queueController.retryMultipleTasks.bind(this.queueController));

    // UNIFIED SCHEMA/TEMPLATE ROUTES
    // NOTE: Schemas and templates are now unified into a single endpoint
    // Use ?format=raw for original schemas, ?format=ui for formatted templates
    // GET /api/dispatcher/schemas - Get all plugin schemas with optional formatting
    // Query parameters: ?format=raw|ui (default: raw)
    this.router.get('/schemas', [
      this.auth()
    ], this.queueController.getAllSchemas.bind(this.queueController));

    // GET /api/dispatcher/schemas/:schemaType - Get specific plugin schema
    this.router.get('/schemas/:schemaType', [
      this.auth()
    ], this.queueController.getSchema.bind(this.queueController));
  }

  protected initializeRoutes(): void {
    this.logger.info(`[${this.moduleName}] routes initializing...`);

    // POST /api/dispatcher/execute/:id - Execute task
    this.router.post('/execute/:id', [
      this.auth(),
      this.roles(['admin'])
    ], this.controller.executeTask.bind(this.controller));

    // GET /api/dispatcher/queue-status - Get queue status
    this.router.get('/queue-status', [
      this.auth()
    ], this.controller.getQueueStatus.bind(this.controller));

    // GET /api/dispatcher/stats - Get statistics
    this.router.get('/stats', [
      this.auth()
    ], this.controller.getStats.bind(this.controller));

    // GET /api/dispatcher/executions - Get recent executions
    this.router.get('/executions', [
      this.auth()
    ], this.controller.getRecentExecutions.bind(this.controller));

    // POST /api/dispatcher/test - Test dispatcher
    this.router.post('/test', [
      this.auth(),
      this.roles(['admin'])
    ], this.controller.testDispatcher.bind(this.controller));

    // POST /api/dispatcher/schedule/:id - Schedule task
    this.router.post('/schedule/:id', [
      this.auth(),
      this.roles(['admin'])
    ], this.controller.scheduleTask.bind(this.controller));

    // GET /api/dispatcher/tasks/schedule/:scheduleType - Get tasks by schedule type
    this.router.get('/tasks/schedule/:scheduleType', [
      this.auth()
    ], this.controller.getTasksByScheduleType.bind(this.controller));

    this.logger.info(`[${this.moduleName}] routes initialized`);
  }
}
