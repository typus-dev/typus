import { BaseController } from '@/core/base/BaseController.js';
import { inject, injectable } from 'tsyringe';
import { Request, Response } from 'express';
import { SitemapService } from '../services/SitemapService';
import { GenerateSitemapRequestSchema, SitemapGenerationOptionsSchema } from '../validation/sitemapSchemas';

/**
 * Controller for sitemap generation endpoints
 */
@injectable()
export class SitemapController extends BaseController {
  constructor(
    @inject(SitemapService) private sitemapService: SitemapService
  ) {
    super();
  }

  /**
   * Generate sitemap
   * POST /api/sitemap/generate
   */
  async generateSitemap(req: Request, res: Response): Promise<void> {
    try {
      // Support both formats: direct parameters or nested in options
      let options;
      if (req.body.options) {
        // Nested format: { options: { includeStatic: true, ... } }
        const validatedData = GenerateSitemapRequestSchema.parse(req.body);
        options = validatedData.options;
      } else {
        // Direct format: { includeStatic: true, includeDynamic: true, ... }
        options = SitemapGenerationOptionsSchema.parse(req.body);
      }
      
      // Generate sitemap
      const result = await this.sitemapService.generateSitemap(options);
      
      if (result.success) {
        this.success(res, result);
      } else {
        this.error(res, 'Sitemap generation failed', 'SITEMAP_GENERATION_FAILED', 500);
      }
    } catch (error) {
      this.handleControllerError(res, error, 'Failed to generate sitemap');
    }
  }

  /**
   * Get sitemap statistics
   * GET /api/sitemap/stats
   */
  async getSitemapStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.sitemapService.getSitemapStats();
      
      if (stats) {
        this.success(res, stats);
      } else {
        this.notFound(res, 'Sitemap not found or could not read statistics');
      }
    } catch (error) {
      this.handleControllerError(res, error, 'Failed to get sitemap statistics');
    }
  }

  /**
   * Get URLs for caching
   * GET /api/sitemap/urls
   */
  async getUrlsForCaching(req: Request, res: Response): Promise<void> {
    try {
      const urls = await this.sitemapService.getUrlsForCaching();
      this.success(res, urls);
    } catch (error) {
      this.handleControllerError(res, error, 'Failed to get URLs for caching');
    }
  }

  /**
   * Generate and return sitemap XML directly (for NGINX fallback)
   * This handles both direct API calls and NGINX fallback requests
   */
  async getSitemapXml(req: Request, res: Response): Promise<void> {
    try {
      // Check if this is a sitemap request (either direct or from NGINX fallback)
      const isSitemapRequest = req.path === '/sitemap.xml' || 
                               req.headers['x-sitemap-request'] === 'true' ||
                               req.headers['x-original-uri'] === '/sitemap.xml' ||
                               req.path.includes('/api/sitemap/generate');

      if (!isSitemapRequest) {
        this.badRequest(res, 'Invalid sitemap request');
        return;
      }

      // Generate sitemap with default options
      const result = await this.sitemapService.generateSitemap({
        includeStaticRoutes: true,
        includeDynamicRoutes: true,
        generateCache: false
      });
      
      if (result.success && result.stats.totalUrls > 0) {
        // Read the generated sitemap file from cache
        const { promises: fs } = await import('fs');
        const { join } = await import('path');
        const sitemapPath = join(process.env.PROJECT_PATH || '/app', 'storage/cache/html/sitemap.xml');
        
        try {
          const xmlContent = await fs.readFile(sitemapPath, 'utf8');
          
          // Set XML headers and return content
          res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Sitemap-Generation': 'success',
            'X-Total-URLs': result.stats.totalUrls.toString(),
            'X-Generated-At': new Date().toISOString()
          });
          
          res.status(200).send(xmlContent);
        } catch (fileError) {
          this.error(res, 'Sitemap generated but could not read file', 'SITEMAP_READ_ERROR', 500);
        }
      } else {
        this.error(res, 'Sitemap generation failed or no URLs found', 'SITEMAP_GENERATION_FAILED', 500);
      }
    } catch (error) {
      this.handleControllerError(res, error, 'Failed to generate sitemap XML');
    }
  }

  /**
   * Combine static routes with dynamic routes
   * POST /api/sitemap/combine
   */
  async combineRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { staticRoutes } = req.body;
      
      if (!Array.isArray(staticRoutes)) {
        this.badRequest(res, 'staticRoutes must be an array');
        return;
      }
      
      const combinedRoutes = await this.sitemapService.combineRoutes(staticRoutes);
      this.success(res, { routes: combinedRoutes });
    } catch (error) {
      this.handleControllerError(res, error, 'Failed to combine routes');
    }
  }
}
