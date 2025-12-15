// src/core/router/middleware.ts
/* @Tags: routing */
import { Router } from 'vue-router'
import { middlewareRegistry, middlewareRunner } from '@/core/middleware'
import { authGuard, abilityGuard } from '@/core/middleware'

export function setupMiddleware(router: Router) {
  
  middlewareRegistry.register('auth', authGuard)
  middlewareRegistry.register('permission', abilityGuard)

  
  router.beforeEach(async (to, from, next) => {
    
    const middlewareNames = to.meta.middleware as string[] || []

    
    const globalMiddleware = ['logging']
    
    
    if (to.meta.requiresAuth) {
      globalMiddleware.push('auth', 'permission')
    }

    
    const allMiddleware = [...new Set([...globalMiddleware, ...middlewareNames])]

    if (allMiddleware.length > 0) {
      await middlewareRunner.run(allMiddleware, to, from, next)
    } else {
      next()
    }
  })
}
