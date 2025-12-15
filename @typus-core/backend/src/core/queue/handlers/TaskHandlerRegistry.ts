import { container } from 'tsyringe';
import { ITaskExecutor } from '../interfaces';
import { EmailTaskHandler } from './EmailTaskHandler';
import { CacheTaskHandler } from './CacheTaskHandler';
import { TelegramTaskHandler } from './TelegramTaskHandler';
// FluxTaskHandler and FluxKontextTaskHandler moved to plugins/image-lab/workers/handlers/
// import { FluxTaskHandler } from './FluxTaskHandler';
// import { FluxKontextTaskHandler } from './FluxKontextTaskHandler';
// SocialMediaTaskHandler moved to plugins/social-media/workers/handlers/
import { CmsScheduledPublishingTaskHandler } from '@/modules/cms/workers/handlers/CmsScheduledPublishingTaskHandler';
import { DatabaseBackupHandler } from './DatabaseBackupHandler';
import { SystemGarbageCollectionHandler } from './SystemGarbageCollectionHandler';
// QuotaResetTaskHandler and WorkflowTaskHandler moved to plugins - will be registered by plugin modules
// import { QuotaResetTaskHandler } from '../../../../../../plugins/payments/backend/tasks/QuotaResetTaskHandler';
// import { WorkflowTaskHandler } from '../../../../../../plugins/workflow/backend/workers/handlers/WorkflowTaskHandler';

/**
 * Task handler registry
 * Manages all available task handlers for STARTER profile
 */
export class TaskHandlerRegistry {
  private static handlers: Map<string, ITaskExecutor> = new Map();
  private static initialized: boolean = false;
  private static initializationPromise?: Promise<void>;
  private static isInitializing: boolean = false;

  /**
   * Initialize registry with all available handlers
   * Uses atomic initialization to prevent race conditions
   */
  static async initialize(): Promise<void> {
    // Already initialized - return immediately
    if (this.initialized) {
      console.log('[TaskHandlerRegistry] Already initialized');
      return;
    }

    // Currently initializing - wait for completion
    if (this.isInitializing && this.initializationPromise) {
      console.log('[TaskHandlerRegistry] Initialization in progress, waiting...');
      return this.initializationPromise;
    }

    // Start initialization
    this.isInitializing = true;
    this.initializationPromise = (async () => {
      try {
        console.log('[TaskHandlerRegistry] Initializing task handlers...');

      // Register email handler
      const emailHandler = container.resolve(EmailTaskHandler);
      TaskHandlerRegistry.register(emailHandler);

      // Register cache handler
      const cacheHandler = container.resolve(CacheTaskHandler);
      TaskHandlerRegistry.register(cacheHandler);

      // Register Telegram handler
      const telegramHandler = container.resolve(TelegramTaskHandler);
      TaskHandlerRegistry.register(telegramHandler);

      // Flux handlers moved to plugins/image-lab - will be registered by plugin workers (Step 003)
      // const fluxHandler = container.resolve(FluxTaskHandler);
      // TaskHandlerRegistry.register(fluxHandler);
      // const fluxKontextHandler = container.resolve(FluxKontextTaskHandler);
      // TaskHandlerRegistry.register(fluxKontextHandler);

      // SocialMediaTaskHandler moved to plugins/social-media/workers/handlers/
      // Will be registered by the social-media plugin module

      // Register CMS scheduled publishing handler (CMS is now a core module)
      const cmsHandler = container.resolve(CmsScheduledPublishingTaskHandler);
      TaskHandlerRegistry.register(cmsHandler);

      // Register database backup handler
      const databaseBackupHandler = container.resolve(DatabaseBackupHandler);
      TaskHandlerRegistry.register(databaseBackupHandler);

      // ProcessNginxLogsHandler and RotateNginxLogsHandler moved to plugins/web-analytics
      // They will be registered by the web-analytics plugin module

      // Register system garbage collection handler
      const systemGarbageCollectionHandler = container.resolve(SystemGarbageCollectionHandler);
      TaskHandlerRegistry.register(systemGarbageCollectionHandler);

      // QuotaResetTaskHandler and WorkflowTaskHandler moved to plugins
      // They will be registered by the plugin modules when loaded
      // const quotaResetHandler = container.resolve(QuotaResetTaskHandler);
      // TaskHandlerRegistry.register(quotaResetHandler);
      // const workflowHandler = container.resolve(WorkflowTaskHandler);
      // TaskHandlerRegistry.register(workflowHandler);

        TaskHandlerRegistry.initialized = true;

        console.log('[TaskHandlerRegistry] Initialized with handlers:',
          Array.from(TaskHandlerRegistry.handlers.keys()));
      } catch (error) {
        console.error('[TaskHandlerRegistry] Failed to initialize:', error);
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Register a task handler
   *
   * @param handler - Task handler implementing ITaskExecutor
   * @throws Error if handler type already registered (prevents duplicate registration)
   */
  static register(handler: ITaskExecutor): void {
    const schema = handler.getSchema();

    // ✅ Duplicate protection: Prevent overwriting existing handlers
    if (this.handlers.has(schema.type)) {
      const existing = this.handlers.get(schema.type)!;
      throw new Error(
        `[TaskHandlerRegistry] Handler type '${schema.type}' already registered by ${existing.constructor.name}. ` +
        `Cannot register ${handler.constructor.name}`
      );
    }

    TaskHandlerRegistry.handlers.set(schema.type, handler);
    console.log(`[TaskHandlerRegistry] Registered handler for type: ${schema.type}`);
  }

  /**
   * Get handler for task type
   *
   * @param taskType - Task type (e.g., 'email_notification_task')
   * @returns Task handler instance
   * @throws Error if handler not found
   */
  static getHandler(taskType: string): ITaskExecutor {
    if (!TaskHandlerRegistry.initialized) {
      TaskHandlerRegistry.initialize();
    }

    const handler = TaskHandlerRegistry.handlers.get(taskType);

    if (!handler) {
      const availableTypes = Array.from(TaskHandlerRegistry.handlers.keys()).join(', ');
      throw new Error(
        `No handler registered for task type: ${taskType}. ` +
        `Available types: ${availableTypes}`
      );
    }

    return handler;
  }

  /**
   * Check if handler exists for task type
   *
   * @param taskType - Task type to check
   * @returns True if handler exists
   */
  static hasHandler(taskType: string): boolean {
    if (!TaskHandlerRegistry.initialized) {
      TaskHandlerRegistry.initialize();
    }

    return TaskHandlerRegistry.handlers.has(taskType);
  }

  /**
   * Get all registered task types
   *
   * @returns Array of task type strings
   */
  static getAllTaskTypes(): string[] {
    if (!TaskHandlerRegistry.initialized) {
      TaskHandlerRegistry.initialize();
    }

    return Array.from(TaskHandlerRegistry.handlers.keys());
  }

  /**
   * Reset registry (mainly for testing)
   */
  static reset(): void {
    TaskHandlerRegistry.handlers.clear();
    TaskHandlerRegistry.initialized = false;
    console.log('[TaskHandlerRegistry] Registry reset');
  }
}
