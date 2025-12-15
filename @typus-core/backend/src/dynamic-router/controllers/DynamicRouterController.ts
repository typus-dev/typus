/**
 * Implementation of the correct pattern for DynamicRouterController
 */
import { BaseController } from '@/core/base/BaseController.js';
import { Controller } from '@/core/decorators/component.js';
import { DynamicRouterService } from '../services/DynamicRouterService';
import { Request, Response, NextFunction } from 'express';
import { inject } from 'tsyringe';
import { AuthMiddleware } from '@/core/security/middlewares/AuthMiddleware.js';

@Controller()
export class DynamicRouterController extends BaseController {
  constructor(
    @inject(DynamicRouterService) private dynamicRouterService: DynamicRouterService
  ) {
    super();
  }

  /**
   * Get all routes
   */
  async getAll(req: Request, res: Response) {
    const routes = await this.dynamicRouterService.getRoutes();
    return routes;
  }

  /**
   * Get route tree
   */
  async getTree(req: Request, res: Response) {
    const routeTree = await this.dynamicRouterService.getRouteTree();
    return routeTree;
  }

  /**
   * Resolve route by path
   */
  async resolveRoute(req: Request, res: Response) {
    const path = req.query.path as string;
    
    if (!path) {
      return this.badRequest(res, 'Path parameter is required');
    }
    
    const route = await this.dynamicRouterService.resolveRoute(path);
    return route;
  }

  /**
   * Get route by ID
   */
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const route = await this.dynamicRouterService.getRouteById(id);
    return route;
  }

  /**
   * Get CMS item by site path
   */
  async getCmsItemBySitePath(req: Request, res: Response) {
    const { sitePath } = req.params;
    const cmsItem = await this.dynamicRouterService.getCmsItemBySitePath(sitePath);
    return cmsItem;
  }

  /**
   * Create route
   * Note: Authentication middleware should be applied at the route level
   */
  async create(req: Request, res: Response) {
    const data = req.body;
    const route = await this.dynamicRouterService.createRoute(data);
    return route;
  }

  /**
   * Update route
   * Note: Authentication middleware should be applied at the route level
   */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const route = await this.dynamicRouterService.updateRoute(id, data);
    return route;
  }

  /**
   * Delete route
   * Note: Authentication middleware should be applied at the route level
   */
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const result = await this.dynamicRouterService.deleteRoute(id);
    return result;
  }

  /**
   * Reorder routes
   * Note: Authentication middleware should be applied at the route level
   */
  async reorder(req: Request, res: Response) {
    const data = req.body;
    const result = await this.dynamicRouterService.reorderRoutes(data);
    return result;
  }
}
