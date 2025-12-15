import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Tag model definition
 */
export const CmsTagModel: DslModel = {
  name: 'CmsTag',
  module: 'cms',
  tableName: 'tags',
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
      name: 'slug',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 },
        { type: 'pattern', value: '^[a-z0-9-]+$', message: 'Slug can only contain lowercase letters, numbers, and hyphens' }
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
  
  relations: [
    {
      name: 'itemLinks',
      type: 'hasMany',
      target: 'CmsItemTag',
      foreignKey: 'tagId',
      inverseSide: 'tag'
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
registry.registerModel(CmsTagModel);

// Also export as CmsTag for convenience
export { CmsTagModel as CmsTag };
