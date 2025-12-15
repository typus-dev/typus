import { IEmailProvider } from './IEmailProvider'; 
import { EmailOptions } from '../services/EmailService'; 
import { ILogger } from '../../../core/logger/ILogger.js';
import { LoggerFactory } from '../../../core/logger/LoggerFactory.js';

export abstract class BaseEmailProvider implements IEmailProvider { protected logger: ILogger;

constructor() {
    this.logger = LoggerFactory.getGlobalLogger();
}

abstract sendMail(options: EmailOptions): Promise<boolean>;
abstract verifyConnection(): Promise<boolean>;
abstract getName(): string;

/**
 * Format recipient list
 */
protected formatRecipients(recipients: string | string[]): string {
    if (Array.isArray(recipients)) {
        return recipients.join(',');
    }
    return recipients;
}

/**
 * Log email sending
 */
protected logEmailSent(options: EmailOptions, info: any): void {
    this.logger.info(`[${this.getName()}] Email sent`, {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId || 'N/A'
    });
}

/**
 * Log email error
 */
protected logEmailError(options: EmailOptions, error: any): void {
    const errorDetails = {
        to: options.to,
        subject: options.subject,
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        code: error.code || null,
        command: error.command || null,
        responseCode: error.responseCode || null,
        response: error.response || null
    };

    this.logger.error(`[${this.getName()}] Email sending failed: ${errorDetails.message}`, errorDetails);
    
    if (error.response) {
        this.logger.error(`[${this.getName()}] SMTP server response: ${error.response}`);
    }
}

}
