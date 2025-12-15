import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { StaticPagesService } from '../services/StaticPagesService.js';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';

/**
 * Static Pages Controller
 * Handles HTTP requests for user-uploaded static HTML pages
 */
@Controller({ path: 'static-pages' })
export class StaticPagesController extends BaseController {
  constructor(
    @inject(StaticPagesService) private staticPagesService: StaticPagesService
  ) {
    super();
  }

  /**
   * Get all static pages (upload sources)
   * GET /api/static-pages
   */
  async getStaticPages(req: Request, res: Response) {
    this.logger.debug('[StaticPagesController.getStaticPages] Request received');

    const pages = await this.staticPagesService.getStaticPages();

    return {
      success: true,
      message: `Found ${pages.length} static pages`,
      data: pages
    };
  }

  /**
   * Upload a static HTML page
   * POST /api/static-pages/upload
   * Body: { path, name, content, meta? }
   */
  async uploadPage(req: Request, res: Response) {
    const { path, name, content, meta } = req.body || {};

    this.logger.debug('[StaticPagesController.uploadPage] Request:', { path, name });

    if (!path || !name || !content) {
      return {
        success: false,
        message: 'Missing required fields: path, name, content'
      };
    }

    const result = await this.staticPagesService.uploadPage({
      path,
      name,
      content,
      meta
    });

    this.logger.info('[StaticPagesController] Page uploaded', { path, name });

    return {
      success: true,
      message: 'Static page uploaded successfully',
      data: result
    };
  }

  /**
   * Upload a page with assets (HTML + images/css/js)
   * POST /api/static-pages/upload-with-assets
   * Body: { path, name, files: [{ filename, content }], meta? }
   */
  async uploadPageWithAssets(req: Request, res: Response) {
    const { path, name, files, meta } = req.body || {};

    this.logger.debug('[StaticPagesController.uploadPageWithAssets] Request:', {
      path,
      name,
      fileCount: files?.length
    });

    if (!path || !name || !files || !Array.isArray(files)) {
      return {
        success: false,
        message: 'Missing required fields: path, name, files (array)'
      };
    }

    const result = await this.staticPagesService.uploadPageWithAssets({
      path,
      name,
      files,
      meta
    });

    this.logger.info('[StaticPagesController] Page with assets uploaded', {
      path,
      name,
      fileCount: files.length
    });

    return {
      success: true,
      message: 'Static page with assets uploaded successfully',
      data: result
    };
  }

  /**
   * Create a redirect
   * POST /api/static-pages/redirect
   * Body: { path, name, redirectTo }
   */
  async createRedirect(req: Request, res: Response) {
    const { path, name, redirectTo } = req.body || {};

    this.logger.debug('[StaticPagesController.createRedirect] Request:', { path, name, redirectTo });

    if (!path || !name || !redirectTo) {
      return {
        success: false,
        message: 'Missing required fields: path, name, redirectTo'
      };
    }

    const result = await this.staticPagesService.createRedirect({
      path,
      name,
      redirectTo
    });

    this.logger.info('[StaticPagesController] Redirect created', { path, redirectTo });

    return {
      success: true,
      message: 'Redirect created successfully',
      data: result
    };
  }

  /**
   * Delete a static page
   * DELETE /api/static-pages/delete
   * Body: { path }
   */
  async deletePage(req: Request, res: Response) {
    const { path } = req.body || {};

    this.logger.debug('[StaticPagesController.deletePage] Request:', { path });

    if (!path) {
      return {
        success: false,
        message: 'Missing required field: path'
      };
    }

    await this.staticPagesService.deletePage(path);

    this.logger.info('[StaticPagesController] Page deleted', { path });

    return {
      success: true,
      message: 'Static page deleted successfully',
      data: { path }
    };
  }

  /**
   * Scan for unregistered files in static folder
   * GET /api/static-pages/scan
   */
  async scanUnregistered(req: Request, res: Response) {
    this.logger.debug('[StaticPagesController.scanUnregistered] Request received');

    const unregistered = await this.staticPagesService.scanUnregisteredFiles();

    return {
      success: true,
      message: `Found ${unregistered.length} unregistered files`,
      data: unregistered
    };
  }

  /**
   * Register an existing file to dynamic_routes
   * POST /api/static-pages/register
   * Body: { filePath, name, meta? }
   */
  async registerExisting(req: Request, res: Response) {
    const { routePath, filePath, name, meta } = req.body || {};

    this.logger.debug('[StaticPagesController.registerExisting] Request:', { routePath, filePath, name });

    if (!routePath || !name) {
      return {
        success: false,
        message: 'Missing required fields: routePath, name'
      };
    }

    const result = await this.staticPagesService.registerExistingFile({
      routePath,
      filePath,
      name,
      meta
    });

    this.logger.info('[StaticPagesController] Existing file registered', { filePath, name });

    return {
      success: true,
      message: 'Existing file registered successfully',
      data: result
    };
  }

  /**
   * Check if a path is a static upload (vs CMS cache)
   * GET /api/static-pages/check/:path
   */
  async checkIsStatic(req: Request, res: Response) {
    const { path } = req.params;
    const decodedPath = decodeURIComponent(path);

    this.logger.debug('[StaticPagesController.checkIsStatic] Request:', { path: decodedPath });

    const isStatic = await this.staticPagesService.isStaticUpload(decodedPath);

    return {
      success: true,
      message: isStatic ? 'Path is a static upload' : 'Path is not a static upload',
      data: {
        path: decodedPath,
        isStaticUpload: isStatic
      }
    };
  }
}
