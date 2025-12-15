import { DispatcherMethods } from '../methods/task.methods.dsx'

export const DispatcherTasksListConfig = {
  name: 'DispatcherTasksList',
  title: 'Task Dispatcher',
  description: 'Manage scheduled tasks and background jobs',
  
  methods: {
    getTasks: DispatcherMethods.getTasks,
    getStats: DispatcherMethods.getStats,
    getQueueStatus: DispatcherMethods.getQueueStatus,
    getRecentExecutions: DispatcherMethods.getRecentExecutions,
    executeTask: DispatcherMethods.executeTask,
    testDispatcher: DispatcherMethods.testDispatcher
  },
  
  lifecycle: {
    mounted: ['getTasks', 'getStats', 'getQueueStatus', 'getRecentExecutions'],
    refreshInterval: 30000
  }
}
