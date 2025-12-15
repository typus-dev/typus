import { BaseModule } from '../../core/base/BaseModule.js';
import { EmailController } from './controllers/EmailController';
import { EmailService } from './services/EmailService';
import { TemplateService } from './services/TemplateService';
import { EmailProviderFactory } from './providers/EmailProviderFactory';
import { SmtpProvider } from './providers/SmtpProvider';
import { SendGridApiProvider } from './providers/SendGridProvider';
import { container } from 'tsyringe';
import { Module } from '../../core/decorators/component.js';

/**
 * Email module with proper DI registration
 */
export class EmailModule extends BaseModule<EmailController, EmailService> { // Add generic types

    constructor() {
        const basePath = 'email';
        
        // Pass classes directly to super
        super(basePath, EmailController, EmailService);
    }


    /**
     * Initialize module
     */
    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] module initialized`);
     
    }

    /**
     * Initialize module routes
     */
    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);

        // Test email route (admin only)
        this.router.post('/test', [
            this.auth(),
            this.roles(['admin'])
        ], this.controller.testEmail.bind(this.controller));

        // API key authenticated email sending route
        this.router.post('/send', [], this.controller.sendEmail.bind(this.controller));

        // Get providers route (admin only)
        this.router.get('/providers', [
            this.auth(),
            this.roles(['admin'])
        ], this.controller.getProviders.bind(this.controller));

        this.logger.info(`[${this.moduleName}] routes initialized`);
    }
}
