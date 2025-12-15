/* @Tags: Composable, CMS, Cache Management */
import { ref, computed } from 'vue'
import { useCmsState } from './useCmsState'
import { useCmsContent } from './useCmsContent'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { formatCacheSize, getCacheTooltip } from '../cms.utils'
import { logger } from '@/core/logging/logger'

// Polling configuration
const POLLING_INTERVAL = 2000 // 2 seconds
const MAX_POLLING_TIME = 30000 // Stop after 30 seconds max

/**
 * Cache management composable
 * Wrapper around existing CmsMethods cache operations with real-time polling
 */
export function useCmsCache() {
  const cmsState = useCmsState()
  const cmsContent = useCmsContent()

  // Hover state for cache icons (temporary UI state)
  const cacheHoverState = ref(new Set<number>())

  // Polling state tracking
  const activePolling = ref(new Map<number, number>())

  // Computed properties
  const getCacheIcon = (content: any) => {
    if (!content.cacheInfo?.exists) {
      return 'ri:database-2-line' // empty database
    }
    return cacheHoverState.value.has(content.id)
      ? 'ri:close-circle-line'
      : 'ri:database-2-fill'
  }

  const getCacheTooltipFn = (content: any) => getCacheTooltip(content)

  // State management functions
  const setCacheHover = (contentId: number, isHovered: boolean) => {
    if (isHovered) {
      cacheHoverState.value.add(contentId)
    } else {
      cacheHoverState.value.delete(contentId)
    }
  }

  // Polling utilities with logging
  const stopPolling = (contentId: number) => {
    const timeoutId = activePolling.value.get(contentId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      activePolling.value.delete(contentId)
      logger.debug('[useCmsCache] Stopped polling for content', { contentId, activePolls: activePolling.value.size })
    }
  }

  const startPolling = (contentId: number, expectedState: boolean, maxTime = MAX_POLLING_TIME) => {
    // Stop any existing polling for this content
    stopPolling(contentId)
    
    let pollCount = 0
    const startTime = Date.now()
    
    logger.debug('[useCmsCache] Starting polling', { contentId, expectedState, maxTime })

    const poll = async () => {
      try {
        pollCount++
        logger.debug(`[useCmsCache] Polling attempt ${pollCount} for content`, { contentId, expectedState })
        
        const cacheInfo = await CmsMethods.getCacheInfo(contentId)
        logger.debug('[useCmsCache] Cache info response', { contentId, cacheInfo, expectedState })

        // Only update the specific item's cache info without reloading all content
        cmsState.updateContentItem(contentId, { cacheInfo })
        
        // Check if operation completed (state matches expected)
        if (cacheInfo.exists === expectedState) {
          stopPolling(contentId)
          logger.debug('[useCmsCache] Cache operation completed', {
            contentId,
            expectedState,
            pollCount,
            duration: Date.now() - startTime,
            cacheInfo
          })
          return
        }

        // Check if we've exceeded max polling time
        if (Date.now() - startTime >= maxTime) {
          stopPolling(contentId)
          logger.warn('[useCmsCache] Polling timeout exceeded', { contentId, maxTime, pollCount })
          
          // Force reload content anyway in case of timeout
          const currentPage = cmsState.state.pagination.currentPage
          await cmsContent.loadContents(currentPage)
          return
        }

        // Continue polling every 2 seconds
        logger.debug(`[useCmsCache] State mismatch, continuing polling in ${POLLING_INTERVAL}ms`, { 
          contentId, 
          currentExists: cacheInfo.exists, 
          expectedState,
          pollCount,
          timeRemaining: maxTime - (Date.now() - startTime)
        })
        const timeoutId = setTimeout(poll, POLLING_INTERVAL)
        activePolling.value.set(contentId, timeoutId)
        
      } catch (error) {
        logger.error('[useCmsCache] Error during polling', { contentId, error, pollCount })
        
        // Don't stop polling on errors - cache operations can be flaky
        if (Date.now() - startTime < maxTime) {
          logger.debug('[useCmsCache] Retrying after error', { contentId, timeRemaining: maxTime - (Date.now() - startTime) })
          const timeoutId = setTimeout(poll, POLLING_INTERVAL)
          activePolling.value.set(contentId, timeoutId)
        } else {
          stopPolling(contentId)
          // Force reload on error timeout
          const currentPage = cmsState.state.pagination.currentPage
          await cmsContent.loadContents(currentPage)
        }
      }
    }

    // Start polling immediately
    poll()
  }

  // Cache operations with polling
  const handleCacheAction = async (content: any) => {
    if (content.cacheInfo?.exists) {
      await clearCacheForContent(content.id)
    } else {
      await generateCacheForContent(content.id)
    }
  }

  const clearCacheForContent = async (contentId: number) => {
    try {
      // 🔥 OPTIMISTIC UPDATE: Immediately update UI before API call
      logger.debug('[useCmsCache] Applying optimistic cache clear update', { contentId })
      cmsState.updateContentItem(contentId, {
        cacheInfo: { exists: false, size: 0, lastModified: new Date() }
      })

      // Make the API call
      await CmsMethods.clearCache(contentId)

      // Start polling to confirm/verify the status
      startPolling(contentId, false)
      logger.debug('[useCmsCache] Cache clear API completed, started polling', { contentId })
    } catch (error) {
      logger.error('[useCmsCache] Error clearing cache', { contentId, error })
      throw error
    }
  }

  const generateCacheForContent = async (contentId: number) => {
    try {
      // 🔥 OPTIMISTIC UPDATE: Immediately update UI before API call
      logger.debug('[useCmsCache] Applying optimistic cache generate update', { contentId })
      cmsState.updateContentItem(contentId, {
        cacheInfo: { exists: true, size: 0, lastModified: new Date() }
      })

      // Make the API call
      await CmsMethods.generateCache(contentId)

      // Start polling to confirm/verify the status
      startPolling(contentId, true)
      logger.debug('[useCmsCache] Cache generation API completed, started polling', { contentId })
    } catch (error) {
      logger.error('[useCmsCache] Error generating cache', { contentId, error })
      throw error
    }
  }

  const getContentCacheInfo = async (contentId: number) => {
    try {
      const cacheInfo = await CmsMethods.getCacheInfo(contentId)
      logger.debug('[useCmsCache] Cache info retrieved', { contentId, cacheInfo })
      return cacheInfo
    } catch (error) {
      logger.error('[useCmsCache] Error getting cache info', { contentId, error })
      throw error
    }
  }

  const openInNewTab = (sitePath: string) => {
    if (sitePath) {
      window.open(sitePath, '_blank')
    }
  }

  return {
    // UI state
    cacheHoverState,
    // Computed helpers
    getCacheIcon,
    getCacheTooltip: getCacheTooltipFn,
    // State actions
    setCacheHover,
    // Cache operations
    handleCacheAction,
    clearCacheForContent,
    generateCacheForContent,
    getContentCacheInfo,
    openInNewTab,
    // Utils
    formatCacheSize
  }
}
