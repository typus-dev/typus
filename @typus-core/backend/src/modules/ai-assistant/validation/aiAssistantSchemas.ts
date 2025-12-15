import { z } from 'zod';

export const seoGenerationSchema = z.object({
  body: z.object({
    cmsItemId: z.number().int().positive(),
    type: z.literal('seo-generation'),
    options: z.object({
      includeKeywords: z.boolean().optional(),
      maxTitleLength: z.number().int().min(30).max(100).optional(),
      maxDescriptionLength: z.number().int().min(100).max(300).optional()
    }).optional()
  })
});

export const aiAssistantRequestSchema = z.object({
  body: z.object({
    cmsItemId: z.number().int().positive(),
    type: z.string(),
    options: z.record(z.any()).optional()
  })
});

export type SeoGenerationRequest = z.infer<typeof seoGenerationSchema>;
export type AiAssistantRequest = z.infer<typeof aiAssistantRequestSchema>;