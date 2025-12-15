import { Controller } from '@/core/decorators/component';
import { BaseController } from '@/core/base/BaseController';
import { inject } from 'tsyringe';
import { Request, Response } from 'express';
import { AiAssistantService } from '../services/AiAssistantService';
import { seoGenerationSchema } from '../validation/aiAssistantSchemas';

@Controller({ path: 'ai-assistant' })
export class AiAssistantController extends BaseController {
  constructor(
    @inject(AiAssistantService) private aiAssistantService: AiAssistantService
  ) {
    super();
  }

  async generateSeo(req: Request, res: Response) {
    // Validate request data - now expects { body: { cmsItemId, type, options } }
    const validatedData = seoGenerationSchema.parse({ body: req.body });
    
    this.logger.info('[AiAssistantController] Debug validation result:', {
      validatedData,
      bodyData: validatedData.body,
      cmsItemId: validatedData.body.cmsItemId,
      type: validatedData.body.type
    });
    
    this.logger.info(`[AiAssistantController] Generating SEO for CMS item ${validatedData.body.cmsItemId}`);
    
    // Generate SEO data - use validatedData.body.cmsItemId
    const seoData = await this.aiAssistantService.generateSeoFromContent(validatedData.body.cmsItemId);
    
    this.logger.info(`[AiAssistantController] SEO generated successfully for CMS item ${validatedData.body.cmsItemId}`);
    
    return seoData;
  }
}