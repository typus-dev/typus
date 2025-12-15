import { z } from 'zod';

/**
 * Schema for generating cache for a specific URL
 */
export const generateCacheSchema = z.object({
  body: z.object({
    url: z.string().min(1, 'URL is required'),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    force: z.boolean().default(false)
  })
});

/**
 * Schema for invalidating cache
 */
export const invalidateCacheSchema = z.object({
  body: z.object({
    url: z.string().min(1, 'URL is required').optional(),
    pattern: z.string().optional()
  }).refine(data => data.url || data.pattern, {
    message: "Either URL or pattern must be provided",
    path: ["body"]
  })
});

/**
 * Schema for cache statistics request
 */
export const cacheStatsSchema = z.object({
  query: z.object({
    detailed: z.string().transform(val => val === 'true').default('false')
  }).optional()
});

/**
 * Schema for URL parameter validation
 */
export const urlParamSchema = z.object({
  params: z.object({
    url: z.string().min(1, 'URL parameter is required')
  })
});

/**
 * Schema for SEO data sitePath parameter validation
 */
export const seoDataParamSchema = z.object({
  params: z.object({
    sitePath: z.string().min(1, 'Site path parameter is required')
  })
});

/**
 * Schema for warm cache request
 */
export const warmCacheSchema = z.object({
  body: z.object({
    urls: z.array(z.string()).optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal')
  })
});

// Export types for TypeScript
export type GenerateCacheDTO = z.infer<typeof generateCacheSchema.shape.body>;
export type InvalidateCacheDTO = z.infer<typeof invalidateCacheSchema.shape.body>;
export type WarmCacheDTO = z.infer<typeof warmCacheSchema.shape.body>;
