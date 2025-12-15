<route lang="json">{
  "name": "system-logs",
  "path": "/system/logs",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "system",
    "ability": {
      "action": "manage",
      "subject": "system"
    }
  }
}</route>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { SystemLogs } from '../methods/logs.methods'
import { useModals } from '@/shared/composables/useModals'
import { logger } from '@/core/logging/logger'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import dxChart from '@/components/charts/dxChart.vue'
import dxCard from '@/components/ui/dxCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import LogDetailsModalContent from '../components/LogDetailsModalContent.vue'

const { customModal } = useModals()

// State
const pageData = reactive({
  logs: [],
  stats: { total: 0, todayTotal: 0, errors: 0, warnings: 0, avgTime: 0 },
  logsByLevel: { labels: [], datasets: [] },
  logsBySource: { labels: [], datasets: [] },
  logsByModule: { labels: [], datasets: [] },
  timeline: { labels: [], datasets: [] },
  responseTime: { labels: [], datasets: [] },
  loading: false,
  error: null as string | null
})

// Table configuration
const columns = [
  {
    key: 'timestamp',
    title: 'Date & Time',
    sortable: true,
    width: '200px',
    formatter: (value: string) => new Date(value).toLocaleString()
  },
  { key: 'level', title: 'Level', sortable: true, width: '80px' },
  { key: 'userId', title: 'User', sortable: true, width: '80px' },
  { key: 'source', title: 'Source', sortable: true, width: '100px' },
  { key: 'module', title: 'Module', sortable: true, width: '100px' },
  { key: 'message', title: 'Message', width: '300px' }
]

// Chart options
const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12, font: { size: 11 } }
    }
  }
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: { boxWidth: 12, font: { size: 11 } }
    }
  },
  scales: {
    y: { beginAtZero: true }
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { beginAtZero: true }
  }
}

// Actions
const loadLogs = async () => {
  pageData.loading = true
  pageData.error = null

  try {
    pageData.logs = await SystemLogs.findRecent(100)
  } catch (error: any) {
    pageData.error = error.message
  } finally {
    pageData.loading = false
  }
}

const loadStats = async () => {
  pageData.stats = await SystemLogs.getStats()
}

const loadTimeline = async () => {
  pageData.timeline = await SystemLogs.getTimeline()
}

const loadLogsByLevel = async () => {
  const data = await SystemLogs.logsByLevel()
  pageData.logsByLevel = {
    labels: data.map(d => d.level),
    datasets: [
      {
        data: data.map(d => d.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',   // error - red
          'rgba(245, 158, 11, 0.7)',  // warn - amber
          'rgba(59, 130, 246, 0.7)',  // info - blue
          'rgba(107, 114, 128, 0.7)', // debug - gray
          'rgba(34, 197, 94, 0.7)'    // success - green
        ],
        borderWidth: 0
      }
    ]
  }
}

const loadLogsBySource = async () => {
  const data = await SystemLogs.logsBySource()
  pageData.logsBySource = {
    labels: data.map(d => d.source),
    datasets: [
      {
        data: data.map(d => d.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(245, 158, 11, 0.7)'
        ],
        borderWidth: 0
      }
    ]
  }
}

const loadLogsByModule = async () => {
  const data = await SystemLogs.logsByModule()
  pageData.logsByModule = {
    labels: data.map(d => d.module),
    datasets: [
      {
        label: 'Logs',
        data: data.map(d => d.count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 4
      }
    ]
  }
}

const loadResponseTime = async () => {
  pageData.responseTime = await SystemLogs.getResponseTimeDistribution()
}

const handleRowClick = (log: any) => {
  logger.debug('Row clicked:', log)

  customModal(LogDetailsModalContent, { item: log }, {
    title: `Log Entry #${log.id}`,
    maxWidth: '2xl'
  })
}

onMounted(async () => {
  await Promise.all([
    loadLogs(),
    loadStats(),
    loadTimeline(),
    loadLogsByLevel(),
    loadLogsBySource(),
    loadLogsByModule(),
    loadResponseTime()
  ])
})
</script>

<template>
  <PageHeader
    title="System Logs"
    subtitle="Monitor system activity and performance"
  />

  <!-- Timeline Chart -->
  <dxCard class="mb-6 p-4">
    <h3 class="text-lg font-semibold mb-4">Activity Timeline (Last 7 Days)</h3>
    <dxChart
      v-if="pageData.timeline.labels?.length > 0"
      type="line"
      :data="pageData.timeline"
      :options="lineChartOptions"
      height="200px"
    />
    <div v-else class="h-[200px] flex items-center justify-center text-gray-400">
      No timeline data
    </div>
  </dxCard>

  <!-- Charts Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <!-- Logs by Level -->
    <dxCard class="p-4">
      <h3 class="text-sm font-semibold mb-3 text-center">By Level</h3>
      <dxChart
        v-if="pageData.logsByLevel.labels.length > 0"
        type="doughnut"
        :data="pageData.logsByLevel"
        :options="pieChartOptions"
        height="180px"
      />
      <div v-else class="h-[180px] flex items-center justify-center text-gray-400 text-sm">
        No data
      </div>
    </dxCard>

    <!-- Logs by Source -->
    <dxCard class="p-4">
      <h3 class="text-sm font-semibold mb-3 text-center">By Source</h3>
      <dxChart
        v-if="pageData.logsBySource.labels.length > 0"
        type="doughnut"
        :data="pageData.logsBySource"
        :options="pieChartOptions"
        height="180px"
      />
      <div v-else class="h-[180px] flex items-center justify-center text-gray-400 text-sm">
        No data
      </div>
    </dxCard>

    <!-- Logs by Module -->
    <dxCard class="p-4">
      <h3 class="text-sm font-semibold mb-3 text-center">By Module</h3>
      <dxChart
        v-if="pageData.logsByModule.labels.length > 0"
        type="bar"
        :data="pageData.logsByModule"
        :options="barChartOptions"
        height="180px"
      />
      <div v-else class="h-[180px] flex items-center justify-center text-gray-400 text-sm">
        No data
      </div>
    </dxCard>

    <!-- Response Time Distribution -->
    <dxCard class="p-4">
      <h3 class="text-sm font-semibold mb-3 text-center">Response Time</h3>
      <dxChart
        v-if="pageData.responseTime.labels?.length > 0"
        type="bar"
        :data="pageData.responseTime"
        :options="barChartOptions"
        height="180px"
      />
      <div v-else class="h-[180px] flex items-center justify-center text-gray-400 text-sm">
        No data
      </div>
    </dxCard>
  </div>

  <!-- Stats Cards Row -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-blue-600">{{ pageData.stats.total }}</div>
      <div class="text-sm text-gray-500 mt-1">Total Logs</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-red-600">{{ pageData.stats.errors }}</div>
      <div class="text-sm text-gray-500 mt-1">Errors</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-amber-600">{{ pageData.stats.warnings }}</div>
      <div class="text-sm text-gray-500 mt-1">Warnings</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-green-600">{{ pageData.stats.avgTime }}ms</div>
      <div class="text-sm text-gray-500 mt-1">Avg Response</div>
    </dxCard>
  </div>

  <!-- Logs Table -->
  <dxCard>
    <dxTable
      :data="pageData.logs"
      :columns="columns"
      :loading="pageData.loading"
      :compact="false"
      :default-items-per-page="10"
      @row-click="handleRowClick"
    />
  </dxCard>
</template>
