// guards.ts
/* @Tags: routing */
import { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@core/store/authStore'
import { useTokenRefresh } from '@/shared/composables/useTokenRefresh'

export async function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  logger.debug('AuthGuard: Guard called')
  logger.debug('AuthGuard: Route navigation', { from: from.path, to: to.path })
  
  const { refreshTokenIfNeeded } = useTokenRefresh()
  logger.debug('AuthGuard: Token refresh hook initialized')
  
  const store = useAuthStore()
  logger.debug('AuthGuard: Auth store initialized')
  
  logger.debug('AuthGuard: Authentication check', { isAuthenticated: store.isAuthenticated })
  logger.debug('AuthGuard: Route details', { path: to.path, meta: to.meta })
  
  // Check if user is authenticated and trying to access root route
  if (to.path === '/' && store.isAuthenticated) {
    logger.debug('AuthGuard: User is authenticated and accessing root, redirecting to dashboard')
    return next('/dashboard')
  }
  
  logger.debug('AuthGuard: Setting layout based on authentication status')
  if (!to.meta.layout) {
    const layoutType = store.isAuthenticated ? 'private' : 'public'
    logger.debug('AuthGuard: Setting layout', { layoutType })
    ;(to.meta as any).layout = layoutType
  } else {
    logger.debug('AuthGuard: Using existing layout', { layout: to.meta.layout })
  }
  
  logger.debug('AuthGuard: Checking if token refresh is needed')
  const isValid = await refreshTokenIfNeeded()
  logger.debug('AuthGuard: Token validation result', { isValid })
  
  if (!isValid) {
    logger.debug('AuthGuard: Token invalid, redirecting to login')
    return next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
  }
  
  logger.debug('AuthGuard: Checking if route requires authentication')
  if (!store.isAuthenticated && to.meta.requiresAuth) {
    logger.debug('AuthGuard: Route requires auth but user is not authenticated, redirecting to login')
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  
  logger.debug('AuthGuard: All checks passed, proceeding to route')
  return next()
}