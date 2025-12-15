/* @Tags: routing */
import { RouteRecordRaw } from 'vue-router';

export const errorRoutes: RouteRecordRaw[] = [
  {
    path: '/access-denied',
    name: 'AccessDenied',
    component: () => import('@/components/system/AccessDenied.vue'),
    meta: {
      layout: 'public'
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/components/system/Error404.vue'),
    meta: {
      layout: 'public'
    }
  },
  {
    path: '/error',
    name: 'SystemError',
    component: () => import('@/components/system/ErrorSystem.vue'),
    meta: {
      layout: 'public'
    }
  },
  
  {
    path: '/reset-password',
    redirect: to => {
      return { path: '/auth/set-password', query: to.query };
    }
  }
];
