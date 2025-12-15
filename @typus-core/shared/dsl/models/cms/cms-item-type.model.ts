import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Item Type model definition
 * Defines content types for CMS
 */
export const CmsItemTypeModel: DslModel = {
  name: 'CmsItemType',
  module: 'cms',
  tableName: 'item_types',
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
      name: 'name',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 }
      ]
    },
    {
      name: 'displayName',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'description',
      type: 'string',
      required: false
    },
    {
      name: 'schema',
      type: 'json',
      required: false
    },
    {
      name: 'icon',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 50 }
      ]
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

// Register the model immediately when this module is imported
registry.registerModel(CmsItemTypeModel);

// Also export as CmsItemType for convenience
export { CmsItemTypeModel as CmsItemType };
