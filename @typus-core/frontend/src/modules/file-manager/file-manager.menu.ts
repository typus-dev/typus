import type { MenuItem } from '@/shared/types/menu'

export const fileManagerMenu: MenuItem = {
  id: 'file-manager',
  title: 'File Manager',
  icon: 'ri-file-cloud-line',
  layout: 'private',
  isOpen: true,
  injectAfter: 'Dashboard',
  ability: {
    action: 'manage' as const,
    subject: 'all' as const
  },
  items: [
    {
      title: 'All Files',
      path: '/file-manager',
      icon: 'ri-file-list-line'
    }
  ]
}
