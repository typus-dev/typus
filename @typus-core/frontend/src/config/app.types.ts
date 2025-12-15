export interface ModuleConfig {
    path: string
    published: boolean
    routePath?: string
}

export interface AppConfig {
    name: string
    logo: {
        icon: string | null | undefined
        size: string
        shortName?: string
    }
    systemMessages: {
        type: 'modals' | 'toasts'
        settings: {
            duration?: number
            position?: string
        }
    },
    auth: {
        google: {
            enabled: boolean
        }
        registration: {
            enabled: boolean
            url: string
            type: string
        }
        forgotPassword: {
            enabled: boolean
            url: string
        }
    },
    development?: {
        filePathComments?: boolean
    },
    modules?: Record<string, ModuleConfig>
}

declare global {
    interface Window {
        appConfig: AppConfig
    }
}
