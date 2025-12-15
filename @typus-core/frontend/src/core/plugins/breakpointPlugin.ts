/*
 Global breakpoint plugin.
 Provides early access to responsive flags (e.g. isMobile) before component rendering.
 Safe for use outside of setup() — no Vue lifecycle hooks used.
*/

import { App, ref, computed } from 'vue'
import { getBreakpoint } from '@/shared/utils/breakpointCore'

export const breakpointKey = Symbol('breakpoint')

export default {
  install(app: App) {

    logger.debug('BREAKPOINT PLUGIN: Installing breakpoint plugin...')

    const current = ref(getBreakpoint())

    const update = () => {
      current.value = getBreakpoint()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', update)
    }

    app.provide(breakpointKey, {
      current,
      isMobile: computed(() => ['xs','sm', 'md'].includes(current.value)),
      isCompact: computed(() => ['sm','md', 'lg'].includes(current.value)),
      isTablet: computed(() => ['md', 'lg'].includes(current.value)),
      isDesktop: computed(() => ['xl', '2xl'].includes(current.value)),
    })
  }
}

