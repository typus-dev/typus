import { Request, Response } from 'express';
import { inject } from 'tsyringe';
import { BaseController } from '@/core/base/BaseController.js';
import { Controller } from '@/core/decorators/component.js';
import { ConfigService } from '../services/ConfigService.js';
import { TelegramTestService } from '../services/TelegramTestService.js';
import { EmailProviderFactory } from '@/modules/email/providers/EmailProviderFactory.js';

/**
 * ConfigController - Public access to system configuration
 */
@Controller()
export class ConfigController extends BaseController {
  constructor(
    @inject(ConfigService) private configService: ConfigService,
    @inject(TelegramTestService) private telegramTestService: TelegramTestService,
    @inject(EmailProviderFactory) private emailProviderFactory: EmailProviderFactory
  ) {
    super();
  }

  /**
   * Get configuration values based on authentication status
   *
   * - Anonymous users: get only public configs from config_public table
   * - Authenticated users: get merged public + system configs
   * - Supports ?category=<name> query parameter to filter configs by category
   *
   * NEVER returns CRITICAL values (DATABASE_URL, JWT_SECRET, etc.)
   */
  async getPublicConfig(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const isAuthenticated = req.user && req.user.id;

      // If category is specified, return configs array for that category
      if (category) {
        this.logger.debug(`[ConfigController] Fetching configs for category: ${category}, authenticated: ${isAuthenticated}`);

        if (isAuthenticated) {
          // Authenticated user: can access SystemConfig (private configs)
          const configs = await this.configService.getConfigsByCategory(category);
          return this.success(res, { configs });
        } else {
          // Anonymous user: only access ConfigPublic
          const configs = await this.configService.getPublicConfigsByCategory(category);
          return this.success(res, { configs });
        }
      }

      // Otherwise, return all configs as flat object (original behavior)
      let config: Record<string, any>;

      if (isAuthenticated) {
        // Authenticated user: get all configs (public + system)
        this.logger.debug('[ConfigController] Authenticated user - fetching all configs');
        config = await this.configService.getAllConfigs(req.user.id, req.user.ability);
      } else {
        // Anonymous user: get only public configs
        this.logger.debug('[ConfigController] Anonymous user - fetching public configs only');
        config = await this.configService.getPublicConfigs();
      }

      this.success(res, { config });
    } catch (error) {
      this.logger.error('[ConfigController] Error fetching config:', error);
      this.error(res, 'Failed to fetch configuration', 500);
    }
  }

  /**
   * Get specific config value by key (must be public)
   */
  async getConfigByKey(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;

      // Security check: only allow public keys
      const allowedKeys = [
        'site.name',
        'site.tagline',
        'site.description',
        'site.language',
        'site.timezone'
      ];

      if (!allowedKeys.includes(key)) {
        return this.error(res, 'Access to this config key is not allowed', 403);
      }

      const value = await this.configService.get(key);

      if (value === undefined) {
        return this.error(res, 'Config not found', 404);
      }

      this.success(res, { key, value });
    } catch (error) {
      this.logger.error(`[ConfigController] Error fetching config ${req.params.key}:`, error);
      this.error(res, 'Failed to fetch configuration', 500);
    }
  }

  /**
   * Test Telegram Bot connection
   * Validates bot token and sends test message if chat_id is configured
   */
  async testTelegramConnection(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('[ConfigController] Testing Telegram connection...', {
        userId: req.user?.id || 'anonymous'
      });

      const result = await this.telegramTestService.testConnection();

      if (result.success) {
        this.success(res, result);
      } else {
        this.error(res, result.message, 400, result.details);
      }
    } catch (error) {
      this.logger.error('[ConfigController] Error testing Telegram:', error);
      this.error(res, 'Failed to test Telegram connection', 500);
    }
  }

  /**
   * Test Email configuration
   * Sends a test email to verify email provider settings
   */
  async testEmailConnection(req: Request, res: Response): Promise<void> {
    try {
      const { recipient, config } = req.body;

      this.logger.info('[ConfigController] Testing email configuration...', {
        recipient,
        userId: req.user?.id || 'anonymous',
        usingFormConfig: !!config
      });

      // Validate recipient
      if (!recipient || !recipient.includes('@')) {
        return this.error(res, 'Invalid email address', 400);
      }

      // Get default provider (uses database SMTP credentials)
      const provider = await this.emailProviderFactory.getDefaultProvider();

      // Get email settings - prefer form values (config) over database
      const fromAddress = config?.['email.from_address']
        || await this.configService.get('email.from_address')
        || process.env.EMAIL_FROM
        || 'noreply@example.com';

      const fromName = config?.['email.from_name']
        || await this.configService.get('email.from_name')
        || process.env.EMAIL_FROM_NAME
        || 'System';

      const replyTo = config?.['email.reply_to']
        || await this.configService.get('email.reply_to');

      if (!fromAddress || fromAddress === 'noreply@example.com') {
        return this.error(res, 'Email from address not configured. Please configure email settings first.', 400);
      }

      // Send test email
      this.logger.info('[ConfigController] Sending test email...', {
        provider: provider.getName(),
        from: fromAddress,
        fromName,
        replyTo: replyTo || '(none)',
        to: recipient
      });

      const mailOptions: any = {
        to: recipient,
        from: `${fromName} <${fromAddress}>`,
        subject: 'Test Email from Your Site',
        html: `
          <h1>Email Configuration Test</h1>
          <p>This is a test email from your site.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <hr>
          <p><small>Provider: ${provider.getName()}</small></p>
          <p><small>From: ${fromAddress}</small></p>
          ${replyTo ? `<p><small>Reply-To: ${replyTo}</small></p>` : ''}
        `,
        text: `
Email Configuration Test

This is a test email from your site.
If you received this, your email configuration is working correctly!

Provider: ${provider.getName()}
From: ${fromAddress}
${replyTo ? `Reply-To: ${replyTo}` : ''}
        `
      };

      // Add reply-to if configured
      if (replyTo) {
        mailOptions.replyTo = replyTo;
      }

      const result = await provider.sendMail(mailOptions);

      if (result) {
        this.success(res, {
          success: true,
          message: 'Test email sent successfully',
          recipient,
          provider: provider.getName(),
          from: fromAddress
        });
      } else {
        this.error(res, 'Failed to send test email', 500);
      }
    } catch (error: any) {
      this.logger.error('[ConfigController] Error testing email:', error);
      this.error(res, `Failed to send test email: ${error.message}`, 500);
    }
  }
}
