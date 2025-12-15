/* @Tags: routing */
import { layoutRegistry } from './registry'
import type { Component } from 'vue'
import type { LayoutMetadata } from './registry'
import { logger } from '@/core/logging/logger'

// Unified layout loader - loads layouts from all sources:
// 1. Core layouts
// 2. Module layouts
// 3. Plugin layouts
// 4. Custom layouts (highest priority)

// ============================================================================
// GLOB IMPORTS (Vite requires static strings)
// ============================================================================

// 1. Core layouts - direct Vue components
const coreLayouts = import.meta.glob('@/layouts/*/index.vue', { eager: true })
const systemLayout = import.meta.glob('@/layouts/system/DefaultDynamicPage.vue', { eager: true })

// 2. Module layouts - index.ts with registerLayouts()
const moduleLayouts = import.meta.glob('/src/modules/*/layouts/index.ts', { eager: true })

// 3. Plugin layouts - index.ts with registerLayouts()
const pluginLayouts = import.meta.glob('../../../../../plugins/*/frontend/layout/index.ts', { eager: true })

// 4. Custom layouts - direct Vue components (highest priority)
const customLayouts = import.meta.glob('../../../../../custom/frontend/layouts/*/index.vue', { eager: true })

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Extract name from path
function extractName(path: string, type: 'core' | 'module' | 'plugin' | 'custom'): string {
  const parts = path.split('/')

  switch (type) {
    case 'core':
      return parts[parts.length - 2]
    case 'module':
      return parts[3]
    case 'plugin':
      return parts[2]
    case 'custom':
      return parts[parts.length - 2]
    default:
      return ''
  }
}

// ============================================================================
// LOADERS
// ============================================================================

// Load core layouts
function loadCoreLayouts(): void {
  logger.debug('[layouts-loader] Loading core layouts')

  const allCoreLayouts = { ...coreLayouts, ...systemLayout }
  let count = 0

  for (const path in allCoreLayouts) {
    const module = allCoreLayouts[path] as { default: Component }
    const component = module.default

    let layoutName: string
    if (path.includes('/system/DefaultDynamicPage.vue')) {
      layoutName = 'system'
    } else {
      layoutName = extractName(path, 'core')
    }

    if (layoutName && component) {
      layoutRegistry.register(layoutName, component, {
        description: `Core layout: ${layoutName}`,
        source: 'core'
      })
      count++
    }
  }

  logger.debug('[layouts-loader] Core layouts loaded', { count })
}

// Load module layouts
async function loadModuleLayouts(): Promise<void> {
  logger.debug('[layouts-loader] Loading module layouts')

  let count = 0

  for (const path in moduleLayouts) {
    try {
      const moduleName = extractName(path, 'module')
      const module = moduleLayouts[path] as { registerLayouts?: () => void | Promise<void> }

      if (typeof module.registerLayouts === 'function') {
        await module.registerLayouts()
        count++
        logger.debug(`[layouts-loader] Module "${moduleName}" layouts registered`)
      }
    } catch (error) {
      logger.error('[layouts-loader] Failed to load module layouts', { path, error })
    }
  }

  logger.debug('[layouts-loader] Module layouts loaded', { count })
}

// Load plugin layouts
async function loadPluginLayouts(): Promise<void> {
  logger.debug('[layouts-loader] Loading plugin layouts')

  let count = 0

  for (const path in pluginLayouts) {
    try {
      const pluginName = extractName(path, 'plugin')
      const plugin = pluginLayouts[path] as { registerLayouts?: () => void | Promise<void> }

      if (typeof plugin.registerLayouts === 'function') {
        await plugin.registerLayouts()
        count++
        logger.debug(`[layouts-loader] Plugin "${pluginName}" layouts registered`)
      }
    } catch (error) {
      logger.error('[layouts-loader] Failed to load plugin layouts', { path, error })
    }
  }

  logger.debug('[layouts-loader] Plugin layouts loaded', { count })
}

// Load custom layouts (highest priority, can override any other layout)
function loadCustomLayouts(): void {
  logger.debug('[layouts-loader] Loading custom layouts')

  let count = 0

  for (const path in customLayouts) {
    const module = customLayouts[path] as { default: Component }
    const component = module.default
    const layoutName = extractName(path, 'custom')

    if (layoutName && component) {
      layoutRegistry.register(layoutName, component, {
        description: `Custom layout: ${layoutName}`,
        source: 'custom'
      })
      count++
      logger.info(`[layouts-loader] Custom layout "${layoutName}" registered (can override)`)
    }
  }

  logger.debug('[layouts-loader] Custom layouts loaded', { count })
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

// Load all layouts from all sources
// Loading order (priority low to high):
// 1. Core layouts (default, public, private, system)
// 2. Module layouts (cms-default, cms-editor, etc.)
// 3. Plugin layouts (demo, docs, etc.)
// 4. Custom layouts (highest priority - can override anything)
export async function loadAllLayouts(): Promise<void> {
  logger.debug('[layouts-loader] Starting unified layout loading')

  // 1. Core layouts (lowest priority)
  loadCoreLayouts()

  // 2. Module layouts
  await loadModuleLayouts()

  // 3. Plugin layouts
  await loadPluginLayouts()

  // 4. Custom layouts (highest priority - loads last, can override)
  loadCustomLayouts()

  const allLayouts = Array.from(layoutRegistry.getAll().keys())
  logger.debug('[layouts-loader] All layouts loaded', {
    total: allLayouts.length,
    layouts: allLayouts
  })
}

// ============================================================================
// HELPER EXPORTS (for manual registration if needed)
// ============================================================================

// Register a layout manually (for use in plugin/module index.ts)
export function registerLayout(
  name: string,
  component: Component,
  metadata?: LayoutMetadata
): void {
  layoutRegistry.register(name, component, metadata)
}

// Register a module layout with module-name prefix
// Example: registerModuleLayout('cms', 'editor', Component) creates 'cms-editor'
export function registerModuleLayout(
  moduleName: string,
  layoutName: string,
  component: Component,
  metadata?: LayoutMetadata
): void {
  const fullName = `${moduleName}-${layoutName}`
  layoutRegistry.register(fullName, component, {
    ...metadata,
    moduleName,
    source: 'module'
  })
}

// Register a plugin layout with plugin-name prefix
// Example: registerPluginLayout('demo', 'default', Component) creates 'demo-default'
export function registerPluginLayout(
  pluginName: string,
  layoutName: string,
  component: Component,
  metadata?: LayoutMetadata
): void {
  const fullName = `${pluginName}-${layoutName}`
  layoutRegistry.register(fullName, component, {
    ...metadata,
    pluginName,
    source: 'plugin'
  })
}
