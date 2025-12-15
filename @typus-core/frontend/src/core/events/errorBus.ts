import mitt from 'mitt'

export type ErrorUIEvent = {
  displayMode: string
  message: string
  details?: Record<string, any> // Changed to Record<string, any> for testing
  actions: string[]
  severity: string
}

export const errorBus = mitt<{
  'error:show': ErrorUIEvent
  'recovery:clearSession': undefined
}>()
