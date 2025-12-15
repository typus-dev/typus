/**
 * CMS module types
 */

/**
 * Base content item interface
 */
export interface ICmsItem {
  id: number;
  title: string;
  slug: string;
  typeId: number;
  type: string;
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  content?: string;
  sitePath: string;
  metadata?: Record<string, any>;
  layout: string;
  // SEO Meta fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  robotsMeta?: string;
  
  // Open Graph fields
  ogTitle?: string;
  ogDescription?: string;
  ogImageId?: number;
  
  // Schema.org fields
  schemaType?: string;
  structuredData?: Record<string, any>;
  
  // Sitemap fields
  sitemapPriority?: number;
  sitemapChangefreq?: string;
  includeInSitemap?: boolean;
  
  // Cache fields
  cacheEnabled?: boolean;
  cacheTtl?: number;
  cacheInfo?: {
    exists: boolean;
    lastModified?: string;
    size?: number;
  };

  // Publishing fields
  isPublic: boolean;
  publishedAt?: Date | string | null;
  publishAt?: Date | string | null;
  scheduledBy?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
  
  // Relations
  categories?: ICmsCategory[];
  tags?: ICmsTag[];
  media?: ICmsMedia[];
  ogImage?: ICmsMedia;
}

/**
 * Content item type interface
 */
export interface ICmsItemType {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  schema?: Record<string, any>;
  icon?: string;
  isActive: boolean;
}

/**
 * Category interface
 */
export interface ICmsCategory {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Tag interface
 */
export interface ICmsTag {
  id: number;
  name: string;
  slug: string;
}

/**
 * Menu interface
 */
export interface ICmsMenu {
  id: number;
  name: string;
  location: string;
  items?: ICmsMenuItem[];
}

/**
 * Menu item interface
 */
export interface ICmsMenuItem {
  id: number;
  menuId: number;
  title: string;
  type: 'link' | 'category' | 'dropdown';
  url?: string;
  itemId?: number;
  categoryId?: number;
  parentId?: number;
  orderIndex: number;
  visibleTo?: string[];
  roles?: string[];
}

/**
 * Media interface
 */
export interface ICmsMedia {
  id: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  path: string;
  altText?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}
