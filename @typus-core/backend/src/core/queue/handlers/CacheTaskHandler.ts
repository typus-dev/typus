import { Service } from '@/core/decorators/component';
import { BaseTaskHandler } from './BaseTaskHandler';
import { TaskSchema } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import axios from 'axios';
import extract from 'extract-zip';
import {
  validateCachePath,
  sanitizePath
} from '@/core/utils/SecurityValidator';
import {
  streamBase64ToFile,
  checkDiskSpace,
  getBase64Size,
  validateZipSafety,
  getDirectorySize
} from '@/core/utils/StreamingZipHandler';
import { executeWithRetry } from '@/core/utils/RetryHandler';
import {
  fetchSeoData,
  injectSeoData,
  injectCacheMetadata
} from './SeoUtils';
import { CircuitBreakerRegistry, CircuitBreakerError } from '@/core/utils/CircuitBreaker';
import { container } from 'tsyringe';
import { SitemapService } from '@/modules/sitemap/services/SitemapService';
import { ConfigService } from '@/modules/system/services/ConfigService';

/**
 * Cache Task Handler
 * Orchestrates cache generation using external cache-generator service
 */
@Service()
export class CacheTaskHandler extends BaseTaskHandler {
  /**
   * Get schema for cache tasks
   */
  getSchema(): TaskSchema {
    return {
      type: 'cache_generation_task',
      fields: ['action', 'url', 'pages', 'baseUrl', 'batchSize', 'priority', 'force', 'taskId'],
      validate: (data) => {
        if (!data.action) {
          if (Array.isArray(data.pages) && data.pages.length > 0) {
            data.action = 'batch';
          } else {
            throw new Error('Action is required: generate, invalidate, or batch');
          }
        }

        if (!['generate', 'invalidate', 'batch', 'sitemap'].includes(data.action)) {
          throw new Error('Action must be: generate, invalidate, batch, or sitemap');
        }

        if (data.action === 'generate' && !Array.isArray(data.pages)) {
          if (!data.url || typeof data.url !== 'string') {
            throw new Error('URL required for single page operations');
          }
        }

        if (data.action === 'batch' || (Array.isArray(data.pages) && data.pages.length > 0)) {
          if (!Array.isArray(data.pages) || data.pages.length === 0) {
            throw new Error('Pages array required for batch operations');
          }
        }

        if (data.action === 'invalidate') {
          if (Array.isArray(data.pages)) {
            if (data.pages.length === 0) {
              throw new Error('Pages array cannot be empty for batch invalidation');
            }
          } else if (!data.url) {
            throw new Error('URL required for single page invalidation');
          }
        }

        if (data.batchSize && (!Number.isInteger(data.batchSize) || data.batchSize < 1)) {
          throw new Error('Batch size must be positive integer');
        }
      }
    };
  }

  /**
   * Normalize data
   */
  private normalize(data: any): any {
    if (!data.action && Array.isArray(data.pages) && data.pages.length > 0) {
      data.action = 'batch';
    }
    if (data.action === 'batch' && !data.batchSize) {
      data.batchSize = 5;
    }
    if (!data.priority) {
      data.priority = 'normal';
    }
    if (!data.baseUrl) {
      data.baseUrl = global.runtimeConfig.siteUrl;
    }
    return data;
  }

  /**
   * Execute cache generation task
   */
  async execute(data: any): Promise<any> {
    const cleanupTasks: Array<() => Promise<void>> = [];

    try {
      const payload = this.normalize(data);
      await this.validate(payload);

      const { action, url, pages, baseUrl, force, priority, batchSize } = payload;

      this.logger.info('[CacheTaskHandler] Processing cache task', {
        action,
        url,
        pagesCount: pages?.length || 0,
        baseUrl,
        force,
        priority
      });

      if (action === 'generate') {
        return await this.generateSinglePage(url, baseUrl, force, cleanupTasks);
      } else if (action === 'batch' || action === 'sitemap') {
        let urlsToCache = pages;

        // If sitemap action, fetch URLs from SitemapService
        if (action === 'sitemap') {
          this.logger.info('[CacheTaskHandler] Fetching URLs from sitemap service');

          const sitemapService = container.resolve(SitemapService);
          urlsToCache = await sitemapService.getUrlsForCaching();

          this.logger.info('[CacheTaskHandler] Fetched URLs from sitemap', {
            count: urlsToCache.length
          });
        }

        return await this.generateBatch(urlsToCache, baseUrl, batchSize, force, cleanupTasks);
      } else if (action === 'invalidate') {
        return await this.invalidateCache(url, pages);
      }

      throw new Error(`Unknown action: ${action}`);
    } catch (error) {
      this.logger.error('[CacheTaskHandler] Failed to process cache task', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: data.action
      });
      throw error;
    } finally {
      // CRITICAL: Always cleanup temp files
      await this.performCleanup(cleanupTasks);
    }
  }

  /**
   * Generate cache for single page
   */
  private async generateSinglePage(
    sitePath: string,
    baseUrl: string,
    force: boolean,
    cleanupTasks: Array<() => Promise<void>>
  ): Promise<any> {
    const startTime = Date.now();

    // Sanitize path for security
    const sanitizedPath = sanitizePath(sitePath);
    // Ensure leading slash for URL construction (sanitizePath removes it)
    const pathWithSlash = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;

    this.logger.info('[CacheTaskHandler] Generating single page', {
      sitePath: pathWithSlash,
      baseUrl,
      force
    });

    // Check if cache exists and not forced
    if (!force) {
      const cacheExists = await this.checkCacheExists(sanitizedPath);
      if (cacheExists) {
        this.logger.info('[CacheTaskHandler] Cache already exists, skipping', {
          sitePath: sanitizedPath
        });
        return {
          status: 'success',
          message: 'Cache already exists',
          sitePath: sanitizedPath,
          skipped: true
        };
      }
    }

    // Create temp directory with UUID (not Date.now() - prevents race conditions)
    const projectPath = process.env.PROJECT_PATH || process.cwd();
    const tempDir = path.join(projectPath, 'storage/temp', `cache-${uuidv4()}`);

    // Register cleanup
    cleanupTasks.push(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        this.logger.debug('[CacheTaskHandler] Temp directory cleaned up', { tempDir });
      } catch (error) {
        this.logger.warn('[CacheTaskHandler] Failed to cleanup temp directory', {
          tempDir,
          error
        });
      }
    });

    try {
      // Step 1: Fetch SEO data
      const seoData = await fetchSeoData(pathWithSlash, this.logger);

      // Step 1.5: Fetch ConfigPublic for cached pages
      // SECURITY: Only expose safe configs to cached HTML (no OAuth secrets, feature flags, etc.)
      // Whitelist approach: only these configs are safe for public HTML cache
      const SAFE_CONFIG_KEYS = [
        'site.name',
        'site.title',
        'site.description',
        'site.tagline',
        'site.language',
        'site.timezone',
        'site.logo_url',
        'site.favicon_url',
        'site.url',
        'site.app_version'
        // Do NOT include:
        // - integrations.* (OAuth credentials)
        // - features.* (internal feature flags)
        // - security.* (security settings)
        // - logging.* (internal config)
      ];

      const configPublicItems = await prisma.configPublic.findMany({
        where: {
          key: { in: SAFE_CONFIG_KEYS }
        }
      });

      const configPublic = configPublicItems.reduce((acc, item) => {
        const keys = item.key.split('.');
        let current = acc;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = current[keys[i]] || {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = item.value;
        return acc;
      }, {} as Record<string, any>);

      this.logger.debug('[CacheTaskHandler] ConfigPublic fetched (whitelisted)', {
        configKeys: Object.keys(configPublic),
        count: configPublicItems.length
      });

      // Step 2: Call cache generator service with Circuit Breaker + Retry
      // Get URL from database config with fallback to env → default
      const configService = container.resolve(ConfigService);
      const cacheGeneratorUrl = await configService.get('cache.html_generator_url') ||
                                process.env.CACHE_GENERATOR_URL ||
                                'http://cache_generator_service:3100';

      // Cache-busting: Only add when force=true
      // Otherwise, allow HTTP cache to work properly (CDN, browser, proxy)
      let fullUrl = `${baseUrl}${pathWithSlash}`;

      if (force) {
        const cacheBustParam = `_cacheBust=${Date.now()}`;
        fullUrl += `${pathWithSlash.includes('?') ? '&' : '?'}${cacheBustParam}`;

        this.logger.debug('[CacheTaskHandler] Cache-busting enabled (force=true)', {
          url: fullUrl
        });
      }

      // Get or create circuit breaker for cache-generator service
      const circuitBreaker = CircuitBreakerRegistry.getOrCreate('cache-generator-service', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
        monitoringPeriod: 120000 // 2 minutes
      });

      this.logger.info('[CacheTaskHandler] Calling cache generator', {
        url: fullUrl,
        cacheGeneratorUrl,
        circuitState: circuitBreaker.getState()
      });

      const cacheResponse = await circuitBreaker.execute(async () => {
        return await executeWithRetry(
          async () => {
            const response = await axios.post(
              `${cacheGeneratorUrl}/api/cache/generate`,
              {
                frontend_url: baseUrl,
                url: pathWithSlash,
                extractMetadata: true,
                metadataKey: '__ROUTE_DATA__',
                fetch_seo: false, // We fetch SEO separately for better control
                minify: true,
                priority: 'normal'
              },
              { timeout: 60000 }
            );

            if (!response.data.success) {
              throw new Error(response.data.error || 'Cache generation failed');
            }

            return response.data;
          },
          { maxRetries: 3 }
        );
      });

      const { archive, files, metadata, renderTime } = cacheResponse;

      this.logger.info('[CacheTaskHandler] Cache generated', {
        filesCount: files?.length || 0,
        hasMetadata: !!metadata,
        renderTime
      });

      // Step 3: Check disk space before extracting
      const estimatedSize = getBase64Size(archive);
      const hasSpace = await checkDiskSpace(estimatedSize, tempDir);

      if (!hasSpace) {
        throw new Error('Insufficient disk space for cache extraction');
      }

      // Step 4: Stream ZIP to temp file (CRITICAL: don't use Buffer.from!)
      await fs.mkdir(tempDir, { recursive: true });
      const tempZipPath = path.join(tempDir, 'cache.zip');

      await streamBase64ToFile(archive, tempZipPath);

      this.logger.debug('[CacheTaskHandler] ZIP file streamed', {
        tempZipPath,
        size: estimatedSize
      });

      // Step 5: Extract ZIP
      const extractDir = path.join(tempDir, 'extracted');
      await extract(tempZipPath, { dir: extractDir });

      this.logger.debug('[CacheTaskHandler] ZIP extracted', { extractDir });

      // Step 5.5: ZIP Bomb Protection - Validate extraction size
      const extractedSize = await getDirectorySize(extractDir);
      const compressedSize = (await fs.stat(tempZipPath)).size;

      try {
        validateZipSafety(compressedSize, extractedSize);
      } catch (error) {
        this.logger.error('[CacheTaskHandler] ZIP bomb detected!', {
          compressedSize,
          extractedSize,
          compressionRatio: (extractedSize / compressedSize).toFixed(2)
        });
        throw error;
      }

      // Step 6: Cache Validity Check - Validate index.html exists and is valid
      const indexHtmlPath = path.join(extractDir, 'index.html');

      try {
        await fs.access(indexHtmlPath);
      } catch {
        throw new Error('index.html not found in extracted cache');
      }

      let html = await fs.readFile(indexHtmlPath, 'utf-8');

      // Validate HTML structure
      if (!this.isValidHtml(html)) {
        throw new Error('Invalid HTML structure in cached file');
      }

      // Step 7: Inject SEO data
      if (seoData) {
        html = injectSeoData(html, seoData);
        this.logger.debug('[CacheTaskHandler] SEO data injected');
      }

      // Step 8: Inject cache metadata (window.__CACHED_ROUTE__)
      if (metadata) {
        html = injectCacheMetadata(html, metadata, sanitizedPath, renderTime, configPublic);
        this.logger.debug('[CacheTaskHandler] Cache metadata injected with ConfigPublic');
      }

      // Step 8.5: Replace #app with #cache-snapshot and add empty #app for Vue
      // This allows smooth transition from cached content to Vue app
      html = html.replace(
        /<div id="app"([^>]*)>/,
        '<div id="cache-snapshot"$1>'
      );
      html = html.replace(
        /(<script type="module"[^>]*>)/,
        '<div id="app"></div>\n$1'
      );

      // CRITICAL: Remove vue-ready class from body - it should be added by JS after Vue renders
      html = html.replace(
        /<body([^>]*)\s+class="([^"]*)vue-ready([^"]*)"/g,
        '<body$1 class="$2$3"'
      );
      html = html.replace(
        /<body([^>]*)\s+class="vue-ready"/g,
        '<body$1'
      );

      this.logger.debug('[CacheTaskHandler] Cache snapshot wrapper added, vue-ready class removed');

      // Step 9: Update asset links in HTML to use proper styles/ structure
      // For /news/sports/news2 → href="/news/sports/styles/news2.css"
      const normalizedPath = sanitizedPath.replace(/^\//, ''); // Remove leading slash
      const cssFileName = normalizedPath === ''
        ? 'index'
        : path.basename(normalizedPath); // Get last part: news2

      const cssPath = normalizedPath === ''
        ? '/styles/index.css'
        : `/${normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1)}styles/${cssFileName}.css`;

      // If no parent directory (like /test), use /styles/
      const finalCssPath = normalizedPath.includes('/')
        ? cssPath
        : `/styles/${cssFileName}.css`;

      html = html.replace(/href="assets\/inline-styles\.css"/g, `href="${finalCssPath}"`);
      html = html.replace(/href="assets\/external-style-\d+\.css"/g, `href="${finalCssPath}"`);

      // Remove asset script references (cache-generator creates them but we don't save JS files)
      html = html.replace(/<script[^>]+src="assets\/[^"]+\.js"[^>]*><\/script>/g, '');
      html = html.replace(/<script[^>]+src="assets\/[^"]+\.js"[^>]*>/g, '');

      // Step 10: Save modified HTML
      await fs.writeFile(indexHtmlPath, html, 'utf-8');

      // Step 11: Move to final cache location (preserving directory structure like original)
      const cacheBasePath = '/app/storage/html-cache';

      // Ensure base cache directory exists
      await fs.mkdir(cacheBasePath, { recursive: true });

      // Preserve directory structure for HTML files
      // /news/sports/news2 → /html-cache/news/sports/news2.html
      // Note: normalizedPath already declared above in Step 9
      const htmlFileName = normalizedPath === '' ? 'index.html' : `${normalizedPath}.html`;
      const finalHtmlPath = path.join(cacheBasePath, htmlFileName);

      // Create parent directories for HTML file
      const htmlDir = path.dirname(finalHtmlPath);
      await fs.mkdir(htmlDir, { recursive: true });

      // Styles directory should be at the same level as HTML file
      // /news/sports/news2.html → /news/sports/styles/news2.css
      const stylesDir = path.join(htmlDir, 'styles');
      await fs.mkdir(stylesDir, { recursive: true });

      // Remove old HTML if exists
      try {
        await fs.unlink(finalHtmlPath);
      } catch {
        // Ignore if doesn't exist
      }

      // Copy HTML to final location
      await fs.copyFile(indexHtmlPath, finalHtmlPath);

      // Move CSS files to /styles/ directory
      const assetsDir = path.join(extractDir, 'assets');
      try {
        const assetFiles = await fs.readdir(assetsDir);

        // Find CSS files and consolidate them
        const cssFiles = assetFiles.filter(f => f.endsWith('.css'));

        if (cssFiles.length > 0) {
          // Read and combine all CSS files
          let combinedCss = '';
          for (const cssFile of cssFiles) {
            const cssContent = await fs.readFile(path.join(assetsDir, cssFile), 'utf-8');
            combinedCss += cssContent + '\n';
          }

          // Save combined CSS to styles/{filename}.css
          const finalCssPath = path.join(stylesDir, `${cssFileName}.css`);
          await fs.writeFile(finalCssPath, combinedCss, 'utf-8');

          this.logger.debug('[CacheTaskHandler] CSS files consolidated', {
            cssFiles: cssFiles.length,
            finalPath: finalCssPath
          });
        }
      } catch (error) {
        this.logger.warn('[CacheTaskHandler] No assets directory or CSS files found', { error });
      }

      const totalTime = Date.now() - startTime;

      this.logger.info('[CacheTaskHandler] Cache saved successfully', {
        sitePath: sanitizedPath,
        htmlPath: finalHtmlPath,
        stylesPath: path.join(stylesDir, `${cssFileName}.css`),
        filesCount: files?.length || 0,
        totalTime
      });

      return {
        status: 'success',
        message: 'Cache generated successfully',
        sitePath: sanitizedPath,
        filesCount: files?.length || 0,
        renderTime,
        totalTime
      };
    } catch (error) {
      this.logger.error('[CacheTaskHandler] Failed to generate cache', {
        sitePath: sanitizedPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate cache for multiple pages (batch)
   */
  private async generateBatch(
    pages: string[],
    baseUrl: string,
    batchSize: number,
    force: boolean,
    cleanupTasks: Array<() => Promise<void>>
  ): Promise<any> {
    this.logger.info('[CacheTaskHandler] Starting batch generation', {
      pagesCount: pages.length,
      batchSize
    });

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ page: string; error: string }>
    };

    // Process in batches
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);

      this.logger.debug('[CacheTaskHandler] Processing batch', {
        batch: `${i + 1}-${Math.min(i + batchSize, pages.length)}`,
        total: pages.length
      });

      // Batch Timeout Protection: Add per-page timeout (5 minutes)
      const PAGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes per page

      const batchResults = await Promise.allSettled(
        batch.map(page =>
          this.withTimeout(
            this.generateSinglePage(page, baseUrl, force, cleanupTasks),
            PAGE_TIMEOUT,
            `Page generation timeout: ${page}`
          )
        )
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];

        if (result.status === 'fulfilled') {
          if (result.value.skipped) {
            results.skipped++;
          } else {
            results.success++;
          }
        } else {
          results.failed++;
          results.errors.push({
            page: batch[j],
            error: result.reason?.message || 'Unknown error'
          });
        }
      }

      // Small delay between batches to prevent overload
      if (i + batchSize < pages.length) {
        await this.sleep(500);
      }
    }

    this.logger.info('[CacheTaskHandler] Batch generation completed', results);

    return {
      status: 'success',
      message: `Batch completed: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`,
      ...results
    };
  }

  /**
   * Invalidate cache (delete cached files)
   */
  private async invalidateCache(url?: string, pages?: string[]): Promise<any> {
    const cacheBasePath = '/app/storage/html-cache';

    const pathsToInvalidate = pages || (url ? [url] : []);

    this.logger.info('[CacheTaskHandler] Invalidating cache', {
      pathsCount: pathsToInvalidate.length
    });

    let successCount = 0;
    let failedCount = 0;

    for (const sitePath of pathsToInvalidate) {
      try {
        const sanitized = sanitizePath(sitePath);
        const cachePath = validateCachePath(sanitized, cacheBasePath);

        await fs.rm(cachePath, { recursive: true, force: true });
        successCount++;

        this.logger.debug('[CacheTaskHandler] Cache invalidated', {
          sitePath: sanitized
        });
      } catch (error) {
        failedCount++;
        this.logger.error('[CacheTaskHandler] Failed to invalidate cache', {
          sitePath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      status: 'success',
      message: `Invalidated ${successCount} pages, ${failedCount} failed`,
      success: successCount,
      failed: failedCount
    };
  }

  /**
   * Check if cache exists for path
   */
  private async checkCacheExists(sitePath: string): Promise<boolean> {
    try {
      const cacheBasePath = '/app/storage/html-cache';
      const cachePath = validateCachePath(sitePath, cacheBasePath);
      const indexPath = path.join(cachePath, 'index.html');

      await fs.access(indexPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Perform cleanup tasks
   */
  private async performCleanup(tasks: Array<() => Promise<void>>): Promise<void> {
    for (const task of tasks) {
      try {
        await task();
      } catch (error) {
        this.logger.warn('[CacheTaskHandler] Cleanup task failed', { error });
      }
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate HTML structure
   *
   * Ensures cached HTML has required structure to prevent serving corrupted files
   *
   * @param html - HTML content to validate
   * @returns True if valid HTML structure
   */
  private isValidHtml(html: string): boolean {
    // Check minimum length (prevent empty/truncated files)
    if (html.length < 100) {
      return false;
    }

    // Check for DOCTYPE (case-insensitive)
    if (!html.toLowerCase().includes('<!doctype html>')) {
      return false;
    }

    // Check for required HTML tags
    const requiredTags = ['<html', '<head', '</head>', '<body', '</body>', '</html>'];

    for (const tag of requiredTags) {
      if (!html.toLowerCase().includes(tag.toLowerCase())) {
        this.logger.warn('[CacheTaskHandler] Invalid HTML: missing tag', { tag });
        return false;
      }
    }

    // Check for proper nesting (basic validation)
    const htmlStart = html.toLowerCase().indexOf('<html');
    const htmlEnd = html.toLowerCase().lastIndexOf('</html>');
    const headStart = html.toLowerCase().indexOf('<head');
    const headEnd = html.toLowerCase().indexOf('</head>');
    const bodyStart = html.toLowerCase().indexOf('<body');
    const bodyEnd = html.toLowerCase().indexOf('</body>');

    // Validate tag order
    if (!(htmlStart < headStart && headStart < headEnd &&
          headEnd < bodyStart && bodyStart < bodyEnd &&
          bodyEnd < htmlEnd)) {
      this.logger.warn('[CacheTaskHandler] Invalid HTML: improper tag nesting');
      return false;
    }

    return true;
  }

  /**
   * Timeout wrapper for promises
   *
   * Prevents indefinite hanging by racing promise against timeout
   *
   * @param promise - Promise to wrap
   * @param timeout - Timeout in milliseconds
   * @param message - Error message if timeout occurs
   * @returns Promise result or timeout error
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    message: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message)), timeout)
      )
    ]);
  }
}
