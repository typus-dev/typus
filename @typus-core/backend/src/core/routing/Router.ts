import { Express, Application as ExpressApp } from 'express';
import { ErrorHandlerMiddleware } from '@/core/middleware/ErrorHandlerMiddleware.js';
import { ILogger } from '@/core/logger/ILogger.js';
import { LoggerFactory } from '@/core/logger/LoggerFactory.js';
import { container } from 'tsyringe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import smlRoutes from '../../sml/routes/sml.routes.js';

export class Router {
  private logger: ILogger;
  private manifestCache: any | null = null;

  constructor(private app: ExpressApp) {
    
    this.logger = LoggerFactory.getGlobalLogger();

    this.logger.info('[Router] initialized');
  }

  public async configure(): Promise<void> {
    
    this.configureMainRoutes();
    
    this.configureErrorHandling();

    this.logger.info('[Router] configured');
  }

  private configureMainRoutes(): void {

    this.logger.info('[Router] configuring main routes');

    this.app.get(`${env.API_PATH}/`, (req, res) => {
      res.status(200).json({ message: '' });
    });
    
    this.app.get(`${env.API_PATH}/health`, (req, res) => {
      const manifest = this.getManifest();

      if (manifest?.version) res.setHeader('X-Typus-Version', String(manifest.version));
      if (manifest?.build_number) res.setHeader('X-Typus-Build-Number', String(manifest.build_number));
      if (manifest?.build_date) res.setHeader('X-Typus-Build-Date', String(manifest.build_date));
      if (manifest?.release_id) res.setHeader('X-Typus-Release-Id', String(manifest.release_id));

      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        version: manifest?.version,
        build_number: manifest?.build_number,
        build_date: manifest?.build_date,
        release_id: manifest?.release_id
      });
    });

    // SML (System Management Layer) API
    this.app.use(`${env.API_PATH}/sml`, smlRoutes);
    this.logger.info('[Router] SML routes mounted at /api/sml');

    // Root-level sitemap route for NGINX fallback
    const sitemapControllerPath = this.resolveModulePath('../../modules/sitemap/controllers/SitemapController.ts');

    if (sitemapControllerPath) {
      this.logger.info('[Router] sitemap module detected, registering /sitemap.xml');

      this.app.get('/sitemap.xml', async (req, res) => {
        try {
          const moduleUrl = pathToFileURL(sitemapControllerPath).href;
          const { SitemapController } = await import(moduleUrl);
          const sitemapController = container.resolve(SitemapController);
          await sitemapController.getSitemapXml(req, res);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === 'ERR_MODULE_NOT_FOUND') {
            global.logger.warn('[Router] Sitemap module not available, returning 404');
            res.status(404).send('Not Found');
            return;
          }

          global.logger.error('[Router] Sitemap route error:', error);
          res.status(500).send('Internal Server Error');
        }
      });
    } else {
      this.logger.info('[Router] sitemap module not found, skipping /sitemap.xml route');
    }

    this.app.use((req, res, next) => {
      global.logger.error(`[Router] Route not found: ${req.method} ${req.path}`);
      res.status(404).json({
        success: false,
        error: {
          message: `Route not found: ${req.method} ${req.path}`,
          code: 'NOT_FOUND',
          status: 404
        }
      });
    });
  }

  private configureErrorHandling(): void {

    this.logger.info('[Router] configuring error handling');

    this.app.use(new ErrorHandlerMiddleware().handle());
  }

  private resolveModulePath(relativePath: string): string | null {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const modulePath = path.resolve(__dirname, relativePath);
      return fs.existsSync(modulePath) ? modulePath : null;
    } catch (error) {
      this.logger.warn('[Router] Failed to resolve module path', { error });
      return null;
    }
  }

  private getManifest(): any {
    if (this.manifestCache) {
      return this.manifestCache;
    }

    try {
      const manifestPath = '/app/typus-manifest.json';
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        this.manifestCache = JSON.parse(content);
        return this.manifestCache;
      }
    } catch (error) {
      this.logger.warn('[Router] Failed to read typus-manifest.json', { error });
    }

    return {};
  }
}
