// Export module
export { AiAssistantModule } from './AiAssistantModule';

// Export controllers
export { AiAssistantController } from './controllers/AiAssistantController';

// Export services
export { AiAssistantService } from './services/AiAssistantService';

// Export types
export type { 
  SeoGenerationResponse, 
  CmsItemData 
} from './types';

// Export DTOs
export * from './dto/AiAssistantDto';

// Export validation schemas
export { 
  seoGenerationSchema, 
  aiAssistantRequestSchema 
} from './validation/aiAssistantSchemas';
export type { 
  SeoGenerationRequest as SeoGenerationRequestSchema, 
  AiAssistantRequest as AiAssistantRequestSchema 
} from './validation/aiAssistantSchemas';

// Import for default export
import { AiAssistantModule as Module } from './AiAssistantModule';

// Default export for module loader
export default { AiAssistantModule: Module };
