// src/core/store/loggingStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LogLevel, LogMode } from '@/core/logging/types'
import { useApi } from '@/shared/composables/useApi'

// Global reference for logger to access without circular dependency
let globalStoreRef: any = null;

export const getGlobalLoggingStore = () => globalStoreRef;

export const useLoggingStore = defineStore('logging', () => {
  // Reactive config - NO DEFAULTS, only values from database
  // If database load fails, isLoaded stays false and logger uses config.ts defaults
  const logLevel = ref<LogLevel | null>(null)
  const logMode = ref<LogMode | null>(null)
  const apiLoggingEnabled = ref<boolean | null>(null)
  const batchSize = ref<number | null>(null)
  const flushInterval = ref<number | null>(null)
  const isLoaded = ref(false)

  const { get: fetchConfig } = useApi('/system/config')

  /**
   * Load logging configuration from database
   */
  const loadConfig = async (): Promise<void> => {
    try {
      const { data, error } = await fetchConfig({ category: 'logging' })

      if (error) {
        console.warn('[LoggingStore] Failed to load config from API, logger will use config.ts defaults:', error)
        // Don't set isLoaded = true, logger will use config.ts defaults
        return
      }

      if (!data?.configs) {
        console.warn('[LoggingStore] No configs returned from API, logger will use config.ts defaults')
        // Don't set isLoaded = true, logger will use config.ts defaults
        return
      }

      // Map database values to store
      const configs = data.configs as Array<{ key: string; value: string }>

      configs.forEach((config: { key: string; value: string }) => {
        switch (config.key) {
          case 'logging.frontend.level':
            logLevel.value = config.value as LogLevel
            break
          case 'logging.frontend.mode':
            logMode.value = config.value as LogMode
            break
          case 'logging.api_logging_enabled':
            apiLoggingEnabled.value = config.value === 'true' || config.value === true
            break
          case 'logging.frontend.batch_size':
            batchSize.value = parseInt(config.value, 10)
            break
          case 'logging.frontend.flush_interval':
            flushInterval.value = parseInt(config.value, 10)
            break
        }
      })

      // Only set isLoaded if we successfully loaded config
      isLoaded.value = true
    } catch (err) {
      console.error('[LoggingStore] Error loading config, logger will use config.ts defaults:', err)
      // Don't set isLoaded = true, logger will use config.ts defaults
    }
  }

  /**
   * Update config immediately (called after Settings UI save)
   */
  const updateConfig = (updates: {
    logLevel?: LogLevel
    logMode?: LogMode
    apiLoggingEnabled?: boolean
    batchSize?: number
    flushInterval?: number
  }): void => {
    if (updates.logLevel !== undefined) {
      logLevel.value = updates.logLevel
    }
    if (updates.logMode !== undefined) {
      logMode.value = updates.logMode
    }
    if (updates.apiLoggingEnabled !== undefined) {
      apiLoggingEnabled.value = updates.apiLoggingEnabled
    }
    if (updates.batchSize !== undefined) {
      batchSize.value = updates.batchSize
    }
    if (updates.flushInterval !== undefined) {
      flushInterval.value = updates.flushInterval
    }

    console.log('[LoggingStore] Config updated:', {
      logLevel: logLevel.value,
      logMode: logMode.value,
      apiLoggingEnabled: apiLoggingEnabled.value,
      batchSize: batchSize.value,
      flushInterval: flushInterval.value
    })
  }

  /**
   * Refresh config from database (reload after save)
   */
  const refreshConfig = async (): Promise<void> => {
    isLoaded.value = false
    await loadConfig()
  }

  // Set global reference for logger access
  const storeInstance = {
    logLevel,
    logMode,
    apiLoggingEnabled,
    batchSize,
    flushInterval,
    isLoaded,
    loadConfig,
    updateConfig,
    refreshConfig
  }

  globalStoreRef = storeInstance

  return storeInstance
})
