// src/core/middleware/registry.ts
/* @Tags: routing */
import type { Middleware } from './types'

class MiddlewareRegistry {
  private middleware = new Map<string, Middleware>()

  register(name: string, middleware: Middleware) {
    this.middleware.set(name, middleware)
  }

  get(name: string): Middleware | undefined {
    return this.middleware.get(name)
  }

  has(name: string): boolean {
    return this.middleware.has(name)
  }

  getAll(): Map<string, Middleware> {
    return this.middleware
  }
}

export const middlewareRegistry = new MiddlewareRegistry()
