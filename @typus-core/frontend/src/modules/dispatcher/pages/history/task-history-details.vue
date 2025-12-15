<route lang="json">{
  "name": "dispatcher-task-history-detail",
  "path": "/dispatcher/history/view/:id",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "dispatcher"
  }
}</route>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DispatcherTaskHistoryMethods } from '../../methods/task-history.methods.dsx'
import dxCard from '@/components/ui/dxCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

interface TaskHistoryData {
  id: string
  taskId: string
  status: string
  startedAt?: string
  finishedAt?: string
  duration?: number
  error?: string
  result?: string
  metadata?: any
  task?: {
    id: number
    name: string
    type: string
    data?: any
  }
}

const router = useRouter()
const route = useRoute()

const taskData = ref<TaskHistoryData | null>(null)
const loading = ref(true)

// Computed
const statusClass = computed(() => {
  if (!taskData.value) return ''
  switch (taskData.value.status) {
    case 'completed': return 'theme-colors-background-success theme-colors-text-success'
    case 'failed': return 'theme-colors-background-error theme-colors-text-error'
    default: return 'theme-colors-background-warning theme-colors-text-warning'
  }
})

const parsedResult = computed(() => {
  if (!taskData.value?.result) return null
  try {
    return JSON.parse(taskData.value.result)
  } catch {
    return taskData.value.result
  }
})

// Formatters
const formatDate = (date?: string) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString()
}

const formatDuration = (ms?: number) => {
  if (!ms) return 'N/A'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s (${ms}ms)`
}

// Actions
const goBack = () => {
  router.back()
}

// Load data
onMounted(async () => {
  try {
    taskData.value = await DispatcherTaskHistoryMethods.getHistoryById(route.params.id as string)
  } catch (error) {
    console.error('Error loading task details:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PageHeader
    :title="`Task Execution #${taskData?.id || ''}`"
    subtitle="View task execution details"
  >
    <template #actions>
      <dxButton variant="secondary" @click="goBack">
        <template #prefix>
          <dxIcon name="ri:arrow-left-line" />
        </template>
        Back
      </dxButton>
    </template>
  </PageHeader>

  <!-- Loading -->
  <div v-if="loading" class="flex justify-center items-center p-8">
    <dxIcon name="ri:loader-4-line" size="xl" class="animate-spin" />
    <span class="ml-2">Loading...</span>
  </div>

  <template v-else-if="taskData">
    <!-- Status Overview -->
    <dxCard class="mb-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="theme-typography-size-xl theme-typography-weight-semibold">
          Task #{{ taskData.id }}
        </h2>
        <span :class="['px-3 py-1 rounded-full text-sm font-medium', statusClass]">
          {{ (taskData.status || 'unknown').toUpperCase() }}
        </span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p class="theme-typography-size-sm theme-colors-text-secondary">Task Name</p>
          <p class="theme-typography-weight-medium">{{ taskData.task?.name || 'Unnamed Task' }}</p>
        </div>
        <div>
          <p class="theme-typography-size-sm theme-colors-text-secondary">Type</p>
          <p class="theme-typography-weight-medium">{{ taskData.task?.type || 'N/A' }}</p>
        </div>
        <div>
          <p class="theme-typography-size-sm theme-colors-text-secondary">Duration</p>
          <p class="theme-typography-weight-medium">{{ formatDuration(taskData.duration) }}</p>
        </div>
        <div>
          <p class="theme-typography-size-sm theme-colors-text-secondary">Task ID</p>
          <p class="theme-typography-weight-medium">#{{ taskData.taskId || 'N/A' }}</p>
        </div>
      </div>
    </dxCard>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <!-- Timing Info -->
      <dxCard>
        <h3 class="theme-typography-size-lg theme-typography-weight-semibold mb-4">Execution Timeline</h3>
        <div class="space-y-4">
          <div>
            <p class="theme-typography-size-sm theme-colors-text-secondary">Started At</p>
            <p>{{ formatDate(taskData.startedAt) }}</p>
          </div>
          <div>
            <p class="theme-typography-size-sm theme-colors-text-secondary">Finished At</p>
            <p>{{ formatDate(taskData.finishedAt) }}</p>
          </div>
          <div>
            <p class="theme-typography-size-sm theme-colors-text-secondary">Duration</p>
            <p class="font-mono">{{ formatDuration(taskData.duration) }}</p>
          </div>
        </div>
      </dxCard>

      <!-- Task Data -->
      <dxCard>
        <h3 class="theme-typography-size-lg theme-typography-weight-semibold mb-4">Task Data</h3>
        <pre class="theme-colors-background-tertiary p-4 rounded-md text-sm overflow-x-auto">{{ JSON.stringify(taskData.task?.data || {}, null, 2) }}</pre>
      </dxCard>
    </div>

    <!-- Error Info -->
    <dxCard v-if="taskData.error" class="mb-4 border-red-500">
      <h3 class="theme-typography-size-lg theme-typography-weight-semibold theme-colors-text-error mb-4">Error Details</h3>
      <pre class="theme-colors-background-error p-4 rounded-md text-sm theme-colors-text-error">{{ taskData.error }}</pre>
    </dxCard>

    <!-- Result -->
    <dxCard>
      <h3 class="theme-typography-size-lg theme-typography-weight-semibold mb-4">Execution Result</h3>
      <pre v-if="parsedResult" class="bg-gray-900 theme-colors-text-success p-4 rounded-md text-sm overflow-x-auto">{{ typeof parsedResult === 'object' ? JSON.stringify(parsedResult, null, 2) : parsedResult }}</pre>
      <p v-else class="theme-colors-text-secondary italic">No result data available</p>
    </dxCard>
  </template>
</template>
