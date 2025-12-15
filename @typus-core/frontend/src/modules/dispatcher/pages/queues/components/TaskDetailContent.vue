<template>
  <div v-if="task" class="space-y-4">
    <!-- Basic Info -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Task ID</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ task.id }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Status</label>
        <p class="mt-1">
          <dx-badge :variant="getStatusVariant(task.status)" size="sm">
            {{ getStatusText(task.status) }}
          </dx-badge>
        </p>
      </div>
    </div>

    <!-- Title/Type -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Name</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ task.title || task.name || 'N/A' }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Type</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ task.type || 'N/A' }}</p>
      </div>
    </div>

    <!-- Queue/Priority -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Queue</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ task.queue || task.queueInfo?.name || 'N/A' }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Priority</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ task.priority ?? 'N/A' }}</p>
      </div>
    </div>

    <!-- Retries -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Retries</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ task.retries || 0 }}</p>
      </div>
      <div>
        <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Created</label>
        <p :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'mt-1']">{{ formatDateTime(task.createdAt) }}</p>
      </div>
    </div>

    <!-- Payload -->
    <div v-if="task.payload || task.data">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Payload</label>
      <pre :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'theme-colors-background-tertiary', 'mt-1 p-3 rounded-md overflow-auto max-h-80']">{{ formatJson(task.payload || task.data) }}</pre>
    </div>

    <!-- Error -->
    <div v-if="task.error">
      <label :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-secondary', 'block']">Error</label>
      <div :class="['theme-typography-size-sm', 'theme-colors-text-error', 'mt-1 p-3 rounded-md border', 'theme-colors-border-error']">
        {{ task.error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DxBadge from '@/components/ui/dxBadge.vue'

defineProps<{
  task: Record<string, any>
}>()

const getStatusVariant = (status: string) => {
  const variantMap: Record<string, string> = {
    'pending': 'warning',
    'queued': 'info',
    'processing': 'info',
    'running': 'warning',
    'waiting': 'info',
    'delayed': 'info',
    'completed': 'success',
    'success': 'success',
    'failed': 'error',
    'error': 'error',
    'canceled': 'secondary'
  }
  return variantMap[status] || 'secondary'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'queued': 'Queued',
    'processing': 'Processing',
    'running': 'Running',
    'waiting': 'Waiting',
    'delayed': 'Delayed',
    'completed': 'Completed',
    'success': 'Success',
    'failed': 'Failed',
    'error': 'Error',
    'canceled': 'Canceled'
  }
  return statusMap[status] || status || 'Unknown'
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
