import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const NotificationsHistoryModel: DslModel = {
  name: 'NotificationsHistory',
  module: 'notifications',
  tableName: 'history',
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
      name: 'userId',
      type: 'Int',
      required: true
    },
    {
      name: 'type',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'message',
      type: 'text',
      required: true
    },
    {
      name: 'status',
      type: 'string',
      required: true,
      default: 'pending',
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'metadata',
      type: 'json',
      required: false
    },
    {
      name: 'templateId',
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

registry.registerModel(NotificationsHistoryModel);
