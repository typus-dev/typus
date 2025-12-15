import { ref, onUnmounted } from 'vue'
import { eventBus } from '@/core/events'
import { EVT_QUEUE_UPDATE, EVT_QUEUE_TASKS_ADDED, EVT_TASK_HISTORY_UPDATE, EVT_QUEUES_CLEARED } from '@/core/events/constants'

interface WebSocketMessage {
  type: string
  data: any
}

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const isReconnecting = ref(false)
  let reconnectAttempts = 0
  let reconnectTimer: number | null = null

  const connect = () => {
    try {
      console.log('[WebSocket] Starting connection attempt...')
      console.log('[WebSocket] window.location.protocol:', window.location.protocol)

      let token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('auth_token')

      if (token) {
        // Remove surrounding quotes if token is stored as JSON string
        try {
          token = JSON.parse(token)
        } catch (e) {
          // Token is already a plain string, use as-is
        }
      }

      if (!token) {
        console.log('[WebSocket] No auth token found in localStorage')
        console.log('[WebSocket] Available localStorage keys:', Object.keys(localStorage))
        return
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`

      console.log('[WebSocket] Connecting to:', wsUrl.replace(token, 'TOKEN_HIDDEN'))
      console.log('[WebSocket] Protocol:', protocol)
      console.log('[WebSocket] Host:', window.location.host)

      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        console.log('[WebSocket] ✅ Connected successfully!')
        isConnected.value = true
        isReconnecting.value = false
        reconnectAttempts = 0

        // Clear any pending reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }

      ws.value.onmessage = (event) => {
        try {
          console.log('[WebSocket] 📥 Received message:', event.data)
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('[WebSocket] 📩 Parsed message:', message)
          handleMessage(message)
        } catch (error) {
          console.error('[WebSocket] ❌ Failed to parse message:', error, 'Raw data:', event.data)
        }
      }

      ws.value.onclose = (event) => {
        console.log('[WebSocket] ❌ Disconnected:', event.code, event.reason)
        isConnected.value = false

        // Only attempt reconnect if not a normal closure
        if (event.code !== 1000) {
          scheduleReconnect()
        }
      }

      ws.value.onerror = (error) => {
        console.error('[WebSocket] ❌ Connection error:', error)
        isConnected.value = false
      }

    } catch (error) {
      console.error('[WebSocket] ❌ Failed to connect:', error)
      scheduleReconnect()
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (ws.value) {
      ws.value.close(1000, 'Manual disconnect')
      ws.value = null
    }

    isConnected.value = false
    isReconnecting.value = false
  }

  const scheduleReconnect = () => {
    if (isReconnecting.value) return

    isReconnecting.value = true
    reconnectAttempts++

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000)

    console.debug(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)

    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'ping':
        // Respond to ping
        if (ws.value?.readyState === WebSocket.OPEN) {
          ws.value.send(JSON.stringify({ type: 'pong' }))
        }
        break

      case 'notification':
        // Handle nested notification data
        if (message.data && message.data.type) {
          switch (message.data.type) {
            case EVT_TASK_HISTORY_UPDATE:
              // Emit task history update - handle items array
              console.log('[WebSocket] Task history update (nested):', message.data.data)
              if (message.data.data?.items && Array.isArray(message.data.data.items)) {
                message.data.data.items.forEach((item: any) => {
                  console.log('[WebSocket] Emitting task update (nested):', item)
                  ; (eventBus as any).emit(EVT_TASK_HISTORY_UPDATE, item)
                })
              } else {
                ; (eventBus as any).emit(EVT_TASK_HISTORY_UPDATE, message.data.data)
              }
              break
            case EVT_QUEUE_TASKS_ADDED:
              ; (eventBus as any).emit(EVT_QUEUE_TASKS_ADDED, message.data)
              ; (eventBus as any).emit(EVT_QUEUE_UPDATE, message.data)
              break
            case EVT_QUEUE_UPDATE:
              ; (eventBus as any).emit(EVT_QUEUE_UPDATE, message.data)
              break
            case EVT_QUEUES_CLEARED:
              ; (eventBus as any).emit(EVT_QUEUES_CLEARED, message.data)
              ; (eventBus as any).emit(EVT_QUEUE_UPDATE, message.data)
              break
            case 'photoshoot:image:completed':
              ; (eventBus as any).emit('photoshoot:image:completed', message.data)
              break
            default:
              // Generic notification
              ; (eventBus as any).emit('notification:realtime', message.data)
          }
        } else {
          // Generic notification without nested type
          ; (eventBus as any).emit('notification:realtime', message.data)
        }
        break

      case EVT_QUEUE_TASKS_ADDED:
        ; (eventBus as any).emit(EVT_QUEUE_TASKS_ADDED, message.data)
        ; (eventBus as any).emit(EVT_QUEUE_UPDATE, message.data)
        break

      case EVT_TASK_HISTORY_UPDATE:
        // Direct task history update - emit each item separately
        console.log('[WebSocket] Task history update:', message.data)
        if (message.data?.items && Array.isArray(message.data.items)) {
          // Emit each task update separately
          message.data.items.forEach((item: any) => {
            console.log('[WebSocket] Emitting task update:', item)
            ; (eventBus as any).emit(EVT_TASK_HISTORY_UPDATE, item)
          })
        } else {
          // Fallback: emit as-is if not in expected format
          ; (eventBus as any).emit(EVT_TASK_HISTORY_UPDATE, message.data)
        }
        break

      case EVT_QUEUE_UPDATE:
        ; (eventBus as any).emit(EVT_QUEUE_UPDATE, message.data)
        break

      case EVT_QUEUES_CLEARED:
        ; (eventBus as any).emit(EVT_QUEUES_CLEARED, message.data)
        ; (eventBus as any).emit(EVT_QUEUE_UPDATE, message.data)
        break

      default:
        console.debug('[WebSocket] Unknown message type:', message.type)
    }
  }

  const send = (data: any) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
      return true
    }
    return false
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    send,
    isConnected,
    isReconnecting
  }
}
