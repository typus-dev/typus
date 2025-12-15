import { injectable, inject } from 'tsyringe';
import nodemailer from 'nodemailer';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { EmailOptions } from '../services/EmailService.js';
import { ConfigService } from '../../system/services/ConfigService.js';

/**
 * Universal SMTP Email Provider
 * Works with any SMTP server: Gmail, Outlook, Mailgun, AWS SES, SendGrid SMTP, custom servers, etc.
 */
@injectable()
export class SmtpProvider extends BaseEmailProvider {
    private transporter: nodemailer.Transporter | null = null;

    constructor(
        @inject(ConfigService) private configService: ConfigService
    ) {
        super();
        // Transporter will be initialized lazily on first use
    }

    /**
     * Initialize the nodemailer transporter (lazy, async)
     * Reads SMTP settings from ConfigService (database) with fallback to .env
     *
     * FIX: Removed Promise caching to avoid AsyncLocalStorage context loss.
     * ConfigService.get() has built-in fallback chain: ENV → Cache → DB → default
     * This works in all contexts (HTTP requests, queue workers, startup).
     */
    private async initTransporter(): Promise<void> {
        // If already initialized, skip
        if (this.transporter) {
            return;
        }

        try {
            // Read SMTP settings from ConfigService (database only, no fallback)
            // If not configured in DB, will be undefined and cause clear error
            const smtpHost = await this.configService.getFromDb('email.smtp_host');
            const smtpPort = await this.configService.getFromDb('email.smtp_port');
            const smtpSecure = await this.configService.getFromDb('email.smtp_secure');
            const smtpUsername = await this.configService.getFromDb('email.smtp_username');
            const smtpPassword = await this.configService.getFromDb('email.smtp_password');

            // Validate required settings
            if (!smtpHost) {
                throw new Error('SMTP host not configured in database (email.smtp_host)');
            }
            if (!smtpPort) {
                throw new Error('SMTP port not configured in database (email.smtp_port)');
            }

            // Log SMTP configuration (without sensitive data)
            this.logger.info(`[${this.getName()}] Initializing transporter with config:`, {
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                user: smtpUsername,
                hasPassword: !!smtpPassword,
                source: 'ConfigService (DB only)'
            });

            const transportOptions: any = {
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                requireTLS: !smtpSecure,
                connectionTimeout: 30000,
                tls: {
                    minVersion: 'TLSv1.2',
                    rejectUnauthorized: false
                },
                debug: true // Enable debug for troubleshooting
            };

            // Add auth only if credentials are provided
            if (smtpUsername && smtpPassword) {
                transportOptions.auth = {
                    user: smtpUsername,
                    pass: smtpPassword
                };
            } else if (smtpUsername) {
                this.logger.warn(`[${this.getName()}] Username provided but password is missing`);
            }

            this.transporter = nodemailer.createTransport(transportOptions);
            this.logger.info(`[${this.getName()}] Transporter initialized successfully`);

            // Verify connection in background (don't block initialization)
            this.verifyConnection()
                .then(isValid => {
                    if (isValid) {
                        this.logger.info(`[${this.getName()}] SMTP connection verified successfully`);
                    } else {
                        this.logger.warn(`[${this.getName()}] SMTP connection verification failed`);
                    }
                })
                .catch(err => {
                    this.logger.error(`[${this.getName()}] SMTP connection verification error:`, { error: err.message });
                });

        } catch (error: any) {
            this.logger.error(`[${this.getName()}] Failed to initialize transporter`, { error: error.message || error });
            this.transporter = null; // Reset on error
            throw error;
        }
    }

    /**
     * Ensure transporter is initialized before use
     */
    private async ensureTransporter(): Promise<void> {
        if (!this.transporter) {
            await this.initTransporter();
        }
    }

    /**
     * Send email using nodemailer
     */
    async sendMail(options: EmailOptions): Promise<boolean> {
        try {
            // Ensure transporter is initialized (lazy initialization)
            await this.ensureTransporter();

            if (!this.transporter) {
                throw new Error('Transporter not initialized');
            }

            // Read email.from_address from ConfigService (DB only)
            const emailFrom = await this.configService.getFromDb('email.from_address');
            if (!emailFrom) {
                throw new Error('Email from address not configured in database (email.from_address)');
            }

            const mailOptions = {
                from: emailFrom,
                to: this.formatRecipients(options.to),
                cc: options.cc ? this.formatRecipients(options.cc) : undefined,
                bcc: options.bcc ? this.formatRecipients(options.bcc) : undefined,
                subject: options.subject,
                text: this.ensureString(options.text),
                html: this.ensureString(options.html),
                attachments: options.attachments,
            };

            this.logger.info(`[${this.getName()}] Sending email to: ${mailOptions.to}`);

            const info = await this.transporter.sendMail(mailOptions);
            this.logEmailSent(options, info);

            return true;
        } catch (error) {
            this.logEmailError(options, error);
            return false;
        }
    }

    /**
     * Verify connection to mail server
     */
    async verifyConnection(): Promise<boolean> {
        try {
            // Ensure transporter is initialized
            await this.ensureTransporter();

            if (!this.transporter) {
                this.logger.warn(`[${this.getName()}] Transporter not initialized`);
                return false;
            }

            await this.transporter.verify();
            return true;
        } catch (error: any) {
            this.logger.error(`[${this.getName()}] Connection verification failed`, { error: error.message });
            return false;
        }
    }

    /**
     * Get provider name
     */
    getName(): string {
        return 'SmtpProvider';
    }

    /**
     * Ensure content is string
     */
    private ensureString(content: any): string | undefined {
        if (!content) return undefined;
        
        if (typeof content === 'string') return content;
        
        if (typeof content === 'object' && content !== null && 'data' in content && typeof content.data === 'string') {
            return content.data;
        }
        
        if (typeof content === 'object' && content !== null) {
            try {
                return JSON.stringify(content);
            } catch (e) {
                this.logger.warn(`[${this.getName()}] Failed to stringify content`, { error: e.message });
            }
        }
        
        return String(content);
    }

    /**
     * Send mail with custom SMTP settings
     */
    async sendMailWithSmtp(options: EmailOptions, smtpOptions: any): Promise<boolean> {
        try {
            const customTransporter = nodemailer.createTransport({
                host: smtpOptions.host,
                port: smtpOptions.port,
                secure: smtpOptions.secure,
                auth: smtpOptions.user && smtpOptions.pass ? {
                    user: smtpOptions.user,
                    pass: smtpOptions.pass
                } : undefined
            });

            // Read email.from_address from ConfigService (DB only)
            const emailFrom = await this.configService.getFromDb('email.from_address');

            const mailOptions = {
                from: options.from || emailFrom || 'noreply@example.com',
                to: this.formatRecipients(options.to),
                subject: options.subject,
                text: this.ensureString(options.text),
                html: this.ensureString(options.html),
                attachments: options.attachments,
            };

            const info = await customTransporter.sendMail(mailOptions);
            this.logEmailSent(options, info);

            return true;
        } catch (error) {
            this.logEmailError(options, error);
            return false;
        }
    }
}
