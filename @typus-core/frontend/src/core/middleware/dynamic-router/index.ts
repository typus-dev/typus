/* @Tags: routing */
import { Middleware } from '../types'
import { RouteLocationNormalized } from 'vue-router'
import type { Router } from 'vue-router'
import { useApi } from '@/shared/composables/useApi'
import { logger } from '@/core/logging/logger'
import { useAuthStore } from '@/core/store/authStore'
import { useAbility } from '@/core/auth/ability'
import { markRaw } from 'vue'
import { layoutRegistry } from '@/core/layouts'

// Cache for dynamic routes
const routeCache = new Map<string, any>()

export function createDynamicRouterMiddleware(router: Router): Middleware {
  return async function dynamicRouterMiddleware(context) {
    const { to } = context

    logger.debug('[createDynamicRouterMiddleware].to:',to.path)
        if (to.path.startsWith('/storage/')) {
      logger.debug('[DynamicRouterMiddleware] Skipping storage route for NGINX proxy', {
        path: to.path
      })
      return
    }


        if (window.__IS_CACHED_PAGE__ && to.path === window.__CACHED_ROUTE__?.path) {
      logger.debug('[DynamicRouterMiddleware] Cached page detected, skipping all processing');
      return;
    }

    // CRITICAL: Check static routes FIRST before any dynamic resolution
    const allRoutes = router.getRoutes()
    const staticRoute = allRoutes.find(route => {
      return route.path === to.path && route.name !== 'DynamicRouteHandler'
    })
    
    if (staticRoute) {
      logger.debug('[DynamicRouterMiddleware] Static route found, skipping dynamic resolution', { 
        path: to.path,
        routeName: staticRoute.name 
      })
      return // Let the static route handle this
    }

    // Debug log to show what routes are available
    logger.debug('[DynamicRouterMiddleware] Available routes:', { 
      routes: allRoutes.map(r => ({ name: r.name, path: r.path }))
    })

    // Special handling for root route
    if (to.path === '/' && router.hasRoute('index')) {
      return
    }

    // If route is already matched by something other than DynamicRouteHandler
    if (to.matched.length > 0 && to.matched[0].name !== 'DynamicRouteHandler') {
      logger.debug('[DynamicRouterMiddleware] Route already matched by specific route, continuing', { 
        path: to.path, 
        name: to.matched[0].name 
      })
      return
    }

    // If matched by DynamicRouteHandler, resolve dynamic route
    if (to.matched.length > 0 && to.matched[0].name === 'DynamicRouteHandler') {
      logger.debug('[DynamicRouterMiddleware] Matched DynamicRouteHandler, resolving dynamic route', { path: to.path })

      try {
        let routeData = null

        // Check cache first
        const normalizeMeta = (data: any) => {
          if (!data) return data
          if (data.meta && typeof data.meta === 'string') {
            try {
              return { ...data, meta: JSON.parse(data.meta) }
            } catch (err) {
              logger.warn('[DynamicRouterMiddleware] Failed to parse meta JSON from cache/API', { meta: data.meta, error: err })
              return { ...data, meta: {} }
            }
          }
          return data
        }

        if (routeCache.has(to.path)) {
          routeData = normalizeMeta(routeCache.get(to.path))
          logger.debug('[DynamicRouterMiddleware] Route found in cache', { path: to.path, meta: routeData?.meta })
        } else {
          // Fetch from API
          logger.debug('[DynamicRouterMiddleware] Fetching route from API', { path: to.path })
          const dynamicRoutesApi = useApi('/dynamic-routes/resolve')
          const { data, error } = await dynamicRoutesApi.get({ path: to.path })

          if (error) {
            throw new Error(error)
          }

          if (data) {
            routeData = normalizeMeta(data)
            logger.debug('[DynamicRouterMiddleware] Route resolved from API', { path: to.path, meta: routeData?.meta })
            routeCache.set(to.path, routeData)
          } else {
            logger.debug('[DynamicRouterMiddleware] No dynamic route found', { path: to.path })
            return '/404'
          }
        }

        // Store route data globally for HtmlCacheGenerator
        if (typeof window !== 'undefined') {
          (window as any).__ROUTE_DATA__ = routeData;
        }

        // Ensure meta is an object
        // Resolve component
        const resolvedComponent = await resolveComponent(routeData.component)
        
        // Check layout exists
        if (routeData.meta?.layout && !layoutRegistry.has(routeData.meta.layout)) {
          logger.warn(`Layout "${routeData.meta.layout}" not found, using public`)
          routeData.meta.layout = 'public'
        }

        // Register dynamic route
        const dynamicRoute = {
          path: routeData.path,
          name: routeData.name,
          component: resolvedComponent,
          meta: {
            ...(routeData.meta || {}),
            isDynamic: true
          }
        }

        if (!router.hasRoute(routeData.name)) {
          router.addRoute(dynamicRoute)
          return {
            path: to.path,
            query: to.query,
            hash: to.hash,
            replace: true
          }
        }

        return

      } catch (error) {
        logger.error('[DynamicRouterMiddleware] Error resolving route:', { path: to.path, error })
        return '/404'
      }
    }

    // No route matched, go to 404
    logger.debug('[DynamicRouterMiddleware] No route matched, going to 404', { path: to.path })
    return '/404'
  }
}

async function resolveComponent(componentName: string) {
  if (!componentName) {
    return () => import('@/layouts/system/DefaultDynamicPage.vue')
  }

  const components = import.meta.glob('@/(components|core/layouts|components/base|core/pages|pages|modules/**/components|layouts/default|layouts/private|layouts/public|dsx/components)/**/*.vue')
  const componentFileName = `${componentName}.vue`

  for (const path in components) {
    if (path.endsWith(componentFileName)) {
      try {
        const componentModule = await components[path]() as any
        return markRaw(componentModule.default)
      } catch (error) {
        logger.error('Failed to load component', { component: componentName, error })
        break
      }
    }
  }

  return () => import('@/layouts/system/DefaultDynamicPage.vue')
}
