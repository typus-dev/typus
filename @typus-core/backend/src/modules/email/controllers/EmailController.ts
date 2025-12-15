import { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import { EmailService } from '../services/EmailService.js';
import { inject } from 'tsyringe';
import { Controller } from '../../../core/decorators/component.js';
import config from '../../../config/app.config.js';

/**
 * Email controller
 */
@Controller({ path: 'email' })
export class EmailController extends BaseController {
    constructor(
        @inject(EmailService) private emailService: EmailService
    ) {
        super();
    }

    /**
     * Test email sending endpoint
     */
    async testEmail(req: Request, res: Response) {
        const { email } = req.body;

        if (!email) {
            return this.badRequest(res, 'Email address is required', 'MISSING_EMAIL');
        }

        await this.emailService.testEmail(email);
        return this.success(res, { message: 'Test email sent successfully' });
    }
    
    /**
     * Get available email providers
     */
    async getProviders(req: Request, res: Response) {
        const providers = this.emailService.getAvailableProviders();
        return this.success(res, { providers });
    }

    /**
     * Send email with API key authentication
     */
    async sendEmail(req: Request, res: Response) {
        this.logger.info(`[${this.className}] Email send endpoint called`);
        
        try {
            // API key validation
            const apiKey = req.headers['x-api-key'];
            this.logger.info(`[${this.className}] API Key received: ${apiKey ? 'Yes' : 'No'}`);
            this.logger.info(`[${this.className}] Expected API key: ${config.email.apiKey}`);
            this.logger.info(`[${this.className}] API keys match: ${apiKey === config.email.apiKey}`);
            
            if (!apiKey || apiKey !== config.email.apiKey) {
                this.logger.warn(`[${this.className}] Invalid API key: ${apiKey}`);
                this.logger.warn(`[${this.className}] Expected API key: ${config.email.apiKey}`);
                return this.unauthorized(res, 'Invalid API key', 'INVALID_API_KEY');
            }

            // Get parameters from request body
            const { from, to, subject, text, html } = req.body;
            
            this.logger.info(`[${this.className}] Request body:`, req.body);
            this.logger.info(`[${this.className}] Preparing to send email to: ${to}, subject: ${subject}`);
            
            // Required parameters validation
            if (!to) {
                this.logger.warn(`[${this.className}] Missing recipient email`);
                return this.badRequest(res, 'Recipient email is required', 'MISSING_RECIPIENT');
            }
            
            if (!subject) {
                this.logger.warn(`[${this.className}] Missing email subject`);
                return this.badRequest(res, 'Email subject is required', 'MISSING_SUBJECT');
            }
            
            if (!text && !html) {
                this.logger.warn(`[${this.className}] Missing email content`);
                return this.badRequest(res, 'Email content is required (text or html)', 'MISSING_CONTENT');
            }
            
            // Prepare email options
            const options = {
                to,
                subject,
                ...(from && { from }),
                ...(text && { text }),
                ...(html && { html })
            };
            
            // Send email
            this.logger.info(`[${this.className}] Sending email with options:`, JSON.stringify(options));
            
            const result = await this.emailService.sendEmail(options);

    
            this.logger.info(`[${this.className}] Email sent result:`, { result });

            if (result === false) {
                return this.error(res, "Failed to send email", "EMAIL_SEND_FAILED");
            }
            
            return this.success(res, { message: 'Email sent successfully', success: result });
        } catch (error) {
            this.logger.error(`[${this.className}] Failed to send email - EXCEPTION CAUGHT:`);
            this.logger.error(`[${this.className}] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
            
            if (error instanceof Error) {
                this.logger.error(`[${this.className}] Error message: ${error.message}`);
                this.logger.error(`[${this.className}] Error stack: ${error.stack}`);
            } else {
                this.logger.error(`[${this.className}] Error details:`, error);
            }
            
            const errorMessage = error instanceof Error 
                ? error.message 
                : (typeof error === 'object' ? JSON.stringify(error) : String(error));
                
            return this.error(res, `Failed to send email: ${errorMessage}`, 'EMAIL_SEND_FAILED');
        }
    }
}
