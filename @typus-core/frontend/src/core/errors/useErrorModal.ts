import { ref } from 'vue'
import type { ErrorUIEvent } from '@/core/events/errorBus'
import { errorHandler } from '@/core/errors/handler'
import type { RecoveryActionId } from '@/core/errors/config'

/**
 * Modal state and API for error modals.
 */
const isOpen = ref(false)
const modalData = ref<ErrorUIEvent | null>(null)

export function useErrorModal() {
  function showErrorModal(event: ErrorUIEvent) {
    modalData.value = event
    isOpen.value = true
  }
  function closeErrorModal() {
    isOpen.value = false
    modalData.value = null
  }
  // Handle recovery action
  function handleAction(actionId: RecoveryActionId) {
    errorHandler.executeRecoveryAction(actionId)
    closeErrorModal()
  }
  return {
    isOpen,
    modalData,
    showErrorModal,
    closeErrorModal,
    handleAction
  }
}
