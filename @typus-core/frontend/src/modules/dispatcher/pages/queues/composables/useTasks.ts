import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { queueApiService } from '../../../services/queueApiService'
import { useWebSocket } from '@/composables/useWebSocket'
import { eventBus } from '@/core/events'
import { EVT_QUEUE_UPDATE, EVT_QUEUE_TASKS_ADDED, EVT_TASK_HISTORY_UPDATE, EVT_QUEUES_CLEARED } from '@/core/events/constants'

export function useTasks() {
  const tasks = ref([])
  const loading = ref(false)
  const error = ref(null)
  const selectedTasks = ref([])

  const limit = ref(50)
  const offset = ref(0)
  const total = ref(0)
  const hasMore = ref(false)

  const subscriptions: Array<() => void> = []
  const lastResponse = ref<any>(null)

  const filters = ref({
    queue: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    includeDiscovered: true
  })

  const { connect, disconnect, isConnected } = useWebSocket()

  const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
  const totalPages = computed(() => Math.ceil(total.value / limit.value))
  const isFirstPage = computed(() => currentPage.value === 1)
  const isLastPage = computed(() => currentPage.value === totalPages.value)

  const selectedTaskIds = computed(() => selectedTasks.value.map(t => t.id))
  const hasSelection = computed(() => selectedTasks.value.length > 0)
  const allSelected = computed(() => 
    tasks.value.length > 0 && selectedTasks.value.length === tasks.value.length
  )

  const buildParams = (customOffset?: number) => {
    const paramsOffset = customOffset !== undefined ? customOffset : offset.value
    return {
      limit: limit.value,
      offset: paramsOffset,
      status: filters.value.status || undefined,
      type: filters.value.type || undefined,
      dateFrom: filters.value.dateFrom || undefined,
      dateTo: filters.value.dateTo || undefined,
      includeDiscovered: filters.value.includeDiscovered
    }
  }

  const fetchTasks = async (resetOffset = false) => {
    loading.value = true
    error.value = null

    if (resetOffset) {
      offset.value = 0
    }

    console.log('Loading tasks...')

    const params = buildParams()
    const response = filters.value.queue
      ? await queueApiService.getQueueTasks(filters.value.queue, params)
      : await queueApiService.getAllQueuesTasks(params)

    console.log('Tasks response:', JSON.stringify(response, null, 2))
    tasks.value = response.tasks || []
    total.value = response.total || tasks.value.length
    offset.value = response.offset ?? params.offset ?? 0
    hasMore.value = response.hasMore ?? (offset.value + limit.value < total.value)
    console.log(`Loaded ${tasks.value.length} tasks from API`)
    
    selectedTasks.value = []
    loading.value = false
    lastResponse.value = response

    return {
      tasks: tasks.value,
      total: total.value,
      offset: offset.value,
      hasMore: hasMore.value
    }
  }

  // Removed legacy Redis scanning fallback. Unified endpoint provides tasks.

  const nextPage = async () => {
    if (!isLastPage.value) {
      const nextOffset = offset.value + limit.value
      offset.value = nextOffset
      await fetchTasks()
    }
  }

  const prevPage = async () => {
    if (!isFirstPage.value) {
      offset.value = Math.max(0, offset.value - limit.value)
      await fetchTasks()
    }
  }

  const goToPage = async (page) => {
    const newOffset = (page - 1) * limit.value
    if (newOffset >= 0 && newOffset < total.value) {
      offset.value = newOffset
      await fetchTasks()
    }
  }

  const loadMore = async () => {
    if (hasMore.value && !loading.value) {
      const nextOffset = offset.value + limit.value
      loading.value = true

      const params = buildParams(nextOffset)
      const response = filters.value.queue
        ? await queueApiService.getQueueTasks(filters.value.queue, params)
        : await queueApiService.getAllQueuesTasks(params)

      console.log('loadMore response:', JSON.stringify(response, null, 2))
      tasks.value.push(...(response.tasks || []))
      offset.value = response.offset ?? nextOffset
      total.value = response.total ?? total.value
      hasMore.value = response.hasMore ?? (offset.value + limit.value < total.value)
      loading.value = false

      lastResponse.value = response
      return {
        tasks: response.tasks || [],
        total: total.value,
        offset: offset.value,
        hasMore: hasMore.value
      }
    }
  }

  const updateFilter = (key, value) => {
    console.log('[useTasks] updateFilter:', { key, value, before: { ...filters.value } })
    filters.value[key] = value
    console.log('[useTasks] updateFilter after:', { ...filters.value })
  }

  const clearFilters = () => {
    filters.value = {
      queue: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      includeDiscovered: filters.value.includeDiscovered
    }
  }

  const applyFilters = async () => {
    await fetchTasks(true)
  }

  const selectTask = (task) => {
    const index = selectedTasks.value.findIndex(t => t.id === task.id)
    if (index === -1) {
      selectedTasks.value.push(task)
    }
  }

  const unselectTask = (task) => {
    const index = selectedTasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      selectedTasks.value.splice(index, 1)
    }
  }

  const toggleTaskSelection = (task) => {
    const index = selectedTasks.value.findIndex(t => t.id === task.id)
    if (index === -1) {
      selectedTasks.value.push(task)
    } else {
      selectedTasks.value.splice(index, 1)
    }
  }

  const selectAll = () => {
    selectedTasks.value = [...tasks.value]
  }

  const unselectAll = () => {
    selectedTasks.value = []
  }

  const toggleSelectAll = () => {
    if (allSelected.value) {
      unselectAll()
    } else {
      selectAll()
    }
  }

  const deleteSelectedTasks = async () => {
    if (selectedTasks.value.length === 0) return false

    console.log('Deleting selected tasks:', selectedTaskIds.value)
    const result = await queueApiService.deleteTasksBatch(selectedTaskIds.value)
    console.log('Delete response:', JSON.stringify(result, null, 2))
    
    try {
      await fetchTasks()
    } catch (err) {
      console.error('[useTasks] Failed to refresh after delete:', err)
      throw err
    }
    return result
  }

  const retrySelectedTasks = async () => {
    if (selectedTasks.value.length === 0) return false

    console.log('Retrying selected tasks:', selectedTaskIds.value)
    const result = await queueApiService.retryTasksBatch(selectedTaskIds.value)
    console.log('Retry response:', JSON.stringify(result, null, 2))
    
    try {
      await fetchTasks()
    } catch (err) {
      console.error('[useTasks] Failed to refresh after retry:', err)
      throw err
    }
    return result
  }

  const getTask = (taskId) => {
    return tasks.value.find(t => t.id === taskId)
  }

  // WebSocket event handlers
  const handleTaskUpdate = (data) => {
    console.log('[useTasks] Task update received:', data)
    // When a task status changes, refresh the tasks list
    fetchTasks()
  }

  const handleQueueUpdate = (data) => {
    console.log('[useTasks] Queue update received:', data)
    fetchTasks().catch(err => console.error('[useTasks] Failed to refresh on queue update:', err))
  }

  // Lifecycle hooks
  onMounted(() => {
    connect()

    subscriptions.push(
      (eventBus as any).on(EVT_TASK_HISTORY_UPDATE, handleTaskUpdate),
      (eventBus as any).on(EVT_QUEUE_UPDATE, handleQueueUpdate),
      (eventBus as any).on(EVT_QUEUE_TASKS_ADDED, handleQueueUpdate),
      (eventBus as any).on(EVT_QUEUES_CLEARED, handleQueueUpdate)
    )
  })

  onUnmounted(() => {
    subscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    })

    disconnect()
  })

  watch(
    () => filters.value.includeDiscovered,
    () => {
      fetchTasks(true).catch(err => console.error('[useTasks] Failed to refresh after includeDiscovered toggle:', err))
    }
  )

  return {
    tasks,
    loading,
    error,
    selectedTasks,
    limit,
    offset,
    total,
    hasMore,
    currentPage,
    totalPages,
    isFirstPage,
    isLastPage,
    filters,
    selectedTaskIds,
    hasSelection,
    allSelected,
    fetchTasks,
    nextPage,
    prevPage,
    goToPage,
    loadMore,
    updateFilter,
    clearFilters,
    applyFilters,
    selectTask,
    unselectTask,
    toggleTaskSelection,
    selectAll,
    unselectAll,
    toggleSelectAll,
    deleteSelectedTasks,
    retrySelectedTasks,
    getTask,
    isConnected,
    lastResponse
  }
}
