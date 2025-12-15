/* @Tags: routing */
import { createRouter, createWebHistory, RouteLocationRaw } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { errorRoutes } from './error-routes'
import { errorHandler } from '@/core/errors'
import { middlewareRunner, middlewareRegistry } from '@/core/middleware'
import { createDynamicRouterMiddleware } from '@/core/middleware/dynamic-router'
import { useAppStore } from '@/core/store'
import { useAbility, Subjects } from '@/core/auth/ability'


logger.debug('🔍 AUTO-ROUTES: All routes:', routes.map(r => ({ name: r.name, path: r.path })))
const dashboardRoute = routes.find(r => r.path === '/dashboard' || r.name === 'dashboard')
logger.debug('🔍 AUTO-ROUTES: Dashboard route found:', dashboardRoute)

// Process routes after initialization
const extendedRoutes = routes.map(route => {
  const component = typeof route.component === 'function'
    ? undefined
    : route.component

  if (component && 'options' in component) {
    logger.debug('component.options', { options: component.options })
    return {
      ...route,
      meta: {
        ...route.meta,
        ...(component.options?.meta || {})
      }
    }
  }
  logger.debug('component', { route })
  return route
})

logger.debug('🔍 EXTENDED-ROUTES: Dashboard in extended routes:',
  extendedRoutes.find(r => r.path === '/dashboard' || r.name === 'dashboard'))

// Plugin pages are already auto-discovered by Vite's unplugin-vue-router
// See vite.config.js lines 81-84: discoverPlugins('pages')
// They are included in the `routes` array from 'vue-router/auto-routes'
logger.debug('🔍 ALL-ROUTES: Total routes from auto-discovery:', {
  count: extendedRoutes.length,
  routes: extendedRoutes.map(r => ({ name: r.name, path: r.path, meta: r.meta }))
})

// Check for route path conflicts (same path, different names)
const routesByPath = new Map<string, typeof extendedRoutes[0][]>()
extendedRoutes.forEach(route => {
  if (!routesByPath.has(route.path)) {
    routesByPath.set(route.path, [])
  }
  routesByPath.get(route.path)!.push(route)
})

const pathConflicts = Array.from(routesByPath.entries()).filter(([_, routes]) => routes.length > 1)
if (pathConflicts.length > 0) {
  logger.warn(`⚠️ [ROUTE CONFLICTS] Found ${pathConflicts.length} paths with multiple route definitions:`)
  pathConflicts.forEach(([path, routes]) => {
    logger.warn(`   Path: ${path}`)
    routes.forEach((r, idx) => {
      const component = typeof r.component === 'function' ? 'lazy' : r.component
      logger.warn(`      ${idx + 1}. ${r.name} (component: ${component})`)
    })
    logger.warn(`   → Router will use the last one: ${routes[routes.length - 1].name}`)
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...extendedRoutes,
    ...errorRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'DynamicRouteHandler',
      component: () => import('@/components/system/DynamicRouteHandler.vue')
    },
  ],
})


logger.debug('🔍 FINAL-ROUTES: All registered routes:', 
  router.getRoutes().map(r => ({ name: r.name, path: r.path })))

router.beforeEach(async (to, from, next) => {
  logger.debug('🔍 ROUTER: Navigation start:', { path: to.path })
  logger.debug('🔍 ROUTER: Route meta:', { meta: to.meta })
  logger.debug('🔍 ROUTER: Route name:', { name: to.name })
  logger.debug('🔍 ROUTER: Route query:', { query: to.query })
  
  try {
    // Special handling for verification pages
    if (to.path.includes('/verify-code') || to.name === 'verify-code') {
      logger.debug('🔍 ROUTER: Special handling for verification page')
      
      if (!to.meta.layout) {
        logger.debug('🔍 ROUTER: Setting layout to public for verification page')
        to.meta.layout = 'public'
      }
      
      logger.debug('🔍 ROUTER: Skipping auth middleware for verification page')
      const filteredMiddleware = ['ability']
      logger.debug('🔍 ROUTER: Filtered middleware chain:', { chain: filteredMiddleware })
      await middlewareRunner.run(filteredMiddleware, to, from, next)
      return
    }

    // Normal middleware chain for other routes
    const systemMiddleware = ['dynamicRouter', 'auth', 'ability']
    const routeMiddleware = (to.meta.middleware as string[]) || []
    const middlewareChain = [...systemMiddleware, ...routeMiddleware]

    logger.debug('🔍 ROUTER: Middleware chain:', { chain: middlewareChain })
    await middlewareRunner.run(middlewareChain, to, from, next)
  } catch (error) {
    logger.error('🔍 ROUTER: Navigation error:', { error })
    errorHandler.handle(error as Error)
    next(false)
  }
})

router.afterEach(() => {
  logger.debug('afterEach', { path: router.currentRoute.value.path })
  const { setLoading } = useAppStore()
  setLoading(false)
})

router.onError((error) => {
  errorHandler.handle(error)
})

/**
 * ❌ COMMENTED OUT 2025-11-09
 *
 * Reason: Duplicate access permission check
 *
 * This beforeResolve hook causes duplicate next() callback when navigating between
 * pages with the same subject (e.g., /payments/admin/quotas/user/25 -> /payments/admin/quotas/user/45).
 *
 * Problem:
 * 1. Middleware 'ability' already checks permissions in ability.ts:50 and calls next()
 * 2. This beforeResolve hook does THE SAME check and returns result (equivalent to next())
 * 3. Result: Vue Router receives two next() calls and shows warning:
 *    "The 'next' callback was called more than once in one navigation guard"
 *
 * Where it occurred:
 * - /plugins/payments/frontend/pages/admin/quotas/user-detail.vue
 * - When clicking table rows on /payments/admin/quotas (navigation between user/:userId)
 *
 * Solution: Permission check is already correctly handled by middleware system.
 * This hook is redundant and creates conflict.
 *
 * See investigation report in context from 2025-11-09
 */
/*
router.beforeResolve(async (to) => {
  const { can } = useAbility()
  logger.debug('beforeResolve.to.meta', to.meta)

  if (to.meta.layout === 'public' || to.meta.layout === 'default') {
    return true
  }

  if (to.meta.subject) {
    if (!can('manage', to.meta.subject as Subjects)) {
      logger.warn(`Access denied to: ${to.meta.subject} for route: ${to.path}`)
      return { name: 'AccessDenied' } as unknown as RouteLocationRaw
    }
  } else {
    logger.warn(`No subject defined for route: ${to.path}`)
  }
})
*/

// Register dynamicRouterMiddleware after router is created
middlewareRegistry.register('dynamicRouter', createDynamicRouterMiddleware(router))

export default router