import { createPinia } from 'pinia'
export { useAppStore } from '@/core/store/appStore'
export { usePersistStore } from '@/core/store/persistStore'
export { useAuthStore } from '@/core/store/authStore'

export const pinia = createPinia()
