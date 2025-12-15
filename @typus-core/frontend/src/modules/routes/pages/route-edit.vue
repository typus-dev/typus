<route lang="json">
{
  "name": "route-edit",
  "path": "/routes/edit/:id",
  "meta": {
    "layout": "private",
    "subject": "dynamic-routes"
  }
}
</route>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/shared/composables/useApi'
import { logger } from '@/core/logging/logger'
import { useMessages } from '@/shared/composables/useMessages'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import RouteForm from '../components/RouteForm.vue'
import type { RouteFormData } from '../types'

const router = useRouter()
const route = useRoute()
const { errorMessage, successMessage } = useMessages()

const routeId = route.params.id as string
const loading = ref(false)
const formData = ref<RouteFormData>({
  name: '',
  path: '',
  component: '',
  parentId: null,
  orderIndex: 0,
  isActive: true,
  meta: {}
})

onMounted(async () => {
  await fetchRouteData()
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    await fetchRouteData()
  }
}, { immediate: false })

async function fetchRouteData() {
  loading.value = true
  
  logger.debug('[RouteEditPage] Fetching route data', { id: routeId })
  
  const { data, error: apiError } = await useApi(`/dynamic-routes/${routeId}`).get()
  
  if (apiError) {
    errorMessage(apiError)
    router.push('/routes')
    loading.value = false
    return
  }
  
  if (!data) {
    errorMessage('Route not found')
    router.push('/routes')
    loading.value = false
    return
  }
  
  formData.value = {
    name: data.name,
    path: data.path,
    component: data.component || '',
    parentId: data.parentId,
    orderIndex: data.orderIndex || 0,
    isActive: data.isActive !== false,
    meta: data.meta || {}
  }
  
  logger.debug('[RouteEditPage] Route loaded successfully')
  loading.value = false
}

const handleSave = async () => {
  loading.value = true
  
  // Validate required fields
  if (!formData.value.name) {
    errorMessage('Route name is required')
    loading.value = false
    return
  }
  
  if (!formData.value.path) {
    errorMessage('Route path is required')
    loading.value = false
    return
  }
  
  if (!formData.value.path.startsWith('/')) {
    errorMessage('Path must start with /')
    loading.value = false
    return
  }
  
  const { error } = await useApi(`/dynamic-routes/${routeId}`).put(formData.value)
  
  if (error) {
    errorMessage(error)
    loading.value = false
    return
  }
  
  logger.debug('[RouteEditPage] Route updated successfully')

  router.push('/routes')
  loading.value = false
}

const handleCancel = () => {
  router.push('/routes')
}
</script>

<template>
  
    <dxFormWrapper
      mode="edit"
      :loading="loading"
      @save="handleSave"
      @cancel="handleCancel"
    >
      <RouteForm v-model="formData" />
    </dxFormWrapper>
  
</template>