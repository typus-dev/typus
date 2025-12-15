// src/core/middleware/index.ts
/* @Tags: routing */
export * from './types'
export * from './registry'
export * from './runner'
export * from './auth'
export * from './ability'
export * from './dynamic-router'

import { authGuard } from './auth'
import { abilityGuard } from './ability'
// import { createDynamicRouterMiddleware } from './dynamic-router' // Will be imported in router/index.ts
import { middlewareRegistry } from './registry'


middlewareRegistry.register('auth', authGuard)
middlewareRegistry.register('ability', abilityGuard)
// middlewareRegistry.register('dynamicRouter', createDynamicRouterMiddleware(router)) // Will be registered in router/index.ts

/*
Middleware can:
1. Return undefined - to continue the chain
2. Return a route object - for redirection
3. Return false - to cancel navigation
4. Throw an error - for error handling

And `next()` will be called only once either with the result from middleware or without parameters at the end of the chain.
*/
