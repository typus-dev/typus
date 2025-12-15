<route lang="json">
{
  "name": "active-sessions",
  "path": "/user-management/sessions",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "user"
  }
}
</route>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { UserSessions, AuthHistory, AuthSessions } from '../methods/logins-history.methods.dsl'
import { formatUtils } from '@/shared/utils/format'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxChart from '@/components/charts/dxChart.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

// State
const sessions = ref<any[]>([])
const loading = ref(false)

// Charts data
const charts = reactive({
  byHour: { labels: [] as string[], datasets: [] as any[] },
  loginHistory: { labels: [] as string[], datasets: [] as any[] },
  byDevice: { labels: [] as string[], datasets: [] as any[] }
})

// Chart options
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } }
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } }
}

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right' as const, labels: { boxWidth: 12 } } }
}

// Table configuration
const columns = [
  { key: 'id', title: 'Session ID', sortable: true, width: '300px' },
  { key: 'user.email', title: 'User', sortable: true, width: '250px' },
  {
    key: 'createdAt',
    title: 'Created',
    sortable: true,
    formatter: (value: any) => value ? formatUtils.timeAgo(value) : 'N/A',
    width: '150px'
  },
  {
    key: 'expiresAt',
    title: 'Expires',
    sortable: true,
    formatter: (value: any) => {
      if (!value) return 'N/A'
      const expiresDate = new Date(value)
      const now = new Date()
      if (expiresDate < now) return 'Expired'

      const diffMs = expiresDate.getTime() - now.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
      if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
      if (diffMinutes > 0) return `in ${diffMinutes} min${diffMinutes > 1 ? 's' : ''}`
      return 'Soon'
    },
    width: '150px'
  }
]

// Actions
const loadSessions = async () => {
  loading.value = true
  try {
    const [sessionsData, hourlyData, historyData, deviceData] = await Promise.all([
      UserSessions.getActiveSessions(),
      AuthSessions.sessionsCountByHours(),
      AuthHistory.loginsHistoryByDateAndResult(),
      AuthHistory.loginsByDevice()
    ])

    sessions.value = sessionsData

    // Sessions by Hour (bar)
    charts.byHour = {
      labels: hourlyData.map((h: any) => h.hour),
      datasets: [{
        label: 'Sessions',
        data: hourlyData.map((h: any) => h.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    }

    // Login History (line - success vs failed)
    charts.loginHistory = {
      labels: historyData.map((d: any) => d.date),
      datasets: [
        {
          label: 'Successful',
          data: historyData.map((d: any) => d.success),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Failed',
          data: historyData.map((d: any) => d.failure),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.3,
          fill: true
        }
      ]
    }

    // Sessions by Device (pie)
    charts.byDevice = {
      labels: deviceData.map((d: any) => d.device),
      datasets: [{
        data: deviceData.map((d: any) => d.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ]
      }]
    }
  } catch (error) {
    console.error('Failed to load sessions', error)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (session: any) => {
  await UserSessions.terminateSession(session.id)
  await loadSessions()
}

onMounted(() => loadSessions())
</script>

<template>
  <PageHeader
    title="Active Sessions"
    subtitle="Manage active user sessions"
  />

  <!-- Charts Row -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <dxCard title="Sessions by Hour">
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.byHour.labels.length > 0"
          type="bar"
          :data="charts.byHour"
          :options="barChartOptions"
        />
        <div v-else class="flex items-center justify-center h-full text-gray-400">No data</div>
      </div>
    </dxCard>

    <dxCard title="Login History">
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.loginHistory.labels.length > 0"
          type="line"
          :data="charts.loginHistory"
          :options="lineChartOptions"
        />
        <div v-else class="flex items-center justify-center h-full text-gray-400">No data</div>
      </div>
    </dxCard>

    <dxCard title="By Device">
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.byDevice.labels.length > 0"
          type="pie"
          :data="charts.byDevice"
          :options="pieChartOptions"
        />
        <div v-else class="flex items-center justify-center h-full text-gray-400">No data</div>
      </div>
    </dxCard>
  </div>

  <!-- Sessions Table -->
  <dxCard title="Active Sessions">
    <dxTable
      :data="sessions"
      :columns="columns"
      :loading="loading"
      :actions="true"
      confirm-delete-message="Are you sure you want to terminate this session?"
      confirm-delete-title="Terminate Session"
      @delete="handleDelete"
    />
  </dxCard>
</template>
