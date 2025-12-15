/**
 * SML (System Management Layer)
 *
 * Unified interface for AI to discover and execute system operations.
 *
 * @example
 * ```typescript
 * import { SML } from '@typus-core/shared/sml';
 *
 * // Discovery
 * const domains = SML.list();
 * const actions = SML.list('actions');
 * const schema = SML.describe('actions.crm.contact.create');
 *
 * // Execution
 * const result = await SML.execute('actions.crm.contact.create', params, ctx);
 * ```
 */

export { SML } from './SML';
export * from './types';
