import type { MenuItem } from '@/shared/types/menu'

export const navigationItems: MenuItem[] = [
  {
    title: 'General',
    layout: 'private',
    isOpen: true,
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: 'ri:dashboard-line' }
    ]
  },

]
