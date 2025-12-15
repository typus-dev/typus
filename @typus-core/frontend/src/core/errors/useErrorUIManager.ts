import { onMounted, onUnmounted } from 'vue'
import { errorBus, type ErrorUIEvent } from '@/core/events/errorBus'
import { useRouter } from 'vue-router'
import { errorHandler } from './handler'

// Import your modal and toast composables here
import { useToasts } from '@/shared/composables/useToasts'
import { useAuthStore } from '@/core/store/authStore'
import { useErrorModal } from '@/core/errors/useErrorModal'

/**
 * Global error UI manager.
 * Subscribes to errorBus and routes error events to UI.
 * Call this once in App.vue or main.ts.
 */
export function useErrorUIManager() {
  const router = useRouter()
  const toasts = useToasts()
  const authStore = useAuthStore()
  const { showErrorModal } = useErrorModal()

  function handleErrorEvent(event: ErrorUIEvent) {
    switch (event.displayMode) {
      case 'modal':
        showErrorModal(event)
        break
      case 'toast':
        toasts.errorToast(event.message)
        break
      case 'fullscreen':
        // Push to error page, pass error via state
        // Push to 404 error page, pass error via state
        router.push({ name: '404', state: { error: event } })
        break
      case 'none':
      default:
        // Do nothing, already logged
        break
    }
  }

  function handleClearSession() {
    authStore.clear()
  }

  onMounted(() => {
    errorBus.on('error:show', handleErrorEvent)
    errorBus.on('recovery:clearSession', handleClearSession)
  })

  onUnmounted(() => {
    errorBus.off('error:show', handleErrorEvent)
    errorBus.off('recovery:clearSession', handleClearSession)
  })
}
