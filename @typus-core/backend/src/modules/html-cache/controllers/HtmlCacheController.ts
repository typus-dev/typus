import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { HtmlCacheService } from '../services/HtmlCacheService.js';
import { QueueService } from '@/core/queue/QueueService.js';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';

/**
 * HTML Cache Controller
 * Handles HTTP requests for HTML cache management
 */
@Controller({ path: 'html-cache' })
export class HtmlCacheController extends BaseController {
    constructor(
        @inject(HtmlCacheService) private htmlCacheService: HtmlCacheService,
        @inject(QueueService) private queueService: QueueService
    ) {
        super();
    }

    
    
    /**
     * Generate cache for a specific URL
     * POST /api/html-cache/generate
     *
     * Queues a cache generation task and returns immediately.
     * Frontend should poll checkCache endpoint to verify completion.
     */
    async generateCache(req: Request, res: Response) {
        const { url, priority = 'normal', force = true } = this.getValidatedData(req).body;

        this.logger.debug('[HtmlCacheController.generateCache] Request:', { url, priority, force });

        // Get userId from context for notifications
        const context = this.getContext();
        const userIdStr = context?.get<string>('userId');
        this.logger.debug('[HtmlCacheController.generateCache] Context userId:', { userIdStr, hasContext: !!context });
        const userId = userIdStr ? parseInt(userIdStr) : undefined;

        // Queue the cache generation task (async, non-blocking)
        await this.queueService.addTask('redis_cache_queue', {
            type: 'cache_generation_task',
            name: `Cache Generation: ${url}`,
            data: {
                action: 'generate',
                url: url,
                baseUrl: global.runtimeConfig.siteUrl,
                force: force,
                priority: priority,
                source: 'manual_button',
                manual: true,
                manual_user_id: userId
            }
        });

        this.logger.info(`[HtmlCacheController] ⚡ Queued async cache generation for ${url}`, { userId });

        return {
            success: true,
            message: 'Cache generation task queued successfully. You will receive a notification when complete.',
            data: {
                url,
                priority,
                force,
                queued: true,
                userId
            }
        };
    }

    /**
     * Invalidate cache for URL or pattern
     * DELETE /api/html-cache/invalidate
     */
    async invalidateCache(req: Request, res: Response) {
        const { url, pattern } = this.getValidatedData(req).body;

        this.logger.debug('[HtmlCacheController.invalidateCache] Request:', { url, pattern });

        // Get userId from context for notifications
        const context = this.getContext();
        const userId = context?.get<string>('userId') ? parseInt(context.get<string>('userId')!) : undefined;

        const deletedCount = await this.htmlCacheService.invalidateUrl(url);

        this.logger.info(`[HtmlCacheController] Cache invalidated for ${url}`, { deletedCount, userId });

        return {
            success: true,
            message: `Invalidated ${deletedCount} cache entries`,
            data: { deletedCount, url, pattern }
        };
    }

    /**
     * Get cache statistics
     * GET /api/html-cache/stats
     */

    async getCacheStats(req: Request, res: Response) {
        const { detailed = false } = req.query;
        const isDetailed = detailed === 'true';

        this.logger.debug('[HtmlCacheController.getCacheStats] Request:', { detailed: isDetailed });

        const stats = await this.htmlCacheService.getCacheStats(isDetailed);

        return {
            success: true,
            message: 'Cache statistics retrieved successfully',
            data: {
                ...stats,
                totalSizeMB: Math.round((stats.totalSize / 1024 / 1024) * 100) / 100
            }
        };
    }

    /**
     * Clear all cache
     * DELETE /api/html-cache/clear
     */
    async clearAllCache(req: Request, res: Response) {
        this.logger.debug('[HtmlCacheController.clearAllCache] Request received');

        const deletedCount = await this.htmlCacheService.clearAllCache();

        return {
            success: true,
            message: `Cleared all cache (${deletedCount} files)`,
            data: { deletedCount }
        };
    }

    /**
     * Warm cache for multiple URLs
     * POST /api/html-cache/warm
     */
    async warmCache(req: Request, res: Response) {
        const { urls, priority = 'normal' } = this.getValidatedData(req).body;

        this.logger.debug('[HtmlCacheController.warmCache] Request:', { 
            urlCount: urls?.length || 0, 
            priority 
        });

        const result = await this.htmlCacheService.warmCache(urls, priority);

        return {
            success: true,
            message: `Cache warming completed: ${result.success} successful, ${result.failed} failed`,
            data: result
        };
    }

    /**
     * Check if cache exists for a URL
     * GET /api/html-cache/check/:url
     */
    async checkCache(req: Request, res: Response) {
        const { url } = req.params;
        const decodedUrl = decodeURIComponent(url);

        this.logger.debug('[HtmlCacheController.checkCache] Request:', { url: decodedUrl });

        const cachePath = await this.htmlCacheService.getCachePath(decodedUrl);
        
        this.logger.debug('[HtmlCacheController.checkCache] Generated cache path:', { 
            url: decodedUrl, 
            cachePath 
        });
        
        try {
            const fs = await import('fs/promises');
            const stat = await fs.stat(cachePath);
            
            this.logger.debug('[HtmlCacheController.checkCache] Cache file found:', { 
                cachePath, 
                size: stat.size, 
                lastModified: stat.mtime 
            });
            
            return {
                success: true,
                message: 'Cache exists',
                data: {
                    url: decodedUrl,
                    exists: true,
                    size: stat.size,
                    lastModified: stat.mtime,
                    cachePath
                }
            };
        } catch (error) {
            this.logger.debug('[HtmlCacheController.checkCache] Cache file not found:', { 
                cachePath, 
                error: error.message 
            });
            
            return {
                success: true,
                message: 'Cache does not exist',
                data: {
                    url: decodedUrl,
                    exists: false,
                    cachePath
                }
            };
        }
    }

    /**
     * Get cache health status
     * GET /api/html-cache/health
     */
    async getHealthStatus(req: Request, res: Response) {
        this.logger.debug('[HtmlCacheController.getHealthStatus] Request received');

        const isEnabled = process.env.HTML_CACHE_ENABLED === 'true';
        const stats = await this.htmlCacheService.getCacheStats();
        
        const maxSizeMB = parseInt(process.env.HTML_CACHE_MAX_SIZE_MB || '500');
        const currentSizeMB = Math.round((stats.totalSize / 1024 / 1024) * 100) / 100;
        const usagePercentage = Math.round((currentSizeMB / maxSizeMB) * 100);

        return {
            success: true,
            message: 'Cache health status retrieved',
            data: {
                enabled: isEnabled,
                totalFiles: stats.totalFiles,
                currentSizeMB,
                maxSizeMB,
                usagePercentage,
                lastGenerated: stats.lastGenerated,
                status: usagePercentage > 90 ? 'warning' : 'healthy'
            }
        };
    }

    /**
     * Get SEO data for cache generation
     * GET /api/html-cache/seo-for-cache/:sitePath
     */
    async getSeoDataForCache(req: Request, res: Response) {
        const { sitePath } = req.params;
        const decodedSitePath = decodeURIComponent(sitePath);

        this.logger.debug('[HtmlCacheController.getSeoDataForCache] Request:', { sitePath: decodedSitePath });

        const seoData = await this.htmlCacheService.getSeoDataForCache(decodedSitePath);

        return {
            success: true,
            message: 'SEO data retrieved successfully',
            data: seoData
        };
    }

    /**
     * TEST: Generate static HTML using template (no Puppeteer)
     * POST /api/html-cache/test-generate
     */
    async testGenerate(req: Request, res: Response) {
        const startTime = Date.now();

        this.logger.info('[HtmlCacheController.testGenerate] Starting hardcoded test');

        try {
            const result = await this.htmlCacheService.testGenerateStatic();

            const renderTime = Date.now() - startTime;

            return {
                success: true,
                message: `Test HTML generated successfully in ${renderTime}ms`,
                data: {
                    ...result,
                    renderTime
                }
            };
        } catch (error) {
            this.logger.error('[HtmlCacheController.testGenerate] Error:', error);
            throw error;
        }
    }

    /**
     * TEST: View generated static HTML
     * GET /api/html-cache/test-view
     */
    async testView(req: Request, res: Response) {
        this.logger.info('[HtmlCacheController.testView] Serving test HTML');

        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const htmlPath = path.join(process.cwd(), 'storage/html-cache/test-static-generation.html');
            const html = await fs.readFile(htmlPath, 'utf-8');

            // Set proper content type and send raw HTML
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (error) {
            this.logger.error('[HtmlCacheController.testView] Error:', error);
            throw error;
        }
    }

    /**
     * Generate fast static cache for CMS item (template-based, no Puppeteer)
     * POST /api/html-cache/generate-fast
     */
    async generateFastCache(req: Request, res: Response) {
        const { cmsItemId } = req.body;

        if (!cmsItemId) {
            throw new Error('cmsItemId is required');
        }

        this.logger.info('[HtmlCacheController.generateFastCache] Request:', { cmsItemId });

        const result = await this.htmlCacheService.generateFastStaticForCms(parseInt(cmsItemId));

        return {
            success: true,
            message: `Fast cache generated in ${result.renderTime}ms`,
            data: result
        };
    }
}
