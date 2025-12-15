// src/core/middleware/ability.ts
/* @Tags: routing */
import { Middleware } from './types'
import { useAbility, type Subjects } from '@/core/auth/ability'
import { useAuthStore } from '@/core/store/authStore'

export const abilityGuard: Middleware = async ({ to }) => {
  logger.debug('🔑 ABILITY GUARD: Ability middleware running for path:', to.path);
  logger.debug('🔑 ABILITY GUARD: Route name:', to.name);
  logger.debug('🔑 ABILITY GUARD: Route meta:', to.meta);
  
  // Skip verification pages
  if (to.path.includes('/verify-code') || to.name === 'verify-code') {
    logger.debug('🔑 ABILITY GUARD: Skipping ability check for verification page');
    return;
  }
  
  const { can } = useAbility()
  const authStore = useAuthStore()
  
  // Skip public or explicitly unauthenticated routes
  if (to.meta.layout === 'public' || to.meta.layout === 'default') {
    logger.debug(`🔑 ABILITY GUARD: Skipping ability check for ${to.meta.layout} layout on path:`, to.path);
    return;
  }
  if (to.meta.requiresAuth === false) {
    logger.debug(`🔑 ABILITY GUARD: Route ${to.path} does not require auth, skipping ability check`);
    return;
  }

  logger.debug(`🔑 ABILITY GUARD: Checking ability for path: ${to.path}, subject: ${to.meta.subject}`);
  
  // Check access rights
  if (to.meta.subject && typeof to.meta.subject === 'string') {
    const subject = to.meta.subject as Subjects;
    const hasAccess = can('manage', subject);
    logger.debug(`🔑 ABILITY GUARD: Access check for ${subject} on path ${to.path}: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    
    if (!hasAccess) {
      logger.warn(`🔑 ABILITY GUARD: Access denied to: ${subject} for route: ${to.path}`)
      
      if (!authStore.isAuthenticated.value) {
        logger.debug('🔑 ABILITY GUARD: User is not authenticated, redirecting to login');
        return {
          name: 'login',
          query: { redirect: to.fullPath }
        };
      }

      logger.debug('🔑 ABILITY GUARD: User authenticated but lacks permissions, redirecting to access denied');
      return { name: 'AccessDenied' } as const;
    }
  } else {
    logger.warn(`🔑 ABILITY GUARD: No subject defined or invalid type for route: ${to.path}`)
  }
  
  logger.debug('🔑 ABILITY GUARD: Ability middleware completed for path:', to.path);
  // Return undefined to let runner call next() - this prevents double next() warning
}
