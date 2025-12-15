import { EmailOptions } from '../services/EmailService';

/**
 * Interface for email providers
 */
export interface IEmailProvider {
    /**
     * Send email
     * @param options Email options
     */
    sendMail(options: EmailOptions): Promise<boolean>;
    
    /**
     * Verify provider configuration
     */
    verifyConnection(): Promise<boolean>;
    
    /**
     * Get provider name
     */
    getName(): string;
}