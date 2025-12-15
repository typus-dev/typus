/**
 * Events Adapter for SML
 *
 * Registers event operations under events.*
 * Also declares core system events.
 */

import { SML } from '@typus-core/shared/sml';
import { container } from 'tsyringe';
import { EventBus } from '../../events/EventBus.js';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:events';

/**
 * Register event operations in SML.
 */
export async function registerEventOperations(): Promise<void> {
  logger.debug('[SML:EventsAdapter] Registering event operations');

  // events.emit
  SML.register('events.emit', {
    handler: async (params, ctx) => {
      const eventBus = container.resolve(EventBus);
      eventBus.emit(params.event, params.payload);
      return true;
    },
    schema: {
      description: 'Emit an event to the event bus',
      params: {
        event: { type: 'string', required: true, description: 'Event name (e.g., crm.contact.created)' },
        payload: { type: 'object', description: 'Event payload data' }
      },
      returns: { type: 'boolean' }
    }
  }, { owner: OWNER });

  // events.subscribe - Declarative subscription for workflows
  // Instead of passing a JS function (impossible via REST/AI), we register
  // a workflow path that will be executed when the event fires.
  SML.register('events.subscribe', {
    handler: async (params, ctx) => {
      const eventBus = container.resolve(EventBus);

      // Store subscription in database for persistence
      const prisma = global.prisma;
      if (!prisma) {
        throw new Error('Prisma client not available');
      }

      // Create or update event subscription record
      await prisma.systemConfig.upsert({
        where: { key: `event.subscription.${params.subscriptionId}` },
        create: {
          key: `event.subscription.${params.subscriptionId}`,
          value: JSON.stringify({
            event: params.event,
            workflowPath: params.workflowPath,
            filter: params.filter,
            createdAt: new Date().toISOString()
          }),
          category: 'events',
          description: `Event subscription: ${params.event} -> ${params.workflowPath}`
        },
        update: {
          value: JSON.stringify({
            event: params.event,
            workflowPath: params.workflowPath,
            filter: params.filter,
            updatedAt: new Date().toISOString()
          })
        }
      });

      // Register in-memory handler that calls the workflow
      eventBus.subscribe(params.event, async (payload: any) => {
        // Check filter if provided
        if (params.filter) {
          const matches = Object.entries(params.filter).every(
            ([key, value]) => payload[key] === value
          );
          if (!matches) return;
        }

        // Execute the workflow via SML
        try {
          await SML.execute(params.workflowPath, payload, ctx);
        } catch (error) {
          logger.error(`[SML:EventsAdapter] Failed to execute workflow ${params.workflowPath}`, error);
        }
      });

      logger.info(`[SML:EventsAdapter] Subscribed ${params.subscriptionId} to ${params.event} -> ${params.workflowPath}`);
      return true;
    },
    schema: {
      description: 'Subscribe a workflow to an event (declarative, ABI-compatible)',
      params: {
        subscriptionId: { type: 'string', required: true, description: 'Unique subscription ID for management' },
        event: { type: 'string', required: true, description: 'Event name to subscribe to (e.g., auth.login)' },
        workflowPath: { type: 'string', required: true, description: 'SML path to execute when event fires' },
        filter: { type: 'object', description: 'Optional payload filter (key-value match)' }
      },
      returns: { type: 'boolean' }
    }
  }, { owner: OWNER, visibility: 'internal' });

  // events.unsubscribe - Remove a subscription
  SML.register('events.unsubscribe', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) {
        throw new Error('Prisma client not available');
      }

      await prisma.systemConfig.deleteMany({
        where: { key: `event.subscription.${params.subscriptionId}` }
      });

      logger.info(`[SML:EventsAdapter] Unsubscribed ${params.subscriptionId}`);
      return true;
    },
    schema: {
      description: 'Remove an event subscription',
      params: {
        subscriptionId: { type: 'string', required: true, description: 'Subscription ID to remove' }
      },
      returns: { type: 'boolean' }
    }
  }, { owner: OWNER, visibility: 'internal' });

  // events.list - List all subscriptions
  SML.register('events.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) {
        throw new Error('Prisma client not available');
      }

      const subscriptions = await prisma.systemConfig.findMany({
        where: { key: { startsWith: 'event.subscription.' } }
      });

      return subscriptions.map(s => ({
        subscriptionId: s.key.replace('event.subscription.', ''),
        ...JSON.parse(s.value as string)
      }));
    },
    schema: {
      description: 'List all event subscriptions',
      returns: { type: 'array' }
    }
  }, { owner: OWNER, visibility: 'internal' });

  // Declare core system events
  SML.declareEvent('system.boot', {
    description: 'System boot completed',
    type: 'system',
    payload: {
      timestamp: { type: 'Date', required: true },
      version: { type: 'string' }
    }
  }, { owner: OWNER });

  SML.declareEvent('system.shutdown', {
    description: 'System shutdown initiated',
    type: 'system',
    payload: {
      reason: { type: 'string' }
    }
  }, { owner: OWNER });

  SML.declareEvent('auth.login', {
    description: 'User logged in',
    type: 'domain',
    payload: {
      userId: { type: 'number', required: true },
      email: { type: 'string', required: true },
      ip: { type: 'string' }
    }
  }, { owner: OWNER });

  SML.declareEvent('auth.logout', {
    description: 'User logged out',
    type: 'domain',
    payload: {
      userId: { type: 'number', required: true }
    }
  }, { owner: OWNER });

  logger.info('[SML:EventsAdapter] Registered 4 operations, 4 events');
}
