<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted, watch } from 'vue'

// Import composables
import { useQueues } from '../composables/useQueues'
import { useTasks } from '../composables/useTasks'
import { useTaskHistory } from '../composables/useTaskHistory'
import { useQueueOverview } from '../composables/useQueueOverview'
import { useMessages } from '@/shared/composables/useMessages'
import { useModals } from '@/shared/composables/useModals'
import { useQueueConfirmations } from '../composables/useQueueConfirmations'

// UI components
import DxButton from '@/components/ui/dxButton.vue'
import DxBadge from '@/components/ui/dxBadge.vue'
import DxCard from '@/components/ui/dxCard.vue'

// Import components
import QueuesSidebar from './QueuesSidebar.vue'
import TasksMain from './TasksMain.vue'
import TaskCreator from './TaskCreator.vue'
import TaskDetailContent from './TaskDetailContent.vue'

// Initialize composables
const {
  queues,
  loading: queuesLoading,
  error: queuesError,
  includeDiscovered,
  queueStats,
  fetchQueues,
  toggleDiscovered,
  pauseQueue,
  resumeQueue,
  clearQueue,
  isConnected,
  lastResponse: lastQueuesResponse
} = useQueues()

const {
  tasks,
  loading: tasksLoading,
  error: tasksError,
  selectedTasks,
  filters: tasksFilters,
  limit,
  offset,
  total,
  hasMore,
  currentPage,
  totalPages,
  isFirstPage,
  isLastPage,
  fetchTasks,
  updateFilter: updateTaskFilter,
  applyFilters: applyTaskFilters,
  clearFilters: clearTaskFilters,
  toggleTaskSelection,
  toggleSelectAll: toggleSelectAllTasks,
  deleteSelectedTasks,
  retrySelectedTasks,
  nextPage: nextTasksPage,
  prevPage: prevTasksPage,
  loadMore: loadMoreTasks,
  lastResponse: lastTasksResponse
} = useTasks()

const {
  history: taskHistory,
  loading: historyLoading,
  fetchHistory,
  total: historyTotal,
  currentPage: historyCurrentPage,
  totalPages: historyTotalPages,
  isFirstPage: historyIsFirstPage,
  isLastPage: historyIsLastPage,
  goToPage: goToHistoryPage,
  nextPage: nextHistoryPage,
  prevPage: prevHistoryPage,
  loadMore: loadMoreHistory
} = useTaskHistory()

const {
  queueOverview,
  healthStatus,
  healthColor,
  fetchSystemLoad,
  clearAllQueues,
  getHealthStatusText
} = useQueueOverview()

const { confirmMessage, successMessage, errorMessage } = useMessages()
const { viewModal } = useModals()
const { confirmQueueClear, confirmAllQueuesClear } = useQueueConfirmations(confirmMessage)
// Local state organised per module guidelines
const pageState = reactive({
  data: {
    rawSystemLoadResponse: 'No data yet',
    rawQueuesResponse: 'No data yet',
    rawTasksResponse: 'No data yet',
    lastUpdatedAt: null as string | null
  },
  ui: {
    selectedQueue: null as any,
    activeTab: 'tasks',
    showTaskCreatorModal: false,
    isRefreshing: false
  }
})

// Computed properties
const connectionStatus = computed(() => ({
  label: isConnected?.value ? 'Connected' : 'Disconnected',
  variant: isConnected?.value ? 'success' : 'error'
}))

const logDataStatus = () => {
  logger.debug('[QueuesManager]')
  logger.debug('queueOverview:', queueOverview.value)
  logger.debug('queueStats:', queueStats.value)
  logger.debug('queues length:', queues.value?.length || 0)
  logger.debug('queues data:', queues.value)
  logger.debug('includeDiscovered:', includeDiscovered.value)
  logger.debug('===============================================')
}

watch([queueOverview, queueStats, queues], () => {
  logDataStatus()
}, { deep: true })

const tasksPagination = computed(() => ({
  currentPage: currentPage?.value || 1,
  totalPages: totalPages?.value || 1,
  isFirstPage: isFirstPage?.value || true,
  isLastPage: isLastPage?.value || true,
  total: total?.value || 0,
  hasMore: hasMore?.value || false
}))

const historyPagination = computed(() => ({
  currentPage: historyCurrentPage?.value || 1,
  totalPages: historyTotalPages?.value || 1,
  isFirstPage: historyIsFirstPage?.value || true,
  isLastPage: historyIsLastPage?.value || true,
  total: historyTotal?.value || 0
}))

let taskRefreshTimer: ReturnType<typeof setTimeout> | null = null
let pendingReset = false
let pendingRefresh = false
let refreshInProgress = false

const scheduleTaskRefresh = (reset = false) => {
  pendingRefresh = true
  if (reset) {
    pendingReset = true
  }

  if (refreshInProgress) {
    return
  }

  if (taskRefreshTimer) {
    return
  }

  taskRefreshTimer = setTimeout(async () => {
    taskRefreshTimer = null

    const shouldReset = pendingReset
    const shouldRefresh = pendingRefresh || shouldReset
    pendingReset = false
    pendingRefresh = false

    refreshInProgress = true
    try {
      const taskResult = await fetchTasks(shouldReset)
      if (shouldReset && pageState.ui.activeTab === 'history') {
        await fetchHistory(true)
      }
      if (taskResult && shouldRefresh) {
        pageState.data.lastUpdatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('[QueuesManager] Failed to refresh tasks:', error)
    } finally {
      refreshInProgress = false
      if (pendingReset || pendingRefresh) {
        scheduleTaskRefresh(pendingReset)
      }
    }
  }, 150)
}

// Methods
const refreshAll = async () => {
  pageState.ui.isRefreshing = true

  const [queuesResponse, _taskSnapshot, systemLoadResponse] = await Promise.all([
    fetchQueues(),
    fetchTasks(true),
    fetchSystemLoad()
  ])

  if (pageState.ui.activeTab === 'history') {
    await fetchHistory(true)
  }

  if (queuesResponse) {
    pageState.data.rawQueuesResponse = JSON.stringify(queuesResponse, null, 2)
  }

  if (systemLoadResponse) {
    pageState.data.rawSystemLoadResponse = JSON.stringify(systemLoadResponse, null, 2)
  }

  pageState.data.lastUpdatedAt = new Date().toISOString()
  pageState.ui.isRefreshing = false
}

const selectQueue = async (queue) => {
  pageState.ui.selectedQueue = queue
  updateTaskFilter('queue', queue?.key || '')
  await applyTaskFilters()
}

const setActiveTab = (tab) => {
  pageState.ui.activeTab = tab
  if (tab === 'history' && taskHistory.value.length === 0) {
    fetchHistory()
  }
}

const refreshTasks = () => fetchTasks(true)

const refreshHistory = () => fetchHistory(true)

// Queue operations
const handleToggleDiscovered = async () => {
  const response = await toggleDiscovered()
  if (response) {
    pageState.data.rawQueuesResponse = JSON.stringify(response, null, 2)
    pageState.data.lastUpdatedAt = new Date().toISOString()
  }
}

const handleClearQueue = async (queueKey) => {
  const confirmed = await confirmQueueClear(queueKey)
  
  if (confirmed) {
    const success = await clearQueue(queueKey)
    if (success) {
      successMessage(`Queue ${queueKey} has been cleared`)
      await refreshTasks()
    }
  }
}

const handlePauseQueue = async (queueKey) => {
  const success = await pauseQueue(queueKey)
  if (success) {
    successMessage(`Queue ${queueKey} has been paused`)
  }
}

const handleResumeQueue = async (queueKey) => {
  const success = await resumeQueue(queueKey)
  if (success) {
    successMessage(`Queue ${queueKey} has been resumed`)
  }
}

const handleClearAllQueues = async () => {
  const confirmed = await confirmAllQueuesClear()
  
  if (confirmed) {
    const result = await clearAllQueues()
    if (result.success) {
      successMessage(result.message || 'All queues cleared successfully')
      await refreshAll()
    } else {
      errorMessage(result.error)
    }
  }
}

// Task operations
const handleDeleteSelectedTasks = async () => {
  if (selectedTasks.value.length === 0) return
  
  const confirmed = await confirmMessage(`Are you sure you want to delete ${selectedTasks.value.length} selected tasks?`)
  
  if (confirmed) {
    const result = await deleteSelectedTasks()
    if (result) {
      successMessage(`${result.success} tasks deleted successfully`)
    }
  }
}

const handleRetrySelectedTasks = async () => {
  if (selectedTasks.value.length === 0) return
  
  const result = await retrySelectedTasks()
  if (result) {
    successMessage(`${result.success} tasks retried successfully`)
  }
}

// Modals
const showTaskCreator = () => {
  pageState.ui.showTaskCreatorModal = true
}

const hideTaskCreator = () => {
  pageState.ui.showTaskCreatorModal = false
}

const showTaskDetail = (task: any) => {
  viewModal(TaskDetailContent, { task }, {
    title: 'Task Details',
    maxWidth: '2xl'
  })
}

const handleTaskCreated = async () => {
  await refreshTasks()
  hideTaskCreator()
}

// WebSocket auto-refresh
watch(isConnected, (connected) => {
  if (connected) {
    logger.debug('[QueuesManager] WebSocket connected, refreshing data')
    refreshAll()
  }
}, { immediate: false })

// Auto-refresh tasks when queues change (WebSocket updates)
watch(queues, () => {
  if (pageState.ui.isRefreshing) {
    return
  }

  logger.debug('[QueuesManager] Queues updated, refreshing tasks and history')
  scheduleTaskRefresh(true)
}, { deep: true })

watch(lastQueuesResponse, (response) => {
  if (response) {
    pageState.data.rawQueuesResponse = JSON.stringify(response, null, 2)
    pageState.data.lastUpdatedAt = new Date().toISOString()
  }
}, { deep: true })

watch(lastTasksResponse, (response) => {
  if (response) {
    pageState.data.rawTasksResponse = JSON.stringify(response, null, 2)
    pageState.data.lastUpdatedAt = new Date().toISOString()
  }
}, { deep: true })

// Watch for queue selection changes
watch(includeDiscovered, () => {
  updateTaskFilter('includeDiscovered', includeDiscovered.value)
  scheduleTaskRefresh(true)
})

// Initialize
onMounted(async () => {
  await refreshAll()
})

onUnmounted(() => {
  if (taskRefreshTimer) {
    clearTimeout(taskRefreshTimer)
    taskRefreshTimer = null
  }
})
</script>

<template>
  <div :class="['overflow-hidden flex flex-col', 'theme-colors-background-primary', 'theme-colors-text-primary']">
    <!-- Header -->
    <header :class="['theme-colors-background-secondary', 'theme-colors-border-primary', 'shadow-sm border-b flex-shrink-0']">
      <div class="mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div class="flex items-center gap-4">
            <h1 :class="['theme-typography-size-2xl', 'theme-typography-weight-bold', 'theme-colors-text-primary']">
              Queue Manager 2.0
            </h1>
            <dx-badge :variant="connectionStatus.variant" size="sm">
              {{ connectionStatus.label }}
            </dx-badge>
          </div>
          
          <div class="flex items-center gap-4">
            <template v-if="queueOverview">
              <dx-badge :variant="healthStatus === 'healthy' ? 'success' : healthStatus === 'critical' ? 'error' : (healthStatus === 'warning' || healthStatus === 'degraded') ? 'warning' : 'info'" size="sm">
                {{ getHealthStatusText(healthStatus) }}
              </dx-badge>
              <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                {{ queueOverview.totalTasks || 0 }} tasks
              </span>
              <span v-if="queueOverview.driver" :class="['theme-typography-size-xs', 'theme-colors-text-secondary']">
                Driver: {{ queueOverview.driver }}
              </span>
            </template>

            <dx-button
              variant="outline"
              :disabled="pageState.ui.isRefreshing"
              @click="refreshAll"
            >
              <template #prefix>
                <i class="ri-refresh-line text-base" :class="{ 'animate-spin': pageState.ui.isRefreshing }"></i>
              </template>
              Refresh
            </dx-button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="grid grid-cols-12 gap-8">
        <!-- Sidebar -->
        <div class="col-span-12 lg:col-span-4 xl:col-span-3">
          <QueuesSidebar
            :queues="queues"
            :loading="queuesLoading"
            :error="queuesError"
            :include-discovered="includeDiscovered"
            :queue-stats="queueStats"
            :queue-overview="queueOverview"
            :selected-queue="pageState.ui.selectedQueue"
            :driver="queueOverview?.driver"
            @toggle-discovered="handleToggleDiscovered"
            @select-queue="selectQueue"
            @refresh-queues="fetchQueues"
            @clear-queue="handleClearQueue"
            @pause-queue="handlePauseQueue"
            @resume-queue="handleResumeQueue"
            @clear-all-queues="handleClearAllQueues"
            @create-task="showTaskCreator"
          />
        </div>

        <!-- Main Content Area -->
        <div class="col-span-12 lg:col-span-8 xl:col-span-9">
          <TasksMain
            :tasks="tasks"
            :loading="tasksLoading"
            :error="tasksError"
            :selected-tasks="selectedTasks"
            :pagination="tasksPagination"
            :filters="tasksFilters"
            :history="taskHistory"
            :history-loading="historyLoading"
            :history-pagination="historyPagination"
            :active-tab="pageState.ui.activeTab"
            :debug-data="{
              queueOverview,
              queueStats,
              queues,
              includeDiscovered,
              queuesLoading,
              tasksLoading,
              queuesError,
              tasksError,
              rawSystemLoadResponse: pageState.data.rawSystemLoadResponse,
              rawQueuesResponse: pageState.data.rawQueuesResponse,
              rawTasksResponse: pageState.data.rawTasksResponse,
              lastUpdatedAt: pageState.data.lastUpdatedAt
            }"
            @update-tab="setActiveTab"
            @update-filter="updateTaskFilter"
            @apply-filters="applyTaskFilters"
            @clear-filters="clearTaskFilters"
            @select-task="toggleTaskSelection"
            @select-all="toggleSelectAllTasks"
            @delete-selected="handleDeleteSelectedTasks"
            @retry-selected="handleRetrySelectedTasks"
            @show-task-detail="showTaskDetail"
            @next-page="nextTasksPage"
            @prev-page="prevTasksPage"
            @load-more="loadMoreTasks"
            @refresh-tasks="refreshTasks"
            @refresh-history="refreshHistory"
            @page-change-history="goToHistoryPage"
          />
        </div>
      </div>
    </div>

    <!-- Task Creator Modal -->
    <TaskCreator
      v-if="pageState.ui.showTaskCreatorModal"
      :visible="pageState.ui.showTaskCreatorModal"
      :queues="queues"
      @close="hideTaskCreator"
      @task-created="handleTaskCreated"
    />

  </div>
</template>
