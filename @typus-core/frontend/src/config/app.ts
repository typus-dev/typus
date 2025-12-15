// src/config/app.ts
import type { AppConfig } from './app.types'

// Get initial config from cached page metadata if available
function getInitialConfigFromCache(): Partial<AppConfig> {
    if (typeof window !== 'undefined' && (window as any).__CACHED_ROUTE__?.meta?.configPublic) {
        const config = (window as any).__CACHED_ROUTE__.meta.configPublic;
        const siteName = config.site?.name || 'Loading...';
        return {
            name: siteName,
            logo: {
                icon: '/favicon/favicon.svg',
                size: 'xl',
                shortName: siteName
            }
        };
    }
    // For non-cached pages, use loading placeholder
    return {
        name: 'Loading...',
        logo: {
            icon: '/favicon/favicon.svg',
            size: 'xl',
            shortName: 'Loading...'
        }
    };
}

const initialConfig = getInitialConfigFromCache();

export const defaultConfig: AppConfig = {
    name: initialConfig.name || 'Loading...',
    logo: {
        icon: initialConfig.logo?.icon || '/favicon/favicon.svg',
        size: initialConfig.logo?.size || 'xl',
        shortName: initialConfig.logo?.shortName || 'Loading...'
    },
    systemMessages: {
        type: 'toasts',
        settings: {
            duration: 3000,
            position: 'bottom-right'
        }
    },
    auth: {
        google: {
            enabled: true
        },
        registration: {
            enabled: true,
            url: '/register',
            type: import.meta.env.VITE_REGISTRATION_TYPE || 'regular'
        },
        forgotPassword: {
            enabled: true,
            url: '/forgot-password'
        }
    },
    development: {
        filePathComments: true // Set to false to disable file path comments
    }
}

// Initializing the appConfig with defaultConfig
if (typeof window !== 'undefined') {
  window.appConfig = defaultConfig
}
