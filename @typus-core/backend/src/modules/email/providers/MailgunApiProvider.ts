import { injectable, inject } from 'tsyringe';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { EmailOptions } from '../services/EmailService.js';
import { ConfigService } from '../../system/services/ConfigService.js';

/**
 * Mailgun API Email Provider
 * Uses Mailgun API for fast email delivery
 */
@injectable()
export class MailgunApiProvider extends BaseEmailProvider {
    private initialized: boolean = false;
    private apiKey: string = '';
    private apiEndpoint: string = '';
    private domain: string = '';

    constructor(
        @inject(ConfigService) private configService: ConfigService
    ) {
        super();
        // Lazy initialization on first use
    }

    /**
     * Initialize Mailgun client (async, lazy)
     * Reads API key and endpoint from ConfigService (database) with fallback to .env
     */
    private async initMailgun(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Read API key from database first, then fallback to env
            this.apiKey = await this.configService.get('email.api_key')
                || process.env.MAILGUN_API_KEY
                || '';

            // Read API endpoint from database (default to US endpoint)
            this.apiEndpoint = await this.configService.get('email.api_endpoint')
                || process.env.MAILGUN_API_ENDPOINT
                || 'https://api.mailgun.net';

            // Extract domain from from_address or use env
            const fromAddress = await this.configService.get('email.from_address')
                || process.env.EMAIL_FROM
                || '';

            this.domain = fromAddress.split('@')[1] || process.env.MAILGUN_DOMAIN || '';

            if (!this.apiKey || !this.domain) {
                this.logger.warn(`[${this.getName()}] Missing API key or domain`);
                return;
            }

            this.initialized = true;
            this.logger.info(`[${this.getName()}] Client initialized from ${
                await this.configService.get('email.api_key') ? 'database' : 'env'
            }`);
        } catch (error) {
            this.logger.error(`[${this.getName()}] Failed to initialize client`, { error });
        }
    }

    /**
     * Send email using Mailgun API
     */
    async sendMail(options: EmailOptions): Promise<boolean> {
        try {
            // Ensure initialization
            await this.initMailgun();

            if (!this.initialized || !this.apiKey || !this.domain) {
                throw new Error('Mailgun client not initialized');
            }

            // Read from_address from database
            const fromAddress = await this.configService.get('email.from_address')
                || process.env.EMAIL_FROM
                || 'noreply@example.com';

            // Prepare form data for Mailgun API
            const formData = new URLSearchParams();
            formData.append('from', options.from || fromAddress);
            formData.append('to', Array.isArray(options.to) ? options.to.join(',') : options.to);
            formData.append('subject', options.subject);

            if (options.text) {
                formData.append('text', options.text);
            }
            if (options.html) {
                formData.append('html', options.html);
            }
            if (options.cc) {
                formData.append('cc', Array.isArray(options.cc) ? options.cc.join(',') : options.cc);
            }
            if (options.bcc) {
                formData.append('bcc', Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc);
            }

            // Send request to Mailgun API
            const url = `${this.apiEndpoint}/v3/${this.domain}/messages`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            this.logEmailSent(options, result);
            return true;
        } catch (error) {
            this.logEmailError(options, error);
            return false;
        }
    }

    /**
     * Verify Mailgun connection
     */
    async verifyConnection(): Promise<boolean> {
        try {
            // Read API key from database
            const apiKey = await this.configService.get('email.api_key')
                || process.env.MAILGUN_API_KEY
                || '';

            const isValid = !!apiKey && apiKey.startsWith('key-');

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
        return 'MailgunApiProvider';
    }
}
