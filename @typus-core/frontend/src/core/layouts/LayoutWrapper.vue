<!-- src/core/layouts/LayoutWrapper.vue -->
<template>
  <component :is="currentLayout">
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { layoutRegistry } from './registry'
import { logger } from '@/core/logging/logger'
import PublicLayout from '@/layouts/public/index.vue'

const route = useRoute()

// Determine current layout based on route metadata
const currentLayout = computed(() => {
  const layoutName = route.meta.layout as string || 'public'

  // Warn if layout not specified (using fallback)
  if (!route.meta.layout && route.path !== '/auth/twitter/callback') {
    logger.debug(
      `[LayoutWrapper] No layout specified for route "${route.path}", using public layout.`
    )
  }

  logger.debug('[LayoutWrapper] Using layout', { name: layoutName, path: route.path })

  if (layoutRegistry.has(layoutName)) {
    return layoutRegistry.get(layoutName)
  }

  logger.warn(
    `[LayoutWrapper] Layout "${layoutName}" not found for route "${route.path}". ` +
    `Using fallback (public layout). Available layouts: ${Array.from(layoutRegistry.getAll().keys()).join(', ')}`
  )
  return PublicLayout
})
</script>
