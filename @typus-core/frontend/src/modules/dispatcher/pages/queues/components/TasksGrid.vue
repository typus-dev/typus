<template>
  <div>
    <!-- Error State -->
    <div v-if="error" class="text-center py-12">
      <i class="ri-close-circle-line text-3xl" :class="'theme-colors-text-error'"></i>
      <p :class="['theme-typography-size-sm', 'theme-colors-text-error', 'mt-4']">{{ error }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="tasks.length === 0" class="text-center py-12">
      <i class="ri-list-check-2 text-3xl" :class="'theme-colors-text-secondary'"></i>
      <h3 :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary', 'mt-4']">No tasks found</h3>
      <p :class="['theme-typography-size-sm', 'theme-colors-text-secondary', 'mt-2']">No tasks match your current filters.</p>
    </div>

    <!-- Tasks Table -->
    <div v-else class="overflow-hidden">
      <table :class="['theme-components-table-base' || 'min-w-full']">
        <thead :class="['theme-components-table-header-row']">
          <tr>
            <th scope="col" :class="['relative w-12 px-6 sm:w-16 sm:px-8', 'theme-components-table-header-cell']">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="$emit('select-all')"
                :class="['absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded', 'theme-colors-border-tertiary', 'theme-colors-background-primary', 'sm:left-6']"
              />
            </th>
            <th scope="col" :class="['theme-components-table-header-cell', 'theme-typography-size-xs', 'theme-colors-text-secondary', 'px-6 py-3 text-left uppercase tracking-wider']">
              Task
            </th>
            <th scope="col" :class="['theme-components-table-header-cell', 'theme-typography-size-xs', 'theme-colors-text-secondary', 'px-6 py-3 text-left uppercase tracking-wider']">
              Queue
            </th>
            <th scope="col" :class="['theme-components-table-header-cell', 'theme-typography-size-xs', 'theme-colors-text-secondary', 'px-6 py-3 text-left uppercase tracking-wider']">
              Status
            </th>
            <th scope="col" :class="['theme-components-table-header-cell', 'theme-typography-size-xs', 'theme-colors-text-secondary', 'px-6 py-3 text-left uppercase tracking-wider']">
              Priority
            </th>
            <th scope="col" :class="['theme-components-table-header-cell', 'theme-typography-size-xs', 'theme-colors-text-secondary', 'px-6 py-3 text-left uppercase tracking-wider']">
              Created
            </th>
            <th scope="col" :class="['relative px-6 py-3', 'theme-components-table-header-cell']">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody :class="['theme-colors-background-secondary']">
          <tr
            v-for="task in tasks"
            :key="task.id"
            :class="[
              'cursor-pointer',
              isSelected(task)
                ? 'theme-colors-background-accent'
                : 'theme-colors-background-secondary',
              'hover:opacity-90'
            ]"
            @click="$emit('show-detail', task)"
          >
            <!-- Selection Checkbox -->
            <td :class="['relative w-12 px-6 sm:w-16 sm:px-8', 'theme-components-table-body-cell']">
              <input
                type="checkbox"
                :checked="isSelected(task)"
                @click.stop
                @change="$emit('select-task', task)"
                :class="['absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded', 'theme-colors-border-tertiary', 'theme-colors-background-primary', 'sm:left-6']"
              />
            </td>

            <!-- Task Info -->
            <td :class="['px-6 py-4', 'theme-components-table-body-cell']">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div 
                    class="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    :style="{ backgroundColor: getTaskTypeColor(task.type) }"
                  >
                    {{ getTaskTypeIcon(task.type) }}
                  </div>
                </div>
                <div class="ml-4">
                  <div :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary']">{{ task.title }}</div>
                  <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">{{ task.type }}</div>
                  <div v-if="task.retries > 0" :class="['theme-typography-size-xs', 'theme-colors-text-warning']">
                    Retries: {{ task.retries }}
                  </div>
                </div>
              </div>
            </td>

            <!-- Queue Info -->
            <td :class="['px-6 py-4', 'theme-components-table-body-cell']">
              <div class="flex items-center">
                <div 
                  class="w-3 h-3 rounded-full mr-2"
                  :style="{ backgroundColor: task.queueInfo?.color || '#6b7280' }"
                ></div>
                <div>
                  <div :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary']">
                    {{ task.queueInfo?.name || task.queue }}
                  </div>
                  <div :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">{{ task.queue }}</div>
                  <div v-if="!task.queueInfo?.isKnown" :class="['theme-typography-size-xs', 'theme-colors-text-warning']">
                    Discovered
                  </div>
                </div>
              </div>
            </td>

            <!-- Status -->
            <td :class="['px-6 py-4', 'theme-components-table-body-cell']">
              <dx-badge :variant="statusVariant(task.status)" size="xs">
                {{ getStatusText(task.status) }}
              </dx-badge>
            </td>

            <!-- Priority -->
            <td :class="['px-6 py-4', 'theme-components-table-body-cell']">
              <div class="flex items-center">
                <PriorityIcon :priority="task.priority" />
                <span :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'ml-2']">{{ task.priority }}</span>
              </div>
            </td>

            <!-- Created At -->
            <td :class="['px-6 py-4', 'theme-components-table-body-cell']">
              <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">{{ formatDate(task.createdAt) }}</div>
              <div :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">{{ formatTime(task.createdAt) }}</div>
            </td>

            <!-- Actions -->
            <td :class="['px-6 py-4 text-right', 'theme-components-table-body-cell']">
              <dx-button
                variant="link"
                size="sm"
                @click.stop="$emit('show-detail', task)"
              >
                View
              </dx-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import DxBadge from '@/components/ui/dxBadge.vue'
import DxButton from '@/components/ui/dxButton.vue'
import PriorityIcon from './PriorityIcon.vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  selectedTasks: {
    type: Array,
    default: () => []
  }
})

defineEmits(['select-task', 'select-all', 'show-detail'])

watch(() => props.tasks, (newTasks) => {
  console.log('[TasksGrid] Tasks updated:', newTasks?.length, newTasks)
}, { immediate: true, deep: true })

const allSelected = computed(() => props.tasks.length > 0 && props.selectedTasks.length === props.tasks.length)

const isSelected = (task: any) => props.selectedTasks.some(selected => selected.id === task.id)

const getTaskTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'email_notification_task': '#2563eb',
    'telegram_notification_task': '#0ea5e9',
    'internal_notification_task': '#8b5cf6',
    'cache_generation_task': '#16a34a',
    'database_backup_task': '#dc2626',
    'system_health_task': '#f59e0b',
    'raw': '#6b7280',
    'binary': '#374151',
    'text': '#059669',
    'number': '#7c3aed',
    'boolean': '#db2777',
    'unknown': '#9ca3af'
  }
  return colors[type] || '#6b7280'
}

const getTaskTypeIcon = (type: string) => {
  return (type || 'unknown').substring(0, 2).toUpperCase()
}

const getStatusText = (status: string) => ({
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  delayed: 'Delayed',
  cancelled: 'Cancelled'
}[status] || status)

const statusVariant = (status: string) => {
  switch (status) {
    case 'running':
      return 'info'
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    case 'delayed':
      return 'warning'
    case 'queued':
      return 'secondary'
    default:
      return 'secondary'
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString()
const formatTime = (date: string) => new Date(date).toLocaleTimeString()
</script>
