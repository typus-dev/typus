// useModals.ts - Updated
import { ref, markRaw, Component } from 'vue'

interface ModalOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  variant?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  component?: Component
  props?: Record<string, any>
  type?: string // Added type for modal styling
}

interface Modal {
  id: number
  message: string
  type: 'error' | 'success' | 'confirm' | 'custom' | 'view'
  options: ModalOptions
  resolve?: (value: boolean) => void
}

const modals = ref<Modal[]>([])
let modalId = 0

export function useModals() {
  const defaultOptions: ModalOptions = {
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    title: '',
    variant: 'primary',
    maxWidth: 'md'
  }

  const remove = (id: number) => {
    modals.value = modals.value.filter(modal => modal.id !== id)
  }

  const success = (message: string, options?: ModalOptions) => {
    if (!options?.title) {
      options = { ...options, title: 'Success' }
    }
    const id = modalId++
    modals.value.push({
      id,
      message,
      type: 'success',
      options: { ...defaultOptions, ...options }
    })
  }

  const error = (message: string, options?: ModalOptions) => {
    if (!options?.title) {
      options = { ...options, title: 'Error' }
    }
    const id = modalId++
    modals.value.push({
      id,
      message,
      type: 'error',
      options: { ...defaultOptions, ...options }
    })
  }

  const confirm = (message: string, options?: ModalOptions): Promise<boolean> => {
    if (!options?.title) {
      options = { ...options, title: 'Are you sure?' }
    }
    return new Promise((resolve) => {
      const id = modalId++
      modals.value.push({
        id,
        message,
        type: 'confirm',
        options: { ...defaultOptions, ...options },
        resolve
      })
    })
  }

  const custom = (component: Component, props?: Record<string, any>, options?: ModalOptions): Promise<boolean> => {
    if (!options?.title) {
      options = { ...options, title: 'Custom' }
    }

    return new Promise((resolve) => {
      const id = modalId++
      modals.value.push({
        id,
        message: '',
        type: 'custom',
        options: {
          ...defaultOptions,
          ...options,
          component: markRaw(component),
          props
        },
        resolve
      })
    })
  }

  const view = (component: Component, props?: Record<string, any>, options?: ModalOptions): void => {
    if (!options?.title) {
      options = { ...options, title: '' }
    }

    const id = modalId++
    modals.value.push({
      id,
      message: '',
      type: 'view',
      options: {
        ...defaultOptions,
        ...options,
        component: markRaw(component),
        props
      }
    })
  }

  return {
    modals,
    successModal: success,
    errorModal: error,
    confirmModal: confirm,
    customModal: custom,
    viewModal: view,
    remove
  }
}
