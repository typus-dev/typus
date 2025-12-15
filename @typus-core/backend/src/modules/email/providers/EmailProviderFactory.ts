import { injectable, container, inject } from 'tsyringe';
import { IEmailProvider } from './IEmailProvider';
import { SmtpProvider } from './SmtpProvider';
import { SendGridApiProvider } from './SendGridProvider';
import { MailgunApiProvider } from './MailgunApiProvider.js';
import { ILogger } from '../../../core/logger/ILogger.js';
import { LoggerFactory } from '../../../core/logger/LoggerFactory.js';
import { ConfigService } from '../../system/services/ConfigService.js';

type EmailProviderType = 'smtp' | 'sendgrid-api' | 'mailgun-api';

@injectable()
export class EmailProviderFactory {
    private providers: Map<EmailProviderType, IEmailProvider>;
    private logger: ILogger;

    constructor(
        @inject(ConfigService) private configService: ConfigService
    ) {
        this.logger = LoggerFactory.getGlobalLogger();
        this.providers = new Map();
        this.initProviders();
    }

    private initProviders(): void {
        try {
            // Resolve providers from container
            const smtpProvider = container.resolve(SmtpProvider);
            const sendgridApiProvider = container.resolve(SendGridApiProvider);
            const mailgunApiProvider = container.resolve(MailgunApiProvider);

            // Register providers in map
            this.providers.set('smtp', smtpProvider);
            this.providers.set('sendgrid-api', sendgridApiProvider);
            this.providers.set('mailgun-api', mailgunApiProvider);

            this.logger.info('[EmailProviderFactory] All providers initialized successfully');
        } catch (error) {
            this.logger.error('[EmailProviderFactory] Failed to initialize providers', { error });
            throw error;
        }
    }

    /**
     * Get the default email provider based on configuration
     * Reads from database first, then falls back to env variable
     */
    async getDefaultProvider(): Promise<IEmailProvider> {
        // Read provider from database first, then fallback to env
        const providerType = (await this.configService.get('email.provider'))
            || global.env.SMTP_PROVIDER
            || 'smtp';

        this.logger.debug(`[EmailProviderFactory] Getting default provider: ${providerType}`);

        return this.getProvider(providerType as EmailProviderType);
    }

    /**
     * Get a specific email provider
     */
    getProvider(type: EmailProviderType): IEmailProvider {
        const provider = this.providers.get(type);

        if (!provider) {
            this.logger.warn(`[EmailProviderFactory] Unknown provider type: ${type}, falling back to smtp`);
            const fallbackProvider = this.providers.get('smtp');

            if (!fallbackProvider) {
                throw new Error('No email providers available');
            }

            return fallbackProvider;
        }

        this.logger.debug(`[EmailProviderFactory] Retrieved provider: ${provider.getName()}`);
        return provider;
    }

    /**
     * List all available providers
     */
    getAvailableProviders(): EmailProviderType[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if a provider is available
     */
    isProviderAvailable(type: EmailProviderType): boolean {
        return this.providers.has(type);
    }

    /**
     * Get provider status information
     */
    async getProvidersStatus(): Promise<Record<EmailProviderType, { available: boolean; name: string }>> {
        const status: Record<string, { available: boolean; name: string }> = {};

        for (const [type, provider] of this.providers) {
            status[type] = {
                available: true,
                name: provider.getName()
            };
        }

        return status as Record<EmailProviderType, { available: boolean; name: string }>;
    }
}