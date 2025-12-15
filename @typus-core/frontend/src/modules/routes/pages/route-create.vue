<route lang="json">{
    "name": "route-create",
    "path": "/routes/create",
    "meta": {
        "layout": "private",
        "subject": "dynamic-routes"
    }
}</route>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/shared/composables/useApi'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import RouteForm from '../components/RouteForm.vue'
import type { RouteFormData } from '../types'

const router = useRouter()
const { errorMessage, successMessage } = useMessages()

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
  
  const { data, error } = await useApi('/dynamic-routes').post(formData.value)
  
  if (error) {
    errorMessage(error)
    loading.value = false
    return
  }
  
  logger.debug('[RouteCreatePage] Route created', { id: data?.id })
  successMessage('Route created successfully')
  router.push('/routes')
  loading.value = false
}

const handleCancel = () => {
  router.push('/routes')
}
</script>

<template>
  
    <dxFormWrapper
      mode="create"
      :loading="loading"
      @save="handleSave"
      @cancel="handleCancel"
    >
      <RouteForm v-model="formData" />
    </dxFormWrapper>
  
</template>