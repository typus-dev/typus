import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const NotificationsTelegramUserModel: DslModel = {
  name: 'NotificationsTelegramUser',
  module: 'notifications',
  tableName: 'telegram_users',
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
      name: 'phone',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 20 }
      ]
    },
    {
      name: 'chatId',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 20 }
      ]
    },
    {
      name: 'username',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 100 }
      ]
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

registry.registerModel(NotificationsTelegramUserModel);
