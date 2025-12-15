import { ref, computed } from 'vue'
import { queueApiService } from '../../../services/queueApiService'

export function useQueueOverview() {
  const systemLoad = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const queueOverview = computed(() => {
    if (!systemLoad.value) return null
    
    return {
      totalQueues: systemLoad.value.totalQueues,
      totalTasks: systemLoad.value.totalTasks,
      totalFailedTasks: systemLoad.value.totalFailedTasks,
      redisMemory: systemLoad.value.redisMemory,
      knownQueues: systemLoad.value.knownQueues,
      unknownQueues: systemLoad.value.unknownQueues,
      discoveredQueues: systemLoad.value.discoveredQueues?.length || 0,
      driver: systemLoad.value.driver || 'unknown'
    }
  })

  const memoryUsage = computed(() => {
    if (!systemLoad.value?.redisMemory) return 'Unknown'
    return systemLoad.value.redisMemory
  })

  const healthStatus = computed(() => {
    if (!systemLoad.value) return 'unknown'
    
    const { totalFailedTasks, totalTasks } = systemLoad.value
    
    if (totalFailedTasks === 0) return 'healthy'
    
    const errorRate = totalTasks > 0 ? (totalFailedTasks / totalTasks) * 100 : 0
    
    if (errorRate > 50) return 'critical'
    if (errorRate > 20) return 'warning'
    if (errorRate > 0) return 'degraded'
    
    return 'healthy'
  })

  const healthColor = computed(() => {
    switch (healthStatus.value) {
      case 'healthy':
        return 'text-green-600 bg-green-50'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50'
      case 'warning':
        return 'text-orange-600 bg-orange-50'
      case 'critical':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  })

  const fetchSystemLoad = async () => {
    loading.value = true
    error.value = null

    console.log('Request system load...')
    const response = await queueApiService.getSystemLoad()
    console.log('Full system load response:', JSON.stringify(response, null, 2))
    console.log('SystemLoad data:', JSON.stringify(response.systemLoad, null, 2))
    console.log('Total tasks:', response.systemLoad?.totalTasks || 0)
    console.log('Known queues:', response.systemLoad?.knownQueues || 0)
    console.log('Discovered queues:', response.systemLoad?.discoveredQueues?.length || 0)
    console.log('Failed tasks:', response.systemLoad?.totalFailedTasks || 0)
    console.log('Redis memory:', response.systemLoad?.redisMemory || 'unknown')
    
    if (response.systemLoad?.discoveredQueues) {
      console.log('Discovered queues details:')
      response.systemLoad.discoveredQueues.forEach((queue, index) => {
        if (typeof queue === 'string') {
          console.log(`  ${index + 1}. ${queue}: unknown tasks`)
        } else if (typeof queue === 'object' && queue !== null) {
          const name = queue.key || queue.name || 'unknown'
          const taskCount = queue.depth || queue.taskCount || 0
          console.log(`  ${index + 1}. ${name}: ${taskCount} tasks`)
        } else {
          console.log(`  ${index + 1}. ${JSON.stringify(queue)}: unknown type`)
        }
      })
    }
    
    const fallbackDriver = response.systemLoad?.driver
      || response.driver
      || 'database'

    systemLoad.value = {
      ...response.systemLoad,
      driver: fallbackDriver
    }
    loading.value = false

    return response
  }

  const clearAllQueues = async () => {
    loading.value = true
    error.value = null

    const response = await queueApiService.clearAllQueues('CLEAR_ALL_QUEUES', 'I_UNDERSTAND_THIS_IS_DESTRUCTIVE')
    
    await fetchSystemLoad()
    loading.value = false
    
    return {
      success: true,
      cleared: response.cleared,
      failed: response.failed,
      message: 'All queues cleared successfully'
    }
  }


  const formatMemorySize = (sizeStr) => {
    if (!sizeStr || sizeStr === 'Unknown' || sizeStr === 'Error') {
      return sizeStr
    }
    
    if (/^\d+\.?\d*[KMGT]B?$/i.test(sizeStr)) {
      return sizeStr
    }
    
    const bytes = parseInt(sizeStr)
    if (isNaN(bytes)) return sizeStr
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`
  }

  const getHealthStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Healthy'
      case 'degraded':
        return 'Degraded'
      case 'warning':
        return 'Warning'
      case 'critical':
        return 'Critical'
      default:
        return 'Unknown'
    }
  }

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return 'CheckCircleIcon'
      case 'degraded':
        return 'ExclamationTriangleIcon'
      case 'warning':
        return 'ExclamationTriangleIcon'
      case 'critical':
        return 'XCircleIcon'
      default:
        return 'QuestionMarkCircleIcon'
    }
  }

  return {
    systemLoad,
    loading,
    error,
    queueOverview,
    memoryUsage,
    healthStatus,
    healthColor,
    fetchSystemLoad,
    clearAllQueues,
    formatMemorySize,
    getHealthStatusText,
    getHealthIcon
  }
}
