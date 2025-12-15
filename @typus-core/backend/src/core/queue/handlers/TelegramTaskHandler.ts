import { Service } from '@/core/decorators/component';
import { BaseTaskHandler } from './BaseTaskHandler';
import { TaskSchema } from '../interfaces';
import { ConfigService } from '@/modules/system/services/ConfigService';
import { inject } from 'tsyringe';

/**
 * Telegram notification task handler for STARTER profile
 * Matches TelegramNotificationPlugin from Dispatcher
 * Handles telegram_notification_task type
 *
 * Configuration loaded from database (messaging.telegram.*) with fallback to .env
 */
@Service()
export class TelegramTaskHandler extends BaseTaskHandler {
  constructor(
    @inject(ConfigService) private configService: ConfigService
  ) {
    super();
  }

  /**
   * Get schema for Telegram tasks
   * Must match TelegramNotificationPlugin.getTaskSchema()
   */
  getSchema(): TaskSchema {
    return {
      type: 'telegram_notification_task',
      fields: ['chat_id', 'message', 'parse_mode', 'scheduled_at'],
      validate: (data) => {
        if (!data.chat_id) {
          throw new Error('chat_id is required');
        }

        if (!data.message || typeof data.message !== 'string') {
          throw new Error('message is required and must be a string');
        }

        if (data.message.length > 4096) {
          throw new Error('message exceeds 4096 character limit');
        }

        if (data.scheduled_at && isNaN(new Date(data.scheduled_at).getTime())) {
          throw new Error('scheduled_at must be a valid date');
        }

        // Note: Telegram bot token check moved to execute() for async ConfigService access
        // If no token configured, task will log warning and skip execution
      }
    };
  }

  /**
   * Normalize data - apply template and convert chat_id to array
   */
  private normalize(data: any): any {
    // Apply template if template_data provided
    if (data.template && data.template_data && !data.message) {
      data.message = data.template;
      for (const [key, value] of Object.entries(data.template_data)) {
        data.message = data.message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      delete data.template;
      delete data.template_data;
    }

    // Convert chat_id to array if comma-separated
    if (data.chat_id && typeof data.chat_id === 'string') {
      if (data.chat_id.includes(',')) {
        data.chat_id = data.chat_id.split(',').map((id: string) => id.trim()).filter((id: string) => id);
      } else {
        data.chat_id = [data.chat_id.trim()];
      }
    }

    data.parse_mode = data.parse_mode || 'HTML';

    // Convert scheduled_at to ISO string if needed
    if (data.scheduled_at && typeof data.scheduled_at === 'string') {
      data.scheduled_at = new Date(data.scheduled_at).toISOString();
    }

    return data;
  }

  /**
   * Execute Telegram notification task
   * Simplified version for STARTER profile
   *
   * Configuration priority: Database → .env → defaults
   * Graceful degradation: If bot token not configured, skip execution with warning
   *
   * @param data - Telegram task data
   * @returns Result object with success status
   */
  async execute(data: any): Promise<any> {
    try {
      // Get config from database with fallback to .env
      // Use ?? (nullish coalescing) to only fallback if undefined/null, not empty string
      const botTokenFromDb = await this.configService.get('messaging.telegram.bot_token');
      const botToken = botTokenFromDb ?? process.env.TELEGRAM_BOT_TOKEN;

      const adminChatIdFromDb = await this.configService.get('messaging.telegram.admin_chat_id');
      const adminChatId = adminChatIdFromDb ?? process.env.TELEGRAM_ADMIN_CHAT_ID;

      // Graceful degradation - if no bot token, skip execution
      if (!botToken) {
        this.logger.warn('[TelegramTaskHandler] Telegram bot token not configured - skipping notification', {
          message: data.message?.substring(0, 50) || 'no message'
        });
        return {
          status: 'skipped',
          message: 'Telegram bot token not configured',
          reason: 'missing_configuration',
          skippedAt: new Date().toISOString()
        };
      }

      // Normalize data
      const payload = this.normalize(data);

      // Validate
      await this.validate(payload);

      // Use admin chat ID as fallback if chat_id not provided
      if (!payload.chat_id && adminChatId) {
        payload.chat_id = adminChatId;
        this.logger.info('[TelegramTaskHandler] Using admin chat ID from config', { adminChatId });
      }

      const chatIds = Array.isArray(payload.chat_id) ? payload.chat_id : [payload.chat_id];

      this.logger.info('[TelegramTaskHandler] Sending Telegram notification', {
        chatIds: chatIds.join(', '),
        messageLength: payload.message?.length || 0,
        parseMode: payload.parse_mode,
        configSource: botToken === process.env.TELEGRAM_BOT_TOKEN ? 'env' : 'database'
      });

      // TODO: Implement actual Telegram Bot API integration
      // For now, just log and simulate success
      const results = chatIds.map((chatId: string) => ({
        chat_id: chatId,
        status: 'simulated',
        message: payload.message.substring(0, 50) + '...'
      }));

      this.logger.info('[TelegramTaskHandler] Telegram notification sent successfully (simulated)', {
        recipientCount: chatIds.length,
        chatIds: chatIds.join(', ')
      });

      return {
        status: 'success',
        message: `Sent ${chatIds.length} Telegram messages (simulated)`,
        sent_count: chatIds.length,
        recipients: results,
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('[TelegramTaskHandler] Failed to send Telegram notification', {
        error: error.message,
        chat_id: data.chat_id
      });
      throw error;
    }
  }
}
