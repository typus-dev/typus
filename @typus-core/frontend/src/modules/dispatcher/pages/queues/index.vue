<route lang="json">{
  "name": "dispatcher-queues",
  "path": "/dispatcher/queues",
  "meta": {
    "layout": "private",
    "subject": "dispatcher"
  }
}</route>

<script setup lang="ts">
import { reactive, computed, onMounted, watch } from 'vue'

// Composables
import { useQueues } from './composables/useQueues'
import { useTasks } from './composables/useTasks'
import { useTaskHistory } from './composables/useTaskHistory'
import { useQueueOverview } from './composables/useQueueOverview'
import { useMessages } from '@/shared/composables/useMessages'
import { useModals } from '@/shared/composables/useModals'
import { useQueueConfirmations } from './composables/useQueueConfirmations'

// Components
import PageHeader from '@/components/layout/PageHeader.vue'
import DxCard from '@/components/ui/dxCard.vue'
import DxButton from '@/components/ui/dxButton.vue'
import DxBadge from '@/components/ui/dxBadge.vue'
import DxSwitch from '@/components/ui/dxSwitch.vue'
import DxTabs from '@/components/ui/dxTabs.vue'
import DxSelect from '@/components/ui/dxSelect'
import DxDateTime from '@/components/ui/dxDateTime.vue'
import DxIcon from '@/components/ui/dxIcon.vue'

// Local components
import TasksGrid from './components/TasksGrid.vue'
import TaskHistoryList from './components/TaskHistoryList.vue'
import TaskCreatorContent from './components/TaskCreatorContent.vue'
import TaskDetailContent from './components/TaskDetailContent.vue'

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
  isConnected
} = useQueues()

const {
  tasks,
  loading: tasksLoading,
  error: tasksError,
  selectedTasks,
  filters: tasksFilters,
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
  loadMore: loadMoreTasks
} = useTasks()

const {
  history: taskHistory,
  loading: historyLoading,
  fetchHistory,
  total: historyTotal,
  limit: historyLimit,
  currentPage: historyCurrentPage,
  totalPages: historyTotalPages,
  goToPage: goToHistoryPage
} = useTaskHistory()

const {
  queueOverview,
  healthStatus,
  fetchSystemLoad,
  clearAllQueues,
  getHealthStatusText
} = useQueueOverview()

const { confirmMessage, successMessage, errorMessage } = useMessages()
const { viewModal } = useModals()
const { confirmQueueClear, confirmAllQueuesClear } = useQueueConfirmations(confirmMessage)

// State
const state = reactive({
  selectedQueue: null as any,
  activeTab: 'tasks',
  isRefreshing: false,
  showFilters: false
})

// Computed
const connectionBadge = computed(() => ({
  label: isConnected?.value ? 'Connected' : 'Disconnected',
  variant: isConnected?.value ? 'success' : 'error'
}))

const healthBadge = computed(() => {
  const variants: Record<string, string> = {
    healthy: 'success',
    critical: 'error',
    warning: 'warning',
    degraded: 'warning'
  }
  return {
    label: getHealthStatusText(healthStatus.value),
    variant: variants[healthStatus.value] || 'info'
  }
})

const tasksPagination = computed(() => ({
  currentPage: currentPage?.value || 1,
  totalPages: totalPages?.value || 1,
  isFirstPage: isFirstPage?.value ?? true,
  isLastPage: isLastPage?.value ?? true,
  total: total?.value || 0,
  hasMore: hasMore?.value || false
}))

const historyPagination = computed(() => ({
  currentPage: historyCurrentPage?.value || 1,
  totalPages: historyTotalPages?.value || 1,
  total: historyTotal?.value || 0,
  limit: historyLimit?.value || 10
}))

const tabs = computed(() => [
  { key: 'tasks', label: 'Tasks', badge: tasksPagination.value.total || undefined },
  { key: 'history', label: 'History', badge: historyPagination.value.total || undefined }
])

// Filter options
const queueOptions = computed(() => [
  { label: 'All Queues', value: '' },
  ...queues.value.map((q: any) => ({ label: q.name, value: q.key }))
])

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Queued', value: 'queued' },
  { label: 'Running', value: 'running' },
  { label: 'Delayed', value: 'delayed' },
  { label: 'Failed', value: 'failed' }
]

// Methods
const refreshAll = async () => {
  state.isRefreshing = true
  await Promise.all([
    fetchQueues(),
    fetchTasks(true),
    fetchSystemLoad()
  ])
  if (state.activeTab === 'history') {
    await fetchHistory(true)
  }
  state.isRefreshing = false
}

const selectQueue = async (queue: any) => {
  state.selectedQueue = queue
  updateTaskFilter('queue', queue?.key || '')
  await applyTaskFilters()
}

const setActiveTab = (tab: string) => {
  state.activeTab = tab
  if (tab === 'history' && taskHistory.value.length === 0) {
    fetchHistory()
  }
}

// Queue operations
const handleToggleDiscovered = async () => {
  await toggleDiscovered()
}

const handleClearQueue = async (queueKey: string) => {
  const confirmed = await confirmQueueClear(queueKey)
  if (confirmed) {
    const success = await clearQueue(queueKey)
    if (success) {
      successMessage(`Queue ${queueKey} has been cleared`)
      await fetchTasks(true)
    }
  }
}

const handlePauseQueue = async (queueKey: string) => {
  const success = await pauseQueue(queueKey)
  if (success) {
    successMessage(`Queue ${queueKey} has been paused`)
  }
}

const handleResumeQueue = async (queueKey: string) => {
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
      successMessage(result.message || 'All queues cleared')
      await refreshAll()
    } else {
      errorMessage(result.error)
    }
  }
}

// Task operations
const handleDeleteSelected = async () => {
  if (selectedTasks.value.length === 0) return
  const confirmed = await confirmMessage(`Delete ${selectedTasks.value.length} selected tasks?`)
  if (confirmed) {
    const result = await deleteSelectedTasks()
    if (result) {
      successMessage(`${result.success} tasks deleted`)
    }
  }
}

const handleRetrySelected = async () => {
  if (selectedTasks.value.length === 0) return
  const result = await retrySelectedTasks()
  if (result) {
    successMessage(`${result.success} tasks retried`)
  }
}

const showTaskDetail = (task: any) => {
  viewModal(TaskDetailContent, { task }, {
    title: 'Task Details',
    maxWidth: '2xl'
  })
}

// Task Creator modal
const showTaskCreator = () => {
  viewModal(TaskCreatorContent, {
    onSubmit: async () => {
      await fetchTasks(true)
      successMessage('Tasks created successfully')
    }
  }, {
    title: 'Create Task',
    maxWidth: 'lg'
  })
}

// Filter handlers
const handleFilterChange = async (key: string, value: string) => {
  updateTaskFilter(key, value)
  await applyTaskFilters()
}

// Auto-refresh
watch(queues, () => {
  if (!state.isRefreshing) {
    fetchTasks(true)
  }
}, { deep: true })

onMounted(() => refreshAll())
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Queue Manager"
      subtitle="Monitor and manage background job queues"
    >
      <template #actions>
        <DxButton variant="primary" @click="showTaskCreator">
          <template #prefix>
            <DxIcon name="ri:add-line" />
          </template>
          Create Task
        </DxButton>
        <DxButton
          variant="outline"
          :disabled="state.isRefreshing"
          @click="refreshAll"
        >
          <template #prefix>
            <i class="ri-refresh-line" :class="{ 'animate-spin': state.isRefreshing }"></i>
          </template>
          Refresh
        </DxButton>
      </template>
    </PageHeader>

    <!-- Main Content: Two Cards Side by Side -->
    <div class="flex gap-6">
      <!-- Left: Queues Sidebar -->
      <div class="w-64 flex-shrink-0">
        <DxCard>
          <!-- System Status -->
          <div class="mb-4 pb-4 border-b" :class="'theme-colors-border-primary'">
            <div class="flex items-center gap-2 mb-2">
              <DxBadge :variant="connectionBadge.variant" size="sm">
                {{ connectionBadge.label }}
              </DxBadge>
              <DxBadge v-if="healthStatus" :variant="healthBadge.variant" size="sm">
                {{ healthBadge.label }}
              </DxBadge>
            </div>
            <div class="flex items-center justify-between">
              <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                Driver: {{ queueOverview?.driver || '...' }}
              </span>
              <span :class="['theme-typography-size-sm', 'theme-typography-weight-medium', 'theme-colors-text-primary']">
                {{ queueOverview?.totalTasks || 0 }} tasks
              </span>
            </div>
          </div>

          <!-- Queue Controls -->
          <div class="space-y-4 mb-4">
            <div class="flex items-center justify-between">
              <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                Show discovered
              </span>
              <DxSwitch
                :model-value="includeDiscovered"
                size="sm"
                @update:model-value="handleToggleDiscovered"
              />
            </div>
          </div>

          <!-- Queue List -->
          <div :class="['divide-y', 'theme-colors-border-primary', '-mx-4']">
            <!-- All Queues -->
            <div
              :class="[
                'px-4 py-3 cursor-pointer flex items-center justify-between',
                state.selectedQueue === null
                  ? 'theme-colors-background-tertiary'
                  : 'hover:opacity-80'
              ]"
              @click="selectQueue(null)"
            >
              <span :class="['theme-typography-size-sm', 'theme-colors-text-primary']">
                All Queues
              </span>
              <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                {{ queueStats?.tasks || 0 }}
              </span>
            </div>

            <!-- Individual Queues -->
            <div
              v-for="queue in queues"
              :key="queue.key"
              :class="[
                'px-4 py-3 cursor-pointer group',
                state.selectedQueue?.key === queue.key
                  ? 'theme-colors-background-tertiary'
                  : 'hover:opacity-80'
              ]"
              @click="selectQueue(queue)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: queue.color }"
                  ></div>
                  <span :class="['theme-typography-size-sm', 'theme-colors-text-primary', 'truncate']">
                    {{ queue.name }}
                  </span>
                  <DxBadge v-if="queue.paused" variant="warning" size="xs">P</DxBadge>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                    {{ queue.depth }}
                  </span>
                  <!-- Queue Actions (show on hover) -->
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      v-if="queueOverview?.driver === 'redis'"
                      class="p-1 hover:opacity-70"
                      :title="queue.paused ? 'Resume' : 'Pause'"
                      @click.stop="queue.paused ? handleResumeQueue(queue.key) : handlePauseQueue(queue.key)"
                    >
                      <i :class="queue.paused ? 'ri-play-line' : 'ri-pause-line'" class="text-xs"></i>
                    </button>
                    <button
                      class="p-1 hover:opacity-70"
                      title="Clear"
                      @click.stop="handleClearQueue(queue.key)"
                    >
                      <i class="ri-delete-bin-line text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Clear All -->
          <div class="mt-4 pt-4 border-t" :class="'theme-colors-border-primary'">
            <DxButton
              variant="danger"
              size="sm"
              class="w-full"
              @click="handleClearAllQueues"
            >
              Clear All Queues
            </DxButton>
          </div>
        </DxCard>
      </div>

      <!-- Right: Tasks/History -->
      <div class="flex-1 min-w-0">
        <DxCard>
          <!-- Tabs -->
          <DxTabs
            :tabs="tabs"
            :model-value="state.activeTab"
            variant="underline"
            @update:model-value="setActiveTab"
          />

          <!-- Tasks Tab -->
          <div v-show="state.activeTab === 'tasks'" class="mt-4 space-y-4">
            <!-- Filters Toggle + Bulk Actions -->
            <div class="flex items-center justify-between">
              <DxButton
                variant="ghost"
                size="sm"
                @click="state.showFilters = !state.showFilters"
              >
                <template #prefix>
                  <i class="ri-filter-line"></i>
                </template>
                Filters
                <template #suffix>
                  <i :class="state.showFilters ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i>
                </template>
              </DxButton>

              <div v-if="selectedTasks.length > 0" class="flex items-center gap-2">
                <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                  {{ selectedTasks.length }} selected
                </span>
                <DxButton size="sm" variant="info" @click="handleRetrySelected">
                  Retry
                </DxButton>
                <DxButton size="sm" variant="danger" @click="handleDeleteSelected">
                  Delete
                </DxButton>
              </div>
            </div>

            <!-- Filters Panel -->
            <div v-if="state.showFilters" class="grid grid-cols-5 gap-4">
              <DxSelect
                label="Queue"
                :options="queueOptions"
                :model-value="tasksFilters.queue || ''"
                size="sm"
                clearable
                noGutters
                @update:model-value="handleFilterChange('queue', $event || '')"
              />
              <DxSelect
                label="Status"
                :options="statusOptions"
                :model-value="tasksFilters.status || ''"
                size="sm"
                clearable
                noGutters
                @update:model-value="handleFilterChange('status', $event || '')"
              />
              <DxDateTime
                label="From"
                :model-value="tasksFilters.dateFrom || null"
                size="sm"
                :show-time="false"
                noGutters
                @update:model-value="handleFilterChange('dateFrom', $event || '')"
              />
              <DxDateTime
                label="To"
                :model-value="tasksFilters.dateTo || null"
                size="sm"
                :show-time="false"
                noGutters
                @update:model-value="handleFilterChange('dateTo', $event || '')"
              />
              <div class="flex items-end">
                <DxButton variant="ghost" size="sm" @click="clearTaskFilters">
                  Clear
                </DxButton>
              </div>
            </div>

            <!-- Tasks Grid -->
            <TasksGrid
              :tasks="tasks"
              :loading="tasksLoading"
              :error="tasksError"
              :selected-tasks="selectedTasks"
              @select-task="toggleTaskSelection"
              @select-all="toggleSelectAllTasks"
              @show-detail="showTaskDetail"
            />

            <!-- Pagination -->
            <div v-if="tasksPagination.total > 0" class="flex items-center justify-between">
              <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                {{ tasks.length }} of {{ tasksPagination.total }}
              </span>
              <div class="flex items-center gap-2">
                <DxButton
                  variant="outline"
                  size="sm"
                  :disabled="tasksPagination.isFirstPage"
                  @click="prevTasksPage"
                >
                  Prev
                </DxButton>
                <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
                  {{ tasksPagination.currentPage }} / {{ tasksPagination.totalPages }}
                </span>
                <DxButton
                  variant="outline"
                  size="sm"
                  :disabled="tasksPagination.isLastPage"
                  @click="nextTasksPage"
                >
                  Next
                </DxButton>
              </div>
            </div>
          </div>

          <!-- History Tab -->
          <div v-show="state.activeTab === 'history'" class="mt-4">
            <TaskHistoryList
              :history="taskHistory"
              :loading="historyLoading"
              :pagination="historyPagination"
              @page-change="({ page, limit }) => goToHistoryPage(page, limit)"
            />
          </div>
        </DxCard>
      </div>
    </div>

  </div>
</template>
