/* @Tags: routing */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { layoutRegistry } from '../registry'
import type { Component } from 'vue'
import { logger } from '@/core/logging/logger'

/**
 * Composable for working with layouts
 */
export function useLayout() {
  const route = useRoute()
  
  // Get current layout name from route metadata
  const currentLayoutName = computed(() => {
    return route.meta.layout as string || 'public'
  })

  // Get current layout component
  const currentLayout = computed<Component>(() => {
    const name = currentLayoutName.value

    if (layoutRegistry.has(name)) {
      return layoutRegistry.get(name)!
    }

    logger.warn(`[useLayout] Layout "${name}" not found, using public`)
    return layoutRegistry.get('public')!
  })
  
  // Check if layout exists
  const hasLayout = (name: string): boolean => {
    return layoutRegistry.has(name)
  }
  
  return {
    currentLayoutName,
    currentLayout,
    hasLayout,
    getLayout: (name: string) => layoutRegistry.get(name),
    getAllLayouts: () => layoutRegistry.getAll(),
    getAllLayoutsWithMetadata: () => layoutRegistry.getAllWithMetadata()
  }
}
