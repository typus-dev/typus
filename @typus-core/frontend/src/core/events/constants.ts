// Unified realtime event names for Dispatcher/Queues (frontend)
export const EVT_QUEUE_UPDATE = 'queue:update'
export const EVT_QUEUE_TASKS_ADDED = 'queue:tasks:added'
export const EVT_TASK_HISTORY_UPDATE = 'task:history:update'
export const EVT_QUEUES_CLEARED = 'queues:cleared'

export type QueueEventName =
  | typeof EVT_QUEUE_UPDATE
  | typeof EVT_QUEUE_TASKS_ADDED
  | typeof EVT_TASK_HISTORY_UPDATE
  | typeof EVT_QUEUES_CLEARED
