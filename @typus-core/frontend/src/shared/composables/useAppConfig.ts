import type { AppConfig } from '@/config/app.types'

export function useAppConfig(): AppConfig {
    return window.appConfig
}