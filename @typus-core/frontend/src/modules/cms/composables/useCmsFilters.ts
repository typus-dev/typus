/* @Tags: Composable, CMS, Filters */

import { computed } from 'vue'
import { useCmsState } from './useCmsState'
import { normalizeSelectedCategory } from '../cms.utils'
import { STATUS_CONFIGS, SORT_OPTIONS } from '../cms.constants'
import type { ICmsCategory } from '../types'

/**
 * Filter management composable
 * Handles filter state, options, and coordination with content loading
 */
export function useCmsFilters() {
  const cmsState = useCmsState()

  // Filter options computed
  const statusConfigs = computed(() => {
    const counts = cmsState.state.statusCounts
    const configs = STATUS_CONFIGS.map(config => {
      const key = config.key as keyof typeof counts
      return {
        ...config,
        count: counts[key] ?? 0
      }
    })

    return configs
  })

  const categoryOptions = computed(() => [
    { value: 'all', label: 'All categories' },
    ...cmsState.state.categories.map((cat: ICmsCategory) => ({ value: cat.id, label: cat.name }))
  ])

  const sortOptions = computed(() => SORT_OPTIONS)

  // Filter actions
  const updateStatusFilter = (status: 'all' | 'published' | 'draft' | 'scheduled') => {
    const newStatus = cmsState.selectedStatus.value === status ? 'all' : status
    cmsState.selectedStatus.value = newStatus
    cmsState.resetPagination()
  }

  const clearCategoryFilter = () => {
    cmsState.selectedCategory.value = 'all'
    cmsState.resetPagination()
  }

  const hasActiveFilters = computed(() => {
    return cmsState.selectedStatus.value !== 'all' ||
           cmsState.selectedCategory.value !== 'all' ||
           cmsState.sortBy.value !== '-updatedAt'
  })

  const resetFilters = () => {
    cmsState.selectedStatus.value = 'all'
    cmsState.selectedCategory.value = 'all'
    cmsState.sortBy.value = '-updatedAt'
    cmsState.resetPagination()
  }

  // Build filter object for API calls
  const buildFilterObject = () => {
    const filter: Record<string, any> = {}

    // Status filter
    if (cmsState.selectedStatus.value !== 'all') {
      filter.status = cmsState.selectedStatus.value
    }

    // Category filter
    const catId = normalizeSelectedCategory(cmsState.selectedCategory.value)
    if (catId !== null) {
      filter.categories = { some: { categoryId: catId } }
    }

    return filter
  }

  return {
    // Options
    statusConfigs,
    categoryOptions,
    sortOptions,

    // Current selections
    selectedStatus: cmsState.selectedStatus,
    selectedCategory: cmsState.selectedCategory,
    sortBy: cmsState.sortBy,

    // Actions
    updateStatusFilter,
    clearCategoryFilter,
    resetFilters,

    // State
    hasActiveFilters,

    // API helpers
    buildFilterObject
  }
}
