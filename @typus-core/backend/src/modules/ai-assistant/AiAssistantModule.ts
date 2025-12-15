import { BaseModule } from '@/core/base/BaseModule.js';
import { AiAssistantController } from './controllers/AiAssistantController';
import { AiAssistantService } from './services/AiAssistantService';
import { seoGenerationSchema } from './validation/aiAssistantSchemas';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js';

export class AiAssistantModule extends BaseModule<AiAssistantController, AiAssistantService> {
  constructor() {
    const basePath = 'ai-assistant';
    // Pass classes directly to super
    super(basePath, AiAssistantController, AiAssistantService);
  }

  protected initialize(): void {
    this.logger.info(`[${this.moduleName}] module initialized`);
  }
  
  protected initializeRoutes(): void {
    this.logger.info(`[${this.moduleName}] routes initializing...`);

    // POST /api/ai-assistant/generate-seo
    this.router.post('/generate-seo', [
      this.auth(),
      this.roles(['admin', 'editor']),
      ValidationMiddleware.validate(seoGenerationSchema, 'body')
    ], this.controller.generateSeo.bind(this.controller));

    this.logger.info(`[${this.moduleName}] routes initialized`);
  }
}
