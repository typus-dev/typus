// File: backend/src/modules/cms/dsl/hooks/cms.hooks.dsl.ts
import { DynamicRouterService } from '@/dynamic-router/services/DynamicRouterService.js';
import { HtmlCacheService } from '@/modules/html-cache/services/HtmlCacheService.js';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from '@/core/logger/Logger.js';
import type { QueueService } from '@/core/queue/QueueService.js';

// Type for CmsItem data
type CmsItemData = {
  id: number;
  sitePath?: string | null;
  title?: string;
  status?: string;
  typeId?: number;
  [key: string]: any;
};

// Type for passed-in services
export type HookServices = {
  dynamicRouterService: DynamicRouterService;
  htmlCacheService: HtmlCacheService;
  prisma: PrismaClient;
  logger: Logger;
  user?: any;
  queueService?: QueueService;
};

/**
 * Smart cache management: instant invalidation + async regeneration
 */
async function handleCacheOperations(
  cmsItem: CmsItemData,
  services: HookServices,
  action: 'create' | 'update' | 'delete' = 'update'
): Promise<void> {
  const { logger, queueService, htmlCacheService } = services;

  if (!cmsItem.sitePath) {
    logger.debug(`[CmsHooks] No sitePath, skipping cache operations for CMS item ${cmsItem.id}`);
    return;
  }

  try {
    // 1. INSTANT INVALIDATION (synchronous) - removes stale cache immediately
    if (action === 'update' || action === 'delete') {
      logger.info(`[CmsHooks] 🔥 INSTANT cache invalidation for ${cmsItem.sitePath}`);
      await htmlCacheService.invalidateUrl(cmsItem.sitePath);
    }

    // 2. ASYNC REGENERATION (only for published items)
    if (cmsItem.status === 'published' && action !== 'delete') {
      if (queueService) {
        await queueService.addTask('redis_cache_queue', {
          type: 'cache_generation_task',
          name: `Cache Generation: ${cmsItem.sitePath}`,
          data: {
            action: 'generate',
            url: cmsItem.sitePath,
            baseUrl: global.runtimeConfig.siteUrl,
            force: true,
            priority: 'normal',
            source: `cms_hook_${action}`,
            cmsItemId: cmsItem.id
          }
        });
        logger.info(`[CmsHooks] ⚡ Queued async cache REGENERATION for ${cmsItem.sitePath}`);
      }
    } else if (action !== 'delete') {
      logger.debug(`[CmsHooks] Item not published (status: ${cmsItem.status}), skipping regeneration for ${cmsItem.sitePath}`);
    }

  } catch (error) {
    logger.error(`[CmsHooks] Failed cache operations for ${cmsItem.sitePath}:`, error);
  }
}

/**
 * Manual cache generation for single CMS item (for UI operations)
 */
export async function manualCacheGeneration(
  cmsItemId: number,
  services: HookServices
): Promise<void> {
  const { prisma, logger, htmlCacheService } = services;

  try {
    const cmsItem = await prisma.cmsItem.findUnique({
      where: { id: cmsItemId }
    });

    if (!cmsItem) {
      throw new Error(`CMS item with ID ${cmsItemId} not found`);
    }

    if (cmsItem.sitePath && cmsItem.status === 'published') {
      await htmlCacheService.generateCacheForUrl(cmsItem.sitePath, 'high', true);
      logger.info(`[CmsHooks] Manual cache generation completed for ${cmsItem.sitePath}`);
    }

  } catch (error) {
    logger.error(`[CmsHooks] Manual cache generation failed for CMS item ${cmsItemId}:`, error);
    throw error;
  }
}

/**
 * Manual cache invalidation for single CMS item (for UI operations)
 */
export async function manualCacheInvalidation(
  cmsItemId: number,
  services: HookServices
): Promise<void> {
  const { prisma, logger, htmlCacheService } = services;

  try {
    const cmsItem = await prisma.cmsItem.findUnique({
      where: { id: cmsItemId }
    });

    if (!cmsItem) {
      throw new Error(`CMS item with ID ${cmsItemId} not found`);
    }

    if (cmsItem.sitePath) {
      await htmlCacheService.invalidateUrl(cmsItem.sitePath);
      logger.info(`[CmsHooks] Manual cache invalidation completed for ${cmsItem.sitePath}`);
    }

  } catch (error) {
    logger.error(`[CmsHooks] Manual cache invalidation failed for CMS item ${cmsItemId}:`, error);
    throw error;
  }
}

/**
 * Handles beforeCreate event for CmsItem.
 */
export async function beforeCreateCmsItemHandler(
  data: any,
  services: HookServices
): Promise<any> {
  services.logger.debug(`[CmsHooks] beforeCreateCmsItemHandler: Processing data`);

  // Set defaults
  if (!data.type) data.type = 'document';
  if (!data.status) data.status = 'draft';
  if (data.isPublic === undefined) data.isPublic = false;
  if (!data.typeId) data.typeId = 0;

  return data;
}

/**
 * Handles afterCreate event for CmsItem.
 */
export async function afterCreateCmsItemHandler(
  cmsItem: CmsItemData,
  services: HookServices
): Promise<CmsItemData> {
  const { dynamicRouterService, logger, prisma } = services;

  logger.info(`[CmsHooks] CmsItem afterCreate: Triggered for cmsItem ${cmsItem.id}`);

  // Handle category relationships
  const categoryIds = cmsItem.categoryIds;
  if (categoryIds?.length > 0) {
    logger.debug(`[CmsHooks] Creating category relationships for ${categoryIds.length} categories`);
    await prisma.cmsItemCategory.createMany({
      data: categoryIds.map(categoryId => ({
        itemId: cmsItem.id,
        categoryId: categoryId
      })),
      skipDuplicates: true
    });
    logger.info(`[CmsHooks] Created ${categoryIds.length} category relationships`);
  } else {
    logger.debug(`[CmsHooks] No categories to process`);
  }

  // Handle dynamic routes
  if (cmsItem && cmsItem.sitePath && cmsItem.status === 'published') {
    try {
      const existingRouteByPath = await dynamicRouterService.resolveRoute(cmsItem.sitePath);
      if (existingRouteByPath) {
        logger.warn(`[CmsHooks] Dynamic route for path ${cmsItem.sitePath} already exists, updating it`);
        await dynamicRouterService.updateRoute(existingRouteByPath.id, {
          name: cmsItem.title || 'CMS Content',
          component: 'ContentDisplay',
          isActive: true,
          meta: { ...existingRouteByPath.meta, cmsItemId: cmsItem.id, layout: cmsItem.layout }
        });
      } else {
        await dynamicRouterService.createRoute({
          path: cmsItem.sitePath,
          name: cmsItem.title || 'CMS Content',
          component: 'ContentDisplay',
          isActive: true,
          parentId: null,
          orderIndex: 0,
          meta: { cmsItemId: cmsItem.id, layout: cmsItem.layout }
        });
        logger.info(`[CmsHooks] Created dynamic route for CmsItem ${cmsItem.id} at ${cmsItem.sitePath}`);
      }
    } catch (error) {
      logger.error(`[CmsHooks] Error processing dynamic route for CmsItem ${cmsItem.id}:`, error);
    }
  }

  // Handle cache operations
  await handleCacheOperations(cmsItem, services, 'create');

  // Convert BigInt to string for JSON serialization
  for (const key in cmsItem) {
    if (typeof cmsItem[key] === 'bigint') {
      cmsItem[key] = cmsItem[key].toString();
    }
  }
  
  return cmsItem;
}

/**
 * Handles afterUpdate event for CmsItem.
 */
export async function afterUpdateCmsItemHandler(
  cmsItem: CmsItemData,
  services: HookServices
): Promise<CmsItemData> {
  const { dynamicRouterService, prisma, logger } = services;
  
  logger.info(`[CmsHooks] CmsItem afterUpdate: Triggered for ID ${cmsItem?.id}`);

  const currentSitePath = cmsItem.sitePath;
  const cmsItemId = cmsItem.id;
  const categoryIds = cmsItem.categoryIds;

  try {
    // Handle dynamic routes synchronization
    logger.debug(`[CmsHooks] Starting route synchronization for CmsItem ID ${cmsItemId}`);

    // Find existing routes for this CMS item
    const allRoutesForThisItem: { id: string; path: string }[] = await prisma.$queryRaw`
      SELECT id, path FROM \`system.dynamic_routes\` WHERE JSON_EXTRACT(meta, '$.cmsItemId') = ${cmsItemId}
    `;

    // Remove obsolete routes
    for (const route of allRoutesForThisItem) {
      if (route.path !== currentSitePath) {
        await dynamicRouterService.deleteRoute(route.id);
        logger.info(`[CmsHooks] Deleted obsolete dynamic route ID ${route.id} (path: ${route.path})`);
      }
    }

    // Create/update route for published items
    if (currentSitePath && cmsItem.status === 'published') {
      let routeForCurrentPath = null;
      try {
        routeForCurrentPath = await dynamicRouterService.resolveRoute(currentSitePath);
      } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
      }

      if (routeForCurrentPath) {
        if (routeForCurrentPath.meta?.cmsItemId === cmsItemId || !routeForCurrentPath.meta?.cmsItemId) {
          await dynamicRouterService.updateRoute(routeForCurrentPath.id, {
            name: cmsItem.title || 'CMS Content',
            component: 'ContentDisplay',
            isActive: true,
            meta: { ...routeForCurrentPath.meta, cmsItemId: cmsItemId, layout: cmsItem.layout }
          });
          logger.info(`[CmsHooks] Updated dynamic route ID ${routeForCurrentPath.id} for CmsItem ${cmsItemId}`);
        } else {
          logger.error(`[CmsHooks] Path conflict: ${currentSitePath} already used by different CmsItem`);
        }
      } else {
        await dynamicRouterService.createRoute({
          path: currentSitePath,
          name: cmsItem.title || 'CMS Content',
          component: 'ContentDisplay',
          isActive: true,
          parentId: null,
          orderIndex: 0,
          meta: { cmsItemId: cmsItemId, layout: cmsItem.layout }
        });
        logger.info(`[CmsHooks] Created new dynamic route for CmsItem ${cmsItemId} at ${currentSitePath}`);
      }
    } else if (cmsItem.status !== 'published') {
      // Remove routes for unpublished items
      for (const route of allRoutesForThisItem) {
        await dynamicRouterService.deleteRoute(route.id);
        logger.info(`[CmsHooks] Deleted route for unpublished item ${cmsItemId}`);
      }
    }

  } catch (error) {
    logger.error(`[CmsHooks] Error processing dynamic routes for CmsItem ${cmsItemId}:`, error);
  }

  // Handle category relationships
  if (categoryIds?.length >= 0) {
    await prisma.cmsItemCategory.deleteMany({
      where: { itemId: cmsItemId }
    });
    
    if (categoryIds.length > 0) {
      await prisma.cmsItemCategory.createMany({
        data: categoryIds.map(categoryId => ({
          itemId: cmsItemId,
          categoryId: categoryId
        }))
      });
    }
  }

  // Handle cache operations (check if only cache fields were updated to avoid loops)
  const updatedFields = (cmsItem as any).__updatedFields;
  const isCacheOnlyUpdate = Array.isArray(updatedFields) && 
    updatedFields.length > 0 &&
    updatedFields.every(f => ['cacheInfo', 'updatedAt', 'updatedBy'].includes(f));

  if (!isCacheOnlyUpdate) {
    await handleCacheOperations(cmsItem, services, 'update');
  } else {
    logger.debug('[CmsHooks] Cache-only update detected, skipping cache operations');
  }

  // Convert BigInt to string for JSON serialization
  for (const key in cmsItem) {
    if (typeof cmsItem[key] === 'bigint') {
      cmsItem[key] = cmsItem[key].toString();
    }
  }
  
  return cmsItem;
}

/**
 * Handles afterDelete event for CmsItem.
 */
export async function afterDeleteCmsItemHandler(
  cmsItem: CmsItemData,
  services: HookServices
): Promise<CmsItemData> {
  const { dynamicRouterService, prisma, logger, htmlCacheService } = services;
  
  logger.info(`[CmsHooks] CmsItem afterDelete: Triggered for ID ${cmsItem?.id}`);

  const cmsItemId = cmsItem.id;

  // IMMEDIATE CACHE INVALIDATION (synchronous)
  if (cmsItem.sitePath) {
    try {
      await htmlCacheService.invalidateUrl(cmsItem.sitePath);
      logger.info(`[CmsHooks] ✅ IMMEDIATE cache invalidation completed for ${cmsItem.sitePath}`);
    } catch (error) {
      logger.warn(`[CmsHooks] ⚠️ Error during immediate cache invalidation:`, error);
    }
  }

  // Handle dynamic routes cleanup
  if (cmsItemId) {
    try {
      // Find and delete all routes linked by cmsItemId
      const routesToDelete: { id: string; path: string }[] = await prisma.$queryRaw`
        SELECT id, path FROM \`system.dynamic_routes\` WHERE JSON_EXTRACT(meta, '$.cmsItemId') = ${cmsItemId}
      `;

      for (const route of routesToDelete) {
        await dynamicRouterService.deleteRoute(route.id);
        logger.info(`[CmsHooks] Deleted dynamic route ID ${route.id} (path: ${route.path})`);
      }

      // Fallback: delete by sitePath if no routes found by cmsItemId
      if (routesToDelete.length === 0 && cmsItem.sitePath) {
        try {
          const routeByPath = await dynamicRouterService.resolveRoute(cmsItem.sitePath);
          if (routeByPath) {
            await dynamicRouterService.deleteRoute(routeByPath.id);
            logger.info(`[CmsHooks] Deleted dynamic route by path fallback for ${cmsItem.sitePath}`);
          }
        } catch (error) {
          if (error.name !== 'NotFoundError') throw error;
        }
      }

    } catch (error) {
      logger.error(`[CmsHooks] Error deleting dynamic routes for CmsItem ${cmsItemId}:`, error);
    }
  }

  // Convert BigInt to string for JSON serialization
  for (const key in cmsItem) {
    if (typeof cmsItem[key] === 'bigint') {
      cmsItem[key] = cmsItem[key].toString();
    }
  }
  
  return cmsItem;
}
