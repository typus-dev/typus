import { BaseService } from '@/core/base/BaseService.js';
import { Service } from '@/core/decorators/component.js';
import { BadRequestError, NotFoundError } from '@/core/base/BaseError.js';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { inject } from 'tsyringe';
import { ConfigService } from '@/modules/system/services/ConfigService.js';
import { DynamicRouterService } from '@/dynamic-router/services/DynamicRouterService.js';
import { PublicLayoutTemplate } from '../templates/PublicLayoutTemplate.js';
import { renderDxceContentForStaticCache } from '../utils/dxceRenderer.js';
import {
  LayoutTemplateService,
  LayoutRenderContext,
  LayoutNavItem,
  LayoutFooterLink,
  LayoutContactInfo
} from './LayoutTemplateService.js';
import { getThemeLinksGenerator } from '@/core/html-generator/ThemeLinksGenerator.js';
import { SOURCE_TYPES } from '../../cms/services/StaticPagesService.js';
import Handlebars from 'handlebars';

/**
 * Priority levels for cache generation
 */
export type CachePriority = 'low' | 'normal' | 'high';

/**
 * Cache statistics interface
 */
export interface CacheStats {
  totalFiles: number;
  totalSize: number;
  lastGenerated: Date | null;
  urls: string[];
}

/**
 * Cache generation result interface
 */
export interface CacheGenerationResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * HTML Cache Service
 * Handles cache management and communicates with the HTML Cache Generator service
 */
@Service()
export class HtmlCacheService extends BaseService {
  private readonly cacheBasePath: string;
  private readonly cacheGeneratorUrl: string;
  private readonly isEnabled: boolean;

  constructor(
    @inject(ConfigService) private configService: ConfigService,
    @inject(LayoutTemplateService) private layoutTemplateService: LayoutTemplateService,
    @inject(DynamicRouterService) private dynamicRouterService: DynamicRouterService
  ) {
    super();

    // Initialize configuration from environment variables
    // Use /app/storage/html/cache (absolute path in container, matches docker volume mount)
    // Static uploads go to /app/storage/html/static (handled by StaticPagesService)
    this.cacheBasePath = '/app/storage/html/cache';
    // Cache generator URL loaded dynamically from ConfigService (see getCacheGeneratorUrl method)
    this.cacheGeneratorUrl = ''; // Will be loaded from database config
    this.isEnabled = process.env.HTML_CACHE_ENABLED === 'true';

    this.logger.info('[HtmlCacheService] Initialized', {
      cacheBasePath: this.cacheBasePath,
      isEnabled: this.isEnabled
    });
  }

  /**
   * Get cache generator URL from config with fallback chain
   * Priority: Database → .env → default
   */
  private async getCacheGeneratorUrl(): Promise<string> {
    // Try database first
    const dbUrl = await this.configService.get('cache.html_generator_url');
    if (dbUrl) return dbUrl;

    // Fallback to .env
    if (process.env.HTML_CACHE_GENERATOR_URL) {
      return process.env.HTML_CACHE_GENERATOR_URL;
    }

    // Default fallback
    return 'http://cache_generator_service:3100';
  }

  /**
 * Generate HTML cache for a specific URL (updated to ensure DB sync)
 */
async generateCacheForUrl(url: string, priority: CachePriority = 'normal', force: boolean = false): Promise<boolean> {
  if (!this.isEnabled) {
    this.logger.warn('[HtmlCacheService] Cache generation disabled, skipping.');
    return false;
  }

  // Check if URL is a user-uploaded static page (source=upload)
  // These should NOT be overwritten by cache regeneration
  try {
    const route = await this.dynamicRouterService.resolveRoute(url);
    if (route?.meta?.source === SOURCE_TYPES.UPLOAD) {
      this.logger.warn(`[HtmlCacheService] Skipping cache generation for upload source: ${url}`);
      return false;
    }
  } catch {
    // Route not found in dynamic_routes - proceed with cache generation
  }

  // If force is true, delete existing cache first
  if (force) {
    this.logger.info(`[HtmlCacheService] Force regeneration requested, invalidating existing cache for: ${url}`);
    await this.invalidateUrl(url);
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      this.logger.info(`[Attempt ${attempt}/${maxRetries}] Requesting cache generation for URL: ${url} (force: ${force})`);

      // 1. Ask the generator service to create the cache file
      const cacheGeneratorUrl = await this.getCacheGeneratorUrl();
      const response = await axios.post(`${cacheGeneratorUrl}/generate`, { url, priority, force }, {
        headers: { 'X-Internal-Request-Secret': process.env.HTML_CACHE_API_SECRET },
        timeout: 60000,
      });

      if (!response.data.success) {
        throw new Error(`Cache generator service failed: ${response.data.error || 'Unknown error'}`);
      }

      // 2. Validate the generated cache file
      const cachePath = this.getCachePath(url);
      const isValid = await this.validateCacheFile(cachePath);

      if (isValid) {
        this.logger.info(`[HtmlCacheService] Successfully generated and validated cache for ${url}`);

        // 3. AUTOMATICALLY UPDATE CMS DATABASE
        try {
          await this.updateCmsCacheInfo(url, cachePath);
          this.logger.info(`[HtmlCacheService] Database updated for ${url}`);
        } catch (dbError) {
          this.logger.error(`[HtmlCacheService] Failed to update CMS cache info for ${url}:`, dbError);
          // Don't fail the cache generation if DB update fails
        }

        return true;
      } else {
        throw new Error(`Generated cache for ${url} failed validation (is it a 404 page?).`);
      }

    } catch (error) {
      this.logger.warn(`[Attempt ${attempt}/${maxRetries}] Failed to generate cache for ${url}: ${error.message}`);
      
      if (attempt === maxRetries) {
        this.logger.error(`[HtmlCacheService] All ${maxRetries} attempts failed for ${url}. Giving up.`);
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  return false;
}

/**
 * Invalidate cache for a specific URL or pattern (updated to ensure DB sync)
 */
async invalidateUrl(url?: string, pattern?: string): Promise<number> {
  try {
    let deletedCount = 0;

    if (url) {
      const cachePath = this.getCachePath(url);
      const deleted = await this.deleteCacheFile(cachePath);
      if (deleted) {
        deletedCount++;
        
        // AUTOMATICALLY UPDATE CMS DATABASE
        try {
          await this.clearCmsCacheInfo(url);
          this.logger.info(`[HtmlCacheService] Database cache info cleared for ${url}`);
        } catch (dbError) {
          this.logger.error(`[HtmlCacheService] Failed to clear CMS cache info for ${url}:`, dbError);
          // Don't fail the invalidation if DB update fails
        }
      }
      this.logger.info(`[HtmlCacheService] Invalidated cache for URL: ${url}`);
    }

    if (pattern) {
      deletedCount += await this.deleteCacheByPattern(pattern);
      this.logger.info(`[HtmlCacheService] Invalidated cache for pattern: ${pattern}`);
    }

    return deletedCount;
  } catch (error) {
    this.logger.error('[HtmlCacheService] Failed to invalidate cache:', error);
    throw new BadRequestError('Failed to invalidate cache');
  }
}
  /**
   * NEW HELPER METHOD: Validate a cache file to ensure it's not a skeleton or error page.
   */
  private async validateCacheFile(filePath: string): Promise<boolean> {
      try {
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Validation 1: Check for minimum size. A real page should be larger than a simple skeleton.
          if (content.length < 1500) { // 1.5 KB threshold
              this.logger.warn(`Validation failed: content is too short (${content.length} bytes) for file ${filePath}`);
              return false;
          }

          // Validation 2: Check for text that only appears on a 404 page.
          // Adjust "Page Not Found" to match the text on your 404 page.
          if (content.toLowerCase().includes('page not found') || content.toLowerCase().includes('error 404')) {
              this.logger.warn(`Validation failed: content contains 404 text for file ${filePath}`);
              return false;
          }

          return true;
      } catch (error) {
          this.logger.error(`Validation failed: could not read cache file ${filePath}`, error);
          return false;
      }
  }

  /**
   * Generate cache for multiple URLs
   */
async generateCacheForUrls(urls: string[], priority: CachePriority = 'normal'): Promise<CacheGenerationResult> {
    if (!this.isEnabled) {
      this.logger.warn('[HtmlCacheService] Cache generation disabled');
      return { success: 0, failed: urls.length, errors: ['Cache generation disabled'] };
    }

    try {
      this.logger.info(`[HtmlCacheService] Requesting batch cache generation for ${urls.length} URLs`);

      const cacheGeneratorUrl = await this.getCacheGeneratorUrl();
      const response = await axios.post(`${cacheGeneratorUrl}/generate-batch`, {
        urls,
        priority
      }, {
        timeout: 300000 // 5 minutes timeout for batch operations
      });

      if (response.data.success) {
        this.logger.info(`[HtmlCacheService] Batch cache generation completed:`, response.data.data);
        return response.data.data;
      } else {
        this.logger.error(`[HtmlCacheService] Batch cache generation failed:`, response.data.error);
        return { success: 0, failed: urls.length, errors: [response.data.error] };
      }

    } catch (error) {
      this.logger.error(`[HtmlCacheService] Failed to generate batch cache:`, error);
      const errorMessage = axios.isAxiosError(error) ? error.message : 'Unknown error';
      return { success: 0, failed: urls.length, errors: [errorMessage] };
    }
  }

  /**
   * Generate cache from sitemap
   */
async generateCacheFromSitemap(sitemapUrl?: string, priority: CachePriority = 'normal'): Promise<CacheGenerationResult> {
    if (!this.isEnabled) {
      this.logger.warn('[HtmlCacheService] Cache generation disabled');
      return { success: 0, failed: 0, errors: ['Cache generation disabled'] };
    }

    try {
      this.logger.info(`[HtmlCacheService] Requesting cache generation from sitemap`);

      const cacheGeneratorUrl = await this.getCacheGeneratorUrl();
      const response = await axios.post(`${cacheGeneratorUrl}/generate-from-sitemap`, {
        sitemapUrl,
        priority
      }, {
        timeout: 600000 // 10 minutes timeout for sitemap operations
      });

      if (response.data.success) {
        this.logger.info(`[HtmlCacheService] Sitemap cache generation completed:`, response.data.data);
        return response.data.data;
      } else {
        this.logger.error(`[HtmlCacheService] Sitemap cache generation failed:`, response.data.error);
        return { success: 0, failed: 0, errors: [response.data.error] };
      }

    } catch (error) {
      this.logger.error(`[HtmlCacheService] Failed to generate cache from sitemap:`, error);
      const errorMessage = axios.isAxiosError(error) ? error.message : 'Unknown error';
      return { success: 0, failed: 0, errors: [errorMessage] };
    }
  }


  /**
   * Get cache statistics
   */
 async getCacheStats(detailed: boolean = false): Promise<CacheStats> {
    try {
      const stats: CacheStats = {
        totalFiles: 0,
        totalSize: 0,
        lastGenerated: null,
        urls: []
      };

      // Check if cache directory exists
      const cacheExists = await this.directoryExists(this.cacheBasePath);
      if (!cacheExists) {
        return stats;
      }

      // Recursively scan cache directory
      await this.scanCacheDirectory(this.cacheBasePath, stats, detailed);

      this.logger.debug('[HtmlCacheService] Cache statistics:', stats);
      return stats;
    } catch (error) {
      this.logger.error('[HtmlCacheService] Failed to get cache stats:', error);
      throw new BadRequestError('Failed to get cache statistics');
    }
  }
  /**
   * Clear all cache
   */
async clearAllCache(): Promise<number> {
    try {
      const stats = await this.getCacheStats();
      const deletedCount = stats.totalFiles;

      // Remove entire cache directory
      const cacheExists = await this.directoryExists(this.cacheBasePath);
      if (cacheExists) {
        await fs.rm(this.cacheBasePath, { recursive: true, force: true });
        this.logger.info(`[HtmlCacheService] Cleared all cache (${deletedCount} files)`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('[HtmlCacheService] Failed to clear cache:', error);
      throw new BadRequestError('Failed to clear cache');
    }
  }


  /**
   * Warm cache for multiple URLs
   */
 async warmCache(urls?: string[], priority: CachePriority = 'normal'): Promise<CacheGenerationResult> {
    if (!urls || urls.length === 0) {
      // Generate cache from sitemap if no URLs provided
      return await this.generateCacheFromSitemap(undefined, priority);
    }

    return await this.generateCacheForUrls(urls, priority);
  }
  /**
   * Get cache file path for a URL
   */
  /**
   * Get cache file path for a URL.
   * Creates a flat file structure (e.g., /docs/overview.html)
   * and a specific index.html for the root URL (/).
   */
  getCachePath(url: string): string {
    // Normalize URL to always start with /
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    
    this.logger.debug('[HtmlCacheService.getCachePath] Input URL:', { 
      originalUrl: url, 
      normalizedUrl,
      cacheBasePath: this.cacheBasePath 
    });
    
    // Handle the root URL specifically
    if (normalizedUrl === '/') {
        const rootPath = path.join(this.cacheBasePath, 'index.html');
        this.logger.debug('[HtmlCacheService.getCachePath] Root URL path:', { rootPath });
        return rootPath;
    }

    // Create a safe path by removing invalid characters and trailing slashes
    const safePath = normalizedUrl
      .replace(/[^a-zA-Z0-9\/\-_.]/g, '_')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
    
    // Add .html extension and join with the base path
    const finalPath = path.join(this.cacheBasePath, `${safePath}.html`);
    
    this.logger.debug('[HtmlCacheService.getCachePath] Generated path:', { 
      normalizedUrl, 
      safePath, 
      finalPath 
    });
    
    return finalPath;
  }


  /**
   * Check if cache generator service is healthy
   */
  async checkCacheGeneratorHealth(): Promise<boolean> {
    try {
      const cacheGeneratorUrl = await this.getCacheGeneratorUrl();
      const response = await axios.get(`${cacheGeneratorUrl}/health`, {
        timeout: 5000
      });
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error('[HtmlCacheService] Cache generator health check failed:', error);
      return false;
    }
  }
  /**
   * Get cache generator service status
   */
   async getCacheGeneratorStatus(): Promise<any> {
    try {
      const cacheGeneratorUrl = await this.getCacheGeneratorUrl();
      const response = await axios.get(`${cacheGeneratorUrl}/status`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      this.logger.error('[HtmlCacheService] Failed to get cache generator status:', error);
      throw new BadRequestError('Failed to get cache generator status');
    }
  }

  /**
   * Clear CMS database cache information on invalidation
   */
  private async clearCmsCacheInfo(sitePath: string): Promise<void> {
    try {
      // Find CMS item by sitePath
      const cmsItem = await this.prisma.cmsItem.findFirst({
        where: { sitePath: sitePath }
      });

      if (!cmsItem) {
        this.logger.warn(`[HtmlCacheService] No CMS item found for sitePath: ${sitePath}`);
        return;
      }

      // Prepare cache info data with exists = false
      const cacheInfo = {
        exists: false,
        size: 0,
        lastModified: null
      };

      // Update CMS item with cache info via DSL API
      const payload = {
        model: 'CmsItem',
        operation: 'update',
        data: { cacheInfo },
        filter: { id: parseInt(cmsItem.id.toString()) }
      };

      const response = await axios.post(`${process.env.BACKEND_URL}/api/dsl`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
        },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`DSL API error: ${response.data.error.message || response.data.error}`);
      }

      this.logger.info(`[HtmlCacheService] Cleared cache info for CMS item ${cmsItem.id}`);

    } catch (error) {
      this.logger.error(`[HtmlCacheService] Failed to clear CMS cache info for ${sitePath}:`, error);
      throw new Error(`Failed to clear CMS cache info: ${error.message}`);
    }
  }

  /**
   * Update CMS database with cache information
   */
   private async updateCmsCacheInfo(sitePath: string, cacheFilePath: string): Promise<void> {
    try {
      // Get file stats to extract size and last modified time
      const stats = await fs.stat(cacheFilePath);

      // Find CMS item by sitePath
      const cmsItem = await this.prisma.cmsItem.findFirst({
        where: { sitePath: sitePath }
      });

      if (!cmsItem) {
        this.logger.warn(`[HtmlCacheService] No CMS item found for sitePath: ${sitePath}`);
        return;
      }

      // Prepare cache info data
      const cacheInfo = {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };

      // Update CMS item with cache info via DSL API
      const payload = {
        model: 'CmsItem',
        operation: 'update',
        data: { cacheInfo },
        filter: { id: parseInt(cmsItem.id.toString()) }
      };

      const response = await axios.post(`${process.env.BACKEND_URL}/api/dsl`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
        },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`DSL API error: ${response.data.error.message || response.data.error}`);
      }

      this.logger.info(`[HtmlCacheService] Updated cache info for CMS item ${cmsItem.id}`, cacheInfo);

    } catch (error) {
      this.logger.error(`[HtmlCacheService] Failed to update CMS cache info for ${sitePath}:`, error);
      throw new Error(`Failed to update CMS cache info: ${error.message}`);
    }
  }

  /**
   * Get SEO data for cache generation
   */
  async getSeoDataForCache(sitePath: string): Promise<any> {
    try {
      // Find CMS item by sitePath
      const cmsItem = await this.prisma.cmsItem.findFirst({
        where: { sitePath }
        // Note: No include needed - all SEO fields are directly on CmsItem
      });

      if (!cmsItem) {
        throw new NotFoundError(`Page not found: ${sitePath}`);
      }

      // Prepare SEO data for cache
      const seoData = {
        // Meta tags
        title: cmsItem.metaTitle || cmsItem.title,
        description: cmsItem.metaDescription,
        keywords: cmsItem.metaKeywords,
        canonical: cmsItem.canonicalUrl || `${global.runtimeConfig.siteUrl}${sitePath}`,
        robots: cmsItem.robotsMeta || 'index,follow',
        
        // Open Graph
        og: {
          title: cmsItem.ogTitle || cmsItem.metaTitle || cmsItem.title,
          description: cmsItem.ogDescription || cmsItem.metaDescription,
          image: cmsItem.ogImageId ? await this.getImageUrl(cmsItem.ogImageId) : null,
          url: `${global.runtimeConfig.siteUrl}${sitePath}`,
          type: cmsItem.schemaType === 'Article' ? 'article' : 'website'
        },
        
        // Schema.org
        schema: {
          type: cmsItem.schemaType || 'WebPage',
          data: cmsItem.structuredData || await this.generateDefaultSchema(cmsItem, sitePath)
        },
        
        // Cache metadata
        meta: {
          cmsItemId: cmsItem.id,
          lastModified: cmsItem.updatedAt,
          cacheEnabled: cmsItem.cacheEnabled !== false
        }
      };

      this.logger.debug('[HtmlCacheService] SEO data prepared for cache:', { sitePath, seoData });
      return seoData;

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('[HtmlCacheService] Failed to get SEO data for cache:', error);
      throw new BadRequestError('Failed to get SEO data for cache');
    }
  }

  /**
   * Get image URL by ID
   */
  private async getImageUrl(imageId: number): Promise<string | null> {
    try {
      const media = await this.prisma.cmsMedia.findUnique({
        where: { id: imageId }
      });
      
      if (media && media.path) {
        return `${global.runtimeConfig.siteUrl}${media.path}`;
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`[HtmlCacheService] Failed to get image URL for ID ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Generate default schema.org data
   */
  private async generateDefaultSchema(cmsItem: any, sitePath: string): Promise<any> {
    // Get dynamic site name from config
    const siteName = await this.configService.getFromDb('site.name');

    return {
      "@context": "https://schema.org",
      "@type": cmsItem.schemaType || "WebPage",
      "name": cmsItem.metaTitle || cmsItem.title,
      "description": cmsItem.metaDescription,
      "url": cmsItem.canonicalUrl || `${global.runtimeConfig.siteUrl}${sitePath}`,
      "datePublished": cmsItem.publishedAt,
      "dateModified": cmsItem.updatedAt,
      "author": {
        "@type": "Organization",
        "name": siteName
      },
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "logo": {
          "@type": "ImageObject",
          "url": `${global.runtimeConfig.siteUrl}/logo.png`
        }
      }
    };
  }

  /**
   * Delete cache file
   */
  private async deleteCacheFile(cachePath: string): Promise<boolean> {
    try {
      await fs.unlink(cachePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Delete cache files by pattern
   */
  private async deleteCacheByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;
    
    try {
      const regex = new RegExp(pattern);
      await this.deleteCacheRecursive(this.cacheBasePath, regex, (count) => {
        deletedCount += count;
      });
    } catch (error) {
      this.logger.error('[HtmlCacheService] Error in pattern deletion:', error);
    }

    return deletedCount;
  }

  /**
   * Recursively delete cache files matching pattern
   */
   private async deleteCacheRecursive(dirPath: string, pattern: RegExp, callback: (count: number) => void): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.deleteCacheRecursive(fullPath, pattern, callback);
        } else if (entry.isFile() && pattern.test(fullPath)) {
          await fs.unlink(fullPath);
          callback(1);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
      this.logger.debug('[HtmlCacheService] Could not scan directory:', dirPath);
    }
  }

  /**
   * Scan cache directory for statistics
   */
  private async scanCacheDirectory(dirPath: string, stats: CacheStats, detailed: boolean): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanCacheDirectory(fullPath, stats, detailed);
        } else if (entry.isFile() && entry.name === 'index.html') {
          const stat = await fs.stat(fullPath);
          stats.totalFiles++;
          stats.totalSize += stat.size;
          
          if (!stats.lastGenerated || stat.mtime > stats.lastGenerated) {
            stats.lastGenerated = stat.mtime;
          }
          
          if (detailed) {
            // Extract URL from file path
            const relativePath = path.relative(this.cacheBasePath, path.dirname(fullPath));
            const url = '/' + relativePath.replace(/\\/g, '/');
            stats.urls.push(url);
          }
        }
      }
    } catch (error) {
      this.logger.debug('[HtmlCacheService] Could not scan directory:', dirPath);
    }
  }

  /**
   * TEST: Generate static HTML using PublicLayoutTemplate
   */
  async testGenerateStatic(): Promise<{
    htmlPath: string
    size: number
    preview: string
  }> {
    this.logger.info('[HtmlCacheService] Starting test HTML generation');

    const { PublicLayoutTemplate } = await import('../templates/PublicLayoutTemplate.js');

    // Hardcoded test data
    const testContent = `
      <p>This is a <strong>test blog post</strong> generated using server-side template rendering.</p>
      <p>No Puppeteer, no browser, just pure TypeScript template functions!</p>
      <h2>Features</h2>
      <ul>
        <li>Fast generation (< 50ms)</li>
        <li>Full layout structure</li>
        <li>SEO-friendly HTML</li>
        <li>Ready for caching</li>
      </ul>
    `;

    // Render layout body
    const bodyHtml = PublicLayoutTemplate.render({
      title: 'Test Blog Post - Server-Side Generation',
      content: testContent,
      siteName: 'Typus CMS',
      siteUrl: 'http://localhost:3000'
    });

    // Wrap in full HTML document
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Blog Post - Server-Side Generation</title>
  <meta name="description" content="Testing server-side HTML generation without Puppeteer">

  <!-- Tailwind CSS CDN for testing -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Custom styles -->
  <style>
    .prose {
      max-width: 65ch;
    }
    .prose p {
      margin-bottom: 1.25em;
      line-height: 1.75;
    }
    .prose h2 {
      font-size: 1.5em;
      font-weight: 700;
      margin-top: 2em;
      margin-bottom: 1em;
    }
    .prose ul {
      list-style-type: disc;
      padding-left: 1.5em;
      margin-top: 1em;
      margin-bottom: 1em;
    }
    .prose li {
      margin-bottom: 0.5em;
    }
  </style>

  <!-- Cache metadata -->
  <script>
    window.__CACHED_ROUTE__ = {
      path: "/test-static-generation",
      name: "test-static",
      meta: {
        cached: true,
        cachedAt: "${new Date().toISOString()}",
        generatedBy: "ServerSideHtmlGenerator",
        method: "template-function"
      }
    };
  </script>
</head>
<body>
  ${bodyHtml}

  <!-- Vue App Mount Point -->
  <div id="app"></div>
</body>
</html>`;

    // Save to test file
    const testHtmlPath = path.join(this.cacheBasePath, 'test-static-generation.html');

    // Ensure directory exists
    await fs.mkdir(path.dirname(testHtmlPath), { recursive: true });

    // Write file
    await fs.writeFile(testHtmlPath, fullHtml, 'utf-8');

    const stats = await fs.stat(testHtmlPath);

    this.logger.info('[HtmlCacheService] Test HTML saved', {
      path: testHtmlPath,
      size: stats.size
    });

    return {
      htmlPath: testHtmlPath,
      size: stats.size,
      preview: fullHtml.substring(0, 500) + '...'
    };
  }

  /**
   * Generate fast static HTML for CMS item using template
   * Returns immediately with cache file created
   */
  async generateFastStaticForCms(cmsItemId: number): Promise<{ success: boolean; url: string; size: number; renderTime: number }> {
    const startTime = Date.now();

    this.logger.info('[HtmlCacheService.generateFastStatic] Starting for CMS item', { cmsItemId });

    try {
      // 1. Get CMS item data
      const cmsItem = await this.prisma.cmsItem.findUnique({
        where: { id: cmsItemId },
        select: {
          id: true,
          title: true,
          layout: true,
          content: true,
          sitePath: true,
          metadata: true,
          metaTitle: true,
          metaDescription: true,
          metaKeywords: true,
          canonicalUrl: true,
          robotsMeta: true,
          ogTitle: true,
          ogDescription: true,
          ogImageId: true,
          ogImage: {
            select: {
              path: true
            }
          },
          schemaType: true,
          structuredData: true
        }
      });

      if (!cmsItem) {
        throw new NotFoundError(`CMS item ${cmsItemId} not found`);
      }

      if (!cmsItem.sitePath) {
        throw new BadRequestError(`CMS item ${cmsItemId} has no sitePath`);
      }

      // 2. Normalize DXCE content and wrap it using shared partial
      const dxceContent = renderDxceContentForStaticCache(cmsItem.content || '');
      const layoutName = cmsItem.layout || 'public';
      const contentWrapperTemplate = await this.layoutTemplateService.getPartialContent(layoutName, 'content-wrapper');

      // Use Handlebars to render content into wrapper (or fallback to raw content if no wrapper)
      let wrappedContent: string;
      if (contentWrapperTemplate) {
        const wrapperCompiled = Handlebars.compile(contentWrapperTemplate);
        wrappedContent = wrapperCompiled({ content: dxceContent });
      } else {
        // Fallback if no wrapper partial found
        wrappedContent = dxceContent;
      }

      // 3. Assemble final HTML via layout renderer
      const layoutContext = await this.buildLayoutContext(cmsItem, wrappedContent);
      let fullHtml: string | { string?: string; toString?: () => string };

      // Render layout template (no fallback - throw error if fails)
      fullHtml = await this.layoutTemplateService.render(cmsItem.layout, layoutContext);

      // 6. Save to cache
      const cachePath = await this.getCachePath(cmsItem.sitePath);
      this.logger.debug('[HtmlCacheService.generateFastStatic] Writing static HTML', { cachePath });

      // Ensure directory exists
      await fs.mkdir(path.dirname(cachePath), { recursive: true });

      let objectKeys: string[] | undefined;
      if (fullHtml && typeof fullHtml === 'object') {
        try {
          objectKeys = Object.keys(fullHtml as any);
        } catch (err) {
          objectKeys = ['<unavailable>'];
        }
      }

      this.logger.debug('[HtmlCacheService.generateFastStatic] Render output type', {
        cmsItemId,
        outputType: typeof fullHtml,
        outputCtor: fullHtml && (fullHtml as any).constructor ? (fullHtml as any).constructor.name : null,
        hasStringProp: typeof (fullHtml as any)?.string === 'string',
        objectKeys,
        renderError: (fullHtml as any)?.error?.message ?? null
      });

      const htmlOutput =
        typeof fullHtml === 'string'
          ? fullHtml
          : typeof fullHtml?.string === 'string'
            ? fullHtml.string
            : fullHtml?.toString?.() ?? '';

      // Write file
      await fs.writeFile(cachePath, htmlOutput, 'utf-8');
      await this.syncThemeAssets();

      const stats = await fs.stat(cachePath);
      const renderTime = Date.now() - startTime;

      this.logger.info('[HtmlCacheService.generateFastStatic] Cache generated successfully', {
        cmsItemId,
        sitePath: cmsItem.sitePath,
        cachePath,
        size: stats.size,
        renderTime
      });

      // 7. Update CMS item cache info in database
      await this.updateCmsCacheInfo(cmsItem.sitePath, cachePath);

      return {
        success: true,
        url: cmsItem.sitePath,
        size: stats.size,
        renderTime
      };
    } catch (error: any) {
      this.logger.error('[HtmlCacheService.generateFastStatic] Error', { cmsItemId, error });
      throw error;
    }
  }

  private async buildLayoutContext(cmsItem: any, wrappedContent: string): Promise<LayoutRenderContext> {
    const metadata = this.ensurePlainObject(cmsItem.metadata);
    const layoutMetadata = this.ensurePlainObject(
      metadata.layout || metadata.layoutSettings || metadata.layoutConfig
    );

    this.logger.debug('[HtmlCacheService.buildLayoutContext] 🔍 DEBUG metadata', {
      cmsItemId: cmsItem.id,
      sitePath: cmsItem.sitePath,
      rawMetadata: cmsItem.metadata,
      metadata,
      layoutMetadata,
      'metadata.bodyClass': metadata.bodyClass,
      'layoutMetadata.bodyClass': layoutMetadata.bodyClass
    });

    const siteUrl = global.runtimeConfig?.siteUrl || '';
    const siteName =
      layoutMetadata.siteName || metadata.siteName || global.runtimeConfig?.siteName || 'Typus';
    const canonicalUrl = cmsItem.canonicalUrl || (siteUrl ? `${siteUrl}${cmsItem.sitePath}` : null);

    const navItems = this.normalizeNavItems(layoutMetadata.navItems ?? metadata.navItems);
    const footerLinks = this.normalizeFooterLinks(layoutMetadata.footerLinks ?? metadata.footerLinks);
    const contact = this.normalizeContactInfo(layoutMetadata.contact ?? metadata.contact);
    const customCSS = this.extractCustomCss(layoutMetadata.customCSS ?? metadata.customCSS);
    const structuredData = this.stringifyStructuredData(cmsItem.structuredData);
    const analyticsId = this.extractAnalyticsId(layoutMetadata.analyticsId ?? metadata.analyticsId);
    const includeJS = typeof layoutMetadata.includeJS === 'boolean' ? layoutMetadata.includeJS : undefined;

    const ogImage = await this.resolveOgImageUrl({
      ogImageId: cmsItem.ogImageId,
      ogImage: cmsItem.ogImage
    });

    const themeName = this.normalizeThemeName(layoutMetadata.theme || metadata.theme);

    const bodyClass = layoutMetadata.bodyClass || metadata.bodyClass || undefined;

    this.logger.debug('[HtmlCacheService.buildLayoutContext] 🔍 DEBUG bodyClass resolution', {
      cmsItemId: cmsItem.id,
      'layoutMetadata.bodyClass': layoutMetadata.bodyClass,
      'metadata.bodyClass': metadata.bodyClass,
      'resolved bodyClass': bodyClass
    });

    return {
      title: cmsItem.metaTitle || cmsItem.title || 'Untitled',
      content: wrappedContent,
      siteName,
      siteUrl,
      language: layoutMetadata.language || metadata.language || 'en',
      theme: themeName,
      bodyClass,
      metaDescription: cmsItem.metaDescription,
      metaKeywords: cmsItem.metaKeywords,
      canonicalUrl,
      robotsMeta: cmsItem.robotsMeta,
      ogTitle: cmsItem.ogTitle || cmsItem.metaTitle || cmsItem.title,
      ogDescription: cmsItem.ogDescription || cmsItem.metaDescription,
      ogImage,
      ogType: cmsItem.schemaType === 'Article' ? 'article' : 'website',
      customCSS,
      structuredData,
      includeJS,
      analyticsId,
      navItems,
      footerLinks,
      contact,
      currentYear: new Date().getFullYear(),
      currentPath: cmsItem.sitePath
    };
  }

  private ensurePlainObject(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private normalizeNavItems(value: unknown): LayoutNavItem[] | undefined {
    if (!Array.isArray(value)) return undefined;

    const items: LayoutNavItem[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        items.push({ label: item, href: item });
        continue;
      }

      if (item && typeof item === 'object') {
        const label = (item as any).label;
        const href = (item as any).href;
        if (typeof label === 'string' && typeof href === 'string') {
          items.push({ label, href, active: (item as any).active });
        }
      }
    }

    return items.length ? items : undefined;
  }

  private normalizeFooterLinks(value: unknown): LayoutFooterLink[] | undefined {
    if (!Array.isArray(value)) return undefined;

    const links: LayoutFooterLink[] = [];
    for (const item of value) {
      if (item && typeof item === 'object') {
        const label = (item as any).label;
        const href = (item as any).href;
        if (typeof label === 'string' && typeof href === 'string') {
          links.push({ label, href });
        }
      }
    }
    return links.length ? links : undefined;
  }

  private normalizeContactInfo(value: unknown): LayoutContactInfo | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const email = typeof (value as any).email === 'string' ? (value as any).email : undefined;
    const phone = typeof (value as any).phone === 'string' ? (value as any).phone : undefined;
    if (!email && !phone) return undefined;
    return { email, phone };
  }

  private extractCustomCss(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
    return null;
  }

  private stringifyStructuredData(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      this.logger.warn('[HtmlCacheService] Failed to stringify structured data', { error });
      return null;
    }
  }

  private async syncThemeAssets(): Promise<void> {
    const projectRoot = process.env.PROJECT_PATH || process.cwd();
    const targetRoot = path.join(this.cacheBasePath, 'themes');
    const candidateSources = [
      path.join(projectRoot, 'public/themes'),
      path.join(projectRoot, '@typus-core/frontend/public/themes'),
      path.join(projectRoot, 'custom/frontend/styles')
    ];

    try {
      await fs.mkdir(targetRoot, { recursive: true });

      for (const sourceRoot of candidateSources) {
        const exists = await this.directoryExists(sourceRoot);
        if (!exists) continue;

        const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const sourceDir = path.join(sourceRoot, entry.name);
          const targetDir = path.join(targetRoot, entry.name);
          await fs.rm(targetDir, { recursive: true, force: true }).catch(() => undefined);
          await fs.cp(sourceDir, targetDir, { recursive: true });
        }
      }
    } catch (error) {
      this.logger.warn('[HtmlCacheService] Failed to sync theme assets', error);
    }
  }

  private extractAnalyticsId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
    if (process.env.GTAG_ID) return process.env.GTAG_ID;
    if (process.env.GA_MEASUREMENT_ID) return process.env.GA_MEASUREMENT_ID;
    return null;
  }

  private async resolveOgImageUrl(cmsItem: { ogImageId?: number | null; ogImage?: { path?: string | null } | null }): Promise<string | null> {
    if (cmsItem.ogImageId) {
      return await this.getImageUrl(cmsItem.ogImageId);
    }
    const relativePath = cmsItem.ogImage?.path;
    if (relativePath) {
      const siteUrl = global.runtimeConfig?.siteUrl || '';
      return siteUrl ? `${siteUrl}${relativePath}` : relativePath;
    }
    return null;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text?: string | null): string {
    if (!text) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private buildDefaultHead(title: string, description?: string | null, keywords?: string | null): string {
    const escapedTitle = this.escapeHtml(title || 'Typus Page')
    const escapedDescription = this.escapeHtml(description || '')
    const escapedKeywords = this.escapeHtml(keywords || '')

    // Get theme links from dynamic generator
    const themeLinksGenerator = getThemeLinksGenerator('/app');
    const themeLinks = themeLinksGenerator.generateAllThemeLinks();
    const defaultTheme = themeLinksGenerator.getDefaultTheme();

    return `<!DOCTYPE html><html lang="en" data-theme="${defaultTheme}" data-reference-theme="default"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  ${escapedDescription ? `<meta name="description" content="${escapedDescription}">` : ''}
  ${escapedKeywords ? `<meta name="keywords" content="${escapedKeywords}">` : ''}
  ${themeLinks}
</head>`
  }

  private normalizeThemeName(theme?: string | null): string {
    const themeLinksGenerator = getThemeLinksGenerator('/app');
    return themeLinksGenerator.normalizeThemeName(theme);
  }
}
