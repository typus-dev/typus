import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const CmsItemMediaModel: DslModel = {
  name: 'CmsItemMedia',
  module: 'cms', 
  tableName: 'item_media',
  generatePrisma: true,
  fields: [
    {
      name: 'itemId',
      type: 'Int',
      required: true
    },
    {
      name: 'mediaId', 
      type: 'Int',
      required: true
    },
    {
      name: 'relationship',
      type: 'String',
      required: true
    },
    {
      name: 'orderIndex',
      type: 'Int'
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
      inverseSide: 'mediaLinks'
    },
    {
      name: 'media',
      type: 'belongsTo' as const,
      target: 'CmsMedia',
      foreignKey: 'mediaId',
      inverseSide: 'itemLinks'
    }
  ],
  primaryKey: ['itemId', 'mediaId'],
  access: {
    create: ['admin', 'editor'],
    read: ['admin', 'editor'],
    update: ['admin', 'editor'],
    delete: ['admin'],
    count: ['admin']
  },
  config: {
    timestamps: true
  }
};

registry.registerModel(CmsItemMediaModel);