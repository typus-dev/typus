import type { MenuItem } from '@/shared/types/menu'

export const cmsMenu: MenuItem = {
  id: 'cms',
  title: 'Content',
  icon: 'ri:file-text-line',
  layout: 'private',
  isOpen: true,
  injectAfter: 'Dashboard',
  ability: {
    action: 'manage',
    subject: 'cms'  
  },
  items: [
    {
      title: 'Dashboard',
      path: '/cms/dashboard',
      icon: 'ri:dashboard-line'
    },


    {
      title: 'Content Management',
      path: '/cms/content',
      icon: 'ri:list-unordered'
    },

    /*
    {
      title: 'Categories',
      path: '/cms/categories',
      icon: 'ri:folder-line'
    },
    {
      title: 'Tags',
      path: '/cms/tags',
      icon: 'ri:price-tag-3-line'
    },
    {
      title: 'Media Library',
      path: '/cms/media',
      icon: 'ri:image-line'
    }
      */
  ]
}
