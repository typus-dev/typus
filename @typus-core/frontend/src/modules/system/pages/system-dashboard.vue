<route lang="json">{
  "name": "system-dashboard",
  "path": "/system/dashboard",
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { SystemDashboardMethods, type SystemDashboard } from '../methods/dashboard.methods'
import dxCard from '@/components/ui/dxCard.vue'
import dxChart from '@/components/charts/dxChart.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

// State
const loading = ref(true)
const error = ref<string | null>(null)
const dashboard = ref<SystemDashboard | null>(null)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Chart data
const memoryChartData = computed(() => {
  if (!dashboard.value) return { labels: [], datasets: [] }
  const { memoryUsedPercent } = dashboard.value.system
  return {
    labels: ['Used', 'Free'],
    datasets: [{
      data: [memoryUsedPercent, 100 - memoryUsedPercent],
      backgroundColor: [
        memoryUsedPercent > 80 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)',
        'rgba(229, 231, 235, 0.5)'
      ],
      borderWidth: 0
    }]
  }
})

const storageChartData = computed(() => {
  if (!dashboard.value) return { labels: [], datasets: [] }
  const { database, uploads, cache, logs } = dashboard.value.storage
  // Convert bytes to MB for readable chart
  const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 10) / 10
  return {
    labels: ['Database', 'Uploads', 'Cache', 'Logs'],
    datasets: [{
      label: 'MB',
      data: [toMB(database.bytes), toMB(uploads.bytes), toMB(cache.bytes), toMB(logs.bytes)],
      backgroundColor: [
        'rgba(34, 197, 94, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(245, 158, 11, 0.7)'
      ]
    }]
  }
})

const recordCountsChartData = computed(() => {
  if (!dashboard.value) return { labels: [], datasets: [] }
  const counts = dashboard.value.database.recordCounts
  return {
    labels: counts.map(c => c.table),
    datasets: [{
      label: 'Records',
      data: counts.map(c => c.count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(20, 184, 166, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(107, 114, 128, 0.7)'
      ]
    }]
  }
})

// Chart options
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false }
  }
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { beginAtZero: true }
  }
}

// Module icons mapping
const moduleIcons: Record<string, string> = {
  auth: 'ri:shield-keyhole-line',
  user: 'ri:user-line',
  role: 'ri:admin-line',
  cms: 'ri:article-line',
  dispatcher: 'ri:calendar-schedule-line',
  storage: 'ri:folder-line',
  notification: 'ri:notification-line',
  system: 'ri:settings-3-line',
  log: 'ri:file-list-3-line',
  email: 'ri:mail-line',
  compass: 'ri:compass-line',
  demo: 'ri:play-circle-line'
}

const getModuleIcon = (name: string): string => {
  return moduleIcons[name.toLowerCase()] || 'ri:puzzle-line'
}

// Load dashboard data
const loadDashboard = async () => {
  try {
    dashboard.value = await SystemDashboardMethods.getDashboard()
    error.value = null
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard'
    console.error('Dashboard error:', err)
  } finally {
    loading.value = false
  }
}

// Format bytes for display
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Lifecycle
onMounted(() => {
  loadDashboard()
  // Auto-refresh every 30 seconds
  refreshInterval.value = setInterval(loadDashboard, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <PageHeader
    title="System Dashboard"
    subtitle="Monitor system health and resources"
  >
    <template #actions>
      <dxButton variant="ghost" @click="loadDashboard" :loading="loading">
        <template #prefix>
          <dxIcon name="ri:refresh-line" />
        </template>
        Refresh
      </dxButton>
    </template>
  </PageHeader>

  <!-- Loading State -->
  <div v-if="loading && !dashboard" class="flex items-center justify-center py-20">
    <dxIcon name="ri:loader-4-line" class="animate-spin text-2xl text-text-tertiary" />
  </div>

  <!-- Error State -->
  <dxCard v-else-if="error" class="bg-status-error-bg border-status-error">
    <div class="p-4 text-status-error">
      <dxIcon name="ri:error-warning-line" class="mr-2" />
      {{ error }}
    </div>
  </dxCard>

  <!-- Dashboard Content -->
  <template v-else-if="dashboard">
    <!-- Application Info Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <dxCard class="text-center p-4">
        <div class="text-xs text-text-tertiary uppercase mb-1">Version</div>
        <div class="text-xl font-bold text-primary">{{ dashboard.application.version }}</div>
      </dxCard>
      <dxCard class="text-center p-4">
        <div class="text-xs text-text-tertiary uppercase mb-1">Uptime</div>
        <div class="text-xl font-bold text-status-success">{{ dashboard.application.uptimeFormatted }}</div>
      </dxCard>
      <dxCard class="text-center p-4">
        <div class="text-xs text-text-tertiary uppercase mb-1">Node.js</div>
        <div class="text-xl font-bold text-text-primary">{{ dashboard.application.nodeVersion }}</div>
      </dxCard>
      <dxCard class="text-center p-4">
        <div class="text-xs text-text-tertiary uppercase mb-1">Queue Driver</div>
        <div class="text-xl font-bold text-primary">{{ dashboard.application.queueDriver }}</div>
      </dxCard>
      <dxCard class="text-center p-4">
        <div class="text-xs text-text-tertiary uppercase mb-1">Sessions</div>
        <div class="text-xl font-bold text-status-warning">{{ dashboard.sessions.active }}</div>
      </dxCard>
      <dxCard class="text-center p-4">
        <div class="text-xs text-text-tertiary uppercase mb-1">Build</div>
        <div class="text-xl font-bold text-text-secondary">#{{ dashboard.application.buildNumber }}</div>
      </dxCard>
    </div>

    <!-- System Info Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Memory Usage -->
      <dxCard title="Memory Usage">
        <div class="p-4 flex items-center gap-4">
          <div class="w-24 h-24 relative">
            <dxChart
              type="doughnut"
              :data="memoryChartData"
              :options="doughnutOptions"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-lg font-bold">{{ dashboard.system.memoryUsedPercent }}%</span>
            </div>
          </div>
          <div class="text-sm">
            <div class="text-text-secondary">Used: {{ formatBytes(dashboard.system.memoryUsed) }}</div>
            <div class="text-text-secondary">Free: {{ formatBytes(dashboard.system.memoryFree) }}</div>
            <div class="text-text-secondary">Total: {{ formatBytes(dashboard.system.memoryTotal) }}</div>
          </div>
        </div>
      </dxCard>

      <!-- System Info -->
      <dxCard title="System Info">
        <div class="p-4 text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-text-secondary">Hostname:</span>
            <span class="font-medium">{{ dashboard.system.hostname }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Platform:</span>
            <span class="font-medium">{{ dashboard.system.platform }} ({{ dashboard.system.arch }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">CPU:</span>
            <span class="font-medium">{{ dashboard.system.cpuCores }} cores</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Load Avg:</span>
            <span class="font-medium">{{ dashboard.system.loadAverage.map(l => l.toFixed(2)).join(' / ') }}</span>
          </div>
        </div>
      </dxCard>

      <!-- Database Info -->
      <dxCard title="Database">
        <div class="p-4 text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-text-secondary">Size:</span>
            <span class="font-bold text-primary">{{ dashboard.database.sizeFormatted }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Tables:</span>
            <span class="font-medium">{{ dashboard.database.tableCount }}</span>
          </div>
          <div class="border-t border-border-primary pt-2 mt-2">
            <div v-for="rc in dashboard.database.recordCounts.slice(0, 4)" :key="rc.table" class="flex justify-between">
              <span class="text-text-secondary">{{ rc.table }}:</span>
              <span class="font-medium">{{ rc.count.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </dxCard>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- Storage Chart -->
      <dxCard title="Storage Usage">
        <div class="p-4" style="height: 250px">
          <dxChart
            v-if="dashboard.storage.total.bytes > 0"
            type="bar"
            :data="storageChartData"
            :options="barOptions"
          />
          <div v-else class="h-full flex items-center justify-center text-text-tertiary">
            No storage data
          </div>
        </div>
        <div class="px-4 pb-4 text-sm text-text-secondary">
          Total: {{ dashboard.storage.total.formatted }}
        </div>
      </dxCard>

      <!-- Record Counts Chart -->
      <dxCard title="Database Records">
        <div class="p-4" style="height: 250px">
          <dxChart
            v-if="dashboard.database.recordCounts.length > 0"
            type="bar"
            :data="recordCountsChartData"
            :options="barOptions"
          />
          <div v-else class="h-full flex items-center justify-center text-text-tertiary">
            No data
          </div>
        </div>
      </dxCard>
    </div>

    <!-- Modules & Queues Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- Modules -->
      <dxCard title="Modules & Plugins">
        <div class="p-4 space-y-4">
          <!-- Core Modules -->
          <div>
            <div class="text-xs text-text-tertiary uppercase mb-2">Core Modules</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="mod in dashboard.modules.filter(m => m.type === 'core')"
                :key="mod.name"
                class="flex flex-col items-center justify-center p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                style="width: 80px; height: 80px"
              >
                <dxIcon
                  :name="getModuleIcon(mod.name)"
                  class="mb-1 text-text-secondary"
                  size="24"
                />
                <span class="text-[10px] text-text-secondary text-center leading-tight">{{ mod.name }}</span>
              </div>
            </div>
          </div>
          <!-- Plugins -->
          <div v-if="dashboard.modules.some(m => m.type === 'plugin')">
            <div class="text-xs text-text-tertiary uppercase mb-2">Plugins</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="mod in dashboard.modules.filter(m => m.type === 'plugin')"
                :key="mod.name"
                class="flex flex-col items-center justify-center p-2 rounded-lg border border-primary bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                style="width: 80px; height: 80px"
              >
                <dxIcon
                  :name="getModuleIcon(mod.name)"
                  class="mb-1 text-primary"
                  size="24"
                />
                <span class="text-[10px] text-text-secondary text-center leading-tight">{{ mod.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </dxCard>

      <!-- Queues -->
      <dxCard title="Queue Status">
        <div class="p-4">
          <div v-if="dashboard.queues.length === 0" class="text-text-tertiary text-center py-4">
            No queues configured
          </div>
          <div v-else>
            <!-- Header with icons -->
            <div class="grid p-2 mb-2 border-b border-border-primary items-center" style="grid-template-columns: 1fr 50px 50px 50px">
              <span class="text-xs text-text-tertiary uppercase">Queue</span>
              <div class="flex justify-center"><dxIcon name="ri:time-line" size="18" class="text-status-warning" title="Pending" /></div>
              <div class="flex justify-center"><dxIcon name="ri:play-circle-line" size="18" class="text-primary" title="Running" /></div>
              <div class="flex justify-center"><dxIcon name="ri:error-warning-line" size="18" class="text-status-error" title="Failed" /></div>
            </div>
            <!-- Queue rows -->
            <div class="space-y-2">
              <div
                v-for="queue in dashboard.queues"
                :key="queue.name"
                class="grid p-2 bg-bg-secondary rounded items-center"
                style="grid-template-columns: 1fr 50px 50px 50px"
              >
                <span class="font-medium text-sm">{{ queue.name }}</span>
                <span class="text-center text-status-warning font-medium text-sm">{{ queue.pending }}</span>
                <span class="text-center text-primary font-medium text-sm">{{ queue.running }}</span>
                <span class="text-center text-status-error font-medium text-sm">{{ queue.failed }}</span>
              </div>
            </div>
          </div>
        </div>
      </dxCard>
    </div>

    <!-- Footer Info -->
    <div class="text-xs text-text-tertiary text-center mt-4">
      Last updated: {{ new Date(dashboard.timestamp).toLocaleString() }}
      <span class="mx-2">|</span>
      Auto-refresh: 30s
    </div>
  </template>
</template>
