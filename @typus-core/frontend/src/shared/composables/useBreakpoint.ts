/*
Reactive breakpoint composable.
Tracks window width and exposes responsive flags inside setup().
Designed for use in components after mount.
*/
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getBreakpoint, Breakpoint } from '@/shared/utils/breakpointCore'

export function useBreakpoint() {
  const current = ref<Breakpoint>('default')

  const update = () => {
    current.value = getBreakpoint()
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return {
    breakpoint: current,
    current,
    isMobile: computed(() => ['xs','sm'].includes(current.value)),
    isCompact: computed(() => ['sm', 'md', 'lg'].includes(current.value)),
    isTablet: computed(() => ['md'].includes(current.value)),
    isDesktop: computed(() => ['lg', 'xl', '2xl'].includes(current.value)),
    isLargeDesktop: computed(() => ['xl', '2xl'].includes(current.value)),
    isDefault: computed(() => current.value === 'default'),
  }
}
