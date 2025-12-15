import { ref, computed } from 'vue'
import { DSL } from '@/dsl/client'

export function useTaskHistory() {
  const history = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Pagination state
  const limit = ref(10) // Default 10 per page
  const offset = ref(0)
  const total = ref(0)
  const hasMore = ref(false)

  // Computed properties
  const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
  const totalPages = computed(() => Math.ceil(total.value / limit.value))
  const isFirstPage = computed(() => currentPage.value === 1)
  const isLastPage = computed(() => currentPage.value === totalPages.value)

  // Statistics
  const successCount = computed(() =>
    history.value.filter(h => h.status === 'success').length
  )
  const failedCount = computed(() =>
    history.value.filter(h => h.status === 'failed').length
  )
  const averageDuration = computed(() => {
    if (history.value.length === 0) return 0
    const totalDuration = history.value.reduce((sum, h) => sum + (h.duration || 0), 0)
    return Math.round(totalDuration / history.value.length)
  })

  const historyStats = computed(() => ({
    total: history.value.length,
    success: successCount.value,
    failed: failedCount.value,
    successRate: history.value.length > 0 ?
      Math.round((successCount.value / history.value.length) * 100) : 0,
    averageDuration: averageDuration.value
  }))

  // Fetch task history from DSL
  const fetchHistory = async (resetOffset = false) => {
    try {
      loading.value = true
      error.value = null

      if (resetOffset) {
        offset.value = 0
      }

      const page = Math.floor(offset.value / limit.value) + 1

      const response = await DSL.DispatcherTaskHistory.findMany(
        {},
        ['task'],
        {
          page,
          limit: limit.value,
          orderBy: { startedAt: 'desc' }
        }
      )

      // Handle DSL response format
      const items = response.data || response
      const paginationMeta = response.paginationMeta

      history.value = items.map(h => ({
        id: h.id?.toString(),
        taskId: h.taskId?.toString(),
        queueKey: h.queueName || 'database',
        type: h.taskType || h.task?.type || 'unknown',
        title: h.taskName || h.task?.name || 'Unknown Task',
        status: h.status === 'success' ? 'completed' : h.status,
        executedAt: h.startedAt,
        finishedAt: h.finishedAt,
        executionTime: h.duration,
        error: h.error,
        data: h.metadata,
        result: h.result
      }))

      total.value = paginationMeta?.total || items.length
      hasMore.value = offset.value + limit.value < total.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetching task history:', err)
    } finally {
      loading.value = false
    }
  }

  // Pagination methods
  const nextPage = async () => {
    if (!isLastPage.value) {
      offset.value += limit.value
      await fetchHistory()
    }
  }

  const prevPage = async () => {
    if (!isFirstPage.value) {
      offset.value = Math.max(0, offset.value - limit.value)
      await fetchHistory()
    }
  }

  const goToPage = async (page: number, newLimit?: number) => {
    if (newLimit && newLimit !== limit.value) {
      limit.value = newLimit
      offset.value = 0
    } else {
      const newOffset = (page - 1) * limit.value
      if (newOffset >= 0) {
        offset.value = newOffset
      }
    }
    await fetchHistory()
  }

  const setLimit = async (newLimit: number) => {
    limit.value = newLimit
    offset.value = 0
    await fetchHistory()
  }

  const loadMore = async () => {
    if (hasMore.value && !loading.value) {
      offset.value += limit.value
      await fetchHistory()
    }
  }

  // Utility methods
  const getHistoryItem = (id) => {
    return history.value.find(h => h.id === id)
  }

  const formatDuration = (duration) => {
    if (!duration) return 'N/A'
    
    if (duration < 1000) {
      return `${duration}ms`
    } else if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`
    } else {
      const minutes = Math.floor(duration / 60000)
      const seconds = Math.round((duration % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return 'CheckCircleIcon'
      case 'failed':
        return 'XCircleIcon'
      default:
        return 'QuestionMarkCircleIcon'
    }
  }

  return {
    // State
    history,
    loading,
    error,

    // Pagination
    limit,
    offset,
    total,
    hasMore,
    currentPage,
    totalPages,
    isFirstPage,
    isLastPage,

    // Computed
    successCount,
    failedCount,
    averageDuration,
    historyStats,

    // Methods
    fetchHistory,
    nextPage,
    prevPage,
    goToPage,
    setLimit,
    loadMore,

    // Utilities
    getHistoryItem,
    formatDuration,
    formatTimestamp,
    getStatusColor,
    getStatusIcon
  }
}
