// src/core/store/appStore.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { usePersistStore } from "@/core/store/persistStore"


export const useAppStore = defineStore('app', () => {
  const store = usePersistStore()

  // Public config from database (loaded from /api/system/config)
  const publicConfig = ref<Record<string, any>>({})
  const configLoaded = ref(false)

  // Load public config from API
  const loadPublicConfig = async () => {
    try {
      const response = await fetch('/api/system/config')
      if (response.ok) {
        const data = await response.json()
        publicConfig.value = data
        configLoaded.value = true
      }
    } catch (error) {
      console.error('[AppStore] Failed to load public config:', error)
    }
  }

  // Get config value with fallback
  const getConfig = (key: string, fallback: any = null) => {
    return publicConfig.value[key] ?? fallback
  }

  const version = computed({
    get: () => getConfig('site.app_version', import.meta.env.VITE_APP_VERSION || '1.0.0'),
    set: (val) => store.set('app_version', val)
  })
  
  const loading = computed({
    get: () => store.get('app_loading', false),
    set: (val) => store.set('app_loading', val)
  })

  const credentials = computed({
    get: () => store.get('app_credentials', { remember: false, email: '', password: '' }),
    set: (val) => store.set('app_credentials', val)
  })

  const setLoading = (status: boolean) => {
    loading.value = status
  }

  const saveUserCredentials = (email: string, password: string) => {
    credentials.value = {
      remember: true,
      email,
      password
    }
  }

  const clearUserCredentials = () => {
    credentials.value = {
      remember: false,
      email: '',
      password: ''
    }
  }


  return {
    version,
    loading,
    credentials,
    publicConfig,
    configLoaded,
    loadPublicConfig,
    getConfig,
    setLoading,
    saveUserCredentials,
    clearUserCredentials
  }
})
