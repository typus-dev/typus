import { useApi } from '@/shared/composables/useApi'

// Types matching backend interfaces
export interface ApplicationInfo {
  version: string
  buildNumber: number
  buildDate: string
  releaseId: string
  projectName: string
  uptime: number
  uptimeFormatted: string
  nodeVersion: string
  queueDriver: string
  cacheDriver: string
}

export interface SystemInfo {
  hostname: string
  platform: string
  osRelease: string
  arch: string
  cpuCores: number
  cpuModel: string
  memoryTotal: number
  memoryFree: number
  memoryUsed: number
  memoryUsedPercent: number
  loadAverage: number[]
}

export interface DatabaseStats {
  sizeBytes: number
  sizeFormatted: string
  tableCount: number
  recordCounts: { table: string; count: number }[]
}

export interface StorageStats {
  database: { bytes: number; formatted: string }
  uploads: { bytes: number; formatted: string }
  cache: { bytes: number; formatted: string }
  logs: { bytes: number; formatted: string }
  total: { bytes: number; formatted: string }
}

export interface ModuleInfo {
  name: string
  type: 'core' | 'plugin'
  status: 'active' | 'inactive'
}

export interface QueueStats {
  name: string
  pending: number
  running: number
  failed: number
  completed: number
}

export interface SessionStats {
  active: number
  total: number
}

export interface SystemDashboard {
  application: ApplicationInfo
  system: SystemInfo
  database: DatabaseStats
  storage: StorageStats
  modules: ModuleInfo[]
  queues: QueueStats[]
  sessions: SessionStats
  timestamp: string
}

export interface QuickStats {
  version: string
  uptime: string
  memoryPercent: number
  activeSessions: number
  pendingTasks: number
}

export const SystemDashboardMethods = {
  /**
   * Get full system dashboard data
   */
  async getDashboard(): Promise<SystemDashboard> {
    const { data } = await useApi('/system/dashboard').get()
    return data
  },

  /**
   * Get quick stats for header widget
   */
  async getQuickStats(): Promise<QuickStats> {
    const { data } = await useApi('/system/dashboard/quick').get()
    return data
  },

  /**
   * Get application info only
   */
  async getApplicationInfo(): Promise<ApplicationInfo> {
    const { data } = await useApi('/system/dashboard/application').get()
    return data
  },

  /**
   * Get system info (CPU, RAM, etc.)
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const { data } = await useApi('/system/dashboard/system').get()
    return data
  },

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const { data } = await useApi('/system/dashboard/database').get()
    return data
  },

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const { data } = await useApi('/system/dashboard/storage').get()
    return data
  },

  /**
   * Get loaded modules and plugins
   */
  async getModulesInfo(): Promise<{ modules: ModuleInfo[] }> {
    const { data } = await useApi('/system/dashboard/modules').get()
    return data
  },

  /**
   * Get queue statistics
   */
  async getQueuesStatus(): Promise<{ queues: QueueStats[] }> {
    const { data } = await useApi('/system/dashboard/queues').get()
    return data
  },

  /**
   * Get session statistics
   */
  async getSessionsInfo(): Promise<SessionStats> {
    const { data } = await useApi('/system/dashboard/sessions').get()
    return data
  }
}
