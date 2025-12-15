<route lang="json">
{
  "name": "login-history",
  "path": "/user-management/login-history",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "user",
    "ability": {
      "action": "manage",
      "subject": "user"
    }
  }
}
</route>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { AuthHistory } from '../methods/logins-history.methods.dsl'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxChart from '@/components/charts/dxChart.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

// State
const loginHistory = ref<any[]>([])
const loading = ref(false)

// Pagination state
const pagination = reactive({
  currentPage: 1,
  limit: 20,
  total: 0,
  totalPages: 1
})

const paginationMeta = computed(() => ({
  total: pagination.total,
  currentPage: pagination.currentPage,
  limit: pagination.limit,
  totalPages: pagination.totalPages
}))

const charts = reactive({
  byStatus: { labels: [] as string[], datasets: [] as any[] },
  byDevice: { labels: [] as string[], datasets: [] as any[] },
})

// Table configuration
const columns = [
  { key: 'timestamp', title: 'Time', sortable: true, width: '160px' },
  { key: 'email', title: 'Email', sortable: true, width: '180px' },
  { key: 'ip', title: 'IP Address', sortable: false, width: '120px' },
  { key: 'device', title: 'Device', sortable: false, width: '200px' },
  { key: 'location', title: 'Location', sortable: false, width: '140px' },
  { key: 'status', title: 'Status', sortable: true, width: '100px' }
]

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: { boxWidth: 12 }
    }
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
const loadLoginHistory = async (page = 1, limit = 20) => {
  loading.value = true
  try {
    const response = await AuthHistory.findRecent(page, limit)
    loginHistory.value = response.data
    pagination.total = response.paginationMeta.total
    pagination.currentPage = response.paginationMeta.page || page
    pagination.limit = response.paginationMeta.limit || limit
    pagination.totalPages = response.paginationMeta.totalPages || Math.ceil(pagination.total / pagination.limit)
  } catch (error) {
    console.error('Failed to load login history', error)
  } finally {
    loading.value = false
  }
}

const handlePageChange = ({ currentPage, limit }: { currentPage: number; limit: number }) => {
  loadLoginHistory(currentPage, limit)
}

const loadCharts = async () => {
  // By Status (pie)
  const statusData = await AuthHistory.loginsByStatus()
  charts.byStatus = {
    labels: statusData.map((d: any) => d.status),
    datasets: [{
      data: statusData.map((d: any) => d.count),
      backgroundColor: [
        'rgba(34, 197, 94, 0.7)',   // success - green
        'rgba(239, 68, 68, 0.7)',   // wrong_password - red
        'rgba(245, 158, 11, 0.7)', // user_not_found - amber
        'rgba(107, 114, 128, 0.7)', // account_locked - gray
      ],
      borderWidth: 0
    }]
  }

  // By Device (bar)
  const deviceData = await AuthHistory.loginsByDevice()
  charts.byDevice = {
    labels: deviceData.map((d: any) => d.device),
    datasets: [{
      label: 'Logins',
      data: deviceData.map((d: any) => d.count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
      ],
      borderWidth: 0
    }]
  }
}

onMounted(async () => {
  await Promise.all([
    loadLoginHistory(),
    loadCharts()
  ])
})
</script>

<template>
  <PageHeader
    title="Login History"
    subtitle="View recent login attempts and security analytics"
  />

  <!-- Charts Row -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <dxCard title="By Status">
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.byStatus.labels.length > 0"
          type="pie"
          :data="charts.byStatus"
          :options="pieChartOptions"
        />
        <div v-else class="h-full flex items-center justify-center text-gray-400">No data</div>
      </div>
    </dxCard>

    <dxCard title="By Device">
      <div class="p-4" style="height: 280px">
        <dxChart
          v-if="charts.byDevice.labels.length > 0"
          type="bar"
          :data="charts.byDevice"
          :options="barChartOptions"
        />
        <div v-else class="h-full flex items-center justify-center text-gray-400">No data</div>
      </div>
    </dxCard>
  </div>

  <!-- Table -->
  <dxCard>
    <dxTable
      :data="loginHistory"
      :columns="columns"
      :loading="loading"
      :actions="false"
      :server-side-pagination="true"
      :pagination-meta="paginationMeta"
      :default-items-per-page="20"
      @page-change="handlePageChange"
    />
  </dxCard>
</template>
