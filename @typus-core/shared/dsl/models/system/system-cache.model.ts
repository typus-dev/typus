import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * System Cache model definition
 *
 * Stores cache entries with TTL support for STARTER profile (database)
 * For FULL profile, Redis is used instead
 */
export const SystemCacheModel: DslModel = {
  name: 'SystemCache',
  module: 'system',
  tableName: 'cache',
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
      name: 'namespace',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'expiresAt',
      type: 'datetime',
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

registry.registerModel(SystemCacheModel);
export { SystemCacheModel as SystemCache };
