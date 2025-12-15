import { useApi } from '@/shared/composables/useApi'

// Cache for API data to avoid multiple calls
let cachedLogs: any[] | null = null;

// Helper function to fetch logs from API
async function fetchLogs(params: {
  page?: number
  limit?: number
  level?: string
  source?: string
  module?: string
  search?: string
  startDate?: string
  endDate?: string
} = {}) {
  const { data } = await useApi('/logs').get(params)
  return data || { data: [], total: 0, page: 1, limit: 50 }
}

export namespace SystemLogs {
  /**
   * Fetch logs with filtering and pagination
   */
  export async function findMany(params: {
    page?: number
    limit?: number
    level?: string
    source?: string
    module?: string
    search?: string
    startDate?: string
    endDate?: string
  } = {}) {
    return await fetchLogs(params)
  }

  /**
   * Get recent logs (default 50) - returns array directly like AuthHistory
   */
  export async function findRecent(limit: number = 50) {
    const response = await fetchLogs({ limit, page: 1 })
    return response.logs || []
  }

  /**
   * Get logs by level for statistics
   */
  export async function logsByLevel() {
    const response = await fetchLogs({ limit: 1000 })
    const logs = response.logs || []
    
    const levelCounts = logs.reduce((acc: Record<string, number>, log: any) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {})
    
    return Object.entries(levelCounts).map(([level, count]) => ({
      level,
      count
    }))
  }

  /**
   * Get logs by source for statistics
   */
  export async function logsBySource() {
    const response = await fetchLogs({ limit: 1000 })
    const logs = response.logs || []

    const sourceCounts = logs.reduce((acc: Record<string, number>, log: any) => {
      acc[log.source] = (acc[log.source] || 0) + 1
      return acc
    }, {})

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count
    }))
  }

  /**
   * Get logs by module for statistics
   */
  export async function logsByModule() {
    const response = await fetchLogs({ limit: 1000 })
    const logs = response.logs || []

    const moduleCounts = logs.reduce((acc: Record<string, number>, log: any) => {
      const mod = log.module || 'unknown'
      acc[mod] = (acc[mod] || 0) + 1
      return acc
    }, {})

    return Object.entries(moduleCounts).map(([module, count]) => ({
      module,
      count
    }))
  }

  /**
   * Get stats summary (today's totals)
   */
  export async function getStats() {
    const response = await fetchLogs({ limit: 1000 })
    const logs = response.logs || []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayLogs = logs.filter((log: any) => new Date(log.timestamp) >= today)
    const errors = logs.filter((log: any) => log.level === 'error').length
    const warnings = logs.filter((log: any) => log.level === 'warn').length

    const timesWithValues = logs
      .filter((log: any) => log.executionTime)
      .map((log: any) => log.executionTime)
    const avgTime = timesWithValues.length > 0
      ? Math.round(timesWithValues.reduce((a: number, b: number) => a + b, 0) / timesWithValues.length)
      : 0

    return {
      total: logs.length,
      todayTotal: todayLogs.length,
      errors,
      warnings,
      avgTime
    }
  }

  /**
   * Get timeline data for chart (last 7 days)
   */
  export async function getTimeline() {
    const response = await fetchLogs({ limit: 1000 })
    const logs = response.logs || []

    // Generate last 7 days labels
    const days: string[] = []
    const dayData: Record<string, { errors: number, warnings: number, info: number }> = {}

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      const label = date.toLocaleDateString('en', { weekday: 'short' })
      days.push(label)
      dayData[key] = { errors: 0, warnings: 0, info: 0 }
    }

    // Count logs per day per level
    logs.forEach((log: any) => {
      const date = new Date(log.timestamp).toISOString().split('T')[0]
      if (dayData[date]) {
        if (log.level === 'error') dayData[date].errors++
        else if (log.level === 'warn') dayData[date].warnings++
        else dayData[date].info++
      }
    })

    const keys = Object.keys(dayData).sort()

    return {
      labels: days,
      datasets: [
        {
          label: 'Errors',
          data: keys.map(k => dayData[k].errors),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Warnings',
          data: keys.map(k => dayData[k].warnings),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Info',
          data: keys.map(k => dayData[k].info),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    }
  }

  /**
   * Get response time distribution
   */
  export async function getResponseTimeDistribution() {
    const response = await fetchLogs({ limit: 1000 })
    const logs = response.logs || []

    const buckets = {
      '0-50ms': 0,
      '50-100ms': 0,
      '100-200ms': 0,
      '200-500ms': 0,
      '500ms+': 0
    }

    logs.forEach((log: any) => {
      const time = log.executionTime || 0
      if (time <= 50) buckets['0-50ms']++
      else if (time <= 100) buckets['50-100ms']++
      else if (time <= 200) buckets['100-200ms']++
      else if (time <= 500) buckets['200-500ms']++
      else buckets['500ms+']++
    })

    return {
      labels: Object.keys(buckets),
      datasets: [{
        label: 'Requests',
        data: Object.values(buckets),
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(239, 68, 68, 0.7)'
        ],
        borderWidth: 0
      }]
    }
  }
}