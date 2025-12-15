/* @Tags: Composable, CMS, Content Management */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCmsState } from './useCmsState'
import { useCmsFilters } from './useCmsFilters'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { transformContentItem, getSortOrderBy } from '../cms.utils'
import { logger } from '@/core/logging/logger'
import { PAGINATION_CONFIG } from '../cms.constants'

type StatusCounts = Awaited<ReturnType<typeof CmsMethods.getContentStatusCounts>>

/**
 * Content management composable
 * Handles loading, CRUD operations, and content coordination
 */
export function useCmsContent() {
  const cmsState = useCmsState()
  const cmsFilters = useCmsFilters()
  const router = useRouter()

  // Filtered contents with transformation
  const filteredContents = computed(() => {
    const transformed = cmsState.state.contents.map(item => transformContentItem(item))
    console.log('[DEBUG] filteredContents computed', {
      rawCount: cmsState.state.contents.length,
      transformedCount: transformed.length,
      loading: cmsState.state.loading,
      contents: cmsState.state.contents
    })
    return transformed
  })

  const refreshStatusCounts = async (currentFilter?: Record<string, any>) => {
    const filterForCounts = currentFilter ? { ...currentFilter } : cmsFilters.buildFilterObject()

    try {
      const counts = await CmsMethods.getContentStatusCounts(filterForCounts)
      cmsState.setStatusCounts(counts)
      logger.debug('[useCmsContent] Status counts refreshed', { counts })
    } catch (error) {
      logger.error('[useCmsContent] Failed to refresh status counts', { error, filter: filterForCounts })
    }
  }

  // Load contents
  const loadContents = async (page: number = cmsState.state.pagination.currentPage) => {
    logger.debug('[useCmsContent] loadContents START', {
      requestedPage: page,
      filters: cmsFilters.buildFilterObject()
    })

    cmsState.setLoading(true)
    cmsState.setError(null)

    try {
      const filter = cmsFilters.buildFilterObject()
      const orderBy = getSortOrderBy(cmsState.sortBy.value)

      logger.debug('[useCmsContent] Built filter and orderBy', { filter, orderBy })

      const [result, statusCounts]: [any, StatusCounts] = await Promise.all([
        CmsMethods.getContentItems(filter, {
          page,
          limit: cmsState.state.pagination.limit,
          orderBy
        }),
        CmsMethods.getContentStatusCounts(filter)
      ])

      logger.debug('[useCmsContent] API result received', {
        result:result,
        hasPaginationMeta: !!result.paginationMeta,
        dataLength: result.data ? result.data.length : result.length
      })

      if (result.paginationMeta) {
        cmsState.setContents(result.data)
        cmsState.setPagination(result.paginationMeta)
      } else {
        cmsState.setContents(result)
      }

      cmsState.setStatusCounts(statusCounts)

      logger.debug('[useCmsContent] Contents loaded COMPLETE', {
        contents:cmsState.state.contents,
        count: cmsState.state.contents.length,
        page: cmsState.state.pagination.currentPage,
        total: cmsState.state.pagination.total
      })

    } catch (error) {
      logger.error('[useCmsContent] Error loading contents', { error })
      cmsState.setError(error instanceof Error ? error.message : 'Failed to load contents')
    } finally {
      cmsState.setLoading(false)
    }
  }

  // Load categories
  const loadCategories = async () => {
    try {
      const categories = await CmsMethods.getCategoryChildren()
      cmsState.setCategories(categories)
      logger.debug('[useCmsContent] Categories loaded', { count: categories.length })
    } catch (error) {
      logger.error('[useCmsContent] Error loading categories', { error })
    }
  }

  // CRUD operations
  const updateContentStatus = async (id: number, newStatus: 'published' | 'draft' | 'scheduled') => {
    try {
      await CmsMethods.updateContentItem({ status: newStatus }, { id: id.toString() })
      cmsState.updateContentItem(id, { status: newStatus, updatedAt: new Date().toISOString() })
      logger.debug('[useCmsContent] Status updated', { id, newStatus })
      await refreshStatusCounts()
    } catch (error) {
      logger.error('[useCmsContent] Error updating status', { id, newStatus, error })
      throw error
    }
  }

  const updateContentSchedule = async (content: any, newDate: string | null) => {
    if (!newDate || !content) return

    const selectedDate = new Date(newDate)
    const now = new Date()
    const newStatus = selectedDate > now ? 'scheduled' : 'draft'

    try {
      await CmsMethods.updateContentItem(
        { publishAt: newDate, status: newStatus },
        { id: content.id.toString() }
      )

      cmsState.updateContentItem(content.id, {
        publishAt: newDate,
        status: newStatus,
        updatedAt: new Date().toISOString()
      })

      logger.debug('[useCmsContent] Schedule updated', { id: content.id, newDate, newStatus })
      await refreshStatusCounts()
    } catch (error) {
      logger.error('[useCmsContent] Error updating schedule', { id: content.id, newDate, error })
      throw error
    }
  }

  const deleteContent = async (id: number) => {
    try {
      await CmsMethods.deleteContentItem(id)
      cmsState.removeContentItem(id)
      logger.debug('[useCmsContent] Content deleted', { id })
      await refreshStatusCounts()
    } catch (error) {
      logger.error('[useCmsContent] Error deleting content', { id, error })
      throw error
    }
  }

  const editContent = (content: any) => {
    router.push(`/cms/editor/${content.id}`)
  }

  const viewContent = (content: any) => {
    if (content.sitePath) {
      window.open(content.sitePath, '_blank')
    }
  }

  // Initialize and refresh
  const initialize = async () => {
    await Promise.all([
      loadContents(),
      loadCategories()
    ])
  }

  return {
    // Data
    filteredContents,
    isLoading: computed(() => cmsState.state.loading),
    error: computed(() => cmsState.state.error),
    pagination: computed(() => cmsState.state.pagination),

    // Actions
    loadContents,
    loadCategories,
    updateContentStatus,
    updateContentSchedule,
    deleteContent,
    editContent,
    viewContent,

    // Initialization
    initialize
  }
}
