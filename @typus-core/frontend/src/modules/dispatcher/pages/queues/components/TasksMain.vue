<template>
  <dx-card variant="flat" background="secondary">
    <div :class="['theme-layout-stack-vertical' || 'space-y-6']">
      <!-- Tab Navigation -->
      <DxTabs
        :tabs="tabs"
        :model-value="activeTab"
        variant="underline"
        full-width
        @update:model-value="handleTabChange"
      />

      <!-- Tasks Tab -->
      <div v-show="activeTab === 'tasks'" :class="['theme-layout-stack-vertical' || 'space-y-6']">
        <!-- Tasks Header -->
        <div class="flex justify-between items-center">
          <div>
            <h2 :class="['theme-typography-size-lg', 'theme-typography-weight-medium', 'theme-colors-text-primary']">Tasks</h2>
            <p :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
              Showing {{ tasks.length }} of {{ pagination.total }} tasks
            </p>
          </div>

        <div class="flex items-center gap-3">
          <div v-if="selectedTasks.length > 0" class="flex items-center gap-2">
            <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">{{ selectedTasks.length }} selected</span>
            <dx-button size="sm" variant="info" @click="$emit('retry-selected')">
              <template #prefix>
                <i class="ri-refresh-line text-xs"></i>
              </template>
              Retry
            </dx-button>
            <dx-button size="sm" variant="danger" @click="$emit('delete-selected')">
              <template #prefix>
                <i class="ri-delete-bin-line text-xs"></i>
              </template>
              Delete
            </dx-button>
          </div>

          <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
            Auto-updating via WebSocket
          </div>
        </div>
        </div>

        <!-- Filters -->
        <dx-card variant="flat" background="tertiary">
          <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <DxSelect
                :label="'Queue'"
                :options="queueOptions"
                :model-value="filters.queue || ''"
                size="md"
                clearable
                filterable
                noGutters
                @update:model-value="handleFilterChange('queue', $event || '')"
              />
            </div>

            <div>
              <DxSelect
                :label="'Type'"
                :options="typeOptions"
                :model-value="filters.type || ''"
                size="md"
                clearable
                filterable
                noGutters
                @update:model-value="handleFilterChange('type', $event || '')"
              />
            </div>

            <div>
              <DxSelect
                :label="'Status'"
                :options="statusOptions"
                :model-value="filters.status || ''"
                size="md"
                clearable
                noGutters
                @update:model-value="handleFilterChange('status', $event || '')"
              />
            </div>

            <div>
              <DxDateTime
                :label="'From Date'"
                :model-value="filters.dateFrom || null"
                size="md"
                :show-time="false"
                :show-calendar="true"
                noGutters
                @update:model-value="handleFilterChange('dateFrom', $event || '')"
              />
            </div>

            <div>
              <DxDateTime
                :label="'To Date'"
                :model-value="filters.dateTo || null"
                size="md"
                :show-time="false"
                :show-calendar="true"
                noGutters
                @update:model-value="handleFilterChange('dateTo', $event || '')"
              />
            </div>

            <div class="flex items-end">
              <dx-button variant="outline" size="md" @click="$emit('clear-filters')">
                Clear
              </dx-button>
            </div>
          </div>
        </dx-card>

        <TasksGrid
          :key="`tasks-${tasks.length}-${filters.type}-${filters.queue}-${filters.status}`"
          :tasks="tasks"
          :loading="loading"
          :error="error"
          :selected-tasks="selectedTasks"
          @select-task="$emit('select-task', $event)"
          @select-all="$emit('select-all')"
          @show-detail="$emit('show-task-detail', $event)"
        />

        <div class="flex items-center justify-between">
          <dx-button
            v-if="pagination.hasMore"
            variant="info"
            :loading="loading"
            @click="$emit('load-more')"
          >
            <template #prefix>
              <i class="ri-add-line text-base"></i>
            </template>
            Load More
          </dx-button>

          <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary', 'ml-auto']">
            Showing {{ Math.min(tasks.length, pagination.total) }} of {{ pagination.total }} results
          </div>
        </div>

        <div v-if="pagination.total > 0" class="flex items-center justify-between">
          <dx-button
            variant="outline"
            size="sm"
            :disabled="pagination.isFirstPage"
            @click="$emit('prev-page')"
          >
            <template #prefix>
              <i class="ri-arrow-left-line text-base"></i>
            </template>
            Previous
          </dx-button>

          <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
            Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
          </span>

          <dx-button
            variant="outline"
            size="sm"
            :disabled="pagination.isLastPage"
            @click="$emit('next-page')"
          >
            Next
            <template #suffix>
              <i class="ri-arrow-right-line text-base"></i>
            </template>
          </dx-button>
        </div>
      </div>

      <!-- History Tab -->
      <div v-show="activeTab === 'history'" class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 :class="['theme-typography-size-lg', 'theme-typography-weight-medium', 'theme-colors-text-primary']">Task History</h2>
            <p :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
              Showing {{ history.length }} of {{ historyPagination.total }} completed tasks
            </p>
          </div>
          <div :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
            Auto-updating via WebSocket
          </div>
        </div>

        <TaskHistoryList
          :history="history"
          :loading="historyLoading"
          :pagination="historyPagination"
          @page-change="$emit('page-change-history', $event)"
        />
      </div>

      <!-- Debug Tab -->
      <div v-show="activeTab === 'debug'">
        <div class="flex justify-between items-center mb-4">
          <p :class="['theme-typography-size-sm', 'theme-colors-text-secondary']">
            Last updated: {{ debugData?.lastUpdatedAt || 'N/A' }}
          </p>
        </div>
        <pre :class="['theme-colors-background-tertiary', 'rounded text-xs overflow-auto p-4 max-h-[600px]']">{{ JSON.stringify(debugData, null, 2) }}</pre>
      </div>
    </div>
  </dx-card>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'

import DxCard from '@/components/ui/dxCard.vue'
import DxButton from '@/components/ui/dxButton.vue'
import DxBadge from '@/components/ui/dxBadge.vue'
import DxSelect from '@/components/ui/dxSelect'
import DxDateTime from '@/components/ui/dxDateTime.vue'
import DxTabs from '@/components/ui/dxTabs.vue'

import TasksGrid from './TasksGrid.vue'
import TaskHistoryList from './TaskHistoryList.vue'

const emit = defineEmits([
  'update-tab',
  'update-filter',
  'apply-filters',
  'clear-filters',
  'select-task',
  'select-all',
  'delete-selected',
  'retry-selected',
  'show-task-detail',
  'next-page',
  'prev-page',
  'load-more',
  'refresh-tasks',
  'refresh-history',
  'page-change-history'
])

const handleFilterChange = async (key: string, value: string) => {
  console.log('[TasksMain] Filter change:', { key, value, currentFilters: props.filters })
  emit('update-filter', key, value)
  // Use nextTick to ensure filter is updated before applying
  await nextTick()
  console.log('[TasksMain] After nextTick, filters:', props.filters)
  emit('apply-filters')
}

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
  },
  pagination: {
    type: Object,
    default: () => ({
      currentPage: 1,
      totalPages: 1,
      isFirstPage: true,
      isLastPage: true,
      total: 0,
      hasMore: false
    })
  },
  filters: {
    type: Object,
    default: () => ({})
  },
  history: {
    type: Array,
    default: () => []
  },
  historyLoading: {
    type: Boolean,
    default: false
  },
  historyPagination: {
    type: Object,
    default: () => ({
      currentPage: 1,
      totalPages: 1,
      isFirstPage: true,
      isLastPage: true,
      total: 0
    })
  },
  activeTab: {
    type: String,
    default: 'tasks'
  },
  debugData: {
    type: Object,
    default: () => ({})
  }
})

const uniqueQueues = computed(() => {
  const queues = new Set<string>()
  props.tasks.forEach((task: any) => {
    if (task.queue) queues.add(task.queue)
  })
  return Array.from(queues).sort()
})

const uniqueTypes = computed(() => {
  const types = new Set<string>()
  props.tasks.forEach((task: any) => {
    if (task.type) types.add(task.type)
  })
  return Array.from(types).sort()
})

const queueOptions = computed(() => [
  { label: 'All Queues', value: '' },
  ...uniqueQueues.value.map(queue => ({ label: queue, value: queue }))
])

const typeOptions = computed(() => [
  { label: 'All Types', value: '' },
  ...uniqueTypes.value.map(type => ({ label: type, value: type }))
])

const statusOptions = computed(() => [
  { label: 'All Status', value: '' },
  { label: 'Queued', value: 'queued' },
  { label: 'Running', value: 'running' },
  { label: 'Delayed', value: 'delayed' },
  { label: 'Failed', value: 'failed' }
])

// Tabs configuration
const tabs = computed(() => [
  { key: 'tasks', label: 'Tasks', badge: props.pagination?.total || undefined },
  { key: 'history', label: 'History', badge: props.historyPagination?.total || undefined },
  { key: 'debug', label: 'Debug' }
])

const handleTabChange = (tab: string) => {
  emit('update-tab', tab)
}
</script>
