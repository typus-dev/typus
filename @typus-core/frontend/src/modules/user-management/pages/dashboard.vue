<route lang="json">
{
  "name": "user-management-dashboard",
  "path": "/user-management/dashboard",
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
import { reactive, onMounted, computed } from 'vue'
import { UsersMethods } from '@/modules/user-management/methods/users.methods.dsl'
import { RolesMethods } from '@/modules/user-management/methods/roles.methods.dsl'
import { AuthHistory, UserSessions } from '@/modules/user-management/methods/logins-history.methods.dsl'
import { SystemLogs } from '@/modules/system/methods/logs.methods'
import { DSL } from '@/dsl/client'
import { formatUtils } from '@/shared/utils/format'
import { logger } from '@/core/logging/logger'
import dxChart from '@/components/charts/dxChart.vue'
import dxTable from '@/components/tables/dxTable/dxTable.vue'

// State
const pageData = reactive({
  users: [] as any[],
  roles: [] as any[],
  loginHistory: [] as any[],
  sessions: [] as any[],
  activityLogs: [] as any[],
  systemErrors: [] as any[],
  loading: true,
  refreshing: false,
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    recentLogins: 0
  },
  charts: {
    hourlyActivity: { labels: [] as string[], datasets: [] as any[] },
    roleDistribution: { labels: [] as string[], datasets: [] as any[] },
    userLocations: { labels: [] as string[], datasets: [] as any[] }
  }
})

// Helper to extract browser from user agent
const getBrowser = (userAgent: string): string => {
  if (!userAgent) return 'Unknown'
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Edg')) return 'Edge'
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
  return 'Other'
}

// Table columns for login history
const loginColumns = [
  {
    key: 'email',
    title: 'Email',
    sortable: true,
    width: '200px'
  },
  {
    key: 'user',
    title: 'Role',
    sortable: false,
    width: '100px',
    formatter: (value: any) => {
      // user.role can be either a string or an object with .name
      if (!value) return 'N/A'
      if (typeof value.role === 'string') return value.role
      return value.role?.name || 'N/A'
    }
  },
  {
    key: 'deviceData',
    title: 'Browser',
    sortable: false,
    width: '100px',
    formatter: (value: any) => getBrowser(value?.user_agent)
  },
  {
    key: 'deviceData',
    title: 'IP Address',
    sortable: false,
    width: '140px',
    formatter: (value: any) => value?.ip || 'N/A'
  },
  {
    key: 'result',
    title: 'Status',
    sortable: true,
    width: '100px'
  },
  {
    key: 'attemptTime',
    title: 'Time',
    sortable: true,
    width: '150px',
    formatter: (value: any) => value ? formatUtils.timeAgo(value) : 'N/A'
  }
]

// Sessions table columns
const sessionsColumns = [
  { key: 'email', title: 'User', sortable: true, width: '200px' },
  { key: 'createdAt', title: 'Started', sortable: true, width: '150px', formatter: (v: any) => v ? formatUtils.timeAgo(v) : 'N/A' },
  { key: 'expiresAt', title: 'Expires', sortable: true, width: '150px', formatter: (v: any) => v ? formatUtils.timeAgo(v) : 'N/A' }
]

// Activity logs table columns
const logsColumns = [
  { key: 'level', title: 'Level', sortable: true, width: '80px' },
  { key: 'message', title: 'Message', sortable: false, width: '300px' },
  { key: 'source', title: 'Source', sortable: true, width: '100px' },
  { key: 'timestamp', title: 'Time', sortable: true, width: '150px', formatter: (v: any) => v ? formatUtils.timeAgo(v) : 'N/A' }
]

// System errors table columns
const errorsColumns = [
  { key: 'level', title: 'Level', sortable: true, width: '80px' },
  { key: 'message', title: 'Message', sortable: false, width: '350px' },
  { key: 'timestamp', title: 'Time', sortable: true, width: '150px', formatter: (v: any) => v ? formatUtils.timeAgo(v) : 'N/A' }
]

// Chart options
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

const userActivityStats = computed(() => {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const users24h = pageData.users.filter(u =>
    u.lastLogin && new Date(u.lastLogin) > last24h
  ).length

  const users7d = pageData.users.filter(u =>
    u.lastLogin && new Date(u.lastLogin) > last7d
  ).length

  const users30d = pageData.users.filter(u =>
    u.lastLogin && new Date(u.lastLogin) > last30d
  ).length

  return { users24h, users7d, users30d }
})

// Chart data: User signups over last 7 days
const signupChartData = computed(() => {
  const days = 7
  const now = new Date()
  const labels: string[] = []
  const signupCounts: number[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

    const dayStart = new Date(date.setHours(0, 0, 0, 0))
    const dayEnd = new Date(date.setHours(23, 59, 59, 999))

    const count = pageData.users.filter(u => {
      if (!u.createdAt) return false
      const created = new Date(u.createdAt)
      return created >= dayStart && created <= dayEnd
    }).length

    signupCounts.push(count)
  }

  return {
    labels,
    datasets: [{
      label: 'New Users',
      data: signupCounts,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }
})

// Chart data: Login activity over last 24 hours
const loginActivityChartData = computed(() => {
  const hours = 24
  const now = new Date()
  const labels: string[] = []
  const loginCounts: number[] = []
  const history = Array.isArray(pageData.loginHistory) ? pageData.loginHistory : []

  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
    hourStart.setMinutes(0, 0, 0)
    labels.push(hourStart.getHours().toString().padStart(2, '0') + ':00')

    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

    const count = history.filter(login => {
      // AuthHistory uses attemptTime, not createdAt
      const timestamp = login.attemptTime || login.createdAt
      if (!timestamp) return false
      const loginTime = new Date(timestamp)
      return loginTime >= hourStart && loginTime < hourEnd
    }).length

    loginCounts.push(count)
  }

  return {
    labels,
    datasets: [{
      label: 'Logins',
      data: loginCounts,
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }
})

// Data loading
const loadDashboardData = async (isRefresh = false) => {
  if (isRefresh) {
    pageData.refreshing = true
  } else {
    pageData.loading = true
  }

  try {
    // Load all data in parallel
    const [users, roles, loginHistory, sessions, hourlyData, countryData, logsResponse, errorsResponse] = await Promise.all([
      UsersMethods.getUsers(),
      RolesMethods.getRoles(),
      DSL.AuthHistory.findMany({}, ['user.role'], { limit: 50, orderBy: { attemptTime: 'desc' } }),
      UserSessions.getActiveSessions(),
      AuthHistory.loginsByHour(),
      AuthHistory.loginsByCountry(),
      SystemLogs.findRecent(20),
      SystemLogs.findMany({ level: 'error', limit: 10 })
    ])

    // Extract arrays from response
    pageData.users = users || []
    pageData.roles = roles || []
    pageData.loginHistory = Array.isArray(loginHistory) ? loginHistory : (loginHistory?.data || [])
    pageData.sessions = (sessions || []).map((s: any) => ({ email: s.user?.email || 'Unknown', createdAt: s.createdAt, expiresAt: s.expiresAt }))
    pageData.activityLogs = logsResponse || []
    pageData.systemErrors = errorsResponse?.logs || []

    // Build hourly activity chart
    const hourlyLabels = hourlyData.map((h: any) => h.hour)
    const hourlyCounts = hourlyData.map((h: any) => h.count)
    pageData.charts.hourlyActivity = {
      labels: hourlyLabels,
      datasets: [{
        label: 'Logins',
        data: hourlyCounts,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }

    // Build user locations chart
    pageData.charts.userLocations = {
      labels: countryData.map((c: any) => c.country),
      datasets: [{
        data: countryData.map((c: any) => c.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(107, 114, 128, 0.7)'
        ]
      }]
    }

    // Build role distribution chart
    const roleCounts: Record<string, number> = {}
    pageData.users.forEach((u: any) => {
      const role = u.role || 'unknown'
      roleCounts[role] = (roleCounts[role] || 0) + 1
    })
    pageData.charts.roleDistribution = {
      labels: Object.keys(roleCounts),
      datasets: [{
        data: Object.values(roleCounts),
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)'
        ]
      }]
    }

    logger.debug('[Dashboard] Data loaded successfully', {
      users: pageData.users.length,
      roles: pageData.roles.length,
      loginHistory: pageData.loginHistory.length,
      sessions: pageData.sessions.length
    })

    // Calculate stats
    pageData.stats.totalUsers = pageData.users.length
    pageData.stats.activeUsers = pageData.users.filter((u: any) => u.isApproved).length
    pageData.stats.totalRoles = pageData.roles.length

    // Recent logins (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    pageData.stats.recentLogins = pageData.loginHistory.filter((login: any) => {
      const timestamp = login?.attemptTime || login?.createdAt
      return timestamp && new Date(timestamp) > yesterday
    }).length
  } catch (error) {
    logger.error('[Dashboard] Failed to load data:', error)
  } finally {
    pageData.loading = false
    pageData.refreshing = false
  }
}

onMounted(() => loadDashboardData())
</script>

<template>
  
    <div v-if="pageData.loading" class="flex justify-center items-center py-12">
      <dxSpinner size="lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold">User Management Dashboard</h1>
        <p class="text-gray-600 mt-2">Overview of users, roles, and activity</p>
      </div>

      <!-- Charts Row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <dxCard title="Hourly Activity">
          <div class="p-4" style="height: 300px">
            <dxChart
              type="line"
              :data="pageData.charts.hourlyActivity"
              :options="lineChartOptions"
            />
          </div>
        </dxCard>

        <dxCard title="User Signups (Last 7 Days)">
          <div class="p-4" style="height: 300px">
            <dxChart
              type="line"
              :data="signupChartData"
              :options="lineChartOptions"
            />
          </div>
        </dxCard>
      </div>

      <!-- Charts Row 2 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <dxCard title="User Locations">
          <div class="p-4" style="height: 300px">
            <dxChart
              type="pie"
              :data="pageData.charts.userLocations"
              :options="pieChartOptions"
            />
          </div>
        </dxCard>

        <dxCard title="Role Distribution">
          <div class="p-4" style="height: 300px">
            <dxChart
              type="doughnut"
              :data="pageData.charts.roleDistribution"
              :options="pieChartOptions"
            />
          </div>
        </dxCard>
      </div>

      <!-- Quick Actions -->
      <dxCard title="Quick Actions">
        <div class="p-6">
          <dxFlex gap="4" wrap="wrap">
            <dxButton
              variant="primary"
              @click="$router.push('/user-management/users/create')"
            >
              <template #prefix="{ iconColor }">
                <dxIcon name="ri:user-add-line" size="sm" :class="iconColor" />
              </template>
              Create User
            </dxButton>

            <dxButton
              variant="secondary"
              @click="$router.push('/user-management/users/list')"
            >
              <template #prefix="{ iconColor }">
                <dxIcon name="ri:user-line" size="sm" :class="iconColor" />
              </template>
              View All Users
            </dxButton>

            <dxButton
              variant="secondary"
              @click="$router.push('/user-management/roles/create')"
            >
              <template #prefix="{ iconColor }">
                <dxIcon name="ri:shield-line" size="sm" :class="iconColor" />
              </template>
              Create Role
            </dxButton>

            <dxButton
              variant="secondary"
              @click="$router.push('/user-management/roles/list')"
            >
              <template #prefix="{ iconColor }">
                <dxIcon name="ri:shield-line" size="sm" :class="iconColor" />
              </template>
              View All Roles
            </dxButton>

            <dxButton
              variant="outline"
              :disabled="pageData.refreshing"
              @click="loadDashboardData(true)"
            >
              <template #prefix="{ iconColor }">
                <dxIcon
                  name="ri:refresh-line"
                  size="sm"
                  :class="[iconColor, pageData.refreshing && 'animate-spin']"
                />
              </template>
              Refresh
            </dxButton>
          </dxFlex>
        </div>
      </dxCard>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <dxCard :class="'theme-colors-background-tertiary'">
          <div class="p-6 text-center">
            <dxIcon name="ri:user-line" size="xl" class="theme-colors-text-accent mb-2" />
            <p class="text-3xl font-bold">{{ pageData.stats.totalUsers }}</p>
            <p class="text-sm font-medium text-gray-600 mt-1">Total Users</p>
          </div>
        </dxCard>

        <dxCard :class="'theme-colors-background-tertiary'">
          <div class="p-6 text-center">
            <dxIcon name="ri:user-check-line" size="xl" class="theme-colors-text-accent mb-2" />
            <p class="text-3xl font-bold">{{ pageData.stats.activeUsers }}</p>
            <p class="text-sm font-medium text-gray-600 mt-1">Active Users</p>
          </div>
        </dxCard>

        <dxCard :class="'theme-colors-background-tertiary'">
          <div class="p-6 text-center">
            <dxIcon name="ri:shield-line" size="xl" class="theme-colors-text-accent mb-2" />
            <p class="text-3xl font-bold">{{ pageData.stats.totalRoles }}</p>
            <p class="text-sm font-medium text-gray-600 mt-1">Total Roles</p>
          </div>
        </dxCard>

        <dxCard :class="'theme-colors-background-tertiary'">
          <div class="p-6 text-center">
            <dxIcon name="ri:login-box-line" size="xl" class="theme-colors-text-accent mb-2" />
            <p class="text-3xl font-bold">{{ pageData.stats.recentLogins }}</p>
            <p class="text-sm font-medium text-gray-600 mt-1">Logins (24h)</p>
          </div>
        </dxCard>
      </div>

      <!-- Activity Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <dxCard title="Activity (24 hours)">
          <div class="p-6 text-center">
            <div class="text-4xl font-bold theme-colors-text-accent">{{ userActivityStats.users24h }}</div>
            <p class="text-sm text-gray-600 mt-2">users active in last 24 hours</p>
          </div>
        </dxCard>

        <dxCard title="Activity (7 days)">
          <div class="p-6 text-center">
            <div class="text-4xl font-bold theme-colors-text-success">{{ userActivityStats.users7d }}</div>
            <p class="text-sm text-gray-600 mt-2">users active in last 7 days</p>
          </div>
        </dxCard>

        <dxCard title="Activity (30 days)">
          <div class="p-6 text-center">
            <div class="text-4xl font-bold theme-colors-text-accent">{{ userActivityStats.users30d }}</div>
            <p class="text-sm text-gray-600 mt-2">users active in last 30 days</p>
          </div>
        </dxCard>
      </div>

      <!-- Tables Row: Sessions + Activity Logs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <dxCard title="Active Sessions">
          <dxTable
            :data="pageData.sessions"
            :columns="sessionsColumns"
            :default-items-per-page="5"
            :actions="false"
          />
        </dxCard>

        <dxCard title="Activity Logs">
          <dxTable
            :data="pageData.activityLogs"
            :columns="logsColumns"
            :default-items-per-page="5"
            :actions="false"
          />
        </dxCard>
      </div>

      <!-- System Errors -->
      <dxCard title="System Errors">
        <dxTable
          :data="pageData.systemErrors"
          :columns="errorsColumns"
          :default-items-per-page="5"
          :actions="false"
        />
      </dxCard>

      <!-- Recent Login Activity -->
      <dxCard title="Recent Login Activity">
        <dxTable
          :data="pageData.loginHistory"
          :columns="loginColumns"
          :default-items-per-page="10"
          :actions="false"
        />
      </dxCard>
    </div>
  
</template>
