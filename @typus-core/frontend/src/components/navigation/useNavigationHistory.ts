import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export interface HistoryEntry {
  path: string
  title: string
  icon?: string
  timestamp: number
}

const STORAGE_KEY = 'typus_nav_history'
const MAX_ENTRIES = 5

// Shared state across all instances
const history = ref<HistoryEntry[]>([])

// Load from localStorage
function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save to localStorage
function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or disabled
  }
}

// Initialize on first import
if (history.value.length === 0) {
  history.value = loadHistory()
}

export function useNavigationHistory() {
  const router = useRouter()
  const route = useRoute()

  // Add current page to history
  function addToHistory(entry: Omit<HistoryEntry, 'timestamp'>) {
    // Skip if same as most recent
    if (history.value.length > 0 && history.value[0].path === entry.path) {
      return
    }

    // Remove if already exists (will re-add at top)
    const filtered = history.value.filter(h => h.path !== entry.path)

    // Add to front
    const newEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now()
    }

    history.value = [newEntry, ...filtered].slice(0, MAX_ENTRIES)
    saveHistory(history.value)
  }

  // Format route name: "cms-dashboard" → "CMS Dashboard"
  function formatRouteName(name: string): string {
    return name
      .split('-')
      .map(word => {
        // Keep common abbreviations uppercase
        if (['cms', 'crm', 'api', 'dsx', 'ui', 'id'].includes(word.toLowerCase())) {
          return word.toUpperCase()
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  // Get title from route - priority: meta.title > name > meta.subject > path
  function getRouteTitle(r: typeof route): string {
    // 1. Explicit title in meta
    if (r.meta?.title) return r.meta.title as string

    // 2. Route name (best for most cases)
    if (r.name) return formatRouteName(String(r.name))

    // 3. Subject as fallback
    if (r.meta?.subject) {
      return formatRouteName(String(r.meta.subject))
    }

    // 4. Path as last resort
    return r.path
  }

  // Get icon from route meta
  function getRouteIcon(r: typeof route): string | undefined {
    return r.meta?.icon as string | undefined
  }

  // Track route changes
  function startTracking() {
    // Add initial route
    if (route.path && route.path !== '/') {
      addToHistory({
        path: route.path,
        title: getRouteTitle(route),
        icon: getRouteIcon(route)
      })
    }

    // Watch for route changes
    watch(
      () => route.path,
      (newPath) => {
        if (newPath && newPath !== '/') {
          addToHistory({
            path: newPath,
            title: getRouteTitle(route),
            icon: getRouteIcon(route)
          })
        }
      }
    )
  }

  // Clear history
  function clearHistory() {
    history.value = []
    saveHistory([])
  }

  // Get history excluding current page
  function getRecentPages(excludeCurrent = true) {
    if (excludeCurrent) {
      return history.value.filter(h => h.path !== route.path)
    }
    return history.value
  }

  return {
    history,
    addToHistory,
    startTracking,
    clearHistory,
    getRecentPages
  }
}
