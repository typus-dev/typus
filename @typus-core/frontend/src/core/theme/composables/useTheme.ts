import { ref, computed, watch } from 'vue'
import { useDynamicConfig } from '@/shared/composables/useDynamicConfig'
import themesManifest from '@/auto-themes.json'

const isDebugMode = import.meta.env.DEV

type ThemeManifestEntry = (typeof themesManifest)[number]
type ThemeNames = ThemeManifestEntry['name']
const THEME_KEY = 'app-theme'

const themeEntries: ThemeManifestEntry[] = themesManifest

if (!themeEntries.length) {
  throw new Error('[useTheme] No theme manifest entries found. Ensure src/auto-themes.json is generated (run: npm run build:themes)')
}

const findFallbackTheme = (): ThemeNames => {
  if (typeof document !== 'undefined') {
    const domTheme = document.documentElement.getAttribute('data-theme') as ThemeNames | null
    if (domTheme && themeEntries.some(entry => entry.name === domTheme)) {
      return domTheme
    }
  }

  // Use theme with default: true, or first available theme
  const defaultTheme = themeEntries.find(entry => (entry as any).default === true)
  return defaultTheme?.name || themeEntries[0]?.name || 'default'
}

const fallbackThemeName: ThemeNames = findFallbackTheme()
const themeMap = new Map<ThemeNames, ThemeManifestEntry>(
  themeEntries.map(entry => [entry.name, entry])
)

// Function to get theme with proper priority order
async function getInitialTheme(): Promise<ThemeNames> {
  // 🎯 PRIORITY 1: Check window.__ACTIVE_THEME__ (set by backend in HTML)
  if (typeof window !== 'undefined' && (window as any).__ACTIVE_THEME__) {
    const backendTheme = (window as any).__ACTIVE_THEME__ as ThemeNames
    logger.info('[useTheme] Using theme from backend (window.__ACTIVE_THEME__)', { theme: backendTheme })

    // Dynamically register theme if not in manifest
    if (!themeMap.has(backendTheme)) {
      logger.warn('[useTheme] Backend theme not in manifest, registering dynamically', { theme: backendTheme })
      themeMap.set(backendTheme, {
        name: backendTheme,
        title: backendTheme.replace(/-/g, ' '),
        icon: 'ri:brush-line',
        type: 'dark'
      } as ThemeManifestEntry)
    }

    return backendTheme
  }

  // 2. Check localStorage (user preference)
  const storedTheme = localStorage.getItem(THEME_KEY) as ThemeNames
  if (storedTheme && themeMap.has(storedTheme)) {
    return storedTheme
  }

  // 3. Check database config (skip for cached pages)
  if (!window.__IS_CACHED_PAGE__) {
    try {
      const { fetchConfig, uiTheme } = useDynamicConfig()
      await fetchConfig()
      const dbTheme = uiTheme.value as ThemeNames
      if (dbTheme && themeMap.has(dbTheme)) {
        return dbTheme
      }
    } catch (error) {
      logger.warn('[useTheme] Failed to load theme from config, using fallback', error)
    }
  }

  // 4. Finally use fallback
  return fallbackThemeName
}

const currentThemeName = ref<ThemeNames>(fallbackThemeName)

// Initialize theme asynchronously
getInitialTheme().then(themeName => {
  currentThemeName.value = themeName
})

export function useTheme() {
  if (isDebugMode) {
    setTimeout(() => {
      logger.debug('[useTheme] Theme manifest loaded:', themeEntries.map(entry => entry.name))
    }, 0)
  }

  watch(currentThemeName, (newName) => {
    localStorage.setItem(THEME_KEY, newName)
    document.documentElement.setAttribute('data-theme', newName)
    document.documentElement.setAttribute('data-reference-theme', newName)

    if (isDebugMode) {
      console.group('[THEME-DEBUG] Theme activated: ' + newName)
      console.log('[THEME-DEBUG] data-theme:', document.documentElement.getAttribute('data-theme'))

      setTimeout(() => {
        const root = document.documentElement
        const computed = getComputedStyle(root)

        console.log('[THEME-DEBUG] --glass-blur:', computed.getPropertyValue('--glass-blur'))
        console.log('[THEME-DEBUG] --glass-apply-to-cards:', computed.getPropertyValue('--glass-apply-to-cards'))
        console.log('[THEME-DEBUG] --glass-card-overlay:', computed.getPropertyValue('--glass-card-overlay'))
        console.log('[THEME-DEBUG] --card-backdrop:', computed.getPropertyValue('--card-backdrop'))

        const card = document.querySelector('.theme-components-card-base')
        if (card) {
          const cardComputed = getComputedStyle(card)
          console.log('[THEME-DEBUG] Card backdrop-filter:', cardComputed.backdropFilter)
          console.log('[THEME-DEBUG] Card background:', cardComputed.background?.substring(0, 100))
        } else {
          console.log('[THEME-DEBUG] No .theme-components-card-base found yet')
        }

        console.groupEnd()
      }, 100)
    }
  }, { immediate: true })

  const setTheme = (name: ThemeNames | string) => {
    if (themeMap.has(name as ThemeNames)) {
      currentThemeName.value = name as ThemeNames
    } else {
      // 🎯 Accept dynamic themes not in manifest (e.g., custom themes)
      logger.warn(`⚠️ [Theme] Theme "${name}" not in manifest, registering dynamically`)

      // Dynamically add to themeMap
      themeMap.set(name as ThemeNames, {
        name: name as ThemeNames,
        title: name.replace(/-/g, ' '),
        icon: 'ri:brush-line',
        type: 'dark'
      } as ThemeManifestEntry)

      currentThemeName.value = name as ThemeNames
    }
  }

  const getThemeIcon = (name: ThemeNames): string => {
    return themeMap.get(name)?.icon || 'ri:palette-line'
  }

  const getThemeTitle = (name: ThemeNames): string => {
    const entry = themeMap.get(name)
    return entry?.title || name.charAt(0).toUpperCase() + name.slice(1)
  }

  const availableThemes = computed(() => themeEntries)

  return {
    currentTheme: currentThemeName,
    setTheme,
    isDebugMode,
    availableThemes,

    getThemeIcon,
    getThemeTitle,
  }
}
