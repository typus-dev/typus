import { DSL, initDslClient } from '@/dsl/client'
import { useApi } from '@/shared/composables/useApi'
import { logger } from '@/core/logging/logger'
import type { BlockContext } from '@/dsx/composables/useBlockContext'
import type { Router } from 'vue-router'

interface IDispatcherTask {
  id: number
  name: string
  type: string
  data?: Record<string, any>
  periodSec?: number
  parentId?: number
  isActive: boolean
  lastRun?: Date
  lastStatus?: string
  lastError?: string
  maxRuns?: number
  runCount: number
  nextRun?: Date
  scheduleType?: string
  cronExpr?: string
  timeout?: number
  retryCount: number
  retryDelay: number
  createdAt?: Date
  updatedAt?: Date
  parent?: IDispatcherTask
  children?: IDispatcherTask[]
  history?: IDispatcherTaskHistory[]
}

interface IDispatcherTaskHistory {
  id: number
  taskId: number
  parentId?: number
  status: string
  startedAt: Date
  finishedAt: Date
  duration: number
  error?: string
  result?: Record<string, any>
  metadata?: Record<string, any>
  task?: IDispatcherTask
  taskName?: string
  taskType?: string
}


export const DispatcherTaskMethods = {

  async getTasks(): Promise<IDispatcherTask[]> {
    
    //const tasks = await DSL.DispatcherTask.findMany({}, ['history', 'parent', 'children']) as IDispatcherTask[]
    const tasks = await DSL.DispatcherTask.findMany({}, [ 'parent', 'children']) as IDispatcherTask[]
    try { logger.debug('[ServerResponse] DSL.DispatcherTask.findMany: ' + JSON.stringify(tasks, null, 2)) } catch {}

    const mapped = tasks.map(task => ({
      id: task.id,
      name: task.name,
      type: task.type,
      isActive: task.isActive,
      lastRun: task.lastRun,
      lastStatus: task.lastStatus,
      nextRun: task.nextRun,
      runCount: task.runCount,
      periodSec: task.periodSec,
      scheduleType: task.scheduleType,
      actions: {
        view: `/dispatcher/tasks/${task.id}/view`,
        edit: `/dispatcher/tasks/${task.id}/edit`
      }
    }))
    return mapped as unknown as IDispatcherTask[]
  },

  async getTaskById(id: string): Promise<IDispatcherTask | null> {
    
    const task = await DSL.DispatcherTask.findById(parseInt(id), ['history', 'parent', 'children'])
    try { logger.debug('[ServerResponse] DSL.DispatcherTask.findById: ' + JSON.stringify(task, null, 2)) } catch {}
    return task as IDispatcherTask
  },

  async createTask(taskData: Partial<IDispatcherTask>): Promise<IDispatcherTask> {
    
    const result = await DSL.DispatcherTask.create(taskData) as IDispatcherTask
    try { logger.debug('[ServerResponse] DSL.DispatcherTask.create: ' + JSON.stringify(result, null, 2)) } catch {}
    return result
  },

  async updateTask(id: string | number, taskData: Partial<IDispatcherTask>): Promise<IDispatcherTask> {
    
    const taskId = typeof id === 'string' ? parseInt(id) : id
    const result = await DSL.DispatcherTask.update(taskId, taskData) as IDispatcherTask
    try { logger.debug('[ServerResponse] DSL.DispatcherTask.update: ' + JSON.stringify(result, null, 2)) } catch {}
    return result
  },

  async deleteTask(id: string | number): Promise<void> {
    
    const taskId = typeof id === 'string' ? parseInt(id) : id
    const result = await DSL.DispatcherTask.delete(taskId)
    try { logger.debug('[ServerResponse] DSL.DispatcherTask.delete: ' + JSON.stringify({ taskId, result }, null, 2)) } catch {}
  },

  async executeTask(id: string | number): Promise<any> {
    const taskId = typeof id === 'string' ? id : id.toString()
    const { data } = await useApi(`/dispatcher/execute/${taskId}`).post()
    try { logger.debug('[ServerResponse] POST /dispatcher/execute/:id: ' + JSON.stringify(data, null, 2)) } catch {}
    return data
  },

  async toggleTaskStatus(id: string | number): Promise<IDispatcherTask> {
    const task = await this.getTaskById(id.toString())
    return this.updateTask(id, { isActive: !task?.isActive })
  },

  async getTaskHistory(taskId?: string): Promise<IDispatcherTaskHistory[]> {
    
    const filter = taskId ? { taskId: parseInt(taskId) } : {}
    const history = await DSL.DispatcherTaskHistory.findMany(filter, ['task', 'parentTask']) as IDispatcherTaskHistory[]
    try { logger.debug('[ServerResponse] DSL.DispatcherTaskHistory.findMany: ' + JSON.stringify(history, null, 2)) } catch {}

    const response = history.map(item => ({
      ...item,
      taskName: item.task?.name,
      taskType: item.task?.type
    }))

    return response
  },

  async pauseTask(id: string | number): Promise<IDispatcherTask> {
    return this.updateTask(id, { isActive: false })
  },

  async resumeTask(id: string | number): Promise<IDispatcherTask> {
    return this.updateTask(id, { isActive: true })
  },

  async getQueueStatus(): Promise<any> {
    const { data } = await useApi('/dispatcher/queue-status').get()
    try { logger.debug('[ServerResponse] GET /dispatcher/queue-status: ' + JSON.stringify(data, null, 2)) } catch {}
    return data
  },

  async getStats(): Promise<any> {
    const { data } = await useApi('/dispatcher/stats').get()
    try { logger.debug('[ServerResponse] GET /dispatcher/stats: ' + JSON.stringify(data, null, 2)) } catch {}
    return data
  }
}

export const TaskEditActions = {
  createActions: (router: Router, isEditMode: boolean, taskIdParam: string) => ({
    async saveTask(ctx: { blockContext?: BlockContext }) {
      logger.debug('[TaskEdit] Save clicked')
      const result = await ctx.blockContext?.methods.saveData()
      try { logger.debug('[TaskEdit] saveData result: ' + JSON.stringify(result, null, 2)) } catch {}
      if (!isEditMode && result?.id) {
        router.push(`/dispatcher/tasks/edit/${result.id}`)
      } else {
        router.push('/dispatcher/tasks')
      }
    },

    cancelEdit() {
      logger.debug('[TaskEdit] Cancel clicked')
      router.push('/dispatcher/tasks')
    },

    async executeTask() {
      if (isEditMode) {
        try {
          logger.debug('[TaskEdit] Running task', taskIdParam)
          const res = await DispatcherTaskMethods.executeTask(taskIdParam)
          try { logger.debug('[TaskEdit] executeTask result: ' + JSON.stringify(res, null, 2)) } catch {}
          logger.debug('[TaskEdit] Task executed successfully')
        } catch (error) {
          logger.error('[TaskEdit] Task execution failed', error)
        }
      }
    }
  })
}

// Chart data methods
export const DispatcherChartMethods = {
  // Timeline: executions by hour (last 24h) or by day (last 7 days)
  async getTimelineData(scale: 'hour' | 'day' = 'hour') {
    const history = await DSL.DispatcherTaskHistory.findMany({}, [], { orderBy: { startedAt: 'desc' }, limit: 500 }) as IDispatcherTaskHistory[]
    const data = Array.isArray(history) ? history : (history as any)?.data || []

    const now = new Date()

    if (scale === 'hour') {
      // Last 24 hours
      const hourData: { hour: string, success: number, failed: number }[] = []
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
        hourStart.setMinutes(0, 0, 0)
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

        const hourLabel = hourStart.getHours().toString().padStart(2, '0') + ':00'
        let success = 0, failed = 0

        data.forEach((h: any) => {
          const started = new Date(h.startedAt)
          if (started >= hourStart && started < hourEnd) {
            if (h.status === 'success') success++
            else failed++
          }
        })

        hourData.push({ hour: hourLabel, success, failed })
      }
      return hourData
    } else {
      // Last 7 days
      const dayData: { day: string, success: number, failed: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now)
        dayStart.setDate(dayStart.getDate() - i)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        const dayLabel = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        let success = 0, failed = 0

        data.forEach((h: any) => {
          const started = new Date(h.startedAt)
          if (started >= dayStart && started <= dayEnd) {
            if (h.status === 'success') success++
            else failed++
          }
        })

        dayData.push({ day: dayLabel, success, failed })
      }
      return dayData
    }
  },

  // Executions by task type
  async getByTaskType() {
    const history = await DSL.DispatcherTaskHistory.findMany({}, [], { limit: 500 }) as IDispatcherTaskHistory[]
    const data = Array.isArray(history) ? history : (history as any)?.data || []

    const typeCounts: Record<string, number> = {}
    data.forEach((h: any) => {
      const type = h.taskType || h.taskName || 'Unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    return Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
  },

  // Success rate
  async getSuccessRate() {
    const history = await DSL.DispatcherTaskHistory.findMany({}, [], { limit: 500 }) as IDispatcherTaskHistory[]
    const data = Array.isArray(history) ? history : (history as any)?.data || []

    const total = data.length
    const success = data.filter((h: any) => h.status === 'success').length
    const failed = total - success

    return { total, success, failed, rate: total > 0 ? Math.round((success / total) * 100) : 0 }
  }
}

export const TaskFieldTransforms = {

  data: {
    afterLoad: (value: any) => {
      return value ? JSON.stringify(value, null, 2) : '{}';
    },
    beforeSave: (value: string) => {
      try {
        return value && value.trim() ? JSON.parse(value) : {};
      } catch (_error) {
        return {};
      }
    }
  },

  periodSec: {
    afterLoad: (value: any) => value?.toString() || '',
    beforeSave: (value: string) => {
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    }
  },

  maxRuns: {
    afterLoad: (value: any) => value?.toString() || '',
    beforeSave: (value: string) => {
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    }
  },

  timeout: {
    afterLoad: (value: any) => value?.toString() || '',
    beforeSave: (value: string) => {
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    }
  },

  retryCount: {
    afterLoad: (value: any) => value?.toString() || '0',
    beforeSave: (value: string) => {
      const num = parseInt(value);
      return isNaN(num) ? 0 : num;
    }
  },

  retryDelay: {
    afterLoad: (value: any) => value?.toString() || '300',
    beforeSave: (value: string) => {
      const num = parseInt(value);
      return isNaN(num) ? 300 : num;
    }
  }
};
