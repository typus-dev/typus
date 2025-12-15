// src/core/middleware/auth.ts
/* @Tags: routing */
import { Middleware } from './types'
import { useAuthStore } from '@/core/store/authStore'
import { useTokenRefresh } from '@/shared/composables/useTokenRefresh'
import { layoutRegistry } from '@/core/layouts'

export const authGuard: Middleware = async ({ to }) => {
 logger.debug('🔑 AUTH GUARD: Auth middleware running for path:', { path: to.path });
 logger.debug('🔑 AUTH GUARD: Route name:', { name: to.name });
 logger.debug('🔑 AUTH GUARD: Route query:', { query: to.query });

 // Skip auth check for verification pages
 if (to.path.includes('/verify-code') || to.name === 'verify-code') {
   logger.debug('🔑 AUTH GUARD: Skipping auth check for verification page', {});
   return;
 }

 const store = useAuthStore()
 const { refreshTokenIfNeeded } = useTokenRefresh()
   
 logger.debug('🔑 AUTH GUARD: isAuthenticated:', { isAuthenticated: store.isAuthenticated.value });
   
 if (to.path === '/' && store.isAuthenticated.value) {
   logger.debug('🔑 AUTH GUARD: Redirecting from / to /dashboard because user is authenticated', {});
   return '/dashboard'
 }

 logger.debug('🔑 AUTH GUARD: Checking if layout is set for path to.meta', { meta: to.meta });

 const fallbackLayoutName = store.isAuthenticated.value ? 'private' : 'public';
 const isCachedRoute = window.__CACHED_ROUTE__ && to.path === window.__CACHED_ROUTE__.path;

 // Handle nested meta.layout that may come from component route metadata
 const nestedLayout = (to.meta as { meta?: { layout?: string } })?.meta?.layout;
 if (!to.meta.layout && typeof nestedLayout === 'string') {
   to.meta.layout = nestedLayout;
   logger.debug('🔑 AUTH GUARD: Extracted layout from nested meta definition:', {
     path: to.path,
     layout: to.meta.layout
   });
 }

 const hasExplicitLayout = typeof to.meta.layout === 'string' && to.meta.layout.length > 0;

 if (isCachedRoute && window.__CACHED_ROUTE__?.meta?.layout) {
   to.meta.layout = window.__CACHED_ROUTE__.meta.layout;
   logger.debug('🔑 AUTH GUARD: Using cached layout for path:', { path: to.path, layout: to.meta.layout });
 } else if (!hasExplicitLayout) {
   const registryHasFallback = layoutRegistry.has(fallbackLayoutName);
   to.meta.layout = registryHasFallback ? fallbackLayoutName : 'public';

   if (!registryHasFallback) {
     logger.warn(
       `🔑 AUTH GUARD: Layout "${fallbackLayoutName}" not found in registry, falling back to "public"`,
       {}
     );
   }

   logger.debug(`🔑 AUTH GUARD: Setting layout to ${to.meta.layout} for path:`, { path: to.path });
 }
      
 if (to.meta.requiresAuth) {
   logger.debug('🔑 AUTH GUARD: Route requires auth, refreshing token if needed', {});
   logger.debug('🔑 AUTH GUARD: Route meta:', { meta: to.meta });
   const isValid = await refreshTokenIfNeeded()
   logger.debug('🔑 AUTH GUARD: Token refresh result:', { isValid });
         
   if (!isValid) {
     logger.debug('🔑 AUTH GUARD: Token refresh failed, redirecting to login', {});
           
     logger.debug('🔑 AUTH GUARD: Setting auth_redirect in localStorage', {});
     localStorage.setItem('auth_redirect', 'true');
     localStorage.setItem('auth_redirect_path', to.fullPath);
           
     return {
       name: 'login',
       query: { redirect: to.fullPath }
     }
   }
 } else {
   logger.debug('🔑 AUTH GUARD: Route does not require auth:', { path: to.path });
 }
   
 logger.debug('🔑 AUTH GUARD: Auth middleware completed for path:', { path: to.path });
}
