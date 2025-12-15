// CMS Types definitions
export interface ICmsCategory {
  id: number
  name: string
  slug: string
  description?: string
  type?: string
  parentId?: number
  orderIndex?: number
  layout?: string // Layout key from LayoutRegistry (e.g., 'docs-default', 'default')
  createdAt?: Date
  updatedAt?: Date
  updatedBy?: number
  children?: ICmsCategory[]
  isActive?: boolean
}

export interface ICmsItemType {
  id: number
  name: string
  label?: string
  description?: string
}

export interface ICmsItem {
  id?: number
  title: string
  slug: string
  sitePath: string
  type?: string | ICmsItemType
  status: string
  content?: string
  isPublic: boolean
  publishAt?: Date
  updatedAt?: string
  categories: Array<{ id: number | string; name: string; slug: string; parentId?: number | string | null }>
  layout?: string // Layout key from LayoutRegistry (e.g., 'docs-default', 'default')

  // SEO fields
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  canonicalUrl?: string
  robotsMeta?: string

  // Social media fields
  ogTitle?: string
  ogDescription?: string
  ogImageId?: number

  // Structured data
  schemaType?: string
  structuredData?: any

  // Sitemap fields
  sitemapPriority?: number
  sitemapChangefreq?: string
  includeInSitemap?: boolean
}
