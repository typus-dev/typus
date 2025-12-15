/* @Tags: routing */ 
import '@styles/main.css'
import '@/styles/tailwind.css'
import '@/config/app'  
import { createApp } from 'vue' 
import { createPinia } from 'pinia' 
import router from '@core/router' 
import { eventBus } from '@core/events' 
import { pluginSystem } from '@core/plugins' 
import App from './App.vue' 
import { setupErrorHandler } from '@core/errors' 
import { pinia } from '@core/store' 
import '@core/middleware' 
import { createAbilityPlugin } from '@core/auth/ability'
import breakpointPlugin from '@core/plugins/breakpointPlugin'
import filePathCommentsPlugin from '@core/plugins/filePathCommentsPlugin'
import webAnalyticsPlugin from '@core/plugins/webAnalyticsPlugin'
import { initLayoutSystem } from '@core/layouts'
import {  initDslClient } from '@/dsl/client'
import { useDynamicConfig } from '@/shared/composables/useDynamicConfig'
import { useFaviconManager } from '@/shared/composables/useFaviconManager'
import { logger } from '@/core/logging/logger'

function registerCachedRoute() {
  if (window.__CACHED_ROUTE__) {
    window.__IS_CACHED_PAGE__ = true;
  } else {
    window.__IS_CACHED_PAGE__ = false;
  }
}

const app = createApp(App)

setupErrorHandler(app)
pluginSystem.install(app)
app.provide('eventBus', eventBus)
app.use(pinia)

registerCachedRoute()

// Initialize app with proper order: Pinia → LoggingStore → Router → Plugins
async function initialize() {
  // 1. Load logging configuration BEFORE router (with timeout to prevent blocking app startup)
  try {
    const { useLoggingStore } = await import('@/core/store/loggingStore')
    const loggingStore = useLoggingStore()

    // Race between config load and timeout (5 seconds)
    // If backend is slow/offline, we continue with defaults from config.ts
    const TIMEOUT_MS = 5000
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS))

    await Promise.race([
      loggingStore.loadConfig(),
      timeoutPromise
    ])

    // Check if config was actually loaded successfully
    // Note: Pinia auto-unwraps refs, so we read isLoaded directly (not .value)
    if (!loggingStore.isLoaded) {
      logger.warn('Using default logging config (database load failed or timed out)', {}, 'Initialize')
    }
  } catch (error) {
    logger.warn('Failed to load logging config, using config.ts defaults', { error }, 'Initialize')
  }

  // 1.5. Load public config from database
  try {
    const { useAppStore } = await import('@/core/store/appStore')
    const appStore = useAppStore()
    await appStore.loadPublicConfig()

    // Set global config for utility functions (like googleAuth.ts)
    // These utilities can't use composables, so we expose via window
    window.__GOOGLE_CLIENT_ID__ = appStore.getConfig('integrations.google_client_id')

    logger.info('Public config loaded from database', {}, 'Initialize')
  } catch (error) {
    logger.warn('Failed to load public config, using .env defaults', { error }, 'Initialize')
  }

  // 2. Setup router and plugins (after logging attempt)
  app.use(router)
  app.use(createAbilityPlugin())
  app.use(breakpointPlugin)
  app.use(filePathCommentsPlugin, {
    enabled: window.appConfig?.development?.filePathComments !== false
  })
  app.use(webAnalyticsPlugin, { router })

  // 2.5. Auto-load Vue plugins from plugins/ folder (after pinia/router ready)
  const pluginModules = import.meta.glob('../../../plugins/*/frontend/*.plugin.ts')
  for (const [path, loader] of Object.entries(pluginModules)) {
    try {
      const module = await (loader as () => Promise<{ default?: { install: (app: any) => void } }>)()
      if (module.default?.install) {
        app.use(module.default)
        console.debug(`[Plugins] Loaded: ${path}`)
      }
    } catch (e) {
      console.error(`[Plugins] Failed to load: ${path}`, e)
    }
  }

  // 3. Bootstrap rest of application
  await bootstrap()
}

async function bootstrap() {
  await initLayoutSystem()
  await router.isReady()
  await initDslClient()

  // Load dynamic configuration from backend (skip for cached pages)
  if (!window.__IS_CACHED_PAGE__) {
    const { fetchConfig, siteName } = useDynamicConfig()
    const { updateFavicons } = useFaviconManager()

    try {
      await fetchConfig()

      // Update HTML title and app config with dynamic site name
      if (siteName.value) {
        document.title = siteName.value

        // Update window.appConfig to use dynamic site name
        if (window.appConfig) {
          window.appConfig.name = siteName.value
          if (window.appConfig.logo) {
            window.appConfig.logo.shortName = siteName.value
          }
        }
      }

      // Update favicons dynamically
      updateFavicons()
    } catch (error) {
      logger.warn('Failed to load dynamic config, using defaults', { error }, 'Bootstrap')
    }
  }

  // Register cached route and save original content
  if (window.__CACHED_ROUTE__) {
    window.__IS_CACHED_PAGE__ = true;
    // Content is inside #cache-snapshot > main
    const cacheSnapshot = document.querySelector('#cache-snapshot');
    const mainElement = cacheSnapshot?.querySelector('main');
    if (mainElement) {
      window.__ORIGINAL_MAIN_CONTENT__ = mainElement.innerHTML;
    }
  } else {
    window.__IS_CACHED_PAGE__ = false;
  }

  if (!app._instance) {
    // Mount Vue app (no hydration - we use overlay approach)
    app.mount('#app');

    // Wait for Vue to fully render AND all resources to load
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        // Wait for window.load (all images, fonts, CSS loaded)
        if (document.readyState === 'complete') {
          // Already loaded
          requestAnimationFrame(() => {
            document.body.classList.add('vue-ready');
          });
        } else {
          // Wait for load event
          window.addEventListener('load', () => {
            requestAnimationFrame(() => {
              document.body.classList.add('vue-ready');
              logger.debug('Vue + resources ready, switching from cache', {}, 'Bootstrap');
            });
          }, { once: true });
        }
      });
    });
  }
}

// Start application initialization
initialize().catch(error => {
  logger.error('Failed to initialize application', { error }, 'Initialize')
})
