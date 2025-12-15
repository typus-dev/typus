import { BaseModule } from '@/core/base/BaseModule.js';
import { StaticPagesController } from './controllers/StaticPagesController.js';
import { StaticPagesService } from './services/StaticPagesService.js';
import { Module } from '@/core/decorators/component.js';

/**
 * CMS Module
 * Manages content including static pages, redirects, and user-uploaded HTML
 */
@Module({ path: 'cms' })
export class CmsModule extends BaseModule<StaticPagesController, StaticPagesService> {

  constructor() {
    const basePath = 'cms';
    super(basePath, StaticPagesController, StaticPagesService);
  }

  /**
   * Initialize module
   */
  protected initialize(): void {
    this.logger.info(`[${this.moduleName}] CMS module initialized`);
  }

  /**
   * Initialize module routes
   */
  protected initializeRoutes(): void {
    this.logger.info(`[${this.moduleName}] routes initializing...`);

    // GET /cms/static-pages - List all static pages
    this.router.get('/static-pages', [],
      this.controller.getStaticPages.bind(this.controller));

    // POST /cms/static-pages/upload - Upload a static HTML page
    this.router.post('/static-pages/upload', [],
      this.controller.uploadPage.bind(this.controller));

    // POST /cms/static-pages/upload-with-assets - Upload page with assets
    this.router.post('/static-pages/upload-with-assets', [],
      this.controller.uploadPageWithAssets.bind(this.controller));

    // POST /cms/static-pages/redirect - Create a redirect
    this.router.post('/static-pages/redirect', [],
      this.controller.createRedirect.bind(this.controller));

    // DELETE /cms/static-pages/delete - Delete a static page
    this.router.delete('/static-pages/delete', [],
      this.controller.deletePage.bind(this.controller));

    // GET /cms/static-pages/scan - Scan for unregistered files
    this.router.get('/static-pages/scan', [],
      this.controller.scanUnregistered.bind(this.controller));

    // POST /cms/static-pages/register - Register an existing file
    this.router.post('/static-pages/register', [],
      this.controller.registerExisting.bind(this.controller));

    // GET /cms/static-pages/check/:path - Check if path is static upload
    this.router.get('/static-pages/check/:path', [],
      this.controller.checkIsStatic.bind(this.controller));

    this.logger.info(`[${this.moduleName}] routes initialized`);
  }

  /**
   * Module cleanup on shutdown
   */
  protected async cleanup(): Promise<void> {
    this.logger.info(`[${this.moduleName}] CMS module cleanup completed`);
  }
}
