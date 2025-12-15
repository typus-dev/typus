/**
 * Dynamic Router service
 * @file DynamicRouterService.ts
 */
import { BaseService } from '@/core/base/BaseService.js';
import { Service } from '@/core/decorators/component.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '@/core/base/BaseError.js';
import { v4 as uuidv4 } from 'uuid';
import { DslService } from '@/dsl/services/DslService.js'; // Import DslService
import { inject } from 'tsyringe'; // Import inject

@Service()
export class DynamicRouterService extends BaseService {
  constructor(
    @inject(DslService) private dslService: DslService // Inject DslService
  ) {
    super();
  }

  /**
   * Get all routes
   * @returns {Promise<Array>} List of all active routes
   */
  async getRoutes() {
    try {
      return await this.prisma.systemDynamicRoute.findMany({
        orderBy: { orderIndex: 'asc' }
      });
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to get routes', { error });
      throw error;
    }
  }

  /**
   * Get route tree structure
   * @returns {Promise<Array>} Hierarchical tree of routes
   */
  async getRouteTree() {
    try {
      const routes = await this.prisma.systemDynamicRoute.findMany({
        orderBy: { orderIndex: 'asc' }
      });

      // Build tree structure
      const routeMap = new Map();
      const rootRoutes = [];

      // First pass: create map of all routes
      routes.forEach(route => {
        routeMap.set(route.id, { ...route, children: [] });
      });

      // Second pass: build tree structure
      routes.forEach(route => {
        const routeWithChildren = routeMap.get(route.id);

        if (route.parentId && routeMap.has(route.parentId)) {
          // Add to parent's children
          routeMap.get(route.parentId).children.push(routeWithChildren);
        } else {
          // Add to root routes
          rootRoutes.push(routeWithChildren);
        }
      });

      return rootRoutes;
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to get route tree', { error });
      throw error;
    }
  }

  /**
   * Resolve route by path
   * @param {string} path - Route path to resolve
   * @returns {Promise<Object>} Route data
   */
  async resolveRoute(path) {
    this.logger.debug(`[DynamicRouterService] resolveRoute entered with path: ${path}`);
    try {
      this.logger.debug(`[DynamicRouterService] resolveRoute: Calling prisma.systemDynamicRoute.findFirst`);
      const route = await this.prisma.systemDynamicRoute.findFirst({
        where: {
          path,
          isActive: true
        }
      });
      this.logger.debug(`[DynamicRouterService] resolveRoute: Prisma call completed. Route found: ${!!route}`);

      if (!route) {
        throw new NotFoundError(`Route with path ${path} not found`);
      }

      return route;
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to resolve route', { path, error });
      throw error; // Re-throw the error after logging
    }
  }

  /**
   * Get route by ID
   * @param {string} id - Route ID
   * @returns {Promise<Object>} Route data
   */
  async getRouteById(id) {
    try {
      const route = await this.prisma.systemDynamicRoute.findUnique({
        where: { id }
      });

      if (!route) {
        throw new NotFoundError(`Route with ID ${id} not found`);
      }

      return route;
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to get route by ID', { id, error });
      throw error;
    }
  }

  /**
   * Create new route
   * @param {Object} data - Route data
   * @returns {Promise<Object>} Created route
   */
  async createRoute(data) {
    this.logger.debug(`[DynamicRouterService] createRoute entered with data:`, data);
    try {
      // Convert empty string or undefined to null
      let parentIdToUse = (data.parentId === '' || data.parentId === undefined) ? null : data.parentId;
      this.logger.debug(`[DynamicRouterService] createRoute: parentIdToUse: ${parentIdToUse}`);

      // Check if parent exists if parentIdToUse is provided
      if (parentIdToUse) {
        this.logger.debug(`[DynamicRouterService] createRoute: Checking if parent route exists with ID: ${parentIdToUse}`);
        const parent = await this.prisma.systemDynamicRoute.findUnique({
          where: { id: parentIdToUse }
        });

        if (!parent) {
          this.logger.error(`[DynamicRouterService] createRoute: Parent route with ID ${data.parentId} not found`);
          throw new BadRequestError(`Parent route with ID ${data.parentId} not found`);
        }
        this.logger.debug(`[DynamicRouterService] createRoute: Parent route found.`);
      }

      // Check if path is unique
      this.logger.debug(`[DynamicRouterService] createRoute: Checking if route with path ${data.path} already exists.`);
      const existingRoute = await this.prisma.systemDynamicRoute.findFirst({
        where: { path: data.path }
      });

      if (existingRoute) {
        this.logger.error(`[DynamicRouterService] createRoute: Route with path ${data.path} already exists`);
        throw new BadRequestError(`Route with path ${data.path} already exists`);
      }
      this.logger.debug(`[DynamicRouterService] createRoute: Path is unique.`);

      this.logger.debug(`[DynamicRouterService] createRoute: Calling prisma.systemDynamicRoute.create with data:`, {
        id: uuidv4(), // id is generated here
        ...data,
        parentId: parentIdToUse
      });
      const createdRoute = await this.prisma.systemDynamicRoute.create({
        data: {
          id: uuidv4(),
          ...data,
          parentId: parentIdToUse // Use the potentially null parentId
        }
      });
      this.logger.debug(`[DynamicRouterService] createRoute: Prisma create completed. Created route ID: ${createdRoute.id}`);
      return createdRoute;
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to create route', { data, error });
      throw error;
    }
  }

  /**
   * Update existing route
   * @param {string} id - Route ID
   * @param {Object} data - Updated route data
   * @returns {Promise<Object>} Updated route
   */
  async updateRoute(id, data) {
    try {
      // Check if route exists
      const route = await this.prisma.systemDynamicRoute.findUnique({
        where: { id }
      });

      if (!route) {
        throw new NotFoundError(`Route with ID ${id} not found`);
      }

      // Check if parent exists if parentId is provided
      if (data.parentId) {
        // Prevent circular reference
        if (data.parentId === id) {
          throw new BadRequestError(`Route cannot be its own parent`);
        }

        const parent = await this.prisma.systemDynamicRoute.findUnique({
          where: { id: data.parentId }
        });

        if (!parent) {
          throw new BadRequestError(`Parent route with ID ${data.parentId} not found`);
        }
      }

      // Check if path is unique if changed
      if (data.path && data.path !== route.path) {
        const existingRoute = await this.prisma.systemDynamicRoute.findFirst({
          where: {
            path: data.path,
            id: { not: id }
          }
        });

        if (existingRoute) {
          throw new BadRequestError(`Route with path ${data.path} already exists`);
        }
      }

      return await this.prisma.systemDynamicRoute.update({
        where: { id },
        data
      });
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to update route', { id, data, error });
      throw error;
    }
  }

  /**
   * Delete route
   * @param {string} id - Route ID
   * @returns {Promise<Object>} Deleted route
   */
  async deleteRoute(id) {
    try {
      // Check if route exists
      const route = await this.prisma.systemDynamicRoute.findUnique({
        where: { id }
      });

      if (!route) {
        throw new NotFoundError(`Route with ID ${id} not found`);
      }

      // Check if route has children
      const children = await this.prisma.systemDynamicRoute.findMany({
        where: { parentId: id }
      });

      if (children.length > 0) {
        throw new BadRequestError(`Cannot delete route with children. Delete children first or update their parentId.`);
      }

      return await this.prisma.systemDynamicRoute.delete({
        where: { id }
      });
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to delete route', { id, error });
      throw error;
    }
  }

  /**
   * Reorder routes
   * @param {Object} data - Reorder data with routes array
   * @returns {Promise<Object>} Success status
   */
  async reorderRoutes(data) {
    try {
      const { routes } = data;

      // Validate all routes exist
      const routeIds = routes.map(r => r.id);
      const existingRoutes = await this.prisma.systemDynamicRoute.findMany({
        where: { id: { in: routeIds } }
      });

      if (existingRoutes.length !== routeIds.length) {
        throw new BadRequestError(`Some routes do not exist`);
      }

      // Update order indexes
      const updates = routes.map(route =>
        this.prisma.systemDynamicRoute.update({
          where: { id: route.id },
          data: { orderIndex: route.orderIndex }
        })
      );

      await this.prisma.$transaction(updates);

      return { success: true };
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to reorder routes', { data, error });
      throw error;
    }
  }

  /**
   * Get CMS item by site path
   * @param {string} sitePath - CMS item site path
   * @returns {Promise<Object>} CMS item data
   */
  async getCmsItemBySitePath(sitePath: string) {
    try {
      const sitePathWithSlash = sitePath.startsWith('/') ? sitePath : `/${sitePath}`; // Add leading slash if missing

      // Use DSL service to fetch CmsItem with public filter for Dynamic Router
      /*
      const result = await this.dslService.executeOperation(
        'CmsItem',
        'read',
        undefined, // No data
        { 
          sitePath: sitePathWithSlash, 
          isPublic: true // Dynamic Router only shows public content
        }, // Filter by sitePath and isPublic
        ['categories', 'tags', 'media'] // Include relations
      );
      */

      const result = await this.dslService.executeOperation(
        'CmsItem',
        'read',
        undefined, // No data
        {
          sitePath: sitePathWithSlash,
          isPublic: true,
          status: 'published'
        },
        ['categories', 'tags', 'media'],
        undefined, // pagination
        null // user = null for anonymous access
      );

      if ('error' in result && result.error) {
        // Handle potential errors from DSL service (e.g., not found, unauthorized)
        if (result.error.code === 'MODEL_NOT_FOUND') {
          throw new NotFoundError(`CMS item with site path ${sitePathWithSlash} not found`);
        }
        if (result.error.code === 'UNAUTHORIZED' || result.error.code === 'FORBIDDEN') {
          throw new UnauthorizedError(`Access to CMS item with site path ${sitePathWithSlash} is denied`);
        }
        // Re-throw other DSL errors
        throw new Error(result.error.message || 'Failed to fetch CMS item via DSL');
      }

      // Check if the result contains data
      if (!result || !('data' in result) || result.data === undefined) {
        throw new NotFoundError(`CMS item with site path ${sitePathWithSlash} not found`);
      }

      const cmsItem = result.data;

      // The previous check ensures cmsItem is not null/undefined, but keeping this for clarity or potential future changes
      // if (!cmsItem) {
      //   throw new NotFoundError(`CMS item with site path ${sitePathWithSlash} not found`);
      // }

      return cmsItem;
    } catch (error) {
      this.logger.error('[DynamicRouterService] Failed to get CMS item by site path', { sitePath, error });
      throw error;
    }
  }
}
