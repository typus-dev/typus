import { Service } from '@/core/decorators/component';
import { BaseTaskHandler } from './BaseTaskHandler';
import { TaskSchema } from '../interfaces';

/**
 * Email task handler for STARTER profile
 * Matches EmailNotificationPlugin from Dispatcher
 * Handles email_notification_task type
 */
@Service()
export class EmailTaskHandler extends BaseTaskHandler {
  /**
   * Get schema for email tasks
   * Must match EmailNotificationPlugin.getTaskSchema()
   */
  getSchema(): TaskSchema {
    return {
      type: 'email_notification_task',
      fields: ['to', 'subject', 'text', 'html', 'template_name', 'recipients'],
      validate: (data) => {
        if (!data.subject) {
          throw new Error('subject is required');
        }

        const hasDirectTo = data.to && (typeof data.to === 'string' || Array.isArray(data.to));
        const hasTypeRecipients = data.recipients;

        if (!hasDirectTo && !hasTypeRecipients) {
          throw new Error('provide "to" or "recipients"');
        }

        if (hasDirectTo) {
          const emails = Array.isArray(data.to) ? data.to : [data.to];
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          for (const email of emails) {
            if (!emailRegex.test(email)) {
              throw new Error(`invalid email: ${email}`);
            }
          }
        }

        if (!data.text && !data.html && !data.template_name) {
          throw new Error('provide text/html or template');
        }
      }
    };
  }

  /**
   * Normalize data - convert recipients to standard format
   */
  private normalize(data: any): any {
    if (data.to && !data.recipients) {
      const emails = Array.isArray(data.to) ? data.to : [data.to];
      data.recipients = { single: emails };
      data.type = 'single';
    }
    return data;
  }

  /**
   * Execute email sending task
   * Simplified version for STARTER profile
   *
   * @param data - Email task data
   * @returns Result object with success status
   */
  async execute(data: any): Promise<any> {
    try {
      this.logger.debug('[EmailTaskHandler] Raw data received', {
        hasSubject: !!data.subject,
        hasRecipients: !!data.recipients,
        dataKeys: Object.keys(data)
      });

      // Normalize data
      const payload = this.normalize(data);

      this.logger.debug('[EmailTaskHandler] After normalize', {
        hasSubject: !!payload.subject,
        hasRecipients: !!payload.recipients,
        payloadKeys: Object.keys(payload)
      });

      // Validate
      await this.validate(payload);

      this.logger.info('[EmailTaskHandler] Processing email task', {
        subject: payload.subject,
        type: payload.type || 'single',
        hasRecipients: !!payload.recipients
      });

      // Get recipients
      let recipients: string[] = [];
      if (payload.to) {
        recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
      } else if (payload.recipients?.single) {
        recipients = payload.recipients.single;
      }

      if (recipients.length === 0) {
        this.logger.warn('[EmailTaskHandler] No recipients found');
        return {
          status: 'success',
          message: 'No recipients found',
          sent_count: 0,
          recipients: []
        };
      }

      this.logger.info('[EmailTaskHandler] Sending email to recipients', {
        subject: payload.subject,
        recipientCount: recipients.length,
        recipients: recipients.join(', ')
      });

      // TODO: Implement actual email sending
      // For now, just log and simulate success
      const results = recipients.map(email => ({
        email,
        status: 'simulated' // Changed from 'success' to make it clear this is not real
      }));

      this.logger.info('[EmailTaskHandler] Email task completed (simulated)', {
        subject: payload.subject,
        sent_count: recipients.length
      });

      return {
        status: 'success',
        message: `Sent ${recipients.length} emails (simulated)`,
        sent_count: recipients.length,
        error_count: 0,
        recipients: results
      };
    } catch (error) {
      this.logger.error('[EmailTaskHandler] Failed to send email', {
        error: error.message,
        subject: data.subject
      });
      throw error;
    }
  }
}
