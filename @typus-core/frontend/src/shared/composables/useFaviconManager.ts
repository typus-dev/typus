/**
 * useFaviconManager - Manage dynamic favicon updates
 *
 * Automatically updates all favicon <link> tags when favicon changes
 * Supports: main favicon, apple-touch-icon
 */

import { watch } from 'vue'
import { useDynamicConfig } from './useDynamicConfig'
import { logger } from '@/core/logging/logger'

export function useFaviconManager() {
  const { siteFaviconUrl, siteFaviconAppleUrl } = useDynamicConfig()

  /**
   * Update or create a <link> tag with specified attributes
   */
  function updateOrCreateLink(attributes: {
    rel: string
    href: string
    type?: string
    sizes?: string
  }) {
    const selector = `link[rel="${attributes.rel}"]${attributes.sizes ? `[sizes="${attributes.sizes}"]` : ''}`
    let link = document.querySelector(selector) as HTMLLinkElement

    if (!link) {
      link = document.createElement('link')
      Object.assign(link, attributes)
      document.head.appendChild(link)
      logger.debug('[useFaviconManager] Created new link', { selector, href: attributes.href })
    } else {
      link.href = attributes.href
      if (attributes.type) link.type = attributes.type
      logger.debug('[useFaviconManager] Updated existing link', { selector, href: attributes.href })
    }
  }

  /**
   * Update all favicon links with current URLs
   */
  function updateFavicons() {
    const mainUrl = siteFaviconUrl.value
    const appleUrl = siteFaviconAppleUrl.value

    if (!mainUrl) {
      logger.warn('[useFaviconManager] No favicon URL found, skipping update')
      return
    }

    logger.info('[useFaviconManager] Updating favicons', {
      mainUrl,
      appleUrl
    })

    // Update main favicon (PNG/SVG - works in all modern browsers)
    updateOrCreateLink({
      rel: 'icon',
      href: mainUrl,
      type: 'image/png'
    })

    // Update Apple Touch Icon (iOS/Safari)
    updateOrCreateLink({
      rel: 'apple-touch-icon',
      href: appleUrl
    })

    logger.info('[useFaviconManager] Favicons updated successfully')
  }

  /**
   * Watch for favicon URL changes and auto-update
   */
  function watchFaviconChanges() {
    watch([siteFaviconUrl, siteFaviconAppleUrl], () => {
      logger.debug('[useFaviconManager] Favicon URLs changed, updating...')
      updateFavicons()
    })
  }

  return {
    updateFavicons,
    watchFaviconChanges
  }
}
