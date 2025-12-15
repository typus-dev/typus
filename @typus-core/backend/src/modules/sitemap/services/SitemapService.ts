import { BaseService } from '@/core/base/BaseService.js';
import { inject, injectable } from 'tsyringe';
import { DynamicRouterService } from '@/dynamic-router/services/DynamicRouterService.js';
import { COMPONENT_TYPES } from '../../cms/services/StaticPagesService.js';
import {
  SitemapUrl,
  RouteInfo,
  SitemapGenerationOptions,
  SitemapStats,
  GenerateSitemapResponse
} from '../types';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Service for generating XML sitemaps
 */
@injectable()
export class SitemapService extends BaseService {
  private frontendUrl: string;
  private baseUrl: string;
  private sitemapPath: string;

  constructor(
    @inject(DynamicRouterService) private dynamicRouterService: DynamicRouterService
  ) {
    super();
    this.frontendUrl = process.env.FRONTEND_URL;
    this.baseUrl = global.runtimeConfig.siteUrl;
    // Sitemap in public folder alongside robots.txt
    this.sitemapPath = path.join(process.env.PROJECT_PATH || '/app', 'public/sitemap.xml');
  }

  /**
   * Generate complete sitemap
   */
  async generateSitemap(options: SitemapGenerationOptions = {}): Promise<GenerateSitemapResponse> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      this.logger.info('[SitemapService] Starting sitemap generation', { options });

      // Set defaults
      const opts = {
        includeStaticRoutes: options.includeStaticRoutes ?? true,
        includeDynamicRoutes: options.includeDynamicRoutes ?? true,
        generateCache: options.generateCache ?? false,
        baseUrl: options.baseUrl || this.baseUrl,
        ...options
      };

      // Ensure baseUrl is properly set (fix for undefined issue)
      if (!opts.baseUrl || opts.baseUrl === 'undefined') {
        opts.baseUrl = this.baseUrl;
        this.logger.warn('[SitemapService] baseUrl was undefined, using fallback:', this.baseUrl);
      }

      this.logger.debug('[SitemapService] Configuration:', {
        baseUrl: opts.baseUrl,
        envBaseUrl: this.baseUrl,
        optionsBaseUrl: options.baseUrl
      });

      const urls: SitemapUrl[] = [];
      let staticCount = 0;
      let dynamicCount = 0;

      // 1. Get static routes from frontend
      if (opts.includeStaticRoutes) {
        try {
          const staticRoutes = await this.getStaticRoutes();
          const staticUrls = this.convertRoutesToSitemapUrls(staticRoutes, opts.baseUrl);
          urls.push(...staticUrls);
          staticCount = staticUrls.length;
          this.logger.info(`[SitemapService] Added ${staticCount} static routes`);
          this.logger.info('--- STATIC ROUTES FROM FRONTEND ---', staticRoutes);
        } catch (error) {
          const errorMsg = `Failed to fetch static routes: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.error('[SitemapService]', errorMsg);
        }
      }

      // 2. Get dynamic routes from database
      if (opts.includeDynamicRoutes) {
        try {
          const dynamicRoutes = await this.getDynamicRoutes();
          const dynamicUrls = this.convertDynamicRoutesToSitemapUrls(dynamicRoutes, opts.baseUrl);
          urls.push(...dynamicUrls);
          dynamicCount = dynamicUrls.length;
          this.logger.info(`[SitemapService] Added ${dynamicCount} dynamic routes`);
          this.logger.info('--- DYNAMIC ROUTES FROM DATABASE ---', dynamicRoutes);
        } catch (error) {
          const errorMsg = `Failed to fetch dynamic routes: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.error('[SitemapService]', errorMsg);
        }
      }
      // 3. Ensure root page is always included before deduplication
      const rootUrl = `${opts.baseUrl}/`;
      if (!urls.some(url => url.loc === rootUrl)) {
        urls.push({
          loc: rootUrl,
          changefreq: 'daily',
          priority: 1.0,
          lastmod: new Date().toISOString().split('T')[0]
        });
        this.logger.info('[SitemapService] Added missing root page to sitemap');
      }

      // 4. Remove duplicates and sort by priority
      const uniqueUrls = this.deduplicateUrls(urls);
      const sortedUrls = uniqueUrls.sort((a, b) => b.priority - a.priority);
      this.logger.info('--- FINAL UNIQUE URLS FOR SITEMAP ---', sortedUrls.map(u => u.loc));

      // 5. Generate XML sitemap
      const sitemapXml = this.generateSitemapXml(sortedUrls);

      // 6. Save sitemap to file
      await this.saveSitemap(sitemapXml);


      const generationTime = Date.now() - startTime;
      const stats: SitemapStats = {
        totalUrls: sortedUrls.length,
        staticRoutes: staticCount,
        dynamicRoutes: dynamicCount,
        lastGenerated: new Date(),
        generationTime
      };

      this.logger.info('[SitemapService] Sitemap generation completed', {
        stats,
        errorsCount: errors.length
      });

      // 6. Cache generation is now handled by separate CLI tool
      let cacheGenerated = false;
      if (opts.generateCache) {
        this.logger.info('[SitemapService] Cache generation requested but will be handled by separate CLI tool');
        this.logger.info('[SitemapService] Use: pnpm run cache:warmup in tools directory');
        cacheGenerated = false; // Will be handled externally
      }

      return {
        success: errors.length === 0,
        stats,
        sitemapUrl: `${opts.baseUrl}/sitemap.xml`,
        cacheGenerated,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const errorMsg = `Sitemap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error('[SitemapService]', errorMsg);

      return {
        success: false,
        stats: {
          totalUrls: 0,
          staticRoutes: 0,
          dynamicRoutes: 0,
          lastGenerated: null
        },
        errors: [errorMsg]
      };
    }
  }


private async getStaticRoutes(): Promise<RouteInfo[]> {
  try {
    this.logger.info('[SitemapService] FRONTEND_URL:', this.frontendUrl);

    const isProd = process.env.NODE_ENV?.toLowerCase() === 'production'

    let routesData: RouteInfo[] = [];

    if (isProd) {
      const httpUrl = new URL('/routes.json', process.env.FRONTEND_URL).toString();
      this.logger.info(`[SitemapService] Production mode — loading routes from ${httpUrl}`);
      const { data } = await axios.get(httpUrl, { timeout: 5000 });
      if (!Array.isArray(data)) throw new Error('Invalid routes.json format from HTTP');
      routesData = data;
    } else {
      const basePath = process.env.PROJECT_PATH || '/app';
      const possiblePaths = [
        path.join(basePath, '@typus-core/frontend/public/routes.json'),
      ];

      for (const routesPath of possiblePaths) {
        try {
          await fs.access(routesPath);
          const content = await fs.readFile(routesPath, 'utf8');
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed)) throw new Error('Invalid routes.json format');
          routesData = parsed;
          this.logger.info(`[SitemapService] Successfully loaded routes from: ${routesPath}`);
          break;
        } catch {
          this.logger.debug(`[SitemapService] Routes not found at: ${routesPath}`);
        }
      }

      if (!routesData.length) {
        throw new Error('routes.json not found in dev paths');
      }
    }

    this.logger.info(`[SitemapService] Loaded ${routesData.length} static routes`);
    return routesData;
  } catch (error) {
    this.logger.error('[SitemapService] Failed to load static routes:', error);
    throw error;
  }
}



  /**
   * Get dynamic routes from database
   * Excludes Redirect components - they should not appear in sitemap
   */
  private async getDynamicRoutes(): Promise<Array<{ path: string; updatedAt: Date }>> {
    const routes = await this.dynamicRouterService.getRoutes();

    return routes
      .filter(route =>
        route.isActive &&
        route.component !== COMPONENT_TYPES.REDIRECT  // Exclude redirects from sitemap
      )
      .map(route => ({
        path: route.path,
        updatedAt: route.updatedAt
      }));
  }

  /**
   * Calculate priority based on URL path depth and type
   */
  private calculatePriorityByPath(path: string): number {
    // Remove trailing slash and split by '/'
    const segments = path.replace(/\/$/, '').split('/').filter(Boolean);
    const depth = segments.length;

    // Homepage gets highest priority
    if (path === '/') return 1.0;

    // Calculate base priority by depth (deeper = lower priority)
    let basePriority: number;
    switch (depth) {
      case 1: basePriority = 0.9; break;  // /about, /features
      case 2: basePriority = 0.7; break;  // /docs/overview
      case 3: basePriority = 0.5; break;  // /docs/backend/overview
      case 4: basePriority = 0.3; break;  // /demo/system/login
      default: basePriority = 0.2; break; // 5+ levels deep
    }

    // Adjust priority based on path type
    const firstSegment = segments[0];

    // Boost important sections
    if (firstSegment === 'docs') basePriority += 0.1;
    if (firstSegment === 'getting-started') basePriority = 0.9;

    // Lower priority for less important sections
    if (firstSegment === 'demo') basePriority *= 0.5;
    if (firstSegment === 'auth') basePriority *= 0.4;

    // Ensure priority stays within valid range
    return Math.min(Math.max(basePriority, 0.1), 1.0);
  }

  /**
   * Convert static routes to sitemap URLs (updated to use path-based priority)
   */
  private convertRoutesToSitemapUrls(routes: RouteInfo[], baseUrl: string): SitemapUrl[] {
    return routes.map(route => ({
      loc: `${baseUrl}${route.path}`,
      changefreq: this.normalizeChangeFreq(route.changefreq),
      priority: this.calculatePriorityByPath(route.path), // Use path-based calculation
      lastmod: new Date().toISOString().split('T')[0]
    }));
  }

  /**
   * Convert dynamic routes to sitemap URLs (updated to use path-based priority)
   */
  private convertDynamicRoutesToSitemapUrls(
    routes: Array<{ path: string; updatedAt: Date }>,
    baseUrl: string
  ): SitemapUrl[] {
    return routes.map(route => ({
      loc: `${baseUrl}${route.path}`,
      changefreq: 'weekly' as const,
      priority: this.calculatePriorityByPath(route.path), // Use path-based calculation
      lastmod: route.updatedAt.toISOString().split('T')[0]
    }));
  }

  /**
   * Remove duplicate URLs (prefer higher priority)
   */
  private deduplicateUrls(urls: SitemapUrl[]): SitemapUrl[] {
    const urlMap = new Map<string, SitemapUrl>();

    for (const url of urls) {
      const existing = urlMap.get(url.loc);
      if (!existing || url.priority > existing.priority) {
        urlMap.set(url.loc, url);
      }
    }

    return Array.from(urlMap.values());
  }

  /**
   * Generate XML sitemap content
   */
  private generateSitemapXml(urls: SitemapUrl[]): string {
    this.logger.info(`[SitemapService] Generating XML sitemap for ${urls.length} URLs`);

    const urlElements = urls.map(url => {
      let urlXml = `  <url>\n    <loc>${this.escapeXml(url.loc)}</loc>\n`;

      if (url.lastmod) {
        urlXml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }

      urlXml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      urlXml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      urlXml += `  </url>`;

      return urlXml;
    }).join('\n');

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;

    this.logger.info(`[SitemapService] Generated XML sitemap with ${urls.length} URLs`);

    return sitemapXml;
  }

  /**
   * Save sitemap to cache directory where NGINX expects it
   */
  private async saveSitemap(sitemapXml: string): Promise<void> {
    try {
      // Primary location: storage/cache/html/sitemap.xml (where NGINX looks for it)
      const primaryPath = this.sitemapPath;
      const dir = path.dirname(primaryPath);

      this.logger.info(`[SitemapService] Creating cache directory: ${dir}`);
      await fs.mkdir(dir, { recursive: true });

      this.logger.info(`[SitemapService] Writing sitemap to cache: ${primaryPath}`);
      await fs.writeFile(primaryPath, sitemapXml, 'utf8');

      // Verify file was created
      const stats = await fs.stat(primaryPath);
      this.logger.info(`[SitemapService] ✓ Sitemap saved successfully: ${primaryPath} (${stats.size} bytes)`);

      // Also save to public directory for development access
      const publicPath = path.join(process.env.PROJECT_PATH || '/app', '@typus-core/frontend/public/sitemap.xml');
      try {
        const publicDir = path.dirname(publicPath);
        await fs.mkdir(publicDir, { recursive: true });
        await fs.writeFile(publicPath, sitemapXml, 'utf8');
        this.logger.info(`[SitemapService] ✓ Sitemap also saved to public: ${publicPath}`);
      } catch (error) {
        this.logger.warn(`[SitemapService] Could not save to public directory: ${error}`);
      }

      // Output the sitemap content to console for debugging
      this.logger.info('[SitemapService] Generated sitemap content:');
      this.logger.info('--- GENERATED SITEMAP XML ---');
      this.logger.info(sitemapXml);
      this.logger.info('--- END OF SITEMAP XML ---');

    } catch (error) {
      this.logger.error(`[SitemapService] ✗ Failed to save sitemap:`, error);
      throw error;
    }
  }


  /**
   * Get all URLs for caching (without generating cache)
   */
  async getUrlsForCaching(): Promise<string[]> {
    try {
      this.logger.info('[SitemapService] Getting URLs for caching');

      const urls: string[] = [];
      let staticCount = 0;
      let dynamicCount = 0;

      // 1. Get static routes from frontend
      try {
        const staticRoutes = await this.getStaticRoutes();
        const staticPaths = staticRoutes.map(route => route.path);
        urls.push(...staticPaths);
        staticCount = staticPaths.length;
        this.logger.info(`[SitemapService] Added ${staticCount} static routes for caching`);
      } catch (error) {
        this.logger.warn('[SitemapService] Failed to fetch static routes for caching:', error instanceof Error ? error.message : 'Unknown error');
      }

      // 2. Get dynamic routes from database
      try {
        const dynamicRoutes = await this.getDynamicRoutes();
        const dynamicPaths = dynamicRoutes.map(route => route.path);
        urls.push(...dynamicPaths);
        dynamicCount = dynamicPaths.length;
        this.logger.info(`[SitemapService] Added ${dynamicCount} dynamic routes for caching`);
      } catch (error) {
        this.logger.warn('[SitemapService] Failed to fetch dynamic routes for caching:', error instanceof Error ? error.message : 'Unknown error');
      }

      // 3. Remove duplicates
      const uniqueUrls = [...new Set(urls)];

      this.logger.info(`[SitemapService] Total URLs for caching: ${uniqueUrls.length} (${staticCount} static + ${dynamicCount} dynamic)`);

      return uniqueUrls;

    } catch (error) {
      this.logger.error('[SitemapService] Failed to get URLs for caching:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Combine static routes from frontend with dynamic routes from database
   */
  async combineRoutes(staticRoutes: RouteInfo[]): Promise<SitemapUrl[]> {
    try {
      this.logger.info('[SitemapService] Combining static and dynamic routes', {
        staticRoutesCount: staticRoutes.length
      });

      const urls: SitemapUrl[] = [];

      // 1. Convert static routes to sitemap URLs
      const staticUrls = staticRoutes.map(route => ({
        loc: route.path,
        changefreq: this.normalizeChangeFreq(route.changefreq),
        priority: route.priority,
        lastmod: new Date().toISOString().split('T')[0]
      })) as SitemapUrl[];

      urls.push(...staticUrls);
      this.logger.info(`[SitemapService] Added ${staticUrls.length} static routes`);

      // 2. Get dynamic routes from database
      try {
        const dynamicRoutes = await this.getDynamicRoutes();
        const dynamicUrls = dynamicRoutes.map(route => ({
          loc: route.path,
          changefreq: 'weekly' as const,
          priority: 0.8,
          lastmod: route.updatedAt.toISOString().split('T')[0]
        })) as SitemapUrl[];

        urls.push(...dynamicUrls);
        this.logger.info(`[SitemapService] Added ${dynamicUrls.length} dynamic routes`);
      } catch (error) {
        this.logger.warn('[SitemapService] Failed to fetch dynamic routes:', error instanceof Error ? error.message : 'Unknown error');
      }

      // 3. Remove duplicates and sort by priority
      const uniqueUrls = this.deduplicateUrls(urls);
      const sortedUrls = uniqueUrls.sort((a, b) => b.priority - a.priority);

      this.logger.info(`[SitemapService] Combined routes result: ${sortedUrls.length} total URLs`);

      return sortedUrls;

    } catch (error) {
      this.logger.error('[SitemapService] Failed to combine routes:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Extract path from full URL
   */
  private extractPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      // If URL parsing fails, assume it's already a path
      return url.startsWith('/') ? url : `/${url}`;
    }
  }

  /**
   * Normalize change frequency to valid sitemap values
   */
  private normalizeChangeFreq(freq: string): SitemapUrl['changefreq'] {
    const validFreqs: SitemapUrl['changefreq'][] = [
      'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'
    ];

    const normalized = freq.toLowerCase() as SitemapUrl['changefreq'];
    return validFreqs.includes(normalized) ? normalized : 'weekly';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&' + 'amp;')
      .replace(/</g, '&' + 'lt;')
      .replace(/>/g, '&' + 'gt;')
      .replace(/"/g, '&' + 'quot;')
      .replace(/'/g, '&' + 'apos;');
  }

  /**
   * Get sitemap statistics
   */
  async getSitemapStats(): Promise<SitemapStats | null> {
    try {
      const stats = await fs.stat(this.sitemapPath);
      const content = await fs.readFile(this.sitemapPath, 'utf8');

      // Count URLs in sitemap
      const urlMatches = content.match(/<url>/g);
      const totalUrls = urlMatches ? urlMatches.length : 0;

      return {
        totalUrls,
        staticRoutes: 0, // Would need to store this separately
        dynamicRoutes: 0, // Would need to store this separately
        lastGenerated: stats.mtime
      };
    } catch (error) {
      this.logger.warn('[SitemapService] Could not read sitemap stats:', error);
      return null;
    }
  }
}
