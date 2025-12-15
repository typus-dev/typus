import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const DispatcherTaskHistoryModel: DslModel = {
  name: 'DispatcherTaskHistory',
  module: 'dispatcher',
  tableName: 'task_history',
  generatePrisma: true,
  fields: [
    {
      name: 'id',
      type: 'Int',
      required: true,
      unique: true,
      primaryKey: true,
      autoIncrement: true
    },
    {
      name: 'taskId',
      type: 'Int',
      required: false
    },
    {
      name: 'parentId',
      type: 'Int',
      required: false
    },
    {
      name: 'taskName',
      type: 'string',
      required: false,
      length: 255
    },
    {
      name: 'taskType',
      type: 'string',
      required: false,
      length: 100
    },
    {
      name: 'queueName',
      type: 'string',
      required: false,
      length: 100
    },
    {
      name: 'status',
      type: 'string',
      required: true,
      validation: [
        {
          type: 'enum',
          value: ['pending', 'processing', 'waiting', 'completed', 'failed', 'canceled']
        }
      ]
    },
    {
      name: 'externalJobId',
      type: 'string',
      required: false,
      length: 200,
      dbName: 'external_job_id'
    },
    {
      name: 'waitingSince',
      type: 'datetime',
      required: false,
      dbName: 'waiting_since'
    },
    {
      name: 'waitingUntil',
      type: 'datetime',
      required: false,
      dbName: 'waiting_until'
    },
    {
      name: 'startedAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'finishedAt',
      type: 'datetime',
      required: false
    },
    {
      name: 'duration',
      type: 'Int',
      required: false
    },
    {
      name: 'error',
      type: 'string',
      required: false
    },
    {
      name: 'result',
      type: 'json',
      required: false
    },
    {
      name: 'metadata',
      type: 'json',
      required: false
    },
    {
      name: 'createdAt',
      type: 'datetime',
      required: false,
      dbName: 'created_at'
    },
    {
      name: 'updatedAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'createdBy',
      type: 'Int',
      required: false,
      dbName: 'created_by'
    }
  ],

  access: {
    create: ['admin', 'system'],
    read: ['admin'],
    update: ['admin', 'system'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }

  // Note: No FK constraint to DispatcherTask - not all tasks are in tasks table
  // Some tasks go directly to history (one-time tasks), others are recurring (in tasks table)
};

registry.registerModel(DispatcherTaskHistoryModel);
export { DispatcherTaskHistoryModel as DispatcherTaskHistory };
