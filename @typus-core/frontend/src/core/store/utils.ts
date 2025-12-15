import { errorHandler } from '@/core/errors/handler'

/**
 * Wrap a Pinia action to catch and handle errors globally.
 * Usage: action: withErrorHandling(async function(args) { ... })
 */
export function withErrorHandling<T extends (...args: any[]) => any>(action: T) {
  return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    try {
      return await action.apply(this, args)
    } catch (err: any) {
      const origin = this?.$id ? `${this.$id}/${action.name || 'anonymous'}` : action.name || 'anonymous'
      errorHandler.handle(err, { origin, args })
      throw err
    }
  }
}
