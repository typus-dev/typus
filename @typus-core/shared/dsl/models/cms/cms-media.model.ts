import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Media model definition
 */
export const CmsMediaModel: DslModel = {
  name: 'CmsMedia',
  module: 'cms',
  tableName: 'media',
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
      name: 'filename',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'originalFilename',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'mimeType',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'size',
      type: 'Int',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'min', value: 0 }
      ]
    },
    {
      name: 'path',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 512 }
      ]
    },
    {
      name: 'altText',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'description',
      type: 'string',
      required: false
    },
    {
      name: 'metadata',
      type: 'json',
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
      target: 'CmsItemMedia',
      foreignKey: 'mediaId',
      inverseSide: 'media'
    },
    {
      name: 'ogItems',
      type: 'hasMany',
      target: 'CmsItem',
      foreignKey: 'ogImageId',
      inverseSide: 'ogImage'
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
registry.registerModel(CmsMediaModel);

// Also export as CmsMedia for convenience
export { CmsMediaModel as CmsMedia };
