import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const DispatcherTaskModel: DslModel = {
  name: 'DispatcherTask',
  module: 'dispatcher',
  tableName: 'tasks',
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
      name: 'name',
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
      name: 'data',
      type: 'json',
      required: false
    },
    {
      name: 'periodSec',
      type: 'Int',
      required: false
    },
    {
      name: 'parentId',
      type: 'Int',
      required: false
    },
    {
      name: 'isActive',
      type: 'boolean',
      required: true,
      default: true
    },
    {
      name: 'lastRun',
      type: 'datetime',
      required: false
    },
    {
      name: 'lastStatus',
      type: 'string',
      required: false,
      validation: [
        { type: 'enum', value: ['success', 'error'] }
      ]
    },
    {
      name: 'lastError',
      type: 'string',
      required: false
    },
    {
      name: 'maxRuns',
      type: 'Int',
      required: false
    },
    {
      name: 'runCount',
      type: 'Int',
      required: false,
      default: 0
    },
    {
      name: 'nextRun',
      type: 'datetime',
      required: false
    },
    {
      name: 'scheduleType',
      type: 'string',
      required: false,
      validation: [
        { type: 'enum', value: ['interval', 'cron', 'manual'] }
      ]
    },
    {
      name: 'cronExpr',
      type: 'string',
      required: false
    },
    {
      name: 'timeout',
      type: 'Int',
      required: false
    },
    {
      name: 'retryCount',
      type: 'Int',
      required: false,
      default: 0
    },
    {
      name: 'retryDelay',
      type: 'Int',
      required: false,
      default: 300
    },
    {
      name: 'createdAt',
      type: 'datetime'
    },
    {
      name: 'updatedAt',
      type: 'datetime'
    }
  ],

  relations: [
    {
      name: 'parent',
      type: 'belongsTo',
      target: 'DispatcherTask',
      foreignKey: 'parentId',
      inverseSide: 'children'
    },
    {
      name: 'children',
      type: 'hasMany',
      target: 'DispatcherTask',
      inverseSide: 'parent'
    }
    // Note: No relation to TaskHistory - taskId in history is nullable reference without FK
  ],
  access: {
    create: ['admin'],
    read: ['admin', 'user'],
    update: ['admin'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }
};

registry.registerModel(DispatcherTaskModel);
export { DispatcherTaskModel as DispatcherTask };