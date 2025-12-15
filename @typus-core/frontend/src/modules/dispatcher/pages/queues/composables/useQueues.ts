import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { queueApiService } from '../../../services/queueApiService'
import { eventBus } from '@/core/events'
import { EVT_QUEUE_UPDATE, EVT_QUEUE_TASKS_ADDED, EVT_TASK_HISTORY_UPDATE, EVT_QUEUES_CLEARED } from '@/core/events/constants'

export function useQueues() {
  const queues = ref([])
  const loading = ref(false)
  const error = ref(null)
  const includeDiscovered = ref(true)

  const { connect, disconnect, isConnected } = useWebSocket()

  const subscriptions: Array<() => void> = []
  const lastResponse = ref<{ queues: any[]; timestamp: string } | null>(null)

  const totalQueues = computed(() => queues.value.length)
  const knownQueues = computed(() => queues.value.filter(q => q.isKnown !== false))
  const discoveredQueues = computed(() => queues.value.filter(q => q.isKnown === false))
  const totalTasks = computed(() => queues.value.reduce((sum, q) => sum + q.depth, 0))
  const totalErrors = computed(() => queues.value.reduce((sum, q) => sum + q.failed, 0))

  const queueStats = computed(() => {
    const stats = {
      total: totalQueues.value,
      known: knownQueues.value.length,
      discovered: discoveredQueues.value.length,
      tasks: totalTasks.value,
      errors: totalErrors.value,
      paused: queues.value.filter(q => q.paused).length
    }
    
    console.log('Queue stats calculated:', stats)
    console.log('Total queues:', queues.value.length)
    console.log('Total tasks:', totalTasks.value)
    
    return stats
  })

  const fetchQueues = async () => {
    loading.value = true
    error.value = null

    console.log('Requesting queues (unified endpoint)...')
    const response = await queueApiService.getAllQueues({ includeDiscovered: includeDiscovered.value })
    console.log('Response from getAllQueues:', JSON.stringify(response, null, 2))
    console.log('Queues:', JSON.stringify(response.queues, null, 2))
    console.log('Number of queues:', response.queues?.length || 0)
    response.queues?.forEach((queue, index) => {
      console.log(`Queue ${index + 1}: ${queue.name} (${queue.key}) - ${queue.depth || 0} tasks`)
    })
    queues.value = response.queues
    lastResponse.value = response

    loading.value = false

    return response
  }

  const toggleDiscovered = async () => {
    // Unified API already returns known + discovered when relevant.
    includeDiscovered.value = !includeDiscovered.value
    return await fetchQueues()
  }

  const pauseQueue = async (queueKey) => {
    await queueApiService.pauseQueue(queueKey)
    await fetchQueues()
    return true
  }

  const resumeQueue = async (queueKey) => {
    await queueApiService.resumeQueue(queueKey)
    await fetchQueues()
    return true
  }

  const clearQueue = async (queueKey) => {
    await queueApiService.clearQueue(queueKey)
    await fetchQueues()
    return true
  }

  const getQueue = (queueKey) => {
    return queues.value.find(q => q.key === queueKey)
  }

  const handleWebSocketMessage = (message) => {
    if (!message) return
    console.log('[useQueues] WebSocket message received:', message)
    switch (message.type) {
      case 'queue:tasks:added':
      case 'queue:update':
      case 'queues:cleared':
        fetchQueues()
        break
    }
  }

  const handleTaskUpdate = (data) => {
    console.log('[useQueues] Task update received:', data)
    // When a task completes/fails, refresh the queues to update task counts
    fetchQueues()
  }

  const handleQueueUpdate = (data) => {
    console.log('[useQueues] Queue update received:', data)
    fetchQueues()
  }

  onMounted(() => {
    fetchQueues()
    connect()

    // Listen for WebSocket events that should trigger queue refresh
    subscriptions.push(
      (eventBus as any).on(EVT_TASK_HISTORY_UPDATE, handleTaskUpdate),
      (eventBus as any).on(EVT_QUEUE_UPDATE, handleQueueUpdate),
      (eventBus as any).on(EVT_QUEUE_TASKS_ADDED, handleWebSocketMessage),
      (eventBus as any).on(EVT_QUEUES_CLEARED, handleWebSocketMessage)
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

  return {
    queues,
    loading,
    error,
    includeDiscovered,
    totalQueues,
    knownQueues,
    discoveredQueues,
    totalTasks,
    totalErrors,
    queueStats,
    fetchQueues,
    toggleDiscovered,
    pauseQueue,
    resumeQueue,
    clearQueue,
    getQueue,
    isConnected,
    lastResponse
  }
}
