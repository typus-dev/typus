/* @Tags: routing */
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

export interface MiddlewareContext {
  to: RouteLocationNormalized
  from: RouteLocationNormalized
  next: NavigationGuardNext
}

export type Middleware = (
  context: MiddlewareContext
) => Promise<void | RouteLocationNormalized | false | undefined> | void | RouteLocationNormalized | false | undefined
