/**
 * Notify Adapter for SML
 *
 * Registers notification operations under bridge.notify.*
 */

import { SML } from '@typus-core/shared/sml';
import { container } from 'tsyringe';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:notify';

/**
 * Register notification operations in SML.
 */
export async function registerNotifyOperations(): Promise<void> {
  logger.debug('[SML:NotifyAdapter] Registering notify operations');

  let registeredCount = 0;

  // bridge.notify.email.send
  try {
    // Check if EmailService is available
    const { EmailService } = await import('../../modules/email/services/EmailService.js');

    SML.register('bridge.notify.email.send', {
      handler: async (params, ctx) => {
        const emailService = container.resolve(EmailService);
        return emailService.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html
        });
      },
      schema: {
        description: 'Send email notification',
        params: {
          to: { type: 'string', required: true, description: 'Recipient email address' },
          subject: { type: 'string', required: true, description: 'Email subject' },
          body: { type: 'string', required: true, description: 'Plain text body' },
          html: { type: 'string', description: 'HTML body (optional)' }
        },
        returns: { type: 'boolean' }
      }
    }, { owner: OWNER });

    registeredCount++;
    logger.debug('[SML:NotifyAdapter] Registered bridge.notify.email.send');
  } catch (error) {
    logger.warn('[SML:NotifyAdapter] EmailService not available, skipping email registration');
  }

  // bridge.notify.telegram.send (if telegram module exists)
  try {
    // Check if TelegramService exists
    const telegramConfigExists = await checkTelegramConfig();

    if (telegramConfigExists) {
      SML.register('bridge.notify.telegram.send', {
        handler: async (params, ctx) => {
          // TODO: Implement when TelegramService is available
          logger.info('[SML:NotifyAdapter] Telegram send called', params);
          return true;
        },
        schema: {
          description: 'Send telegram message',
          params: {
            chatId: { type: 'string', required: true, description: 'Telegram chat ID' },
            message: { type: 'string', required: true, description: 'Message text' }
          },
          returns: { type: 'boolean' }
        }
      }, { owner: OWNER });

      registeredCount++;
      logger.debug('[SML:NotifyAdapter] Registered bridge.notify.telegram.send');
    }
  } catch (error) {
    logger.debug('[SML:NotifyAdapter] Telegram not configured, skipping');
  }

  // bridge.notify.internal.send - Internal notifications (in-app)
  SML.register('bridge.notify.internal.send', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) {
        throw new Error('Prisma client not available');
      }

      // Create notification record
      try {
        await prisma.notificationsHistory.create({
          data: {
            userId: params.userId,
            type: params.type || 'info',
            message: params.title ? `${params.title}: ${params.message}` : params.message,
            status: 'pending',
            metadata: params.metadata || {}
          }
        });
        return true;
      } catch (error) {
        logger.error('[SML:NotifyAdapter] Failed to create internal notification', error);
        return false;
      }
    },
    schema: {
      description: 'Send internal (in-app) notification to user',
      params: {
        userId: { type: 'number', required: true, description: 'Target user ID' },
        title: { type: 'string', required: true, description: 'Notification title' },
        message: { type: 'string', required: true, description: 'Notification message' },
        type: { type: 'string', description: 'Type: info, warning, error, success' },
        metadata: { type: 'object', description: 'Additional metadata' }
      },
      returns: { type: 'boolean' }
    }
  }, { owner: OWNER });

  registeredCount++;

  logger.info(`[SML:NotifyAdapter] Registered ${registeredCount} notify operations`);
}

/**
 * Check if Telegram is configured.
 */
async function checkTelegramConfig(): Promise<boolean> {
  try {
    const prisma = global.prisma;
    if (!prisma) return false;

    const config = await prisma.systemConfig.findFirst({
      where: { key: 'telegram.botToken' }
    });

    return config?.value !== null && config?.value !== '';
  } catch {
    return false;
  }
}
