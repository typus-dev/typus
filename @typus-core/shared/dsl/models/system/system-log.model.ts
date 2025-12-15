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

registry.registerModel(SystemLogModel);
