/**
 * useDynamicConfig - Dynamic application configuration from backend
 *
 * Provides reactive access to system configuration like site.name, site.tagline, etc.
 * Values are fetched from backend via DSL (ConfigPublic model - no auth required).
 */

import { ref, computed } from 'vue'
import { DSL } from '@/dsl/client'
import { logger } from '@/core/logging/logger'
import themesManifest from '@/auto-themes.json'

interface DynamicConfig {
  'site.name': string
  'site.tagline': string
  'site.description': string
  'site.language': string
  'site.timezone': string
  'site.logo_url': string
  'site.favicon_url': string
  'site.maintenance_mode': boolean
  'features.registration_enabled': boolean
  'features.email_verification_required': boolean
  'features.comments_enabled': boolean
  'ui.theme': string
}

const config = ref<Partial<DynamicConfig>>({})
const loading = ref(false)
const error = ref<string | null>(null)

let fetchPromise: Promise<void> | null = null

export function useDynamicConfig() {
  /**
   * Fetch configuration from backend via DSL
   */
  const fetchConfig = async (): Promise<void> => {
    // Prevent multiple simultaneous fetches
    if (fetchPromise) {
      return fetchPromise
    }

    loading.value = true
    error.value = null

    fetchPromise = (async () => {
      try {
        logger.debug('[useDynamicConfig] Fetching public configuration via DSL')

        // Read from ConfigPublic (no auth required)
        const publicConfigs = await DSL.ConfigPublic.findMany()

        logger.debug('[useDynamicConfig] Loaded public configs:', publicConfigs.length)

        // Transform array to object { key: value }
        const configObject: Record<string, any> = {}
        for (const item of publicConfigs) {
          configObject[item.key] = item.value
        }

        config.value = configObject as Partial<DynamicConfig>
        logger.debug('[useDynamicConfig] Configuration loaded:', config.value)
      } catch (err: any) {
        error.value = err.message || 'Failed to load configuration'
        logger.error('[useDynamicConfig] Error fetching configuration:', err)
      } finally {
        loading.value = false
        fetchPromise = null
      }
    })()

    return fetchPromise
  }

  /**
   * Get config value with fallback
   */
  const get = <K extends keyof DynamicConfig>(
    key: K,
    fallback?: DynamicConfig[K]
  ): DynamicConfig[K] | undefined => {
    return (config.value[key] as DynamicConfig[K]) ?? fallback
  }

  /**
   * Computed site name
   */
  const siteName = computed(() => get('site.name'))

  /**
   * Computed site tagline
   */
  const siteTagline = computed(() => get('site.tagline', ''))

  /**
   * Computed site description
   */
  const siteDescription = computed(() => get('site.description', ''))

  /**
   * Check if in maintenance mode
   */
  const isMaintenanceMode = computed(() => get('site.maintenance_mode', false))

  /**
   * Check if registration is enabled
   */
  const isRegistrationEnabled = computed(() => get('features.registration_enabled', true))

  /**
   * Get UI theme
   */
  const defaultTheme = themesManifest[0]?.name || 'default'
  const uiTheme = computed(() => get('ui.theme', defaultTheme))

  /**
   * Site logo URL
   */
  const siteLogoUrl = computed(() => get('site.logo_url', '/assets/logo.png'))

  /**
   * Site favicon URL (main)
   */
  const siteFaviconUrl = computed(() => get('site.favicon_url', '/favicon/favicon.svg'))

  /**
   * Site favicon URL for Apple devices (computed from main URL using convention)
   * Convention: /storage/{guid}.png → /storage/{guid}-apple.png
   */
  const siteFaviconAppleUrl = computed(() => {
    const mainUrl = siteFaviconUrl.value
    if (!mainUrl) return '/favicon/apple-touch-icon.png'

    // If it's a storage URL, compute apple variant using convention
    if (mainUrl.startsWith('/storage/')) {
      // Replace extension with -apple.png (works for both .png and no extension)
      return mainUrl.replace(/(\.\w+)?$/, '-apple.png')
    }

    // Fallback to default apple-touch-icon
    return '/favicon/apple-touch-icon.png'
  })

  return {
    // State
    config,
    loading,
    error,

    // Actions
    fetchConfig,
    get,

    // Computed helpers
    siteName,
    siteTagline,
    siteDescription,
    siteLogoUrl,
    siteFaviconUrl,
    siteFaviconAppleUrl,
    isMaintenanceMode,
    isRegistrationEnabled,
    uiTheme
  }
}
