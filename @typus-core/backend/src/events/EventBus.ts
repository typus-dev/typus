import { Service } from '../core/decorators/component.js';
import { BaseService } from '../core/base/BaseService.js';

type EventHandler = (payload: any) => void | Promise<void>;
type WildcardHandler = (eventName: string, payload: any) => void | Promise<void>;

// Global singleton storage to survive hot reload
declare global {
  var __eventBusHandlers: Map<string, EventHandler[]> | undefined;
  var __eventBusWildcardHandlers: WildcardHandler[] | undefined;
}

/**
 * EventBus - Universal event emitter for decoupled plugin communication
 *
 * Core is agnostic - just provides emit/subscribe mechanism.
 * Plugins define their own events and handlers.
 *
 * Usage in DSL models:
 *   events: { afterCreate: 'waitlist.signup.created' }
 *
 * Usage in services:
 *   this.eventBus.emit('waitlist.signup.created', { record, userId })
 *
 * Usage in listeners:
 *   this.eventBus.subscribe('waitlist.signup.created', (payload) => { ... })
 *   this.eventBus.subscribe('*', (eventName, payload) => { ... }) // wildcard
 */
@Service()
export class EventBus extends BaseService {
  // Use global storage to survive hot reload
  private get handlers(): Map<string, EventHandler[]> {
    if (!global.__eventBusHandlers) {
      global.__eventBusHandlers = new Map();
    }
    return global.__eventBusHandlers;
  }

  private get wildcardHandlers(): WildcardHandler[] {
    if (!global.__eventBusWildcardHandlers) {
      global.__eventBusWildcardHandlers = [];
    }
    return global.__eventBusWildcardHandlers;
  }

  /**
   * Emit event to all subscribers
   * Fire-and-forget, non-blocking, errors logged but not thrown
   */
  emit(eventName: string, payload: any): void {
    this.logger.debug(`[EventBus] Emitting: ${eventName}`);

    // Specific handlers for this event
    const specificHandlers = this.handlers.get(eventName) || [];
    for (const handler of specificHandlers) {
      setImmediate(async () => {
        try {
          await handler(payload);
        } catch (error) {
          this.logger.error(`[EventBus] Handler error for ${eventName}:`, error);
        }
      });
    }

    // Wildcard handlers (receive all events)
    for (const handler of this.wildcardHandlers) {
      setImmediate(async () => {
        try {
          await handler(eventName, payload);
        } catch (error) {
          this.logger.error(`[EventBus] Wildcard handler error for ${eventName}:`, error);
        }
      });
    }

    this.logger.debug(`[EventBus] Dispatched ${eventName} to ${specificHandlers.length} specific + ${this.wildcardHandlers.length} wildcard handlers`);
  }

  /**
   * Subscribe to specific event or wildcard ('*')
   * Returns unsubscribe function
   */
  subscribe(eventName: string, handler: EventHandler | WildcardHandler): () => void {
    if (eventName === '*') {
      this.wildcardHandlers.push(handler as WildcardHandler);
      this.logger.info(`[EventBus] Wildcard subscriber registered (total: ${this.wildcardHandlers.length})`);

      return () => {
        const index = this.wildcardHandlers.indexOf(handler as WildcardHandler);
        if (index > -1) {
          this.wildcardHandlers.splice(index, 1);
          this.logger.debug(`[EventBus] Wildcard subscriber removed`);
        }
      };
    }

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler as EventHandler);
    this.logger.info(`[EventBus] Subscribed to: ${eventName}`);

    return () => {
      const handlers = this.handlers.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(handler as EventHandler);
        if (index > -1) {
          handlers.splice(index, 1);
          this.logger.debug(`[EventBus] Unsubscribed from: ${eventName}`);
        }
      }
    };
  }

  /**
   * Check if event has any subscribers
   */
  hasSubscribers(eventName: string): boolean {
    const specific = this.handlers.get(eventName)?.length || 0;
    return specific > 0 || this.wildcardHandlers.length > 0;
  }

  /**
   * Get all registered event names (for debugging)
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get subscriber counts (for debugging/monitoring)
   */
  getStats(): { events: number; specificHandlers: number; wildcardHandlers: number } {
    let specificHandlers = 0;
    for (const handlers of this.handlers.values()) {
      specificHandlers += handlers.length;
    }
    return {
      events: this.handlers.size,
      specificHandlers,
      wildcardHandlers: this.wildcardHandlers.length
    };
  }
}
