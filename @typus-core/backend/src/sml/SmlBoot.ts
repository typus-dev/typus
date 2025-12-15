/**
 * SML Boot Sequence
 *
 * Initializes SML by registering all operations from core adapters and plugins.
 * Should be called once during server startup, after all services are initialized.
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../core/logger/Logger.js';
import { registerDslOperations } from './adapters/DslAdapter.js';
import { registerAuthOperations } from './adapters/AuthAdapter.js';
import { registerNotifyOperations } from './adapters/NotifyAdapter.js';
import { registerEventOperations } from './adapters/EventsAdapter.js';
import { registerActionOperations } from './adapters/ActionsAdapter.js';
import { registerConfigOperations } from './adapters/ConfigAdapter.js';
import { registerAnalyticsOperations } from './adapters/AnalyticsAdapter.js';
import { registerFeedOperations } from './adapters/FeedAdapter.js';
import { registerFlowOperations } from './adapters/FlowAdapter.js';
import { registerUiOperations } from './adapters/UiAdapter.js';

const logger = new Logger();

/**
 * Plugin SML adapters registry.
 * Plugins call registerPluginAdapter() before bootSml() to register their adapters.
 */
const pluginAdapters: Array<{ name: string; register: () => Promise<void> }> = [];

/**
 * Register a plugin SML adapter to be loaded during boot.
 * Call this before bootSml() is called.
 *
 * @example
 * // In plugin's module init:
 * import { registerPluginAdapter } from '@typus-core/backend/src/sml';
 * import { registerUiActions } from './sml/UiActionsAdapter';
 * registerPluginAdapter('ai-agent:ui-actions', registerUiActions);
 */
export function registerPluginAdapter(name: string, register: () => Promise<void>): void {
  pluginAdapters.push({ name, register });
  logger.debug(`[SML] Plugin adapter registered: ${name}`);
}

/**
 * Boot SML registry with all core operations.
 */
export async function bootSml(): Promise<void> {
  logger.info('[SML] Starting boot sequence...');

  try {
    // Phase 1: Core adapters (internal)
    await registerDslOperations();
    await registerAuthOperations();
    await registerNotifyOperations();
    await registerEventOperations();

    // Phase 2: Public actions
    await registerActionOperations();

    // Phase 3: Domain adapters
    await registerConfigOperations();
    await registerAnalyticsOperations();
    await registerFeedOperations();
    await registerFlowOperations();
    await registerUiOperations();

    // Note: CRM and Waitlist operations are already in ActionsAdapter.ts
    // actions.crm.contact.create, actions.crm.contact.find, actions.crm.contact.list
    // actions.waitlist.signup, actions.waitlist.check

    // Phase 4: Plugin adapters (dissolve pattern)
    for (const adapter of pluginAdapters) {
      try {
        logger.debug(`[SML] Loading plugin adapter: ${adapter.name}`);
        await adapter.register();
      } catch (error) {
        logger.error(`[SML] Plugin adapter failed: ${adapter.name}`, error);
        // Continue with other adapters
      }
    }

    // Phase 5: Lock registry
    SML.lock();

    // Log summary
    const meta = SML.meta;
    logger.info('[SML] Boot completed:', {
      domains: meta.domains.length,
      operations: SML.size,
      events: SML.eventCount,
      models: meta.models.length,
      integrations: meta.integrations
    });

  } catch (error) {
    logger.error('[SML] Boot failed:', error);
    throw error;
  }
}

/**
 * Check if SML is ready (locked and has operations).
 */
export function isSmlReady(): boolean {
  return SML.isLocked() && SML.size > 0;
}
