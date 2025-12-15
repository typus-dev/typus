// Core breakpoint logic shared between plugin and composable.
// Provides static breakpoint thresholds and detection based on window width.
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'default'

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

export function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'default'
  const width = window.innerWidth

  //logger.debug('BREAKPOINT CORE: Current width:', width)

  if (width >= breakpoints['2xl']) return '2xl'
  if (width >= breakpoints.xl) return 'xl'
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  return 'xs'
}
