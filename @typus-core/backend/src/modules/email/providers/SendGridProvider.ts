import { injectable, inject } from 'tsyringe';
import sgMail from '@sendgrid/mail';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { EmailOptions } from '../services/EmailService.js';
import { ConfigService } from '../../system/services/ConfigService.js';

/**
 * SendGrid API Email Provider
 * Uses SendGrid API for fast email delivery
 */
@injectable()
export class SendGridApiProvider extends BaseEmailProvider {
    private initialized: boolean = false;

    constructor(
        @inject(ConfigService) private configService: ConfigService
    ) {
        super();
        // Lazy initialization on first use
    }

    /**
     * Initialize SendGrid client (async, lazy)
     * Reads API key from ConfigService (database) with fallback to .env
     */
    private async initSendGrid(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Read API key from database first, then fallback to env
            const apiKey = await this.configService.get('email.api_key')
                || process.env.SENDGRID_API_KEY
                || '';

            if (!apiKey) {
                this.logger.warn(`[${this.getName()}] No API key configured`);
                return;
            }

            sgMail.setApiKey(apiKey);
            this.initialized = true;
            this.logger.info(`[${this.getName()}] Client initialized from ${
                await this.configService.get('email.api_key') ? 'database' : 'env'
            }`);
        } catch (error) {
            this.logger.error(`[${this.getName()}] Failed to initialize client`, { error });
        }
    }
    
    /**
     * Send email using SendGrid API
     */
    async sendMail(options: EmailOptions): Promise<boolean> {
        try {
            // Ensure initialization
            await this.initSendGrid();

            if (!this.initialized) {
                throw new Error('SendGrid client not initialized');
            }

            // Read from_address from database
            const fromAddress = await this.configService.get('email.from_address')
                || process.env.EMAIL_FROM
                || 'noreply@example.com';

            const msg = {
                to: options.to,
                from: options.from || fromAddress,
                subject: options.subject,
                text: options.text || '',
                html: options.html || '',
                cc: options.cc,
                bcc: options.bcc,
                attachments: options.attachments?.map(attachment => ({
                    content: attachment.content.toString('base64'),
                    filename: attachment.filename,
                    type: attachment.contentType,
                    disposition: 'attachment'
                }))
            };

            const response = await sgMail.send(msg);
            this.logEmailSent(options, response[0]);
            return true;
        } catch (error) {
            this.logEmailError(options, error);
            return false;
        }
    }
    
    /**
     * Verify SendGrid connection
     */
    async verifyConnection(): Promise<boolean> {
        try {
            // Read API key from database
            const apiKey = await this.configService.get('email.api_key')
                || process.env.SENDGRID_API_KEY
                || '';

            const isValid = !!apiKey && apiKey.startsWith('SG.');

            if (isValid) {
                this.logger.info(`[${this.getName()}] API key format is valid`);
                return true;
            } else {
                this.logger.warn(`[${this.getName()}] Invalid or missing API key`);
                return false;
            }
        } catch (error) {
            this.logger.error(`[${this.getName()}] Verification failed`, { error });
            return false;
        }
    }

    /**
     * Get provider name
     */
    getName(): string {
        return 'SendGridApiProvider';
    }
}
