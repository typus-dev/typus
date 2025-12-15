import { inject } from 'tsyringe';
import { BaseService } from '../../../core/base/BaseService.js';
import { EmailProviderFactory } from '../providers/EmailProviderFactory';
import { TemplateService } from './TemplateService';
import { BadRequestError } from '../../../core/base/BaseError.js';
import { Service } from '../../../core/decorators/component.js';

export interface SmtpOptions {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    secure?: boolean;
}

export interface EmailOptions {
    to: string | string[];
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

/**
 * Email service with decorator
 */
@Service()
export class EmailService extends BaseService {
    constructor(
        @inject(EmailProviderFactory) private emailProviderFactory: EmailProviderFactory,
        @inject(TemplateService) private templateService: TemplateService
    ) {
        super();
    }
    
    /**
     * Send email using the default provider
     */
    async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            this.logger.info(`[EmailService] Starting email sending process`);

            // Get default provider (now async!)
            const provider = await this.emailProviderFactory.getDefaultProvider();
            this.logger.info(`[EmailService] Selected provider: ${provider.getName()}`);

            // Send email
            this.logger.info(`[EmailService] Calling provider.sendMail with options:`, {
                to: options.to,
                subject: options.subject,
                hasText: !!options.text,
                hasHtml: !!options.html
            });

            const result = await provider.sendMail(options);

            if (result === false) {
                throw new Error("Email provider failed to send email");
            }

            this.logger.info(`[EmailService] Provider.sendMail result:`, result);

            return result;
        } catch (error) {
            this.logger.error(`[EmailService] Exception in sendEmail method:`);

            if (error instanceof Error) {
                this.logger.error(`[EmailService] Error type: ${error.constructor.name}`);
                this.logger.error(`[EmailService] Error message: ${error.message}`);
                this.logger.error(`[EmailService] Error stack: ${error.stack}`);
            } else {
                this.logger.error(`[EmailService] Error details:`, error);
            }

            throw error; // Re-throw to be handled by the controller
        }
    }
    
    /**
     * Send email using a specific provider
     */
    async sendEmailWithProvider(options: EmailOptions, providerType: string): Promise<boolean> {
        // Get specified provider
        const provider = this.emailProviderFactory.getProvider(providerType as any);
        this.logger.info(`[EmailService] Sending email using selected provider: ${provider.getName()}`);
        
        // Send email
        return await provider.sendMail(options);
    }
    
    /**
     * Send email with custom SMTP settings
     */
    async sendEmailWithSmtp(options: EmailOptions, smtpOptions: SmtpOptions): Promise<boolean> {
        // Get SMTP provider
        const provider = this.emailProviderFactory.getProvider('smtp');
        this.logger.info(`[EmailService] Sending email using provider with custom SMTP: ${provider.getName()}`);

        // Check if provider supports custom SMTP
        if ('sendMailWithSmtp' in provider) {
            return await (provider as any).sendMailWithSmtp(options, smtpOptions);
        } else {
            this.logger.warn(`[EmailService] Provider ${provider.getName()} does not support custom SMTP settings`);
            return await provider.sendMail(options);
        }
    }
    
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(to: string, resetToken: string, username: string): Promise<boolean> {
        const resetUrl = `${global.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        // Prepare template data
        const templateData = {
            username,
            resetUrl
        };
        
        // Get compiled templates
        const html = await this.templateService.getCompiledTemplate('password-reset', 'html', templateData);
        const text = await this.templateService.getCompiledTemplate('password-reset', 'text', templateData);
    
        const options: EmailOptions = {
            to,
            subject: 'Password Reset Request',
            text,
            html
        };
    
        // Send email
        return await this.sendEmail(options);
    }
    
    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
        // Prepare template data
        const templateData = {
            username
        };
        
        // Get compiled templates
        const html = await this.templateService.getCompiledTemplate('welcome', 'html', templateData);
        const text = await this.templateService.getCompiledTemplate('welcome', 'text', templateData);
        
        const options: EmailOptions = {
            to,
            subject: 'Welcome to Our Platform',
            text,
            html
        };
    
        // Send email
        return await this.sendEmail(options);
    }
    
    /**
     * Send verification code email
     */
    async sendVerificationCodeEmail(to: string, code: string, username: string): Promise<boolean> {
        // Prepare template data
        const templateData = {
            username,
            code
        };
        
        // Get compiled templates
        const html = await this.templateService.getCompiledTemplate('verification-code', 'html', templateData);
        const text = await this.templateService.getCompiledTemplate('verification-code', 'text', templateData);
        
        const options: EmailOptions = {
            to,
            subject: 'Your Verification Code',
            text,
            html
        };
    
        // Send email
        return await this.sendEmail(options);
    }
    
    /**
     * Send email verification link
     */
    async sendVerificationEmail(to: string, verificationToken: string, username: string): Promise<boolean> {
        const verificationUrl = `${global.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        
        // Prepare template data
        const templateData = {
            username,
            verificationUrl
        };
        
        // Get compiled templates
        const html = await this.templateService.getCompiledTemplate('email-verification', 'html', templateData);
        const text = await this.templateService.getCompiledTemplate('email-verification', 'text', templateData);
        
        const options: EmailOptions = {
            to,
            subject: 'Verify Your Email Address',
            text,
            html
        };
    
        // Send email
        return await this.sendEmail(options);
    }
    
/**
 * Send temporary password email
 */
async sendPasswordEmail(email: string, password: string, name: string): Promise<boolean> {
    this.logger.debug('[EmailService] Sending temporary password email', { email });
    
    // Prepare template data
    const templateData = {
        name,
        password
    };
    
    // Get compiled templates
    const html = await this.templateService.getCompiledTemplate('temporary-password', 'html', templateData);
    const text = await this.templateService.getCompiledTemplate('temporary-password', 'text', templateData);
    
    const options: EmailOptions = {
        to: email,
        subject: 'Your temporary password',
        text,
        html
    };

    // Send email
    return await this.sendEmail(options);
}

    /**
     * Test email sending
     */
    async testEmail(to: string): Promise<boolean> {
        // Validate email
        if (!to || !to.includes('@')) {
            throw new BadRequestError('Invalid email address');
        }
        
        // Get compiled templates
        const html = await this.templateService.getCompiledTemplate('test', 'html', {});
        const text = await this.templateService.getCompiledTemplate('test', 'text', {});
        
        const options: EmailOptions = {
            to,
            subject: 'Test Email',
            text,
            html
        };
    
        // Send email
        return await this.sendEmail(options);
    }
    
    /**
     * Check available providers
     */
    getAvailableProviders(): string[] {
        return this.emailProviderFactory.getAvailableProviders();
    }
}
