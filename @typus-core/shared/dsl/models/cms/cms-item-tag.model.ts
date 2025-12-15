import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Item Tag junction model
 */
export const CmsItemTagModel: DslModel = {
  name: 'CmsItemTag',
  module: 'cms',
  tableName: 'item_tags',
  generatePrisma: true,  
  fields: [
    {
      name: 'itemId',
      type: 'Int',
      required: true
    },
    {
      name: 'tagId',
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
      inverseSide: 'tagLinks'
    },
    {
      name: 'tag',
      type: 'belongsTo' as const,
      target: 'CmsTag',
      foreignKey: 'tagId',
      inverseSide: 'itemLinks'
    }
  ],
  primaryKey: ['itemId', 'tagId'],
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

registry.registerModel(CmsItemTagModel);