import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const SystemDynamicRouteModel: DslModel = {
  name: 'SystemDynamicRoute',
  module: 'system',
  tableName: 'dynamic_routes',
  generatePrisma: true,
  fields: [
    {
      name: 'id',
      type: 'string',
      required: true,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
      validation: [
        { type: 'maxLength', value: 36 }
      ]
    },
    {
      name: 'path',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'name',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'component',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'parentId',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 36 }
      ]
    },
    {
      name: 'orderIndex',
      type: 'Int',
      required: true,
      default: 0
    },
    {
      name: 'meta',
      type: 'json',
      required: false
    },
    {
      name: 'isActive',
      type: 'boolean',
      required: true,
      default: true
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

registry.registerModel(SystemDynamicRouteModel);
