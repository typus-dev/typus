<route lang="json">{
  "name": "dispatcher-tasks",
  "path": "/dispatcher/tasks",
  "meta": {
    "layout": "private",
    "subject": "dispatcher"
  }
}</route>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DispatcherTaskMethods, DispatcherChartMethods } from '../../methods/task.methods.dsx'
import { formatUtils } from '@/shared/utils/format'
import { useToasts } from '@/shared/composables/useToasts'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxChart from '@/components/charts/dxChart.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

const router = useRouter()
const { successToast, errorToast } = useToasts()
const executingTasks = ref<Set<number>>(new Set())

// State
const tasks = ref<any[]>([])
const loading = ref(false)

// Chart state
const timelineScale = ref<'hour' | 'day'>('hour')
const charts = reactive({
  timeline: { labels: [] as string[], datasets: [] as any[] },
  byType: { labels: [] as string[], datasets: [] as any[] }
})

// Chart options
const timelineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: { y: { beginAtZero: true, stacked: true }, x: { stacked: true } }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } }
}

// Table configuration
const columns = [
  { key: 'id', title: 'ID', sortable: true, width: '70px' },
  { key: 'name', title: 'Task Name', sortable: true, width: '200px' },
  { key: 'type', title: 'Type', sortable: true, width: '200px' },
  { key: 'isActive', title: 'Active', sortable: true, type: 'boolean', width: '80px' },
  { key: 'lastRun', title: 'Last Run', sortable: true, type: 'datetime', formatter: formatUtils.timeAgo, width: '140px'},
  { key: 'nextRun', title: 'Next Run', sortable: true, type: 'datetime', formatter: formatUtils.datetime, width: '210px' },
  { key: 'lastStatus', title: 'Status', sortable: true, width: '100px' },
  { key: 'runCount', title: 'Runs', sortable: true, width: '80px' },
  { key: 'periodSec', title: 'Period', sortable: true, formatter: formatUtils.period, width: '120px' }
]

// Custom actions
const customActions = [
  {
    key: 'run',
    label: 'Run',
    icon: 'ri:play-line',
    variant: 'ghost',
    condition: (item: any) => item.isActive,
    loading: (item: any) => executingTasks.value.has(item.id),
    onClick: async (item: any) => {
      executingTasks.value.add(item.id)

      try {
        const result = await DispatcherTaskMethods.executeTask(item.id)
        successToast(result.message || 'Task queued for execution')
        await loadTasks()
      } catch (error: any) {
        errorToast(error.message || 'Failed to execute task')
      } finally {
        setTimeout(() => {
          executingTasks.value.delete(item.id)
        }, 500)
      }
    }
  }
]

// Load chart data
const loadCharts = async () => {
  try {
    // Timeline data
    const timelineData = await DispatcherChartMethods.getTimelineData(timelineScale.value)
    const labels = timelineData.map((d: any) => d.hour || d.day)
    charts.timeline = {
      labels,
      datasets: [
        {
          label: 'Success',
          data: timelineData.map((d: any) => d.success),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        },
        {
          label: 'Failed',
          data: timelineData.map((d: any) => d.failed),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        }
      ]
    }

    // By task type
    const typeData = await DispatcherChartMethods.getByTaskType()
    charts.byType = {
      labels: typeData.map((d: any) => d.type),
      datasets: [{
        label: 'Executions',
        data: typeData.map((d: any) => d.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ]
      }]
    }
  } catch (error) {
    console.error('Failed to load charts', error)
  }
}

// Watch for scale change
watch(timelineScale, () => loadCharts())

// Actions
const loadTasks = async () => {
  loading.value = true

  try {
    tasks.value = await DispatcherTaskMethods.getTasks()
  } catch (error: any) {
    errorToast(error.message || 'Failed to load tasks')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  router.push('/dispatcher/tasks/create')
}

const handleEdit = (task: any) => {
  router.push(`/dispatcher/tasks/edit/${task.id}`)
}

const handleDelete = async (task: any) => {
  try {
    await DispatcherTaskMethods.deleteTask(task.id)
    successToast('Task deleted successfully')
    await loadTasks()
  } catch (error: any) {
    errorToast(error.message || 'Failed to delete task')
  }
}

const handleRowClick = (task: any) => {
  router.push(`/dispatcher/tasks/edit/${task.id}`)
}

onMounted(() => {
  loadTasks()
  loadCharts()
})
</script>

<template>
  <PageHeader
    title="Task Dispatcher"
    subtitle="Manage scheduled tasks and jobs"
  >
    <template #actions>
      <dxButton variant="primary" @click="handleCreate">
        <template #prefix>
          <dxIcon name="ri:add-line" />
        </template>
        Create Task
      </dxButton>
    </template>
  </PageHeader>

  <!-- Charts Row -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <dxCard>
      <div class="flex justify-between items-center px-4 pt-4">
        <h3 class="font-semibold">Task Executions</h3>
        <div class="flex gap-1">
          <button
            :class="[
              'px-3 py-1 text-sm rounded-l',
              timelineScale === 'hour' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            ]"
            @click="timelineScale = 'hour'"
          >24h</button>
          <button
            :class="[
              'px-3 py-1 text-sm rounded-r',
              timelineScale === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            ]"
            @click="timelineScale = 'day'"
          >7 days</button>
        </div>
      </div>
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.timeline.labels.length > 0"
          type="bar"
          :data="charts.timeline"
          :options="timelineChartOptions"
        />
        <div v-else class="h-full flex items-center justify-center text-gray-400">No data</div>
      </div>
    </dxCard>

    <dxCard title="By Task Type">
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.byType.labels.length > 0"
          type="bar"
          :data="charts.byType"
          :options="barChartOptions"
        />
        <div v-else class="h-full flex items-center justify-center text-gray-400">No data</div>
      </div>
    </dxCard>
  </div>

  <dxCard>
    <dxTable
      :data="tasks"
      :columns="columns"
      :loading="loading"
      :actions="true"
      :custom-actions="customActions"
      confirm-delete-message="Are you sure you want to delete this task?"
      confirm-delete-title="Delete Task"
      @update="handleEdit"
      @delete="handleDelete"
      @row-click="handleRowClick"
    />
  </dxCard>
</template>
