import { BaseModule } from '@/core/base/BaseModule.js';
import { HtmlCacheController } from './controllers/HtmlCacheController.js';
import { HtmlCacheService } from './services/HtmlCacheService.js';
import { Module } from '@/core/decorators/component.js';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js';
import {
    generateCacheSchema,
    invalidateCacheSchema,
    cacheStatsSchema,
    urlParamSchema,
    seoDataParamSchema,
    warmCacheSchema
} from './validation/htmlCacheSchemas.js';

/**
 * HTML Cache Module
 * Provides HTML caching functionality for SEO optimization and performance
 */
@Module({ path: 'html-cache' })
export class HtmlCacheModule extends BaseModule<HtmlCacheController, HtmlCacheService> {

    constructor() {
        const basePath = 'html-cache';
        super(basePath, HtmlCacheController, HtmlCacheService);
    }

    /**
     * Initialize module
     */
    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] HTML Cache module initialized`);
        
        // Log configuration
        const isEnabled = process.env.HTML_CACHE_ENABLED === 'true';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const timeout = process.env.PUPPETEER_TIMEOUT || '30000';
        
        this.logger.info(`[${this.moduleName}] Configuration:`, {
            enabled: isEnabled,
            frontendUrl,
            timeout: `${timeout}ms`
        });
    }

    /**
     * Initialize module routes
     */
    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);

        // POST /html-cache/generate - Generate cache for specific URL
        this.router.post('/generate', [
            ValidationMiddleware.validate(generateCacheSchema, 'body')
        ], this.controller.generateCache.bind(this.controller));

        // DELETE /html-cache/invalidate - Invalidate cache by URL or pattern
        this.router.delete('/invalidate', [
            ValidationMiddleware.validate(invalidateCacheSchema, 'body')
        ], this.controller.invalidateCache.bind(this.controller));

        // GET /html-cache/stats - Get cache statistics
        this.router.get('/stats', [
            ValidationMiddleware.validate(cacheStatsSchema, 'query')
        ], this.controller.getCacheStats.bind(this.controller));

        // DELETE /html-cache/clear - Clear all cache
        this.router.delete('/clear', [
        ], this.controller.clearAllCache.bind(this.controller));

        // POST /html-cache/warm - Warm cache for multiple URLs
        this.router.post('/warm', [
            ValidationMiddleware.validate(warmCacheSchema, 'body')
        ], this.controller.warmCache.bind(this.controller));

        // GET /html-cache/check/:url - Check if cache exists for URL
        this.router.get('/check/:url', [
            ValidationMiddleware.validate(urlParamSchema, 'params')
        ], this.controller.checkCache.bind(this.controller));

        // GET /html-cache/health - Get cache health status
        this.router.get('/health', [
        ], this.controller.getHealthStatus.bind(this.controller));

        // GET /html-cache/seo-for-cache/:sitePath - Get SEO data for cache generation
        this.router.get('/seo-for-cache/:sitePath', [
            ValidationMiddleware.validate(seoDataParamSchema, 'params')
        ], this.controller.getSeoDataForCache.bind(this.controller));

        // POST /html-cache/test-generate - TEST: Generate static HTML (no Puppeteer)
        this.router.post('/test-generate', [
        ], this.controller.testGenerate.bind(this.controller));

        // POST /html-cache/generate-fast - Generate fast static cache for CMS item (template-based)
        this.router.post('/generate-fast', [
        ], this.controller.generateFastCache.bind(this.controller));

        this.logger.info(`[${this.moduleName}] routes initialized`);
    }

    /**
     * Module cleanup on shutdown
     */
    protected async cleanup(): Promise<void> {
        this.logger.info(`[${this.moduleName}] Cleaning up HTML Cache module...`);
        
        // Any cleanup logic can be added here
        // For example, closing browser instances, clearing temporary files, etc.
        
        this.logger.info(`[${this.moduleName}] HTML Cache module cleanup completed`);
    }
}
