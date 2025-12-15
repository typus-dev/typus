<template>
  <dxTable
    :data="history"
    :columns="columns"
    :loading="loading"
    :pagination-meta="paginationMeta"
    :server-side-pagination="true"
    @row-click="showDetails"
    @page-change="handlePageChange"
  >
    <!-- Custom status column -->
    <template #status="{ item }">
      <dx-badge :variant="getStatusVariant(item.status)" size="sm">
        {{ getStatusText(item.status) }}
      </dx-badge>
    </template>

    <!-- Custom duration column -->
    <template #duration="{ item }">
      {{ formatDuration(item.executionTime || item.duration) }}
    </template>

    <!-- Custom started column -->
    <template #started="{ item }">
      <div>{{ formatDate(item.executedAt || item.started_at || item.startedAt) }}</div>
      <div :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">
        {{ formatTime(item.executedAt || item.started_at || item.startedAt) }}
      </div>
    </template>

    <!-- Custom finished column -->
    <template #finished="{ item }">
      <div>{{ formatDate(item.finishedAt || item.finished_at) }}</div>
      <div :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">
        {{ formatTime(item.finishedAt || item.finished_at) }}
      </div>
    </template>
  </dxTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import DxBadge from '@/components/ui/dxBadge.vue'
import { useModals } from '@/shared/composables/useModals'
import TaskHistoryDetailContent from './TaskHistoryDetailContent.vue'

const props = defineProps({
  history: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    default: () => ({
      currentPage: 1,
      totalPages: 1,
      total: 0
    })
  }
})

const emit = defineEmits(['load-more', 'page-change'])

const { viewModal } = useModals()

const columns = [
  {
    key: 'task',
    title: 'Task',
    sortable: false,
    width: '250px',
    formatter: (value: any, row: any) => {
      const id = row.taskId || row.task_id
      const title = row.title || row.type || 'Unknown Task'
      return `#${id} - ${title}`
    }
  },
  {
    key: 'status',
    title: 'Status',
    sortable: true,
    width: '120px'
  },
  {
    key: 'duration',
    title: 'Duration',
    sortable: false,
    width: '100px'
  },
  {
    key: 'started',
    title: 'Started',
    sortable: true,
    width: '180px'
  },
  {
    key: 'finished',
    title: 'Finished',
    sortable: true,
    width: '180px'
  }
]

const paginationMeta = computed(() => ({
  total: props.pagination.total || 0,
  currentPage: props.pagination.currentPage || 1,
  limit: props.pagination.limit || 10,
  totalPages: props.pagination.totalPages || 1,
  hasMore: props.pagination.currentPage < props.pagination.totalPages
}))

// Methods
const handlePageChange = ({ currentPage, limit }: { currentPage: number; limit: number }) => {
  emit('page-change', { page: currentPage, limit })
}

const showDetails = (item: any) => {
  viewModal(TaskHistoryDetailContent, { item }, {
    title: 'Task History Details',
    maxWidth: '2xl'
  })
}

const getStatusVariant = (status: string) => {
  const variantMap: Record<string, string> = {
    'completed': 'success',
    'success': 'success',
    'failed': 'error',
    'error': 'error',
    'retry': 'warning',
    'running': 'info',
    'pending': 'warning'
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
    'pending': 'Pending'
  }
  return statusMap[status] || 'Unknown'
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

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

const formatTime = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Time'
    return date.toLocaleTimeString()
  } catch {
    return 'Invalid Time'
  }
}
</script>
