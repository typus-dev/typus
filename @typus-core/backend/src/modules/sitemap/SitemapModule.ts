import { BaseModule } from '@/core/base/BaseModule.js';
import { SitemapController } from './controllers/SitemapController';
import { SitemapService } from './services/SitemapService';

/**
 * Sitemap module for XML sitemap generation
 */

export class SitemapModule extends BaseModule<SitemapController, SitemapService> {
  constructor() {
    super('sitemap', SitemapController, SitemapService);
  }

  /**
   * Initialize module-specific logic
   */
  protected initialize(): void {
    this.logger.info('[SitemapModule] Module initialized successfully');
  }

  /**
   * Initialize module routes
   */
  protected initializeRoutes(): void {
    this.logger.info('[SitemapModule] Setting up routes');

    // Sitemap generation routes
    this.router.post('/generate', this.controller.generateSitemap.bind(this.controller));
    this.router.get('/generate', this.controller.getSitemapXml.bind(this.controller));
    this.router.post('/combine', this.controller.combineRoutes.bind(this.controller));
    this.router.get('/stats', this.controller.getSitemapStats.bind(this.controller));
    this.router.get('/urls', this.controller.getUrlsForCaching.bind(this.controller));

    this.logger.info('[SitemapModule] Routes configured:');
    this.logger.info('  POST /api/sitemap/generate - Generate XML sitemap (API)');
    this.logger.info('  GET  /api/sitemap/generate - Generate and return XML sitemap (NGINX fallback)');
    this.logger.info('  POST /api/sitemap/combine - Combine static and dynamic routes');
    this.logger.info('  GET  /api/sitemap/stats - Get sitemap statistics');
    this.logger.info('  GET  /api/sitemap/urls - Get URLs for caching');
  }
}
