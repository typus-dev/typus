import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const SystemErrorModel: DslModel = {
  name: 'SystemError',
  module: 'system',
  tableName: 'errors',
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
      name: 'logId',
      type: 'Int',
      required: true
    },
    {
      name: 'errorType',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'errorMessage',
      type: 'text',
      required: true
    },
    {
      name: 'stackTrace',
      type: 'text',
      required: false
    },
    {
      name: 'additionalData',
      type: 'json',
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

registry.registerModel(SystemErrorModel);
