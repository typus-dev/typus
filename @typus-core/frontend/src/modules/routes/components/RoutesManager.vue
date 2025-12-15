<template>
  <route-form
    v-if="showForm"
    :route-id="selectedRouteId"
    :parent-id="parentRouteId"
    @saved="onRouteSaved"
    @cancel="closeForm"
  />

  <div v-else>
    <route-tree @edit="editRoute" @add="addRoute" @refresh="refreshRoutes" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { logger } from '@/core/logging/logger'
import RouteTree from './RouteTree.vue'
import RouteForm from './RouteForm.vue'

// Component state
const showForm = ref(false)
const selectedRouteId = ref<string | null>(null)
const parentRouteId = ref<string | null>(null)
const router = useRouter()

// Methods
function editRoute(route: any) {
  selectedRouteId.value = route.id
  parentRouteId.value = null
  showForm.value = true
  logger.debug('[RoutesManager] Editing route', { id: route.id })
}

function addRoute(options: { parentId: string | null }) {
  selectedRouteId.value = null
  parentRouteId.value = options.parentId
  showForm.value = true
  logger.debug('[RoutesManager] Adding new route', { parentId: options.parentId })
}

function closeForm() {
  showForm.value = false
  selectedRouteId.value = null
  parentRouteId.value = null
  logger.debug('[RoutesManager] Form closed')
}

function onRouteSaved(route: any) {
  logger.debug('[RoutesManager] Route saved', { id: route.id })
  showForm.value = false
  selectedRouteId.value = null
  parentRouteId.value = null

  // Refresh dynamic routes in router
  refreshDynamicRoutes()
}

function refreshRoutes() {
  logger.debug('[RoutesManager] Routes refreshed')

  // Refresh dynamic routes in router
  refreshDynamicRoutes()
}

function refreshDynamicRoutes() {
  // This would typically call a method to refresh the dynamic routes in the router
  logger.debug('[RoutesManager] Dynamic routes refreshed in router')

  // In a real implementation, you might do something like:
  // router.refreshDynamicRoutes()
}
</script>
