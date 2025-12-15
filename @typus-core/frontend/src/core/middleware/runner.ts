// src/core/middleware/runner.ts
/* @Tags: routing */
import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { middlewareRegistry } from './registry'
import { Middleware, MiddlewareContext } from './types'

export class MiddlewareRunner {
  async run(
    middlewareNames: string[],
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) {
    const context: MiddlewareContext = { to, from, next }
   // logger.debug('🔍 MIDDLEWARE-RUNNER: Running middleware chain:', middlewareNames);
   // logger.debug('🔍 MIDDLEWARE-RUNNER: Route path:', to.path);
   // logger.debug('🔍 MIDDLEWARE-RUNNER: Route name:', to.name);
  //  logger.debug('🔍 MIDDLEWARE-RUNNER: Route meta:', to.meta);

    try {
      
      const middlewares: Middleware[] = middlewareNames
        .map(name => {
          const middleware = middlewareRegistry.get(name);
         // logger.debug(`🔍 MIDDLEWARE-RUNNER: Middleware ${name} ${middleware ? 'found' : 'not found'}`);
          return middleware;
        })
        .filter((m): m is Middleware => m !== undefined)
      
     // logger.debug('🔍 MIDDLEWARE-RUNNER: Filtered middlewares count:', middlewares.length);

      
      for (const middleware of middlewares) {
      //  logger.debug('🔍 MIDDLEWARE-RUNNER: Executing middleware:', middleware.name || 'anonymous');
        const result = await middleware(context)
      //  logger.debug('🔍 MIDDLEWARE-RUNNER: Middleware result:', result);
        
        
        // If middleware returns a value, it means it's redirecting or cancelling
        if (result === false) {
       //   logger.debug('🔍 MIDDLEWARE-RUNNER: Middleware returned false, cancelling navigation.');
          return next(false);
        } else if (result) { // If result is a RouteLocationNormalized object
       //   logger.debug('🔍 MIDDLEWARE-RUNNER: Middleware returned a route location, redirecting to:', result);
          return next(result);
        }
        // If result is undefined, continue to the next middleware
      }


   //   logger.debug('🔍 MIDDLEWARE-RUNNER: All middlewares executed, calling next()');
      next()
    } catch (error) {
      logger.error('🔍 MIDDLEWARE-RUNNER: Middleware execution failed:', error)
      next(false)
    }
  }
}

export const middlewareRunner = new MiddlewareRunner()
