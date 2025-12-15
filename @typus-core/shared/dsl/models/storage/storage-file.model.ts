import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const StorageFileModel: DslModel = {
  name: 'StorageFile',
  module: 'storage',
  tableName: 'files',
  generatePrisma: true,
  fields: [
    {
      name: 'id',
      type: 'string',
      required: true,
      unique: true,
      primaryKey: true
    },
    {
      name: 'originalName',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'fileName', 
      type: 'string',
      required: true
    },
    {
      name: 'mimeType',
      type: 'string',
      required: true
    },
    {
      name: 'size',
      type: 'Int',
      required: true
    },
    {
      name: 'storageProvider',
      type: 'string',
      required: true,
      default: 'LOCAL'
    },
    {
      name: 'storagePath',
      type: 'string',
      required: true
    },
    {
      name: 'publicUrl',
      type: 'string',
      required: false,
      validation: [
        { type: 'url' },
        { type: 'maxLength', value: 2048 }
      ]
    },
    {
      name: 'visibility',
      type: 'string',
      required: true,
      default: 'PRIVATE'
    },
    {
      name: 'userId',
      type: 'Int',
      required: true
    },
    {
      name: 'moduleContext',
      type: 'string',
      required: false
    },
    {
      name: 'contextId',
      type: 'string',
      required: false
    },
    {
      name: 'tags',
      type: 'json',
      required: false
    },
    {
      name: 'description',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 500 }
      ]
    },
    {
      name: 'status',
      type: 'string',
      required: true,
      default: 'ACTIVE'
    },
    {
      name: 'expiresAt',
      type: 'datetime',
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
      name: 'deletedAt',
      type: 'datetime',
      required: false
    }
  ],

  access: {
    create: ['user', 'admin'],
    read: ['user', 'admin', 'anonymous'],  // Allow anonymous read for PUBLIC files
    update: ['user', 'admin'],
    delete: ['user', 'admin'],
    count: ['admin']
  },

  ownership: {
    field: 'userId',
    autoFilter: true,
    operations: ['update', 'delete'],  // Removed 'read' - access control via Service layer
    adminBypass: true
  },
  config: {
    timestamps: true,
    softDelete: true
  }
};

// Register the model
registry.registerModel(StorageFileModel);

export { StorageFileModel as StorageFile };
