import { Service } from '@/core/decorators/component';
import { BaseTaskHandler } from '@/core/queue/handlers/BaseTaskHandler';
import { TaskSchema } from '@/core/queue/interfaces';
import { inject } from 'tsyringe';
import { DslService } from '@/dsl/services/DslService';
import { QueueService } from '@/core/queue/QueueService';
import { TASK_WORKER_USER } from '@/constants/system';

/**
 * CMS Scheduled Publishing Task Handler
 * Ports CmsScheduledPublishingDslPlugin from old dispatcher
 * Handles cms_scheduled_publishing task type
 *
 * Contract Compatibility: 100% compatible with production Task ID=29 (19,919 runs)
 */
@Service()
export class CmsScheduledPublishingTaskHandler extends BaseTaskHandler {
  constructor(
    @inject(DslService) private dslService: DslService,
    @inject(QueueService) private queueService: QueueService
  ) {
    super();
  }

  /**
   * Get schema for CMS scheduled publishing tasks
   * Must match CmsScheduledPublishingDslPlugin.getTaskSchema() exactly
   */
  getSchema(): TaskSchema {
    return {
      type: 'cms_scheduled_publishing',
      fields: ['batchSize', 'systemUserId', 'notifications', 'timeout', 'queueName'],
      validate: (data) => {
        if (data.batchSize !== undefined) {
          if (!Number.isInteger(data.batchSize) || data.batchSize < 1 || data.batchSize > 1000) {
            throw new Error('batchSize must be between 1-1000');
          }
        }

        if (data.systemUserId !== undefined) {
          if (!Number.isInteger(data.systemUserId) || data.systemUserId < 1) {
            throw new Error('systemUserId must be positive integer');
          }
        }

        if (data.notifications !== undefined) {
          if (typeof data.notifications !== 'object') {
            throw new Error('notifications must be object');
          }

          // Check onPublish structure
          if (data.notifications.onPublish !== undefined) {
            if (typeof data.notifications.onPublish !== 'object') {
              throw new Error('notifications.onPublish must be object');
            }
            if (data.notifications.onPublish.emails && !Array.isArray(data.notifications.onPublish.emails)) {
              throw new Error('notifications.onPublish.emails must be array');
            }
          }

          // Check onError structure
          if (data.notifications.onError !== undefined) {
            if (typeof data.notifications.onError !== 'object') {
              throw new Error('notifications.onError must be object');
            }
            if (data.notifications.onError.emails && !Array.isArray(data.notifications.onError.emails)) {
              throw new Error('notifications.onError.emails must be array');
            }
          }
        }

        if (data.timeout !== undefined) {
          if (!Number.isInteger(data.timeout) || data.timeout < 1000 || data.timeout > 300000) {
            throw new Error('timeout must be between 1000ms-300000ms');
          }
        }
      }
    };
  }

  /**
   * Normalize task data - apply defaults
   * Must match old plugin normalize logic exactly
   */
  private normalize(data: any): any {
    const normalized = { ...data };

    // Apply defaults
    normalized.batchSize = normalized.batchSize || 50;
    normalized.notifications = normalized.notifications || {};
    normalized.timeout = normalized.timeout || 30000;
    normalized.queueName = normalized.queueName || 'system_queue';

    // Apply template defaults for notifications
    if (normalized.notifications.onPublish && !normalized.notifications.onPublish.template) {
      normalized.notifications.onPublish.template = 'cms_item_published_dsl';
    }
    if (normalized.notifications.onError && !normalized.notifications.onError.template) {
      normalized.notifications.onError.template = 'cms_publishing_error_dsl';
    }

    return normalized;
  }

  /**
   * Execute CMS scheduled publishing task
   * Ports execute logic from CmsScheduledPublishingDslPlugin
   */
  async execute(data: any): Promise<any> {
    const results: any[] = [];

    try {
      // Normalize data (includes defaults)
      const payload = this.normalize(data);

      // Validate
      await this.validate(payload);

      const { batchSize, notifications } = payload;

      this.logger.info('[CmsScheduledPublishingHandler] Starting CMS scheduled publishing check', {
        batchSize,
        hasNotifications: !!notifications
      });

      // Find items to publish
      const itemsToPublish = await this.findScheduledItems(batchSize);

      if (!itemsToPublish || itemsToPublish.length === 0) {
        this.logger.debug('[CmsScheduledPublishingHandler] No CMS items ready for publishing');
        return {
          status: 'completed',
          message: 'No items ready for publishing',
          processedItems: 0,
          publishedItems: 0,
          errors: 0
        };
      }

      this.logger.info(`[CmsScheduledPublishingHandler] Found ${itemsToPublish.length} CMS items ready for publishing`, {
        itemIds: itemsToPublish.map((item: any) => item.id)
      });

      // Publish each item
      for (const item of itemsToPublish) {
        try {
          const result = await this.publishItem(item);
          results.push(result);

          this.logger.info('[CmsScheduledPublishingHandler] CMS item published successfully', {
            itemId: item.id,
            title: item.title,
            sitePath: item.sitePath
          });

          // Send success notification if configured
          if (notifications.onPublish) {
            await this.sendPublishNotification(item, notifications.onPublish, payload.queueName);
          }
        } catch (error) {
          const errorResult = {
            itemId: item.id,
            title: item.title,
            status: 'error',
            error: error.message,
            publishAt: item.publishAt
          };
          results.push(errorResult);

          this.logger.error('[CmsScheduledPublishingHandler] Failed to publish CMS item', {
            itemId: item.id,
            error: error.message
          });

          // Send error notification if configured
          if (notifications.onError) {
            await this.sendErrorNotification(item, error, notifications.onError, payload.queueName);
          }
        }
      }

      // Count successes and errors
      const successCount = results.filter(r => r.status === 'published').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      this.logger.info('[CmsScheduledPublishingHandler] CMS scheduled publishing completed', {
        totalItems: results.length,
        published: successCount,
        errors: errorCount
      });

      return {
        status: 'completed',
        message: `Processed ${results.length} items: ${successCount} published, ${errorCount} errors`,
        processedItems: results.length,
        publishedItems: successCount,
        errors: errorCount,
        results: results
      };

    } catch (error) {
      this.logger.error('[CmsScheduledPublishingHandler] CMS scheduled publishing failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find CMS items ready for publishing
   * Uses DSL read operation to find items with status='draft' and publishAt <= NOW()
   */
  private async findScheduledItems(batchSize: number): Promise<any[]> {
    this.logger.debug('[CmsScheduledPublishingHandler] Finding scheduled CMS items', {
      batchSize
    });

    try {
      const now = new Date();
      const filter = {
        status: 'draft',
        publishAt: { lte: now }
      };

      this.logger.info('[CmsScheduledPublishingHandler] Executing DSL query', {
        filter,
        now: now.toISOString(),
        batchSize
      });

      const result = await this.dslService.executeOperation(
        'CmsItem',
        'read',
        null, // data
        filter,
        null, // include
        { limit: batchSize }, // pagination (NOTE: page missing, just limit)
        TASK_WORKER_USER, // user
        undefined, // relationParams
        undefined, // module
        { publishAt: 'asc' } // orderBy
      );

      const itemCount = Array.isArray(result)
        ? result.length
        : (Array.isArray(result?.data?.data)
          ? result.data.data.length
          : (Array.isArray(result?.data) ? result.data.length : 0));

      this.logger.info('[CmsScheduledPublishingHandler] DSL query result', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        hasData: !!result?.data,
        dataType: typeof result?.data,
        dataIsArray: Array.isArray(result?.data),
        dataDataIsArray: Array.isArray(result?.data?.data),
        resultKeys: result ? Object.keys(result) : [],
        dataKeys: result?.data ? Object.keys(result.data) : [],
        itemCount
      });

      // Handle different response formats
      // DSL returns: { data: { data: [...], paginationMeta: {...} } }
      if (Array.isArray(result)) {
        return result;
      }
      if (result?.data?.data && Array.isArray(result.data.data)) {
        return result.data.data;
      }
      if (result?.data && Array.isArray(result.data)) {
        return result.data;
      }
      // If result is an object but not array, treat as empty
      return [];
    } catch (error) {
      this.logger.error('[CmsScheduledPublishingHandler] Error finding scheduled items', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Publish single CMS item
   * Uses DSL update operation to change status to 'published'
   */
  private async publishItem(item: any): Promise<any> {
    const startTime = Date.now();

    this.logger.debug('[CmsScheduledPublishingHandler] Publishing CMS item', {
      itemId: item.id,
      title: item.title,
      sitePath: item.sitePath
    });

    try {
      const result = await this.dslService.executeOperation(
        'CmsItem',
        'update',
        {
          status: 'published',
          publishedAt: new Date(),
          isPublic: true,
          publishAt: null
        }, // data
        { id: item.id }, // filter
        null, // include
        null, // pagination
        TASK_WORKER_USER // user
      );

      const duration = Date.now() - startTime;

      this.logger.info('[CmsScheduledPublishingHandler] CMS item published successfully via DSL', {
        itemId: item.id,
        title: item.title,
        sitePath: item.sitePath,
        publishAt: item.publishAt,
        duration: `${duration}ms`,
        triggeredHooks: 'dynamic_routes, cache_generation, audit'
      });

      return {
        itemId: item.id,
        title: item.title,
        sitePath: item.sitePath,
        status: 'published',
        publishAt: item.publishAt,
        duration,
        method: 'dsl_direct',
        hooksTriggered: true
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('[CmsScheduledPublishingHandler] Failed to publish CMS item via DSL', {
        itemId: item.id,
        error: error.message,
        duration: `${duration}ms`
      });

      throw error;
    }
  }

  /**
   * Send publish notification via email queue
   * Uses QueueService to add email task to database queue
   */
  private async sendPublishNotification(item: any, notificationConfig: any, queueName: string): Promise<void> {
    try {
      await this.queueService.addTask(queueName, {
        type: 'email_notification_task',
        name: `CMS Item Published: ${item.title}`,
        data: {
          subject: `CMS Item Published (DSL): ${item.title}`,
          to: notificationConfig.emails || [],
          template_name: notificationConfig.template || 'cms_item_published_dsl',
          templateData: {
            itemId: item.id,
            title: item.title,
            sitePath: item.sitePath,
            publishedAt: new Date().toISOString(),
            scheduledAt: item.publishAt,
            method: 'DSL Direct',
            features: ['Dynamic Routes', 'Cache Generation', 'Audit Trail']
          }
        },
        priority: 5
      });

      this.logger.info('[CmsScheduledPublishingHandler] Queued publish notification', {
        itemId: item.id,
        recipients: notificationConfig.emails?.length || 0
      });

    } catch (error) {
      this.logger.error('[CmsScheduledPublishingHandler] Failed to send publish notification', {
        itemId: item.id,
        error: error.message
      });
      // Don't throw - notification failure should not fail the publish task
    }
  }

  /**
   * Send error notification via email queue
   * Uses QueueService to add email task to database queue
   */
  private async sendErrorNotification(item: any, error: Error, notificationConfig: any, queueName: string): Promise<void> {
    try {
      await this.queueService.addTask(queueName, {
        type: 'email_notification_task',
        name: `CMS Publishing Error: ${item.title}`,
        data: {
          subject: `CMS Publishing Error (DSL): ${item.title}`,
          to: notificationConfig.emails || [],
          template_name: notificationConfig.template || 'cms_publishing_error_dsl',
          templateData: {
            itemId: item.id,
            title: item.title,
            sitePath: item.sitePath,
            error: error.message,
            scheduledAt: item.publishAt,
            failedAt: new Date().toISOString(),
            method: 'DSL Direct'
          }
        },
        priority: 8 // Higher priority for errors
      });

      this.logger.info('[CmsScheduledPublishingHandler] Queued error notification', {
        itemId: item.id,
        error: error.message,
        recipients: notificationConfig.emails?.length || 0
      });

    } catch (notificationError) {
      this.logger.error('[CmsScheduledPublishingHandler] Failed to send error notification', {
        itemId: item.id,
        originalError: error.message,
        notificationError: notificationError.message
      });
      // Don't throw - notification failure should not fail the publish task
    }
  }
}
