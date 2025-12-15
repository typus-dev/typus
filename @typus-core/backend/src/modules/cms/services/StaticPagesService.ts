/**
 * Static Pages Service
 * Handles user-uploaded static HTML pages (stored in /storage/html/static/)
 *
 * Component types:
 * - StaticHtml: User-uploaded HTML page
 * - Redirect: Redirect to another URL
 *
 * Source types (stored in meta.source):
 * - upload: User-uploaded file
 * - cms: CMS-generated cache (handled by HtmlCacheService)
 */
import { BaseService } from '@/core/base/BaseService.js';
import { Service } from '@/core/decorators/component.js';
import { BadRequestError, NotFoundError } from '@/core/base/BaseError.js';
import { inject } from 'tsyringe';
import { DynamicRouterService } from '@/dynamic-router/services/DynamicRouterService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Component type constants
export const COMPONENT_TYPES = {
  CONTENT_DISPLAY: 'ContentDisplay',  // CMS content
  STATIC_HTML: 'StaticHtml',          // User-uploaded HTML
  REDIRECT: 'Redirect'                // Redirect to another URL
} as const;

// Source type constants
export const SOURCE_TYPES = {
  CMS: 'cms',       // CMS-generated (can regenerate)
  UPLOAD: 'upload'  // User-uploaded (cannot regenerate)
} as const;

export interface StaticPageMeta {
  source: typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES];
  title?: string;
  description?: string;
  redirect_to?: string;  // For Redirect component
  uploadedAt?: string;
  originalFilename?: string;
}

export interface UploadStaticPageParams {
  path: string;
  name: string;
  content: string;  // HTML content
  meta?: Partial<StaticPageMeta>;
}

export interface CreateRedirectParams {
  path: string;
  name: string;
  redirectTo: string;
}

@Service()
export class StaticPagesService extends BaseService {
  private readonly staticBasePath: string;

  constructor(
    @inject(DynamicRouterService) private dynamicRouterService: DynamicRouterService
  ) {
    super();
    // Static uploads go to /app/storage/html/static
    this.staticBasePath = '/app/storage/html/static';
  }

  /**
   * Upload a static HTML page
   */
  async uploadPage(params: UploadStaticPageParams): Promise<{ route: any; filePath: string }> {
    const { path: routePath, name, content, meta = {} } = params;

    // Normalize path
    const normalizedPath = this.normalizePath(routePath);

    // Determine file path
    const filePath = this.getFilePath(normalizedPath);

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write HTML file
      await fs.writeFile(filePath, content, 'utf-8');

      // Register in dynamic_routes
      const routeMeta: StaticPageMeta = {
        source: SOURCE_TYPES.UPLOAD,
        uploadedAt: new Date().toISOString(),
        ...meta
      };

      const route = await this.dynamicRouterService.createRoute({
        path: normalizedPath,
        name,
        component: COMPONENT_TYPES.STATIC_HTML,
        meta: routeMeta,
        isActive: true,
        orderIndex: 0
      });

      this.logger.info('[StaticPagesService] Page uploaded', { path: normalizedPath, filePath });

      return { route, filePath };
    } catch (error) {
      // Cleanup file if route creation failed
      try {
        await fs.unlink(filePath);
      } catch {}

      this.logger.error('[StaticPagesService] Failed to upload page', { path: normalizedPath, error });
      throw error;
    }
  }

  /**
   * Upload a static page with assets (from ZIP or folder)
   */
  async uploadPageWithAssets(params: {
    path: string;
    name: string;
    files: Array<{ filename: string; content: Buffer | string }>;
    meta?: Partial<StaticPageMeta>;
  }): Promise<{ route: any; folderPath: string }> {
    const { path: routePath, name, files, meta = {} } = params;
    const normalizedPath = this.normalizePath(routePath);
    const folderPath = path.join(this.staticBasePath, normalizedPath);

    try {
      // Ensure folder exists
      await fs.mkdir(folderPath, { recursive: true });

      // Write all files
      for (const file of files) {
        const filePath = path.join(folderPath, file.filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // Register in dynamic_routes
      const routeMeta: StaticPageMeta = {
        source: SOURCE_TYPES.UPLOAD,
        uploadedAt: new Date().toISOString(),
        ...meta
      };

      const route = await this.dynamicRouterService.createRoute({
        path: normalizedPath,
        name,
        component: COMPONENT_TYPES.STATIC_HTML,
        meta: routeMeta,
        isActive: true,
        orderIndex: 0
      });

      this.logger.info('[StaticPagesService] Page with assets uploaded', {
        path: normalizedPath,
        folderPath,
        fileCount: files.length
      });

      return { route, folderPath };
    } catch (error) {
      // Cleanup folder if route creation failed
      try {
        await fs.rm(folderPath, { recursive: true, force: true });
      } catch {}

      this.logger.error('[StaticPagesService] Failed to upload page with assets', { path: normalizedPath, error });
      throw error;
    }
  }

  /**
   * Create a redirect
   */
  async createRedirect(params: CreateRedirectParams): Promise<any> {
    const { path: routePath, name, redirectTo } = params;
    const normalizedPath = this.normalizePath(routePath);

    const routeMeta: StaticPageMeta = {
      source: SOURCE_TYPES.UPLOAD,
      redirect_to: redirectTo,
      uploadedAt: new Date().toISOString()
    };

    const route = await this.dynamicRouterService.createRoute({
      path: normalizedPath,
      name,
      component: COMPONENT_TYPES.REDIRECT,
      meta: routeMeta,
      isActive: true,
      orderIndex: 0
    });

    this.logger.info('[StaticPagesService] Redirect created', {
      path: normalizedPath,
      redirectTo
    });

    return route;
  }

  /**
   * Delete a static page route (unregister only, keeps files on disk)
   */
  async deletePage(routePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(routePath);

    // Get route to check source
    const route = await this.dynamicRouterService.resolveRoute(normalizedPath);

    if (!route) {
      throw new NotFoundError(`Route ${normalizedPath} not found`);
    }

    const meta = route.meta as StaticPageMeta;

    // Only delete upload sources
    if (meta?.source !== SOURCE_TYPES.UPLOAD) {
      throw new BadRequestError(`Cannot delete non-upload page. Source: ${meta?.source}`);
    }

    // Delete route only (keep files on disk - user can re-register via scan)
    await this.dynamicRouterService.deleteRoute(route.id);

    this.logger.info('[StaticPagesService] Route unregistered (files kept)', { path: normalizedPath });
  }

  /**
   * Scan static folder for unregistered files
   */
  async scanUnregisteredFiles(): Promise<Array<{
    routePath: string;
    filePath: string;
    fileName: string;
    type: 'file' | 'folder'
  }>> {
    const unregistered: Array<{
      routePath: string;
      filePath: string;
      fileName: string;
      type: 'file' | 'folder'
    }> = [];

    try {
      await this.scanDirectory(this.staticBasePath, '', unregistered);
    } catch (error) {
      this.logger.error('[StaticPagesService] Failed to scan static folder', { error });
    }

    return unregistered;
  }

  /**
   * Register an existing static file/folder
   */
  async registerExistingFile(params: {
    routePath: string;
    filePath?: string;
    name: string;
    meta?: Partial<StaticPageMeta>;
  }): Promise<any> {
    const { routePath: rawRoutePath, filePath, name, meta = {} } = params;

    // Normalize route path
    const routePath = this.normalizePath(rawRoutePath);

    const routeMeta: StaticPageMeta = {
      source: SOURCE_TYPES.UPLOAD,
      uploadedAt: new Date().toISOString(),
      ...meta
    };

    const route = await this.dynamicRouterService.createRoute({
      path: routePath,
      name,
      component: COMPONENT_TYPES.STATIC_HTML,
      meta: routeMeta,
      isActive: true,
      orderIndex: 0
    });

    this.logger.info('[StaticPagesService] Existing file registered', {
      filePath,
      routePath
    });

    return route;
  }

  /**
   * Get all static pages (from dynamic_routes with source=upload)
   */
  async getStaticPages(): Promise<any[]> {
    const routes = await this.dynamicRouterService.getRoutes();

    return routes.filter(route => {
      const meta = route.meta as StaticPageMeta;
      return meta?.source === SOURCE_TYPES.UPLOAD;
    });
  }

  /**
   * Check if a path is a static upload (vs CMS cache)
   */
  async isStaticUpload(routePath: string): Promise<boolean> {
    try {
      const route = await this.dynamicRouterService.resolveRoute(routePath);
      const meta = route?.meta as StaticPageMeta;
      return meta?.source === SOURCE_TYPES.UPLOAD;
    } catch {
      return false;
    }
  }

  // === Private helpers ===

  private normalizePath(routePath: string): string {
    // Ensure path starts with /
    let normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
    // Remove trailing slash (except for root)
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  private getFilePath(routePath: string): string {
    // /about -> /app/storage/html/static/about.html
    // /docs/intro -> /app/storage/html/static/docs/intro.html
    const safePath = routePath.replace(/^\//, '');
    return path.join(this.staticBasePath, `${safePath}.html`);
  }

  private filePathToRoutePath(filePath: string): string {
    // /app/storage/html/static/about.html -> /about
    // /app/storage/html/static/docs/intro.html -> /docs/intro
    let relative = filePath.replace(this.staticBasePath, '');
    relative = relative.replace(/\.html$/, '');
    relative = relative.replace(/\/index$/, '');
    return relative || '/';
  }

  private async scanDirectory(
    basePath: string,
    relativePath: string,
    results: Array<{ routePath: string; filePath: string; fileName: string; type: 'file' | 'folder' }>
  ): Promise<void> {
    const fullPath = path.join(basePath, relativePath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelativePath = path.join(relativePath, entry.name);
        const routePath = this.filePathToRoutePath(path.join(basePath, entryRelativePath));

        // Check if already registered
        const isRegistered = await this.isRouteRegistered(routePath);

        if (entry.isDirectory()) {
          // Check if folder has index.html
          const indexPath = path.join(fullPath, entry.name, 'index.html');
          try {
            await fs.access(indexPath);
            if (!isRegistered) {
              results.push({
                routePath,
                filePath: entryRelativePath + '/index.html',
                fileName: entry.name + '/',
                type: 'folder'
              });
            }
          } catch {
            // No index.html, scan subdirectory
            await this.scanDirectory(basePath, entryRelativePath, results);
          }
        } else if (entry.name.endsWith('.html')) {
          // Include all .html files except index.html in subdirectories
          // Root index.html (relativePath === '') should be included as route '/'
          const isRootIndex = entry.name === 'index.html' && relativePath === '';
          const isNonIndexHtml = entry.name !== 'index.html';

          if ((isRootIndex || isNonIndexHtml) && !isRegistered) {
            results.push({
              routePath,
              filePath: entryRelativePath || entry.name,
              fileName: entry.name,
              type: 'file'
            });
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
    }
  }

  private async isRouteRegistered(routePath: string): Promise<boolean> {
    try {
      await this.dynamicRouterService.resolveRoute(routePath);
      return true;
    } catch {
      return false;
    }
  }
}
