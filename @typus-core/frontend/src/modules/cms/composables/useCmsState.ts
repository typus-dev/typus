/* @Tags: Composable, CMS, State Management */
import { reactive, computed } from 'vue'
import { useStore } from '@/shared/composables/useStore'
import { logger } from '@/core/logging/logger'

// 👇 Singleton instance for module-wide shared state
let _cmsState: ReturnType<typeof createCmsState> | null = null

function createCmsState() {
  const store = useStore()

  // Initialize store defaults if not present
  const initStoreDefaults = () => {
    if (!store.get('cms.dashboard.filters')) {
      store.set('cms.dashboard.filters', {
        status: 'all',
        category: 'all',
        sortBy: '-updatedAt'
      })
    }
    if (!store.get('cms.dashboard.view')) {
      store.set('cms.dashboard.view', {
        currentPage: 1,
        limit: 20
      })
    }
  }

  // Reactive state (shared across all composable instances)
  const state = reactive({
    // Content data
    contents: [] as any[],
    categories: [] as Array<{ id: number; name: string; slug: string }>,
    statusCounts: {
      all: 0,
      published: 0,
      draft: 0,
      scheduled: 0
    },
    // View state
    loading: true,
    error: null as string | null,
    // Pagination metadata
    pagination: {
      currentPage: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasMore: false
    }
  })

  // Computed properties
  const filters = computed(() => store.get('cms.dashboard.filters', {}))
  const viewState = computed(() => store.get('cms.dashboard.view', {}))

  // Filter computed values
  const selectedStatus = computed({
    get: () => filters.value.status || 'all',
    set: (value: string) => updateFilter('status', value)
  })

  const selectedCategory = computed({
    get: () => filters.value.category || 'all',
    set: (value: string | number) => updateFilter('category', value)
  })

  const sortBy = computed({
    get: () => filters.value.sortBy || '-updatedAt',
    set: (value: string) => updateFilter('sortBy', value)
  })

  // Helper functions
  const updateFilter = (key: string, value: any) => {
    const currentFilters = store.get('cms.dashboard.filters', {})
    store.set('cms.dashboard.filters', { ...currentFilters, [key]: value })
  }

  const incrementPagination = (page: number) => {
    const newPage = Math.max(1, Math.min(page, state.pagination.totalPages))
    state.pagination.currentPage = newPage
    store.set('cms.dashboard.view.currentPage', newPage)
  }

  const resetPagination = () => {
    state.pagination.currentPage = 1
    store.set('cms.dashboard.view.currentPage', 1)
  }

  const setLoading = (loading: boolean) => {
    state.loading = loading
  }

  const setError = (error: string | null) => {
    state.error = error
  }

  const setContents = (contents: any[]) => {
    state.contents = contents
    store.set('cms.dashboard.contents', contents)
    logger.debug('[useCmsState] Contents updated in state', { 
      count: contents.length,
      contentIds: contents.map(c => ({ id: c.id, type: typeof c.id })),
      firstContent: contents[0] ? { id: contents[0].id, cacheInfo: contents[0].cacheInfo } : null
    })
  }

  const setCategories = (categories: Array<{ id: number; name: string; slug: string }>) => {
    state.categories = categories
  }

  const setStatusCounts = (counts: Partial<typeof state.statusCounts>) => {
    state.statusCounts = {
      all: counts.all ?? 0,
      published: counts.published ?? 0,
      draft: counts.draft ?? 0,
      scheduled: counts.scheduled ?? 0
    }
  }

  const setPagination = (paginationData: any) => {
    if (paginationData) {
      state.pagination = {
        currentPage: paginationData.currentPage || 1,
        limit: paginationData.limit || 20,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 0,
        hasMore: paginationData.hasMore || false
      }
    }
  }

  const updateContentItem = (id: number, updates: any) => {
    // Convert id to both string and number for comparison
    const numId = Number(id)
    const strId = String(id)
    
    logger.debug('[useCmsState] updateContentItem called', {
      requestedId: id,
      requestedType: typeof id,
      numId,
      strId,
      contents:state.contents,
      availableItems: state.contents.map(c => ({ 
        id: c.id, 
        type: typeof c.id,
        numMatch: c.id === numId,
        strMatch: c.id === strId,
        stringMatch: String(c.id) === strId
      }))
    })
    
    const index = state.contents.findIndex(item => 
      item.id === numId || item.id === strId || String(item.id) === strId
    )
    
    if (index !== -1) {
      const oldItem = state.contents[index]
      const newItem = { ...state.contents[index], ...updates }
      state.contents[index] = newItem
      
      logger.debug('[useCmsState] Content item updated successfully', {
        id,
        updates,
        index,
        oldCacheInfo: oldItem.cacheInfo,
        newCacheInfo: newItem.cacheInfo
      })
    } else {
      logger.warn('[useCmsState] Content item not found for update', { 
        id, 
        requestedId: id,
        numId,
        strId,
        availableIds: state.contents.map(c => ({ id: c.id, type: typeof c.id })),
        contentsCount: state.contents.length
      })
    }
  }

  const removeContentItem = (id: number) => {
    const numId = Number(id)
    const strId = String(id)
    
    const index = state.contents.findIndex(item => 
      item.id === numId || item.id === strId || String(item.id) === strId
    )
    
    if (index !== -1) {
      state.contents.splice(index, 1)
      logger.debug('[useCmsState] Content item removed', { id, index })
    } else {
      logger.warn('[useCmsState] Content item not found for removal', { 
        id,
        availableIds: state.contents.map(c => c.id)
      })
    }
  }

  // Initialize on first use
  initStoreDefaults()

  return {
    // Reactive state
    state,
    // Computed filters
    filters,
    selectedStatus,
    selectedCategory,
    sortBy,
    viewState,
    // State management functions
    updateFilter,
    incrementPagination,
    resetPagination,
    setLoading,
    setError,
    setContents,
    setCategories,
    setStatusCounts,
    setPagination,
    updateContentItem,
    removeContentItem
  }
}

/**
 * Singleton export function - ensures all composables use the same state instance
 */
export function useCmsState() {
  if (!_cmsState) {
    _cmsState = createCmsState()
    logger.debug('[useCmsState] Created singleton instance')
  }
  return _cmsState
}
