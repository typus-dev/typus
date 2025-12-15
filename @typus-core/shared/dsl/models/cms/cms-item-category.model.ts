import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Item Category junction model
 */
export const CmsItemCategoryModel = {
  name: 'CmsItemCategory',
  module: 'cms',
  tableName: 'item_categories',
  generatePrisma: true,
  fields: [
    {
      name: 'itemId',
      type: 'Int',
      required: true
    },
    {
      name: 'categoryId',
      type: 'Int',
      required: true
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
      type: 'Int'
    },
    {
      name: 'updatedBy',
      type: 'Int'
    }
  ],
  relations: [
    {
      name: 'item',
      type: 'belongsTo' as const,
      target: 'CmsItem',
      foreignKey: 'itemId',
      inverseSide: 'categoryLinks'
    },
    {
      name: 'category',
      type: 'belongsTo' as const,
      target: 'CmsCategory',
      foreignKey: 'categoryId',
      inverseSide: 'itemLinks'
    }
  ],
  primaryKey: ['itemId', 'categoryId'],
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

registry.registerModel(CmsItemCategoryModel);


// Also export as CmsItem for convenience
export { CmsItemCategoryModel as CmsItemCategory };
