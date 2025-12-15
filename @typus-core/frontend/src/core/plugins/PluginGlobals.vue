<script setup lang="ts">
/**
 * PluginGlobals - Renders global components registered by plugins
 *
 * This component is included once in App.vue and automatically renders
 * all global components that plugins have registered via pluginSystem.registerGlobal()
 *
 * Features:
 * - ErrorBoundary around each component (one crash doesn't affect others)
 * - Conditional rendering via condition function
 * - Order/priority support for z-index layering
 */
import { computed } from 'vue'
import { pluginSystem } from '@core/plugins'

// Get active global components (filtered by condition, sorted by order)
const activeGlobals = computed(() => {
  return pluginSystem.globalComponents.value
    .filter(registration => {
      // If no condition, always show
      if (!registration.condition) return true
      // Otherwise evaluate condition
      try {
        return registration.condition()
      } catch (e) {
        console.error(`[PluginGlobals] Error in condition for "${registration.id}":`, e)
        return false
      }
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
})
</script>

<template>
  <template v-for="registration in activeGlobals" :key="registration.id">
    <ErrorBoundary>
      <component :is="registration.component" />
    </ErrorBoundary>
  </template>
</template>
