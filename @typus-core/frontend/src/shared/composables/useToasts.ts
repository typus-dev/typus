// src/shared/composables/useToasts.ts
import { ref } from 'vue'
import { defaultConfig } from '@/config/app'

type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

interface ToastOptions {
  duration?: number
  position?: ToastPosition
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
  options: ToastOptions
}

const toasts = ref<Toast[]>([])
let toastId = 0

export function useToasts() {
  const defaultOptions: ToastOptions = {
    duration: defaultConfig.systemMessages.settings.duration,
    position: defaultConfig.systemMessages.settings.position as ToastPosition
  }

  const remove = (id: number) => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  const success = (message: string, options?: ToastOptions) => {
    const id = toastId++
    const toast: Toast = {
      id,
      message,
      type: 'success',
      options: { ...defaultOptions, ...options }
    }
    toasts.value.push(toast)
    if (toast.options.duration) {
      setTimeout(() => remove(id), toast.options.duration)
    }
  }

  const error = (message: string, options?: ToastOptions) => {
    const id = toastId++
    const toast: Toast = {
      id,
      message,
      type: 'error',
      options: { ...defaultOptions, ...options }
    }
    toasts.value.push(toast)
    if (toast.options.duration) {
      setTimeout(() => remove(id), toast.options.duration)
    }
  }

  return {
    toasts,
    successToast: success,
    errorToast: error,
    removeToast: remove
  }
}
