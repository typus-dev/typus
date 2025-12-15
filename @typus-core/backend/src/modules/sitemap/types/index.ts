/**
 * Sitemap module types and interfaces
 */

export interface RouteInfo {
  name: string;
  path: string;
  priority: number;
  changefreq: string;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export interface SitemapGenerationOptions {
  includeStaticRoutes?: boolean;
  includeDynamicRoutes?: boolean;
  generateCache?: boolean;
  baseUrl?: string;
}

export interface SitemapStats {
  totalUrls: number;
  staticRoutes: number;
  dynamicRoutes: number;
  lastGenerated: Date | null;
  generationTime?: number;
}

export interface GenerateSitemapRequest {
  options?: SitemapGenerationOptions;
}

export interface GenerateSitemapResponse {
  success: boolean;
  stats: SitemapStats;
  sitemapUrl?: string;
  cacheGenerated?: boolean;
  errors?: string[];
}

export interface DynamicRoute {
  id: string;
  path: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
