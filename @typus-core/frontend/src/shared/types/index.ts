import { RouteRecordRaw } from 'vue-router'; // Import RouteRecordRaw
import { Component } from 'vue'; // Import Component

export interface User {
  id: number | string
  email: string
  name: string
  role: string
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse {
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
  }
}

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error'

export interface BaseModule {
  name: string
  routes?: RouteRecordRaw[]
  store?: any
  components?: Record<string, Component>
}

declare module 'vue-router' {
  interface RouteMeta {
    layout?: string
    middleware?: string[]
    title?: string
  }
}
