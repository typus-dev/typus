/* @Tags: routing */
import { loadAllLayouts } from './layouts-loader'
import { logger } from '@/core/logging/logger'

/**
 * Initialize the layout system
 *
 * Loading order (priority low → high):
 * 1. Core layouts (default, public, private, system)
 * 2. Module layouts (cms-*, auth-*, etc.)
 * 3. Plugin layouts (demo-*, docs-*, etc.)
 * 4. Custom layouts (highest priority - can override anything)
 */
export async function initLayoutSystem(): Promise<void> {
  logger.debug('[initLayoutSystem] Initializing layout system')

  await loadAllLayouts()

  logger.debug('[initLayoutSystem] Layout system initialized')
}
