import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * CMS Item model definition
 * Main content model for CMS module with full SEO support
 * 
 * anonymous - documentation and other public pages
 * task_worker - scheduled publishing by task_worker
 */
export const CmsItemModel: DslModel = {
  name: 'CmsItem',
  module: 'cms',
  tableName: 'items',
  generatePrisma: true,  
  access: {
    create: ['admin', 'editor', 'task_worker'],
    read: ['admin', 'editor', 'task_worker','anonymous'],
    update: ['admin', 'editor', 'task_worker'],
    delete: ['admin'],
    count: ['admin', 'editor', 'task_worker']
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
      name: 'title',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 },
        { type: 'pattern', value: '^[a-z0-9-]+$', message: 'Slug can only contain lowercase letters, numbers, and hyphens' }
      ]
    },
    {
      name: 'contentType',
      type: 'string',
      required: true,
      default: 'document',
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 }
      ]
    },
    {
  name: 'content',
  type: 'text', 
  required: false
},
    {
      name: 'status',
      type: 'string',
      required: true,
      default: 'draft',
      validation: [
        { type: 'required' },
        { type: 'enum', value: ['draft', 'published', 'archived', 'scheduled'] }
      ]
    },
    {
      name: 'layout',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'sitePath',
      type: 'string', 
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 },
        { type: 'pattern', value: '^/', message: 'Site path must start with /' }
      ]
    },
    {
      name: 'metadata',
      type: 'json', 
      required: false
    },

    // SEO Meta Fields
    {
      name: 'metaTitle',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'metaDescription',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'metaKeywords',
      type: 'string',
      required: false
    },
    {
      name: 'canonicalUrl',
      type: 'string',
      required: false,
      validation: [
        { type: 'url' },
        { type: 'maxLength', value: 512 }
      ]
    },
    {
      name: 'robotsMeta',
      type: 'string',
      required: false,
      default: 'index,follow'
    },

    // Open Graph Fields
    {
      name: 'ogTitle',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 95 }
      ]
    },
    {
      name: 'ogDescription',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 200 }
      ]
    },
    {
      name: 'ogImageId',
      type: 'Int',
      required: false
    },

    // Schema.org Structured Data
    {
      name: 'schemaType',
      type: 'string',
      required: false,
      default: 'WebPage'
    },
    {
      name: 'structuredData',
      type: 'json',
      required: false
    },

    // Sitemap Configuration
    {
      name: 'sitemapPriority',
      type: 'decimal',
      required: false,
      default: 0.5,
      validation: [
        { type: 'min', value: 0.0 },
        { type: 'max', value: 1.0 }
      ]
    },
    {
      name: 'sitemapChangefreq',
      type: 'string',
      required: false,
      default: 'monthly'
    },
    {
      name: 'includeInSitemap',
      type: 'boolean',
      required: false,
      default: true
    },

    // Cache Configuration
    {
      name: 'cacheEnabled',
      type: 'boolean',
      required: false,
      default: true
    },
    {
      name: 'cacheTtl',
      type: 'Int',
      required: false,
      default: 3600,
      validation: [
        { type: 'min', value: 0 }
      ]
    },
    {
      name: 'cacheInfo',
      type: 'json',
      required: false
    },

    // Timestamps
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
      name: 'publishedAt',
      type: 'datetime',
      required: false
    },
    {
      name: 'publishAt',
      type: 'datetime',
      required: false
    },
    {
      name: 'scheduledBy',
      type: 'Int',
      required: false
    },

    // Public visibility
    {
      name: 'isPublic',
      type: 'boolean',
      required: true,
      default: false
    },

    // Audit fields
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
      name: 'categoryLinks',
      type: 'hasMany',
      target: 'CmsItemCategory',
      foreignKey: 'itemId',
      inverseSide: 'item'
    },
    {
      name: 'tagLinks',
      type: 'hasMany',
      target: 'CmsItemTag',
      foreignKey: 'itemId',
      inverseSide: 'item'
    },
    {
      name: 'mediaLinks',
      type: 'hasMany',
      target: 'CmsItemMedia',
      foreignKey: 'itemId',
      inverseSide: 'item'
    },
    {
      name: 'ogImage',
      type: 'belongsTo',
      target: 'CmsMedia',
      foreignKey: 'ogImageId',
      inverseSide: 'ogItems',
      required: false
    }
  ],
  config: {
    timestamps: true
  }
};

// Register the model immediately when this module is imported
registry.registerModel(CmsItemModel);

// Also export as CmsItem for convenience
export { CmsItemModel as CmsItem };
