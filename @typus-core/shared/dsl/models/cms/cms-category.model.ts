import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Category model definition
 */
export const CmsCategoryModel: DslModel = {
  name: 'CmsCategory',
  module: 'cms',
  tableName: 'categories',
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
      required: true
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      unique: true
    },
    {
      name: 'parentId',
      type: 'Int',
      required: false,
      relationField: true
    },
    {
      name: 'layout',
      type: 'string',
      required: false
    },
    {
      name: 'description',
      type: 'string',
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
      required: true
    }
  ],

  relations: [
    {
      name: 'itemLinks',
      type: 'hasMany',
      target: 'CmsItemCategory',
      foreignKey: 'categoryId',
      inverseSide: 'category'
    }
  ],

  access: {
    create: ['admin', 'editor'],
    read: ['admin', 'editor', 'user'],
    update: ['admin', 'editor'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }
};

// Register the model immediately when this module is imported
registry.registerModel(CmsCategoryModel);
