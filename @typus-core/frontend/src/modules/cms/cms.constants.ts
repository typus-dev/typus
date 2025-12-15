/* @Tags: Constants, CMS, Configuration */

// Status configurations with colors, icons and gradients
export const STATUS_CONFIGS = [
  { key: 'all', label: 'All', count: 0 },
  {
    key: 'published',
    label: 'Published',
    count: 0,
    color: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-teal-600',
    icon: 'ri-global-line'
  },
  {
    key: 'draft',
    label: 'Draft',
    count: 0,
    color: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-600',
    icon: 'ri-draft-line'
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    count: 0,
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-indigo-600',
    icon: 'ri-time-line'
  }
] as const

// Sorting options for content list
export const SORT_OPTIONS = [
  { value: '-updatedAt', label: 'Recently updated' },
  { value: '-createdAt', label: 'Recently created' },
  { value: 'title', label: 'By title' },
  { value: '-views', label: 'By views' }
] as const

// Pagination settings
export const PAGINATION_CONFIG = {
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 5
} as const

// Category badge variants for different types
export const CATEGORY_BADGE_VARIANTS = {
  blog: 'info',
  news: 'error',
  product: 'success',
  guide: 'primary',
  announcement: 'warning'
} as const

// Status badge variant mapping
export const STATUS_BADGE_VARIANT = 'outline' as const

// Status helper functions
export const getStatusInfo = (status: string) => {
  const configs: Record<string, any> = {
    published: { label: 'Published', gradient: 'from-emerald-500 to-teal-600', icon: 'ri-global-line' },
    draft: { label: 'Draft', gradient: 'from-amber-500 to-orange-600', icon: 'ri-draft-line' },
    scheduled: { label: 'Scheduled', gradient: 'from-blue-500 to-indigo-600', icon: 'ri-time-line' }
  }
  return configs[status] || configs.draft
}

// Date format for different contexts
export const DATE_FORMATS = {
  short: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const,
  long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const
} as const

// Transition classes for content grid animations with staggered entrance
export const GRID_TRANSITIONS = {
  enterActive: 'stagger-enter transition-all duration-500 ease-out',
  enterFrom: 'opacity-0 translate-y-6',
  enterTo: 'opacity-100 translate-y-0',
  leaveActive: 'transition-all duration-300 ease-in',
  leaveFrom: 'opacity-100 translate-y-0',
  leaveTo: 'opacity-0 -translate-y-4'
} as const

// Animation stagger settings
export const STAGGER_SETTINGS = {
  delay: 60, // ms between each item
  maxDelay: 800 // maximum total delay before resetting
} as const
