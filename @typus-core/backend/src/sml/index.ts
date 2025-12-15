/**
 * SML Backend Module
 *
 * Re-exports SML core from shared and provides backend-specific boot functionality.
 */

// Re-export core SML from shared
export { SML } from '@typus-core/shared/sml';
export * from '@typus-core/shared/sml';

// Backend-specific exports
export { bootSml, isSmlReady, registerPluginAdapter } from './SmlBoot.js';

// Adapter exports (for manual registration if needed)
export { registerDslOperations } from './adapters/DslAdapter.js';
export { registerAuthOperations } from './adapters/AuthAdapter.js';
export { registerNotifyOperations } from './adapters/NotifyAdapter.js';
export { registerEventOperations } from './adapters/EventsAdapter.js';
export { registerActionOperations } from './adapters/ActionsAdapter.js';
export { registerConfigOperations } from './adapters/ConfigAdapter.js';
export { registerAnalyticsOperations } from './adapters/AnalyticsAdapter.js';
export { registerFeedOperations } from './adapters/FeedAdapter.js';
export { registerFlowOperations } from './adapters/FlowAdapter.js';
export { registerUiOperations } from './adapters/UiAdapter.js';
