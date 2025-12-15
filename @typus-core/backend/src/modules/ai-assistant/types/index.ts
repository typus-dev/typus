export interface SeoGenerationRequest {
  cmsItemId: number;
  type: 'seo-generation';
  options?: {
    includeKeywords?: boolean;
    maxTitleLength?: number;
    maxDescriptionLength?: number;
  };
}

export interface SeoGenerationResponse {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
}

export interface AiAssistantRequest {
  cmsItemId: number;
  type: string;
  options?: Record<string, any>;
}

export interface CmsItemData {
  id: number;
  title: string;
  content: string;
  sitePath?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}
