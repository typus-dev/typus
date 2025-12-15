import { container } from 'tsyringe';
import { Logger } from '../logger/Logger';
import { EmailService } from '@/modules/email/services/EmailService.js';
import { EmailProviderFactory } from '@/modules/email/providers/EmailProviderFactory.js';
import { SmtpProvider } from '@/modules/email/providers/SmtpProvider.js';
import { SendGridApiProvider } from '@/modules/email/providers/SendGridProvider.js';
import { TemplateService } from '@/modules/email/services/TemplateService.js';
import { EventBus } from '@/events/EventBus.js';

const logger = global.logger || new Logger();

// For strict tracking of registered tokens
const registeredTokens = new WeakMap<object, boolean>();
const registeredNames = new Set<string>();

/**
 * Registers a class as a singleton in the dependency container
 * @param token The class to register
 * @returns An instance of the registered class
 */
export function register<T>(token: new (...args: any[]) => T): T {
    const name = token.name;
    
    // Check by class reference
    if (registeredTokens.has(token)) {
        logger.debug(`[Registry] Class ${name} already registered (by reference)`);
        return container.resolve(token);
    }
    
    // Check by class name (additional protection)
    if (registeredNames.has(name)) {
        logger.warn(`[Registry] Class name ${name} already registered but with different reference`);
    }
    
    // Check via tsyringe functionality
    if (container.isRegistered(token)) {
        logger.debug(`[Registry] Token ${name} already registered in container`);
        return container.resolve(token);
    }
    
    // Register class
    container.registerSingleton(token);
    registeredTokens.set(token, true);
    registeredNames.add(name);
    
    logger.info(`[Registry] Registered ${name}`);
    
    // Return an instance for possible use
    return container.resolve(token);
}

/**
 * Register email module dependencies in correct order
 */
export function registerEmailDependencies(): void {
    logger.info('[Registry] Registering email module dependencies');
    
    try {
        // Register email providers first
        register(SmtpProvider);
        register(SendGridApiProvider);

        // Register factory after providers
        register(EmailProviderFactory);

        // Register template service
        register(TemplateService);
        
        // Register main email service last
        register(EmailService);
        
        logger.info('[Registry] Email module dependencies registered successfully');
    } catch (error) {
        logger.error('[Registry] Failed to register email dependencies', { error });
        throw error;
    }
}

// Auto-register email dependencies
registerEmailDependencies();

/**
 * Register core services (EventBus, etc.)
 */
export function registerCoreServices(): void {
    logger.info('[Registry] Registering core services');

    try {
        register(EventBus);
        logger.info('[Registry] Core services registered successfully');
    } catch (error) {
        logger.error('[Registry] Failed to register core services', { error });
        throw error;
    }
}

// Auto-register core services
registerCoreServices();