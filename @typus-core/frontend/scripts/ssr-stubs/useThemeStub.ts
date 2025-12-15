import { ref, computed } from 'vue'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load themes dynamically from auto-themes.json
function loadThemes() {
  const themesPath = path.resolve(__dirname, '../../src/auto-themes.json')

  if (!fs.existsSync(themesPath)) {
    console.warn('[useThemeStub] auto-themes.json not found, using empty array')
    return []
  }

  try {
    const themesData = JSON.parse(fs.readFileSync(themesPath, 'utf-8'))
    return themesData.themes || []
  } catch (error) {
    console.warn('[useThemeStub] Failed to load auto-themes.json:', error)
    return []
  }
}

const themeOptions = loadThemes()
const currentTheme = ref(themeOptions[0]?.name || 'default')

export function useTheme() {
  const setTheme = (themeName: string) => {
    if (themeOptions.some(theme => theme.name === themeName)) {
      currentTheme.value = themeName
    }
  }

  const getThemeIcon = (themeName: string) => {
    return themeOptions.find(theme => theme.name === themeName)?.icon || 'ri:palette-line'
  }

  const getThemeTitle = (themeName: string) => {
    return themeOptions.find(theme => theme.name === themeName)?.title || themeName
  }

  return {
    currentTheme,
    setTheme,
    isDebugMode: false,
    availableThemes: computed(() => themeOptions),
    getThemeIcon,
    getThemeTitle
  }
}
