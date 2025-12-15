import type { MenuItem } from '@/shared/types/menu'

/**
 * Dynamic menu for user-management module.
 * Follows MenuItem type.
 */
export const userManagementMenu: MenuItem = {
    id: 'users_auth',
    title: 'User Management',
    icon: 'ri:group-line',
    layout: 'private',
      isOpen: true,
    injectAfter: 'Dashboard',
    ability: {
        action: 'manage',
        subject: 'user'
    },
    items: [
        {
            title: 'Dashboard',
            path: '/user-management/dashboard',
            icon: 'ri:dashboard-3-line'
        },
        {
            title: 'User List',
            path: '/user-management/users/list',
            icon: 'ri:user-line'
        },
        {
            title: 'Active Sessions',
            path: '/user-management/sessions',
            icon: 'ri:time-line'
        },
        {
            title: 'Login History',
            path: '/user-management/login-history',
            icon: 'ri:history-line'
        },
        {
            title: 'Role List',
            path: '/user-management/roles/list',
            icon: 'ri:shield-line',
            ability: {
                action: 'manage',
                subject: 'role'
            }
        }

    ]
}
