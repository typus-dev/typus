/**
 * Dynamic Router validation schemas
 * @file dynamicRouterSchemas.ts
 */
import { z } from 'zod';

/**
 * Schema for route ID parameter
 */
export const dynamicRouteIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid route ID format')
  })
});

/**
 * Schema for creating a new route
 */
export const createDynamicRouteSchema = z.object({
  body: z.object({
    path: z.string().min(1, 'Path is required'),
    name: z.string().min(1, 'Name is required'),
    component: z.string().optional(),
    parentId: z.union([z.string().uuid('Invalid parent ID format'), z.literal('')]).nullable().optional(),
    orderIndex: z.number().int().nonnegative().optional(),
    meta: z.record(z.any()).optional(),
    isActive: z.boolean().optional()
  })
});

/**
 * Schema for updating a route
 */
export const updateDynamicRouteSchema = z.object({
  path: z.string().min(1, 'Path is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  component: z.string().optional().nullable(),
  parentId: z.string().uuid('Invalid parent ID format').optional().nullable(),
  orderIndex: z.number().int().nonnegative().optional(),
  meta: z.record(z.any()).optional(),
  isActive: z.boolean().optional()
});

/**
 * Schema for reordering routes
 */
export const reorderDynamicRoutesSchema = z.object({
  routes: z.array(
    z.object({
      id: z.string().uuid('Invalid route ID format'),
      orderIndex: z.number().int().nonnegative()
    })
  ).min(1, 'At least one route is required')
});
