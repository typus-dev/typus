/*
 * Vite Plugin: Layout Partials Resolver
 *
 * Resolves layout partial imports with priority: custom -> plugins -> core
 *
 * Usage in Vue:
 *   import headerHtml from '@layouts/public/_header.html?raw';
 *
 * Resolution order:
 *   1. custom/frontend/layouts/public/_header.html
 *   2. plugins/star/frontend/layouts/public/_header.html
 *   3. typus-core/frontend/src/layouts/public/_header.html
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function layoutPartialsPlugin() {
  // Path pattern: @layouts/layoutName/_partialName.html
  const PARTIAL_PATTERN = /@layouts\/([^/]+)\/_([^/]+)\.html/

  // Calculate project root once at plugin initialization
  const projectRoot = resolve(__dirname, '../../..')
  console.log('[layout-partials] Plugin initialized, project root:', projectRoot)

  return {
    name: 'layout-partials-resolver',
    enforce: 'pre',

    resolveId(id, importer) {
      // Handle both with and without ?raw suffix
      const cleanId = id.replace(/\?raw$/, '')
      const match = cleanId.match(PARTIAL_PATTERN)

      if (!match) return null

      const [, layoutName, partialName] = match
      const fileName = `_${partialName}.html`

      // Build candidates list
      const candidates = [
        // 1. Custom
        resolve(projectRoot, 'custom/frontend/layouts', layoutName, fileName),
        // 2. Plugins
        ...getPluginCandidates(projectRoot, layoutName, fileName),
        // 3. Core
        resolve(projectRoot, '@typus-core/frontend/src/layouts', layoutName, fileName)
      ]

      console.log(`[layout-partials] Resolving ${id}, checking candidates:`, candidates)

      // Find first existing file
      for (const candidatePath of candidates) {
        if (existsSync(candidatePath)) {
          console.log(`[layout-partials] Resolved ${id} → ${candidatePath}`)
          // Return with ?raw if original had it
          return id.endsWith('?raw') ? `${candidatePath}?raw` : candidatePath
        }
      }

      console.warn(`[layout-partials] Partial not found: ${id}`)
      return null
    }
  }
}

/**
 * Get plugin paths for partial
 */
function getPluginCandidates(projectRoot, layoutName, fileName) {
  const pluginsDir = join(projectRoot, 'plugins')

  if (!existsSync(pluginsDir)) {
    return []
  }

  try {
    return readdirSync(pluginsDir)
      .filter(name => {
        const pluginPath = join(pluginsDir, name)
        return statSync(pluginPath).isDirectory()
      })
      .map(pluginName =>
        join(pluginsDir, pluginName, 'frontend/layouts', layoutName, fileName)
      )
  } catch {
    return []
  }
}
