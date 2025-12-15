import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const SystemSessionStorageModel: DslModel = {
  name: 'SystemSessionStorage',
  module: 'system',
  tableName: 'session_storage',
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
      name: 'key',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'value',
      type: 'text',
      required: true
    },
    {
      name: 'expiresAt',
      type: 'datetime',
      required: true
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
    }
  ],

  access: {
    create: ['admin', 'system'],
    read: ['admin', 'system'],
    update: ['admin', 'system'],
    delete: ['admin', 'system'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }
};

registry.registerModel(SystemSessionStorageModel);
export { SystemSessionStorageModel as SystemSessionStorage };
