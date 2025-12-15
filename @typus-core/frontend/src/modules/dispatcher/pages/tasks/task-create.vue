<route lang="json">
{
  "name": "dispatcher-tasks-create",
  "path": "/dispatcher/tasks/create",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "dispatcher"
  }
}
</route>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import DispatcherTaskForm from '../../components/DispatcherTaskForm.dsx.vue'

const router = useRouter()
const { errorMessage, successMessage } = useMessages()

const loading = ref(false)
const formRef = ref()

const handleSave = async () => {
  loading.value = true
  
  try {
    // Call saveData from the DSX form
    const result = await formRef.value?.saveData()
    
    if (result?.id) {
      successMessage('Task created successfully')
      router.push(`/dispatcher/tasks/edit/${result.id}`)
    } else {
      successMessage('Task created successfully')
      router.push('/dispatcher/tasks')
    }
  } catch (err) {
    logger.error('[CreateTask] Failed to create task:', err)
    errorMessage('Failed to create task')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.push('/dispatcher/tasks')
}
</script>

<template>
  
    <dxFormWrapper
      mode="create"
      :loading="loading"
      @save="handleSave"
      @cancel="handleCancel"
    >
      <DispatcherTaskForm ref="formRef" mode="create" />
    </dxFormWrapper>
  
</template>
