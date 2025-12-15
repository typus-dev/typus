import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const DispatcherQueueTaskModel: DslModel = {
  name: 'DispatcherQueueTask',
  module: 'dispatcher',
  tableName: 'queue_tasks',
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
      name: 'queue',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'type',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 }
      ]
    },
    {
      name: 'name',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 200 }
      ]
    },
    {
      name: 'data',
      type: 'json',
      required: true
    },
    {
      name: 'status',
      type: 'string',
      required: true,
      default: 'pending',
      validation: [
        { type: 'enum', value: ['pending', 'processing', 'completed', 'failed'] }
      ]
    },
    {
      name: 'priority',
      type: 'Int',
      required: true,
      default: 0
    },
    {
      name: 'attempts',
      type: 'Int',
      required: true,
      default: 0
    },
    {
      name: 'maxAttempts',
      type: 'Int',
      required: true,
      default: 3
    },
    {
      name: 'error',
      type: 'string',
      required: false
    },
    {
      name: 'createdAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'updatedAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'processedAt',
      type: 'datetime',
      required: false
    }
  ],

  access: {
    create: ['admin', 'system'],
    read: ['admin', 'system'],
    update: ['admin', 'system'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }
};

registry.registerModel(DispatcherQueueTaskModel);
export { DispatcherQueueTaskModel as DispatcherQueueTask };
