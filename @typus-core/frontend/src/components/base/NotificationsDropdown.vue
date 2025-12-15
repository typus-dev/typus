<!-- src/core/components/NotificationsDropdown.vue -->
<template>
  <div class="relative">
    <dxButton
      variant="ghost"
      size="md"
      shape="circle"
      icon-only
      @click="toggleDropdown"
      aria-label="Notifications"
    >
      <div class="relative">
        <dxIcon name="ri:notification-line" />
        <div
          v-if="unreadCount > 0"
          :class="[
            'absolute -top-2 -right-2 w-4 h-4 rounded-full text-xs flex items-center justify-center',
            'theme-colors-background-error',
            'theme-colors-text-contrast'
          ]"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </div>
      </div>
    </dxButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        :class="[
          'absolute right-0 mt-2 max-h-96 overflow-y-auto overflow-x-hidden z-50 custom-scrollbar shadow-md border',
          'theme-colors-background-secondary',
          'theme-colors-border-primary',
          'theme-layout-radius',
          'w-96'
        ]"
      >
        <div :class="['p-2 border-b', 'theme-colors-border-primary']">
          <div class="flex justify-between items-center">
            <h4 :class="['font-small', 'theme-colors-text-primary']">Notifications</h4>
            <dxButton
              variant="ghost"
              size="sm"
              @click="markAllAsRead"
              :disabled="unreadCount === 0"
            >
              Read all
            </dxButton>
          </div>
        </div>

        <div :class="['divide-y', 'theme-colors-border-secondary']">
          <div
            v-for="(notification, index) in notifications"
            :key="notification.id || index"
            :class="[
              'p-3',
              'theme-mixins-interactive',
              !notification.read ? ('theme-colors-background-tertiary' || 'bg-neutral-700') : ''
            ]"
            @click="markAsRead(index)"
          >
            <div class="flex items-start gap-3">
              <div
                :class="[
                  'p-1.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  getEventTypeStyle(notification.event).bgColorClass
                ]"
              >
                <dxIcon
                  :name="getEventTypeStyle(notification.event).icon"
                  :class="getEventTypeStyle(notification.event).iconColorClass"
                  size="sm"
                />
              </div>

              <div class="flex-1 min-w-0">
                <div :class="['font-medium text-sm', 'theme-colors-text-primary']">
                  {{ notification.data?.title || getEventTypeStyle(notification.event).title }}
                </div>

                <div
                  v-if="formattedContent(notification.data)"
                  :class="['text-xs mt-1 break-words', 'theme-colors-text-secondary']"
                >
                  {{ formattedContent(notification.data) }}
                </div>

                <div :class="['text-xs mt-1', 'theme-colors-text-tertiary']">
                  {{ formatTime(notification.timestamp) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="notifications.length === 0"
            :class="['p-4 text-center text-sm', 'theme-colors-text-secondary']"
          >
            No notifications yet
          </div>
        </div>
      </div>
    </transition>

    <div v-if="isOpen" class="fixed inset-0 z-40" @click="closeDropdown" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { eventBus } from '@/core/events'
import { useWebSocket } from '@/composables/useWebSocket'
import { useApi } from '@/shared/composables/useApi'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { connect, disconnect, isConnected } = useWebSocket()
const notificationsApi = useApi('notifications')

interface Notification {
  id: string
  event: string
  data: any
  timestamp: Date
  read: boolean
}

const isOpen = ref(false)
const notifications = ref<Notification[]>([])

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const markAllAsRead = async () => {
  // Mark all unread notifications as read
  const unreadNotifications = notifications.value.filter(n => !n.read)

  // Update UI immediately
  unreadNotifications.forEach(n => n.read = true)

  // Sync with backend for each notification
  for (const notification of unreadNotifications) {
    try {
      const markAsReadApi = useApi(`notifications/${notification.id}/read`)
      await markAsReadApi.put()
    } catch (error) {
      console.error('[NotificationsDropdown] Failed to mark notification as read', { id: notification.id, error })
    }
  }

  console.debug('[NotificationsDropdown] Marked all notifications as read', { count: unreadNotifications.length })
}

const markAsRead = async (index: number) => {
  if (index >= 0 && index < notifications.value.length) {
    const notification = notifications.value[index]

    // Update UI immediately for better UX
    notification.read = true

    // Sync with backend
    try {
      const markAsReadApi = useApi(`notifications/${notification.id}/read`)
      await markAsReadApi.put()
      console.debug('[NotificationsDropdown] Marked notification as read in database', { id: notification.id })
    } catch (error) {
      console.error('[NotificationsDropdown] Failed to mark notification as read', error)
      // Don't revert UI state - user can still see it as read locally
    }
  }
}

const loadNotifications = async () => {
  try {
    const response = await notificationsApi.get()
    if (response.data && Array.isArray(response.data)) {
      // Convert DB notifications to frontend format
      const dbNotifications = response.data.map((n: any) => ({
        id: String(n.id),
        event: n.type,
        data: n.metadata || {},
        timestamp: new Date(n.createdAt),
        read: n.status === 'read'
      }))
      notifications.value = dbNotifications
      console.debug('[NotificationsDropdown] Loaded notifications from database', { count: dbNotifications.length })
    }
  } catch (error) {
    console.error('[NotificationsDropdown] Failed to load notifications from database', error)
    // Continue with empty notifications array - real-time notifications will still work
  }
}

const addNotification = (event: string, data: any) => {
  // Handle real-time notifications from WebSocket
  if (event === 'notification:realtime' && data) {
    const notificationId = String(data.id) || `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Deduplicate: check if notification with this ID already exists
    const exists = notifications.value.some(n => n.id === notificationId)
    if (exists) {
      console.debug('[NotificationsDropdown] Ignoring duplicate notification', { id: notificationId })
      return
    }

    notifications.value.unshift({
      id: notificationId,
      event: data.type || 'notification',
      data: data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      read: false
    })
  } else {
    // Handle other event bus notifications
    notifications.value.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      event,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      timestamp: new Date(),
      read: false
    })
  }
}

const formatTime = (date: Date) => {
  return dayjs(date).fromNow()
}

const formattedContent = (data: any) => {
  if (!data) return ''
  if (typeof data.message === 'string')
    return data.message.length > 100 ? data.message.substring(0, 97) + '...' : data.message
  if (typeof data.title === 'string') return data.title
  if (typeof data === 'string') return data.length > 100 ? data.substring(0, 97) + '...' : data
  const stringified = JSON.stringify(data)
  return stringified.length > 100 ? stringified.substring(0, 97) + '...' : stringified
}

const getEventTypeStyle = (event: string) => {
  const defaultStyle = {
    icon: 'ri:notification-3-line',
    title: event || 'Notification',
    bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
    iconColorClass: 'theme-colors-text-secondary' || 'text-neutral-300'
  }

  const styles = {
    success: {
      icon: 'ri:checkbox-circle-line',
      title: 'Task Completed',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-success' || 'theme-colors-text-success'
    },
    info: {
      icon: 'ri:information-line',
      title: 'Information',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-info' || 'text-sky-400'
    },
    internal: {
      icon: 'ri:settings-4-line',
      title: 'System Task',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-info' || 'text-sky-400'
    },
    notification: {
      icon: 'ri:notification-3-line',
      title: 'Notification',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-secondary' || 'text-neutral-300'
    },
    'auth:login': {
      icon: 'ri:user-shared-line',
      title: 'User Login',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-success' || 'theme-colors-text-success'
    },
    'auth:logout': {
      icon: 'ri:logout-box-r-line',
      title: 'User Logout',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-warning'
    },
    error: {
      icon: 'ri:error-warning-line',
      title: 'Error Occurred',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-error' || 'theme-colors-text-error'
    },
    warning: {
      icon: 'ri:alert-line',
      title: 'Warning',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-warning'
    },
    'modal:open': {
      icon: 'ri:window-line',
      title: 'Modal Action',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-info' || 'text-sky-400'
    },
    'notification:show': {
      icon: 'ri:information-line',
      title: 'System Notification',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-info' || 'text-sky-400'
    },
    task_queued: {
      icon: 'ri:time-line',
      title: 'Task Queued',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-info' || 'text-sky-400'
    },
    task_completed: {
      icon: 'ri:checkbox-circle-line',
      title: 'Task Completed',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-success' || 'theme-colors-text-success'
    },
    task_failed: {
      icon: 'ri:error-warning-line',
      title: 'Task Failed',
      bgColorClass: 'theme-colors-background-tertiary' || 'bg-neutral-700',
      iconColorClass: 'theme-colors-text-error' || 'theme-colors-text-error'
    }
  }

  return styles[event as keyof typeof styles] || defaultStyle
}

onMounted(async () => {
  // Load existing notifications from database
  await loadNotifications()

  // Connect to WebSocket for real-time notifications
  connect()

  const subscriptions = [
    eventBus.on('auth:login', data => addNotification('auth:login', data)),
    eventBus.on('auth:logout', () => addNotification('auth:logout', null)),
    eventBus.on('error', data => addNotification('error', data)),
    eventBus.on('warning', data => addNotification('warning', data)),
    eventBus.on('modal:open', data => addNotification('modal:open', data)),
    eventBus.on('notification:show', data => addNotification('notification:show', data)),
    // Handle real-time notifications from WebSocket
    (eventBus as any).on('notification:realtime', (data: any) => {
      addNotification('notification:realtime', data)
    })
  ]

  onUnmounted(() => {
    subscriptions.forEach(unsubscribe => unsubscribe())
    disconnect()
  })
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(107, 114, 128, 0.4);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.6);
}
</style>
