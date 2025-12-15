<route lang="json">
{
  "name": "dispatcher-task-edit",
  "path": "/dispatcher/tasks/edit/:id",
  "meta": {
    "layout": "private",
    "subject": "dispatcher"
  }
}
</route>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import TaskForm from '../../components/TaskForm.vue'
import { DispatcherTaskMethods } from '../../methods/task.methods.dsx'
import type { TaskFormData } from '../../components/TaskForm.vue'

const route = useRoute()
const router = useRouter()
const { errorMessage, successMessage, confirmMessage } = useMessages()

const taskId = computed(() => route.params.id as string)

// State
const pageData = reactive({
  formData: {
    name: '',
    type: '',
    isActive: true,
    retryCount: 0,
    retryDelay: 0
  } as TaskFormData,
  loading: false,
  hasErrors: false
})

const additionalActions = computed(() => [
  {
    label: 'Delete Task',
    variant: 'danger' as const,
    icon: 'ri:delete-bin-line',
    action: 'delete'
  }
])

const handleAction = async (actionName: string) => {
  if (actionName === 'delete') {
    const confirmed = await confirmMessage('Are you sure you want to delete this task?')
    if (confirmed) {
      try {
        pageData.loading = true
        await DispatcherTaskMethods.deleteTask(parseInt(taskId.value))
        successMessage('Task deleted successfully')
        router.push('/dispatcher/tasks')
      } catch (err) {
        logger.error('[EditTask] Failed to delete task:', err)
        errorMessage(`Failed to delete: ${err.message}`)
      } finally {
        pageData.loading = false
      }
    }
  }
}

// Actions
const fetchData = async () => {
  pageData.loading = true

  const task = await DispatcherTaskMethods.getTaskById(parseInt(taskId.value))
  logger.debug('[EditTask] Task data fetched:', task)

  if (!task) {
    logger.error('[EditTask] Task not found')
    router.push('/dispatcher/tasks')
    return
  }

  pageData.formData = {
    ...task,
    data: task.data ? JSON.stringify(task.data, null, 2) : ''
  }

  pageData.loading = false
}

const handleSave = async () => {
  pageData.loading = true

  try {
    const updateData = { ...pageData.formData }

    // Parse JSON data if it's a string
    if (typeof updateData.data === 'string') {
      try {
        updateData.data = JSON.parse(updateData.data)
      } catch {
        updateData.data = {}
      }
    }

    await DispatcherTaskMethods.updateTask(parseInt(taskId.value), updateData)
    successMessage('Task updated successfully')
    router.push('/dispatcher/tasks')
  } catch (err) {
    logger.error('[EditTask] Failed to save task:', err)
    errorMessage(`Failed to save: ${err.message}`)
  } finally {
    pageData.loading = false
  }
}

const handleCancel = () => {
  router.push('/dispatcher/tasks')
}

onMounted(() => fetchData())
</script>

<template>
  
    <dxFormWrapper
      mode="edit"
      title="Edit Task"
      :loading="pageData.loading"
      :has-errors="pageData.hasErrors"
      :additional-actions="additionalActions"
      @save="handleSave"
      @cancel="handleCancel"
      @action="handleAction"
    >
      <TaskForm
        v-if="!pageData.loading"
        v-model="pageData.formData"
        :is-create-mode="false"
        @validate="pageData.hasErrors = $event"
      />
    </dxFormWrapper>
  
</template>