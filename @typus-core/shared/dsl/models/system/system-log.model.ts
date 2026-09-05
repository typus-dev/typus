import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const SystemLogModel: DslModel = {
  name: 'SystemLog',
  module: 'system',
  tableName: 'logs',
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
      name: 'timestamp',
      type: 'datetime',
      required: true
    },
    {
      name: 'level',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 10 }
      ]
    },
    {
      name: 'source',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 }
      ]
    },
    {
      name: 'component',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'module',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 }
      ]
    },
    {
      name: 'message',
      type: 'text',
      required: true
    },
    {
      name: 'metadata',
      type: 'json',
      required: false
    },
    {
      name: 'contextId',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 36 }
      ]
    },
    {
      name: 'userId',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 36 }
      ]
    },
    {
      name: 'ipAddress',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 45 }
      ]
    },
    {
      name: 'requestPath',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'requestMethod',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 10 }
      ]
    },
    {
      name: 'executionTime',
      type: 'Int',
      required: false
    },
    {
      name: 'createdAt',
      type: 'datetime'
    },
    {
      name: 'updatedAt',
      type: 'datetime'
    },
    {
      name: 'createdBy',
      type: 'Int',
      required: false
    },
    {
      name: 'updatedBy',
      type: 'Int',
      required: false
    }
  ],

  // WHY read is admin-only (#2897): this table carries the application's own operational log, and the
  // DSL grants an operation with no row condition, so `user` here meant every signed-in customer could
  // read every log line the system ever wrote. It has a userId column, but scoping to "your own log
  // rows" would be answering a question nobody asks: the only readers in the tree are workflow seed
  // definitions, which run server-side, and the admin console.
  access: {
    create: ['admin'],
    read: ['admin'],
    update: ['admin'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }
};

registry.registerModel(SystemLogModel);
