import type { MenuItem } from '@/shared/types/menu'

export const dispatcherMenu: MenuItem = {
   id: 'dispatcher',
   title: 'Dispatcher',
   icon: 'ri:send-plane-line',
   layout: 'private',
   isOpen: true,
   injectAfter: 'Tasks',
   ability: {
       action: 'manage',
       subject: 'task'
   },
   items: [
       {
           title: 'Tasks',
           path: '/dispatcher/tasks',
           icon: 'ri:task-line'
       },

       {
           title: 'Queues',
           path: '/dispatcher/queues',
           icon: 'ri:stack-line'
       }
   ]
}
