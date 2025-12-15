// src/core/errors/index.ts
export * from './config'
export * from './types'
export * from './handler'

import { errorHandler } from './handler'
import type { App } from 'vue'

export function setupErrorHandler(app: App) {
 
 app.config.errorHandler = (err: Error, instance, info) => {

  errorHandler.handle(err, {
    componentInfo: info,
    componentInstance: instance
  })

}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const stack = String(reason?.stack || reason?.message || reason || '')


  if (stack.includes('chrome-extension://')) return
  if (stack.includes('/vite/client') && stack.includes('Failed to fetch')) return

  errorHandler.handle(reason)
})

window.addEventListener('error', (event) => {
  const src = event?.filename || ''
  if (src.startsWith('chrome-extension://')) return
  if (src.includes('/vite/client')) return

  errorHandler.handle(event.error)
})
}