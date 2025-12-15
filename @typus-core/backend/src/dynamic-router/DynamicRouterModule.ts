/**
 * Dynamic Router core module
 * @file DynamicRouterModule.ts
 */
import { BaseModule } from '@/core/base/BaseModule.js';
import { DynamicRouterController } from './controllers/DynamicRouterController';
import { DynamicRouterService } from './services/DynamicRouterService';
import { Module } from '@/core/decorators/component.js';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js'; // Import ValidationMiddleware
import { 
  dynamicRouteIdParamSchema, 
  createDynamicRouteSchema, 
  updateDynamicRouteSchema, 
  reorderDynamicRoutesSchema 
} from './validation/dynamicRouterSchemas';


@Module({ path: 'dynamic-router' })
export class DynamicRouterModule extends BaseModule<DynamicRouterController, DynamicRouterService> { // Add generic types

  constructor() {
    const basePath = 'dynamic-routes';
    // Pass classes directly to super
    super(basePath, DynamicRouterController, DynamicRouterService);
  }
  
  /**
   * Initialize module
   */
  protected initialize(): void {
    this.logger.info(`[${this.moduleName}] core module initialized`);
  }
  
  /**
   * Initialize module routes
   */
  protected initializeRoutes(): void {
    this.logger.info(`[${this.moduleName}] routes initializing...`);

    // Public endpoint for frontend dynamic routing
    this.router.get('/resolve', [],
      this.controller.resolveRoute.bind(this.controller));

    // Public endpoint to get CMS item by site path (Define before /:id)
    this.router.get('/cms/:sitePath(.*)', [], // Use (.*) to capture slashes
      this.controller.getCmsItemBySitePath.bind(this.controller));

    // Admin routes with authentication
    this.router.get('/:id', [
      this.auth(),
      this.roles(['admin']),
      ValidationMiddleware.validate(dynamicRouteIdParamSchema, 'params') // Use ValidationMiddleware directly
    ], this.controller.getById.bind(this.controller));

    this.router.get('/', [
      this.auth(),
      this.roles(['admin'])
    ], this.controller.getAll.bind(this.controller));

    this.router.get('/tree', [
      this.auth(),
      this.roles(['admin'])
    ], this.controller.getTree.bind(this.controller));

    this.router.post('/', [
      this.auth(),
      this.roles(['admin']),
      ValidationMiddleware.validate(createDynamicRouteSchema) // Use ValidationMiddleware directly
    ], this.controller.create.bind(this.controller));

    this.router.put('/:id', [
      this.auth(),
      this.roles(['admin']),
      ValidationMiddleware.validate(dynamicRouteIdParamSchema, 'params'), // Use ValidationMiddleware directly
      ValidationMiddleware.validate(updateDynamicRouteSchema, 'all') // Use ValidationMiddleware directly
    ], this.controller.update.bind(this.controller));

    this.router.delete('/:id', [
      this.auth(),
      this.roles(['admin']),
      ValidationMiddleware.validate(dynamicRouteIdParamSchema, 'params') // Use ValidationMiddleware directly
    ], this.controller.delete.bind(this.controller));

    this.router.post('/reorder', [
      this.auth(),
      this.roles(['admin']),
      ValidationMiddleware.validate(reorderDynamicRoutesSchema) // Use ValidationMiddleware directly
    ], this.controller.reorder.bind(this.controller));

    this.logger.info(`[${this.moduleName}] routes initialized`);
  }
}
