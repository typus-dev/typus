// Unified realtime event names for Dispatcher/Queues
export const EVT_QUEUE_UPDATE = 'queue:update';
export const EVT_QUEUE_TASKS_ADDED = 'queue:tasks:added';
export const EVT_TASK_HISTORY_UPDATE = 'task:history:update';
export const EVT_QUEUES_CLEARED = 'queues:cleared';

// Workflow execution events
export const EVT_WORKFLOW_EXECUTION_UPDATE = 'workflow:execution:update';

// Workflow creation events (Master Workflow building new workflows)
export const EVT_WORKFLOW_CREATION_STARTED = 'workflow:creation:started';
export const EVT_WORKFLOW_CREATION_BLOCK_ADDED = 'workflow:creation:block-added';
export const EVT_WORKFLOW_CREATION_COMPLETED = 'workflow:creation:completed';

export type QueueEventName =
  | typeof EVT_QUEUE_UPDATE
  | typeof EVT_QUEUE_TASKS_ADDED
  | typeof EVT_TASK_HISTORY_UPDATE
  | typeof EVT_QUEUES_CLEARED
  | typeof EVT_WORKFLOW_EXECUTION_UPDATE
  | typeof EVT_WORKFLOW_CREATION_STARTED
  | typeof EVT_WORKFLOW_CREATION_BLOCK_ADDED
  | typeof EVT_WORKFLOW_CREATION_COMPLETED;

