/**
 * Plugin Auto-Loader
 *
 * Auto-discovers and initializes all plugins from /plugins/*\/frontend/init.ts
 * Uses Vite's import.meta.glob for dynamic imports
 *
 * @module core/plugins/loader
 */

import { errorHandler } from '@/core/errors'
import { logger } from '@/core/logging/logger'

/**
 * Plugin initialization result
 */
interface PluginInitResult {
  pluginName: string
  status: 'success' | 'skipped' | 'error'
  duration?: number
  error?: string
}

/**
 * Plugin loader statistics
 */
interface PluginLoaderStats {
  total: number
  success: number
}

/**
 * Discovers all plugin init files from /plugins/*\/frontend/init.ts
 *
 * Uses Vite's import.meta.glob with relative path from THIS file
 * Path: @typus-core/frontend/src/core/plugins/loader.ts
 * Relative to plugins: ../../../../../../plugins
 *
 * @returns Map of plugin paths to init function factories
 */
function discoverPluginInits() {
  const initModules = import.meta.glob<{ default: () => Promise<void> | void }>(
    '../../../../../../plugins/*/frontend/init.ts',
    { eager: false, import: 'default' }
  )

  return initModules
}

/**
 * Load and execute all plugin init functions
 *
 * Features:
 * - Parallel loading with Promise.allSettled (one failure doesn't break others)
 * - Error boundaries for each plugin
 * - Detailed logging with timing
 * - Summary table in console
 *
 * @returns Statistics about loaded plugins
 */
export async function loadPlugins(): Promise<PluginLoaderStats> {
  const initModules = discoverPluginInits()
  const pluginNames = Object.keys(initModules).map(path => {
    const match = path.match(/plugins\/([^/]+)\//)
    return match ? match[1] : 'unknown'
  })

  if (pluginNames.length === 0) {
    logger.info('[PluginLoader] No plugins with init files found')
    return { total: 0, success: 0 }
  }

  logger.info(`[PluginLoader] Found ${pluginNames.length} plugin(s) with init files:`, pluginNames)

  // Load all plugins in parallel with error boundaries
  const results = await Promise.allSettled(
    Object.entries(initModules).map(async ([path, moduleFactory]) => {
      const pluginName = path.match(/plugins\/([^/]+)\//)?.[1] || 'unknown'

      try {
        logger.debug(`[PluginLoader] Loading init for plugin: ${pluginName}`)

        const start = performance.now()
        const initFn = await moduleFactory()

        // Type guard: ensure init.ts exports a function
        if (typeof initFn === 'function') {
          await initFn()
          const duration = performance.now() - start

          logger.info(`[PluginLoader] ✅ Plugin ${pluginName} initialized (${duration.toFixed(2)}ms)`)
          return { pluginName, status: 'success', duration } as PluginInitResult
        } else {
          logger.warn(`[PluginLoader] ⚠️  Plugin ${pluginName} init.ts does not export default function`)
          return { pluginName, status: 'skipped' } as PluginInitResult
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`[PluginLoader] ❌ Plugin ${pluginName} failed to initialize:`, error)
        errorHandler.logError(error as Error, { context: `PluginLoader:${pluginName}` })
        return { pluginName, status: 'error', error: errorMessage } as PluginInitResult
      }
    })
  )

  // Build summary table
  const summary = results.map((result, idx) => {
    const pluginName = pluginNames[idx]

    if (result.status === 'fulfilled') {
      const data = result.value
      return {
        Plugin: pluginName,
        Status: data.status === 'success' ? '✅' : data.status === 'skipped' ? '⚠️' : '❌',
        Time: data.duration ? `${data.duration.toFixed(2)}ms` : '-',
        Error: data.error || '-'
      }
    } else {
      return {
        Plugin: pluginName,
        Status: '❌',
        Time: '-',
        Error: result.reason?.message || 'Unknown error'
      }
    }
  })

  // Log summary table (pretty format in console)
  console.table(summary)
  logger.info('[PluginLoader] Plugin Initialization Summary:', summary)

  // Calculate success count
  const successCount = results.filter(r =>
    r.status === 'fulfilled' && r.value.status === 'success'
  ).length

  return { total: pluginNames.length, success: successCount }
}
