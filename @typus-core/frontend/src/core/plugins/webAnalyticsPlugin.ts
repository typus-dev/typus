// plugins/webAnalyticsPlugin.ts
import { App } from 'vue'
import { Router } from 'vue-router'
import { logger } from '@/core/logging/logger'

interface WebAnalyticsOptions {
  router: Router
}

export default {
  install(app: App, options: WebAnalyticsOptions) {
    const { router } = options

    if (!router) {
      logger.warn('[webAnalyticsPlugin] Router not provided, plugin disabled')
      return
    }

    let pageLoadTime = Date.now()

    // Track SPA navigation
    router.afterEach((to, from) => {
      // Skip initial page load (nginx already logged it)
      if (!from.name) {
        pageLoadTime = Date.now()
        logger.debug('[webAnalyticsPlugin] Initial load, skipping beacon')
        return
      }

      // Calculate time on previous page
      const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000)
      pageLoadTime = Date.now()

      // Collect page view data
      const data = {
        source: 'frontend',
        path: to.path,
        query_params: Object.keys(to.query).length > 0 ? to.query : undefined,
        referrer_path: from.path,

        // Promoted fields
        screen_resolution: `${screen.width}x${screen.height}`,
        page_title: document.title,
        time_on_page_seconds: timeOnPage,

        // Metadata
        metadata: {
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          device_pixel_ratio: window.devicePixelRatio || 1,
          timezone_offset: new Date().getTimezoneOffset()
        }
      }

      logger.debug('[webAnalyticsPlugin] Tracking page view', {
        from: from.path,
        to: to.path,
        timeOnPage
      })

      // Send beacon
      trackPageView(data)
    })

    logger.debug('[webAnalyticsPlugin] Plugin installed')
  }
}

function trackPageView(data: any) {
  try {
    // Use sendBeacon for reliability (works even on page unload)
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const success = navigator.sendBeacon('/api/web-analytics/track', blob)

    if (!success) {
      // Fallback to fetch if sendBeacon fails
      fetch('/api/web-analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {
        // Silent fail - don't break app if analytics fails
      })
    }
  } catch (error) {
    // Silent fail
    logger.debug('[webAnalyticsPlugin] Failed to send beacon:', error)
  }
}
