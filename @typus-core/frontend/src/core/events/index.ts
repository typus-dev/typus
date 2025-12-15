// src/core/events/index.ts

// Define types for main events
type EventMap = {
  'auth:login': { userId: string; email: string }
  'auth:logout': void
  'error': { message: string; code?: string }
  'warning': any // Add warning event
  'loading:start': void
  'loading:end': void
  'modal:open': { id: string; data?: any }
  'modal:close': { id: string }
  'notification:show': any // Add notification:show event
  'queue:update': any // Queue update events
  'task:history:update': any // Task history update events
}

type EventCallback<T> = (data: T) => void

export class EventBus {
  private events = new Map<keyof EventMap, EventCallback<any>[]>()

  on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)?.push(callback)

    // Return a function for unsubscribing
    return () => {
      const callbacks = this.events.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    console.debug(`Event emitted: ${String(event)}`, data) // Simple logging
    this.events.get(event)?.forEach(callback => callback(data))
  }

  clear() {
    this.events.clear()
  }
}

// Create a single instance for the entire application
export const eventBus = new EventBus()

// Usage example:
/*
// Subscribe to events
const unsubscribe = eventBus.on('auth:login', (data) => {
  logger.debug(`User logged in: ${data.email}`)
})

// Emit an event
eventBus.emit('auth:login', { userId: '123', email: 'user@example.com' })

// Unsubscribe from an event
unsubscribe()
*/
