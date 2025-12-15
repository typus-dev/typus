import type { MenuItem } from '@/shared/types/menu'

/**
 * Dynamic menu for system module.
 * Follows MenuItem type.
 */
export const systemMenu: MenuItem = {
    id: 'system_management',
    title: 'System',
    icon: 'ri:settings-3-line',
    layout: 'private',
    isOpen: true,
    injectAfter: 'Role Management',
    ability: {
        action: 'manage',
        subject: 'user'
    },
    items: [
        {
            title: 'Dashboard',
            path: '/system/dashboard',
            icon: 'ri:dashboard-3-line'
        },
        {
            title: 'Settings',
            path: '/system/settings',
            icon: 'ri:settings-4-line'
        },
        {
            title: 'Theme Editor',
            path: '/system/theme-editor',
            icon: 'ri:palette-line'
        },
        {
            title: 'Routes',
            path: '/routes',
            icon: 'ri:route-line'
        },
        {
            title: 'Logs',
            path: '/system/logs',
            icon: 'ri:file-list-3-line'
        }
    ]
}
