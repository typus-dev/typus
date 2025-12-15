import { z } from 'zod';

/**
 * Validation schemas for sitemap module
 */

export const SitemapGenerationOptionsSchema = z.object({
  includeStaticRoutes: z.boolean().optional().default(true),
  includeDynamicRoutes: z.boolean().optional().default(true),
  // Support both naming conventions for backward compatibility
  includeStatic: z.boolean().optional(),
  includeDynamic: z.boolean().optional(),
  generateCache: z.boolean().optional().default(false),
  baseUrl: z.string().url().optional()
}).transform((data) => {
  // Map short names to full names if provided
  return {
    includeStaticRoutes: data.includeStatic ?? data.includeStaticRoutes,
    includeDynamicRoutes: data.includeDynamic ?? data.includeDynamicRoutes,
    generateCache: data.generateCache,
    baseUrl: data.baseUrl
  };
});

export const GenerateSitemapRequestSchema = z.object({
  options: SitemapGenerationOptionsSchema.optional()
});

export const SitemapUrlSchema = z.object({
  loc: z.string().url(),
  lastmod: z.string().optional(),
  changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']),
  priority: z.number().min(0).max(1)
});

export const RouteInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  priority: z.number().min(0).max(1),
  changefreq: z.string()
});

export const DynamicRouteSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type SitemapGenerationOptions = z.infer<typeof SitemapGenerationOptionsSchema>;
export type GenerateSitemapRequest = z.infer<typeof GenerateSitemapRequestSchema>;
export type SitemapUrl = z.infer<typeof SitemapUrlSchema>;
export type RouteInfo = z.infer<typeof RouteInfoSchema>;
export type DynamicRoute = z.infer<typeof DynamicRouteSchema>;
