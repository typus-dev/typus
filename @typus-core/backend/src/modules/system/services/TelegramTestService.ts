import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { BadRequestError } from '@/core/base/BaseError.js';
import { ConfigService } from './ConfigService';
import { inject } from 'tsyringe';

interface TelegramTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Service for testing Telegram Bot integration
 */
@Service()
export class TelegramTestService extends BaseService {
  private readonly telegramApiUrl = 'https://api.telegram.org';

  constructor(
    @inject(ConfigService) private configService: ConfigService
  ) {
    super();
  }

  /**
   * Test Telegram Bot connection and send test message
   *
   * @returns Test result with success status and details
   */
  async testConnection(): Promise<TelegramTestResult> {
    try {
      // Get config from database with fallback to .env
      // Use ?? (nullish coalescing) to only fallback if undefined/null, not empty string
      const botTokenFromDb = await this.configService.get('messaging.telegram.bot_token');
      const botToken = botTokenFromDb ?? process.env.TELEGRAM_BOT_TOKEN;

      const adminChatIdFromDb = await this.configService.get('messaging.telegram.admin_chat_id');
      const adminChatId = adminChatIdFromDb ?? process.env.TELEGRAM_ADMIN_CHAT_ID;

      this.logger.debug('[TelegramTestService] Config values:', {
        botTokenFromDb: botTokenFromDb ? '***' : botTokenFromDb,
        botTokenSource: botTokenFromDb !== undefined && botTokenFromDb !== null ? 'database' : 'env',
        adminChatIdFromDb,
        adminChatIdSource: adminChatIdFromDb !== undefined && adminChatIdFromDb !== null ? 'database' : 'env',
        finalAdminChatId: adminChatId
      });

      // Check if bot token is configured
      if (!botToken) {
        return {
          success: false,
          message: 'Telegram bot token not configured. Please set messaging.telegram.bot_token or TELEGRAM_BOT_TOKEN environment variable.'
        };
      }

      // Validate token format (should be like: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
      const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
      if (!tokenPattern.test(botToken)) {
        return {
          success: false,
          message: 'Invalid Telegram bot token format. Expected format: 123456:ABC-DEF...'
        };
      }

      // Step 1: Validate bot token by calling getMe
      this.logger.info('[TelegramTestService] Validating bot token with getMe...');

      const getMeUrl = `${this.telegramApiUrl}/bot${botToken}/getMe`;
      const getMeResponse = await fetch(getMeUrl);

      if (!getMeResponse.ok) {
        const errorText = await getMeResponse.text();
        this.logger.error('[TelegramTestService] Bot token validation failed:', {
          status: getMeResponse.status,
          error: errorText
        });

        return {
          success: false,
          message: `Invalid bot token: ${getMeResponse.status} ${getMeResponse.statusText}`,
          details: { error: errorText }
        };
      }

      const botInfo = await getMeResponse.json();

      if (!botInfo.ok) {
        return {
          success: false,
          message: 'Bot token validation failed',
          details: botInfo
        };
      }

      this.logger.info('[TelegramTestService] Bot validated successfully:', {
        username: botInfo.result.username,
        firstName: botInfo.result.first_name
      });

      // Step 2: Send test message if chat_id is configured
      if (!adminChatId) {
        return {
          success: true,
          message: `Bot token is valid (${botInfo.result.username}). To send test messages, please configure messaging.telegram.admin_chat_id.`,
          details: {
            bot: botInfo.result
          }
        };
      }

      // Send test message
      this.logger.info('[TelegramTestService] Sending test message to chat:', adminChatId);

      const sendMessageUrl = `${this.telegramApiUrl}/bot${botToken}/sendMessage`;
      const testMessage = `🤖 Telegram Test Message\n\nYour Telegram bot is configured correctly!\n\nBot: @${botInfo.result.username}\nTime: ${new Date().toISOString()}`;

      const sendResponse = await fetch(sendMessageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: testMessage,
          parse_mode: 'HTML'
        })
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        this.logger.error('[TelegramTestService] Failed to send test message:', {
          status: sendResponse.status,
          error: errorText
        });

        return {
          success: false,
          message: `Failed to send test message: ${sendResponse.status} ${sendResponse.statusText}`,
          details: {
            bot: botInfo.result,
            error: errorText,
            hint: 'Make sure the bot has permission to send messages to this chat. Try sending /start to your bot first.'
          }
        };
      }

      const sendResult = await sendResponse.json();

      if (!sendResult.ok) {
        return {
          success: false,
          message: 'Failed to send test message',
          details: {
            bot: botInfo.result,
            error: sendResult
          }
        };
      }

      this.logger.info('[TelegramTestService] Test message sent successfully');

      return {
        success: true,
        message: `✅ Test message sent successfully to chat ${adminChatId}!`,
        details: {
          bot: botInfo.result,
          message: sendResult.result
        }
      };

    } catch (error) {
      this.logger.error('[TelegramTestService] Test failed with exception:', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        message: `Test failed: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }
}
