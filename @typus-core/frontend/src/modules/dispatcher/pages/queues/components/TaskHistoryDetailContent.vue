<template>
  <div v-if="item" class="space-y-4">
    <!-- Basic Info -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Task ID</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ item.taskId || item.task_id || item.id }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Status</label>
        <p class="mt-1">
          <dx-badge :variant="getStatusVariant(item.status)" size="sm">
            {{ getStatusText(item.status) }}
          </dx-badge>
        </p>
      </div>
    </div>

    <!-- Title/Type -->
    <div v-if="item.title || item.type || item.taskType">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Task Type</label>
      <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ item.title || item.type || item.taskType }}</p>
    </div>

    <!-- Queue Info -->
    <div v-if="item.queueKey || item.queueName">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Queue</label>
      <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ item.queueKey || item.queueName }}</p>
    </div>

    <!-- Timing Info -->
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Started</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ formatDateTime(item.executedAt || item.started_at || item.startedAt) }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Finished</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ formatDateTime(item.finishedAt || item.finished_at) }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Duration</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ formatDuration(item.executionTime || item.duration) }}</p>
      </div>
    </div>

    <!-- Result -->
    <div v-if="item.result || item.data">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Result</label>
      <pre :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'theme-colors-background-tertiary', 'mt-1 p-3 rounded-md overflow-auto max-h-80']">{{ formatJson(item.result || item.data) }}</pre>
    </div>

    <!-- Error -->
    <div v-if="item.error">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Error</label>
      <div :class="['theme-typography-size-sm', 'theme-colors-text-error', 'mt-1 p-3 rounded-md border', 'theme-colors-border-error']">
        {{ item.error }}
      </div>
    </div>

    <!-- Metadata -->
    <div v-if="item.metadata">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Metadata</label>
      <pre :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'theme-colors-background-tertiary', 'mt-1 p-3 rounded-md overflow-auto max-h-80']">{{ formatJson(item.metadata) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import DxBadge from '@/components/ui/dxBadge.vue'

defineProps<{
  item: Record<string, any>
}>()

const getStatusVariant = (status: string) => {
  const variantMap: Record<string, string> = {
    'completed': 'success',
    'success': 'success',
    'failed': 'error',
    'error': 'error',
    'retry': 'warning',
    'running': 'info',
    'pending': 'warning',
    'processing': 'info',
    'waiting': 'info',
    'canceled': 'secondary'
  }
  return variantMap[status] || 'secondary'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'completed': 'Success',
    'success': 'Success',
    'failed': 'Failed',
    'error': 'Failed',
    'retry': 'Retry',
    'running': 'Running',
    'pending': 'Pending',
    'processing': 'Processing',
    'waiting': 'Waiting',
    'canceled': 'Canceled'
  }
  return statusMap[status] || status || 'Unknown'
}

const formatDuration = (duration: number) => {
  if (!duration && duration !== 0) return 'N/A'

  if (duration < 1000) {
    return `${duration}ms`
  } else if (duration < 60000) {
    return `${Math.round(duration / 1000)}s`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.round((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleString()
  } catch {
    return 'Invalid Date'
  }
}

const formatJson = (obj: any) => {
  if (!obj) return 'N/A'
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>
