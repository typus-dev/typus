import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * ConfigPublic model definition
 *
 * Public configuration storage accessible without authentication.
 * Contains non-sensitive settings like site name, features toggles, etc.
 *
 * Features:
 * - No authentication required for read access
 * - No encryption (public data only)
 * - Category-based organization
 * - Type-safe value storage
 */
export const ConfigPublicModel: DslModel = {
  name: 'ConfigPublic',
  module: 'system',
  tableName: 'config_public',
  generatePrisma: true,

  // Access control - allow anonymous read access
  access: {
    read: ['anonymous'],  // Public read access (no authentication required)
    create: ['admin'],    // Only admins can create
    update: ['admin'],    // Only admins can update
    delete: ['admin'],    // Only admins can delete
    count: ['admin']
  },

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
      name: 'category',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'dataType',
      type: 'string',
      required: false,
      default: 'string',
      validation: [
        { type: 'maxLength', value: 20 }
      ]
    },
    {
      name: 'description',
      type: 'text',
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
  config: {
    timestamps: true
  }
};

registry.registerModel(ConfigPublicModel);
