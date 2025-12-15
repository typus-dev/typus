<template>
  <div class="relative min-h-[200px]">
    <Transition name="cross-fade" appear>
      <component
        :is="dynamicComponent"
        v-if="dynamicComponent"
        :key="route.fullPath"
        class="transition-component"
      />
      <div v-else class="transition-component flex items-center justify-center h-full">
        <div
          v-if="loading"
          class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"
        ></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { logger } from '@/core/logging/logger'

const route = useRoute()
const dynamicComponent = ref<any>(null)
let loading = ref()

const loadComponent = async () => {
  const componentName = route.meta?.component as string

  if (!componentName) {
    logger.warn('[DynamicRouteHandler] No component name specified in route meta', {
      path: route.path
    })
    dynamicComponent.value = null

    return
  }

  try {
    loading.value = true
    logger.debug('[DynamicRouteHandler] Loading component', { name: componentName })

    const components = import.meta.glob(
      '@/(components|core/layouts|components/base|core/pages|pages|modules/**/components|layouts/default|layouts/private|layouts/public|dsx/components)/**/*.vue'
    )
    const componentFileName = `${componentName}.vue`

    const foundComponentPath = Object.keys(components).find(path =>
      path.endsWith(componentFileName)
    )

    if (foundComponentPath) {
      const componentModule = (await components[foundComponentPath]()) as any
      dynamicComponent.value = componentModule.default
      logger.debug('[DynamicRouteHandler] Component loaded successfully', {
        name: componentName,
        path: foundComponentPath
      })
    } else {
      logger.error('[DynamicRouteHandler] Component not found via glob', { name: componentName })
      dynamicComponent.value = null
    }
  } catch (error) {
    logger.error('[DynamicRouteHandler] Failed to load component', {
      name: componentName,
      error
    })
    dynamicComponent.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => route,
  async (newRoute, oldRoute) => {
    logger.debug('[DynamicRouteHandler] Route changed', {
      newPath: newRoute.fullPath,
      oldPath: oldRoute?.fullPath
    })
    await loadComponent()
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.transition-component {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}

.cross-fade-enter-active,
.cross-fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.cross-fade-enter-from,
.cross-fade-leave-to {
  opacity: 0;
}
</style>
