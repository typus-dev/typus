/**
 * Email module index file
 * Exports all components of the module
 */

// Export module
export { EmailModule } from './EmailModule';

// Export controllers
export { EmailController } from './controllers/EmailController';

// Export services
export { EmailService } from './services/EmailService';
export { TemplateService } from './services/TemplateService';

// Export providers
export { EmailProviderFactory } from './providers/EmailProviderFactory';
export { SmtpProvider } from './providers/SmtpProvider';
export { SendGridApiProvider } from './providers/SendGridProvider';

// Import for default export
import { EmailModule as Module } from './EmailModule';

// Default export for module loader
export default { EmailModule: Module };
