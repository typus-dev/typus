/* @Tags: DSL, DSX, CMS */
import { DSL, initDslClient } from '@/dsl/client'
import { logger } from '@/core/logging/logger'
import { useApi } from '@/shared/composables/useApi'
import type { ICmsItem, ICmsItemType, ICmsCategory, ICmsTag } from '../types'
import type { Router } from 'vue-router'

// CMS methods
export const CmsMethods = {
  // Content Item methods
 async createContentItem(formData: Partial<ICmsItem>): Promise<ICmsItem> {
    if (formData.publishAt instanceof Date) {
      formData.publishAt = formData.publishAt.toISOString()
    }
    
    const result = await DSL.CmsItem.create(formData)
    logger.debug('[CmsMethods] Content item created successfully', { formData })
    return result
  },

  async updateContentItem(formData: Partial<ICmsItem>, params: { id: string }): Promise<void> {
    // Convert publishAt to ISO-8601 string if it's a Date object
    if (formData.publishAt instanceof Date) {
      formData.publishAt = formData.publishAt.toISOString()
    } else if (typeof formData.publishAt === 'string' && formData.publishAt) {
      // If it's already a string, ensure it's a valid ISO string by re-parsing and re-serializing
      try {
        const date = new Date(formData.publishAt)
        if (!isNaN(date.getTime())) {
          formData.publishAt = date.toISOString()
        } else {
          logger.warn('[CmsMethods] Invalid date string for publishAt in updateContentItem, keeping as is:', formData.publishAt)
        }
      } catch (e) {
        logger.error('[CmsMethods] Error re-formatting publishAt string in updateContentItem:', e)
      }
    }

    await DSL.CmsItem.update(parseInt(params.id), formData)
    logger.debug('[CmsMethods] Content item updated successfully', { formData })
  },

  async deleteContentItem(id: number): Promise<void> {
    await DSL.CmsItem.delete(id)
    logger.debug('[CmsMethods] Content item deleted successfully', { id })
  },

  async getContentItemData(params: { id: string }): Promise<Partial<ICmsItem>> {
    logger.debug('[CmsMethods] Fetching content item data', { params })
    const item = await DSL.CmsItem.findById(parseInt(params.id), ['type', 'categories', 'tags', 'ogImage'])
    logger.debug('[CmsMethods.getContentItemData] Content item fetched successfully', { item })

    return {
      // ID field - IMPORTANT for AI generation
      id: item.id,

      // Basic content fields
      title: item.title,
      slug: item.slug,
      type: item.type,
      status: item.status,
      content: item.content,
      sitePath: item.sitePath,
      metadata: item.metadata,
      layout: item.layout,
      // Publishing fields
      publishedAt: item.publishedAt,
      publishAt: item.publishAt,
      scheduledBy: item.scheduledBy,
      isPublic: item.isPublic,

      // SEO Meta fields
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
      metaKeywords: item.metaKeywords,
      canonicalUrl: item.canonicalUrl,
      robotsMeta: item.robotsMeta,

      // Open Graph fields
      ogTitle: item.ogTitle,
      ogDescription: item.ogDescription,
      ogImageId: item.ogImageId,

      // Schema.org fields
      schemaType: item.schemaType,
      structuredData: item.structuredData,

      // Sitemap fields
      sitemapPriority: item.sitemapPriority,
      sitemapChangefreq: item.sitemapChangefreq,
      includeInSitemap: item.includeInSitemap,

      // Cache fields
      cacheEnabled: item.cacheEnabled,
      cacheTtl: item.cacheTtl,
      cacheInfo: item.cacheInfo,

      // Relations
      categories: item.categories,
      tags: item.tags,
      ogImage: item.ogImage
    }
  },

  async getContentItems(filter?: any, options?: {
    page?: number,
    limit?: number,
    orderBy?: any
  }) {

     logger.debug('[CmsMethods] getContentItems called', { filter, options })
  

    const result = await DSL.CmsItem.findMany(
      filter || {},
      ['categories', 'tags', 'type', 'ogImage'],
      options
    )
     logger.debug('[CmsMethods] getContentItems result', result)
  

    // Handle both paginated and non-paginated responses
    const items = result.data || result
    const paginationMeta = result.paginationMeta

    const transformedData = items.map(item => ({
      ...item,
      categories: item.categories || [],
      tags: item.tags || [],
      cacheInfo: item.cacheInfo, // Add cache info field
      actions: {
        view: `/cms/view/${item.id}`,
        edit: `/cms/editor/${item.id}`
      }
    }))

    logger.debug('[CmsMethods] Content items fetched', {
      count: transformedData.length,
      hasPagination: !!paginationMeta
    })

    return paginationMeta
      ? { data: transformedData, paginationMeta }
      : transformedData
  },

  async getContentStatusCounts(baseFilter: Record<string, any> = {}) {
    const filterWithoutStatus = { ...baseFilter }
    if ('status' in filterWithoutStatus) {
      delete filterWithoutStatus.status
    }

    const buildFilterWithStatus = (status?: string) => (
      status
        ? { ...filterWithoutStatus, status }
        : { ...filterWithoutStatus }
    )

    const normalizeCount = (value: unknown): number => {
      if (typeof value === 'number') {
        return value
      }

      if (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
        const dataValue = (value as Record<string, unknown>).data
        if (typeof dataValue === 'number') {
          return dataValue
        }
      }

      return 0
    }

    try {
      const [allRaw, publishedRaw, draftRaw, scheduledRaw] = await Promise.all([
        DSL.CmsItem.count(buildFilterWithStatus()),
        DSL.CmsItem.count(buildFilterWithStatus('published')),
        DSL.CmsItem.count(buildFilterWithStatus('draft')),
        DSL.CmsItem.count(buildFilterWithStatus('scheduled'))
      ])

      return {
        all: normalizeCount(allRaw),
        published: normalizeCount(publishedRaw),
        draft: normalizeCount(draftRaw),
        scheduled: normalizeCount(scheduledRaw)
      }
    } catch (error) {
      logger.error('[CmsMethods] Failed to load status counts', { baseFilter: filterWithoutStatus, error })
      return { all: 0, published: 0, draft: 0, scheduled: 0 }
    }
  },

  // SEO-specific methods
  async updateSeoData(id: number, seoData: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;
    robotsMeta?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageId?: number;
    schemaType?: string;
    structuredData?: object;
  }): Promise<void> {
    await DSL.CmsItem.update(id, seoData)
    logger.debug('[CmsMethods] SEO data updated successfully', { id, seoData })
  },

  async updateSitemapSettings(id: number, sitemapData: {
    sitemapPriority?: number;
    sitemapChangefreq?: string;
    includeInSitemap?: boolean;
  }): Promise<void> {
    await DSL.CmsItem.update(id, sitemapData)
    logger.debug('[CmsMethods] Sitemap settings updated successfully', { id, sitemapData })
  },

  async updateCacheSettings(id: number, cacheData: {
    cacheEnabled?: boolean;
    cacheTtl?: number;
  }): Promise<void> {
    await DSL.CmsItem.update(id, cacheData)
    logger.debug('[CmsMethods] Cache settings updated successfully', { id, cacheData })
  },

  async getCacheInfo(id: number): Promise<{ exists: boolean, size?: number, lastModified?: Date, url?: string }> {
    try {
      // Get the content item to extract its sitePath
      const item = await DSL.CmsItem.findById(id)
      if (!item || !item.sitePath) {
        logger.warn('[CmsMethods] Content item not found or has no sitePath', { id })
        return { exists: false }
      }

      // Use HTML Cache Module API to check cache status
      const { error, data } = await useApi(`/html-cache/check/${encodeURIComponent(item.sitePath)}`).get()

      if (error) {
        logger.error('[CmsMethods] Failed to get cache info via API', { id, sitePath: item.sitePath, error })
        return { exists: false }
      }

      logger.debug('[CmsMethods] Cache API response', { id, data })

      if (data && data.success && data.data) {
        return {
          exists: data.data.exists,
          size: data.data.size,
          lastModified: data.data.lastModified ? new Date(data.data.lastModified) : undefined,
          url: data.data.url
        }
      } else if (data && data.exists !== undefined) {
        // Handle direct response format (fallback)
        return {
          exists: data.exists,
          size: data.size,
          lastModified: data.lastModified ? new Date(data.lastModified) : undefined,
          url: data.url
        }
      } else {
        logger.warn('[CmsMethods] Failed to get cache info', { id, data })
        return { exists: false }
      }
    } catch (error) {
      logger.error('[CmsMethods] Error getting cache info', { id, error })
      return { exists: false }
    }
  },

  async clearCache(id: number): Promise<void> {
    try {
      // Get the content item to extract its sitePath
      const item = await DSL.CmsItem.findById(id)
      if (!item || !item.sitePath) {
        logger.warn('[CmsMethods] Content item not found or has no sitePath', { id })
        throw new Error('Content item not found or has no URL path')
      }

      // Use HTML Cache Module API for cache invalidation
      const { error, data } = await useApi('/html-cache/invalidate').del({
        data: { url: item.sitePath }
      })

      if (error) {
        logger.error('[CmsMethods] Failed to invalidate cache via API', { id, sitePath: item.sitePath, error })
        throw new Error(typeof error === 'string' ? error : 'Failed to invalidate cache')
      }

      logger.debug('[CmsMethods] Cache invalidated successfully via API', { id, sitePath: item.sitePath, data })
    } catch (error) {
      logger.error('[CmsMethods] Error invalidating cache', { id, error })
      throw error
    }
  },

  async generateCache(id: number): Promise<void> {
    try {
      // Get the content item to extract its sitePath
      const item = await DSL.CmsItem.findById(id)

      // Support both camelCase (sitePath) and snake_case (site_path) from DSL
      const sitePath = (item as any)?.sitePath || (item as any)?.site_path

      if (!item || !sitePath) {
        logger.warn('[CmsMethods] Content item not found or has no sitePath', { id, item })
        throw new Error('Content item not found or has no URL path')
      }

      // Use HTML Cache Module API for cache generation
      const { error, data } = await useApi('/html-cache/generate').post({
        url: sitePath,
        priority: 'normal',
        force: true
      })

      if (error) {
        logger.error('[CmsMethods] Failed to generate cache via API', { id, sitePath, error })
        throw new Error(typeof error === 'string' ? error : 'Failed to generate cache')
      }

      logger.debug('[CmsMethods] Cache generated successfully via API', { id, sitePath, data })
    } catch (error) {
      logger.error('[CmsMethods] Error generating cache', { id, error })
      throw error
    }
  },

  async generateFastCache(id: number): Promise<{ success: boolean; url: string; size: number; renderTime: number }> {
    try {
      logger.debug('[CmsMethods] Generating fast cache for CMS item', { id })

      // Use HTML Cache Module API for fast cache generation
      const { error, data } = await useApi('/html-cache/generate-fast').post({
        cmsItemId: id
      })

      if (error) {
        logger.error('[CmsMethods] Failed to generate fast cache via API', { id, error })
        throw new Error(typeof error === 'string' ? error : 'Failed to generate fast cache')
      }

      logger.debug('[CmsMethods] Fast cache generated successfully via API', { id, data })

      // Return data directly (it already contains success, url, size, renderTime)
      return data?.data || data
    } catch (error) {
      logger.error('[CmsMethods] Error generating fast cache', { id, error })
      throw error
    }
  },

  async generateStructuredData(id: number): Promise<any> {
    const item = await DSL.CmsItem.findById(id, ['type', 'categories', 'tags'])

    const structuredData: any = {
      "@context": "https://schema.org",
      "@type": item.schemaType || "WebPage",
      "name": item.metaTitle || item.title,
      "description": item.metaDescription,
      "url": item.canonicalUrl || item.sitePath,
      "datePublished": item.publishedAt,
      "dateModified": item.updatedAt
    }

    // Add additional fields based on schema type
    if (item.schemaType === 'Article' || item.schemaType === 'NewsArticle' || item.schemaType === 'BlogPosting') {
      structuredData.headline = item.metaTitle || item.title
      structuredData.articleSection = item.categories?.[0]?.name
    }


    logger.debug('[CmsMethods] Structured data generated', { id, structuredData })
    return structuredData
  },

  // Media methods for OG images
  async getMediaOptions(): Promise<Array<{ value: number; label: string; url?: string }>> {
    const media = await DSL.CmsMedia.findMany({
      mimeType: { startsWith: 'image/' }
    })

    return media.map((item: any) => ({
      value: item.id,
      label: item.originalFilename,
      url: item.path
    }))
  },



  /**
   * Get category children with hasChildren flag for hierarchical picker
   */
  async getCategoryChildren(parentId?: number): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    parentId?: number;
    hasChildren: boolean
  }>> {
    try {
      const filter = { parentId: parentId || null }
      const categories = await DSL.CmsCategory.findMany(filter, ['children'])

      logger.debug('[CmsMethods] Category children fetched', { parentId, count: categories.length, categories })

      return categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        hasChildren: category.children && category.children.length > 0
      }))
    } catch (error: any) {
      logger.error('[CmsMethods] Error fetching category children', { parentId, error })
      throw error
    }
  },

  /**
   * Get flattened hierarchy categories for picker initialization
   */
  async getCategoriesHierarchy(): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    parentId?: number;
    hasChildren: boolean
  }>> {
    try {
      // Simplified query without include to avoid relation issues
      const categories = await DSL.CmsCategory.findMany()

      logger.debug('[CmsMethods] Categories hierarchy fetched', { count: categories.length })

      // Build hierarchy manually by processing relations
      const categoryMap = new Map()
      const rootCategories = []

      // First pass: create map of all categories
      for (const category of categories) {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          hasChildren: false,
          children: []
        })
      }

      // Second pass: build tree structure
      for (const category of categories) {
        const cat = categoryMap.get(category.id)

        if (category.parentId) {
          // Has parent - add to parent's children
          const parent = categoryMap.get(category.parentId)
          if (parent) {
            parent.children.push(cat)
            parent.hasChildren = true
          }
        } else {
          // Root category
          rootCategories.push(cat)
        }
      }

      // Flatten the hierarchy for frontend consumption
      const flattenHierarchy = (cats: any[], result: any[] = []): any[] => {
        for (const cat of cats) {
          // Add current category (without children to avoid recursion)
          result.push({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentId,
            hasChildren: cat.hasChildren
          })

          if (cat.hasChildren && cat.children.length > 0) {
            flattenHierarchy(cat.children, result)
          }
        }
        return result
      }

      return flattenHierarchy(rootCategories)
    } catch (error: any) {
      logger.error('[CmsMethods] Error fetching categories hierarchy', { error, message: error.message })
      throw error
    }
  },


  async createCategory(formData: Partial<ICmsCategory>): Promise<ICmsCategory> {
    try {
      if (!formData.name || formData.name.trim().length === 0) {
        throw new Error('Category name is required')
      }

      if (formData.name.length > 100) {
        throw new Error('Category name must be 100 characters or less')
      }

      // Generate slug if not provided
      const slug = formData.slug
        ? formData.slug
        : formData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()

      const newCategory = await DSL.CmsCategory.create({
        name: formData.name.trim(),
        slug,
        parentId: formData.parentId ?? null,
      })

      logger.debug('[CmsMethods] Category created successfully', { newCategory })
      return newCategory
    } catch (error: any) {
      logger.error('[CmsMethods] Error creating category', { formData, error })
      throw error
    }
  },

  /**
   * Create category with parentId support
   */
  // REPLACE ONLY this method inside CmsMethods

  async createCategoryWithParent(
    name: string,
    parentId?: number
  ): Promise<ICmsCategory> {
    try {
      logger.debug('[CmsMethods] createCategoryWithParent START', { name, parentId, parentIdType: typeof parentId })

      if (!name || name.trim().length === 0) {
        throw new Error('Category name is required')
      }
      if (name.length > 100) {
        throw new Error('Category name must be 100 characters or less')
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      logger.debug('[CmsMethods] Slug generated', { originalName: name, generatedSlug: slug, slugLength: slug.length })

      // ✅ Prisma-safe duplicate check: no `mode` usage
      const normalizedParent: number | null = Number.isFinite(parentId as number)
        ? (parentId as number)
        : null

      logger.debug('[CmsMethods] Parent normalization', {
        originalParentId: parentId,
        normalizedParent,
        isNull: normalizedParent === null,
        isUndefined: normalizedParent === undefined
      })

      // Load siblings in the same level
      const siblings = await DSL.CmsCategory.findMany({
        parentId: normalizedParent
      })

      logger.debug('[CmsMethods] Siblings loaded', { siblingCount: siblings.length, parentIdFilter: normalizedParent })

      // Case-insensitive comparison in JS
      const wanted = name.trim().toLowerCase()
      const exists = siblings.some((c: any) => (c?.name ?? '').trim().toLowerCase() === wanted)
      if (exists) {
        throw new Error(`Category "${name}" already exists in this level`)
      }

      // Create
      const formData: Partial<ICmsCategory> = {
        name: name.trim(),
        slug,
        parentId: normalizedParent
      }

      logger.debug('[CmsMethods] Formdata prepared for Prisma create', {
        formData,
        hasSlug: !!formData.slug,
        slugValue: formData.slug,
        parentIdValue: formData.parentId,
        parentIdIsNull: formData.parentId === null,
        parentIdIsUndefined: formData.parentId === undefined
      })

      const newCategory = await DSL.CmsCategory.create(formData)
      logger.debug('[CmsMethods] Category created with parent', {
        newCategory,
        parentId: normalizedParent
      })

      return newCategory
    } catch (error: any) {
      logger.error('[CmsMethods] Error creating category with parent', { name, parentId, error, errorMessage: error.message, errorStack: error.stack })
      throw error
    }
  },

  async getCategories(): Promise<Array<{ id: number; name: string; description?: string; actions: { edit: string; view: string } }>> {
    const categories = await DSL.CmsCategory.findMany()
    logger.debug('[CmsMethods] Categories fetched successfully', { categories })

    // Transform categories for display
    return categories.map((category: ICmsCategory) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      actions: {
        edit: `/cms/categories/${category.id}/edit`,
        view: `/cms/categories/${category.id}`
      }
    }))
  },

  async getCategoryOptions(): Promise<Array<{ value: number; label: string }>> {
    const categories = await DSL.CmsCategory.findMany()

    logger.debug('[CmsMethods] Categories fetched successfully', { categories })

    return categories.map((category: ICmsCategory) => ({
      value: category.id,
      label: category.name
    }))
  },

  // Tag methods
  async createTag(formData: Partial<ICmsTag>) {
    await DSL.CmsTag.create(formData)
    logger.debug('[CmsMethods] Tag created successfully', { formData })

    // Refresh page
    window.location.reload()
  },

  async getTags(): Promise<Array<{ value: number; label: string }>> {
    const tags = await DSL.CmsTag.findMany()
    logger.debug('[CmsMethods] Tags fetched successfully', { tags })

    return tags.map((tag: ICmsTag) => ({
      value: tag.id,
      label: tag.name
    }))
  },

  // Scheduled Publishing methods
  async scheduleContentItem(id: number, publishAt: Date): Promise<void> {
    // Convert publishAt to ISO-8601 string
    const formattedPublishAt = publishAt.toISOString()

    await DSL.CmsItem.update(id, {
      status: 'scheduled',
      publishAt: formattedPublishAt
    })

    logger.debug('[CmsMethods] Content item scheduled successfully', { id, publishAt: formattedPublishAt })
  },

  async cancelScheduledPublication(id: number): Promise<void> {
    await DSL.CmsItem.update(id, {
      status: 'draft',
      publishAt: null
    })

    logger.debug('[CmsMethods] Scheduled publication cancelled', { id })
  },

  async publishContentItemNow(id: number): Promise<void> {
    const now = new Date()
    await DSL.CmsItem.update(id, {
      status: 'published',
      publishedAt: now,
      publishAt: null
    })

    logger.debug('[CmsMethods] Content item published immediately', { id, publishedAt: now })
  },

  async getScheduledContentItems(): Promise<ICmsItem[]> {
    const items = await DSL.CmsItem.findMany(
      { status: 'scheduled' },  // filter
      ['type'],                 // include
      { orderBy: { publishAt: 'asc' } }  // pagination
    )

    logger.debug('[CmsMethods] Scheduled content items fetched', { count: items.length })
    return items
  },

  async getOverdueContentItems(): Promise<ICmsItem[]> {
    const now = new Date()
    const items = await DSL.CmsItem.findMany(
      {                         // filter
        status: 'scheduled',
        publishAt: { lt: now }
      },
      ['type'],                 // include
      { orderBy: { publishAt: 'asc' } }  // pagination
    )

    logger.debug('[CmsMethods] Overdue content items fetched', { count: items.length })
    return items
  },

  // AI Assistant methods
  async generateSeoWithAI(id: number): Promise<{
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
  }> {
    try {
      // Ensure id is a valid number
      const cmsItemId = Number(id)
      if (!Number.isInteger(cmsItemId) || cmsItemId <= 0) {
        throw new Error(`Invalid CMS item ID: ${id}`)
      }

      const payload = {
        cmsItemId,
        type: 'seo-generation' as const
      }

      logger.debug('[CmsMethods] Sending SEO generation request', payload)

      // Use useApi instead of fetch
      const { error, data } = await useApi('/ai-assistant/generate-seo').post(payload)

      if (error) {
        logger.error('[CmsMethods] Failed to generate SEO data', { id: cmsItemId, error })
        throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
      }

      logger.debug('[CmsMethods] SEO data generated successfully', { id: cmsItemId, data })
      return data
    } catch (error) {
      logger.error('[CmsMethods] Failed to generate SEO data', { id, error })
      throw error
    }

  },

  /**
   * Check if a site path is available for use (not already taken by another CMS item)
   * @param sitePath - The path to check
   * @param excludeId - Optional CMS item ID to exclude from the check (useful when editing)
   * @returns Promise that resolves to boolean indicating availability
   */
  async checkPathAvailability(sitePath: string, excludeId?: number): Promise<boolean> {
    try {
      logger.debug('[CmsMethods] Checking path availability', { sitePath, excludeId })

      const filter: any = { sitePath }

      // Exclude a specific item if editing (don't count current item as conflict)
      if (excludeId) {
        filter.id = { not: excludeId }
      }

      const existingItem = await DSL.CmsItem.findMany(filter)

      const isAvailable = existingItem.length === 0

      logger.debug('[CmsMethods] Path availability check', {
        sitePath,
        excludeId,
        isAvailable,
        conflictingCount: existingItem.length
      })

      return isAvailable
    } catch (error: any) {
      logger.error('[CmsMethods] Error checking path availability', { sitePath, excludeId, error })
      throw error
    }
  },

  /**
   * Generate a unique site path based on category hierarchy and content slug
   * @param categories - Array of categories with id, name, and slug
   * @param contentSlug - The slug of the content item
   * @param excludeId - Optional CMS item ID to exclude from uniqueness check
   * @returns Promise that resolves to a unique available path
   */
  async generateUniqueSitePath(
    categories: Array<{ id: number; name: string; slug: string }>,
    contentSlug: string,
    excludeId?: number
  ): Promise<string> {
    try {
      logger.debug('[CmsMethods] Generating unique site path', {
        categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
        contentSlug,
        excludeId
      })

      if (!contentSlug) {
        contentSlug = 'untitled'
      }

      // Clean the content slug
      const { cleanSlug } = await import('../utils/pathGenerator')
      const cleanContentSlug = cleanSlug(contentSlug)

      // DEBUG: Show exact data received
      console.log('[CmsMethods.DEBUG] generateUniqueSitePath RECEIVED:', {
        categories: categories,
        categoriesMapped: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
        categoriesRaw: JSON.stringify(categories),
        contentSlug: contentSlug,
        cleanContentSlug: cleanContentSlug
      })

      // Build base path from categories + content slug
      let segments = ['']
      console.log('[CmsMethods.DEBUG] Initial segments:', segments)

      // Add category slugs in order
      console.log('[CmsMethods.DEBUG] Processing categories:')
      for (const [index, category] of categories.entries()) {
        console.log(`[CmsMethods.DEBUG] Category ${index}:`, {
          raw: category,
          id: category?.id,
          name: category?.name,
          slug: category?.slug,
          slugIsValid: !!category?.slug,
          slugType: typeof category?.slug
        })
        if (category?.slug && typeof category.slug === 'string') {
          segments.push(category.slug)
        } else if (!category?.slug) {
          console.log(`[CmsMethods.DEBUG] Category ${index} has NO slug!`, category)
        } else {
          console.log(`[CmsMethods.DEBUG] Category ${index} slug is not string:`, category.slug)
        }
      }

      console.log('[CmsMethods.DEBUG] Segments after categories:', segments)

      // Add content slug
      segments.push(cleanContentSlug)
      console.log('[CmsMethods.DEBUG] Final segments:', segments)

      // Join to form base path
      let basePath = segments.join('/')
      basePath = basePath.replace(/\/+/g, '/') // Remove double slashes
      console.log('[CmsMethods.DEBUG] Base path after join:', basePath)

      // Always use category structure if categories exist, otherwise fallback to content
      console.log('[CmsMethods.DEBUG] Checking condition - segments.length:', segments.length)
      if (segments.length === 2) { // Only ['', 'content-slug'] - no categories
        console.log('[CmsMethods.DEBUG] CONDITION: USING CONTENT FALLBACK')
        basePath = `/${cleanContentSlug}`
      } else {
        console.log('[CmsMethods.DEBUG] CONDITION: USING CATEGORY PATH AS-IS')
        // If we have categories (segments.length >= 3), keep the category path as-is
      }
      console.log('[CmsMethods.DEBUG] FINAL BASE PATH:', basePath)

      logger.debug('[CmsMethods] Base path generated', { basePath })

      // Check if base path is available
      const isAvailable = await this.checkPathAvailability(basePath, excludeId)

      if (isAvailable) {
        logger.debug('[CmsMethods] Base path is available', { basePath })
        return basePath
      }

      // Base path is taken, try numbered variants
      let counter = 2
      let uniquePath = basePath
      const maxAttempts = 100

      while (!(await this.checkPathAvailability(uniquePath, excludeId))) {
        // Insert counter before content slug part
        const pathParts = basePath.split('/')
        const contentSlugPart = pathParts.pop() || cleanContentSlug
        const categoryPath = pathParts.join('/') || '/'

        const numberedSlug = `${contentSlugPart}-${counter}`
        uniquePath = categoryPath === '/content' && pathParts.length === 1
          ? `/${pathParts[0]}/${numberedSlug}`
          : `${pathParts.join('/')}/${numberedSlug}`

        // Ensure it starts with /
        if (!uniquePath.startsWith('/')) {
          uniquePath = `/${uniquePath}`
        }

        logger.debug('[CmsMethods] Trying numbered variant', { counter, uniquePath })
        counter++

        if (counter > maxAttempts) {
          throw new Error(`Could not generate unique path within ${maxAttempts} attempts for: ${contentSlug}`)
        }
      }

      logger.debug('[CmsMethods] Unique path found', { uniquePath })
      return uniquePath

    } catch (error: any) {
      logger.error('[CmsMethods] Error generating unique site path', {
        categories: categories.map(c => c.name),
        contentSlug,
        excludeId,
        error
      })
      throw error
    }
  },


  /**
   * Parse site path to extract category structure and content slug
   * @param sitePath - The full site path to parse (e.g., "/docs/system-flows/session-management")
   * @param categoryCache - Optional cached categories to avoid DB hits
   * @returns Object with categories array and content slug
   */
  async parseSitePathToCategories(
    sitePath: string,
    categoryCache?: Array<{ id: number; name: string; slug: string; parentId?: number | null }>
  ): Promise<{
    categories: Array<{ id: number; name: string; slug: string; parentId?: number }>;
    contentSlug: string;
  }> {
    try {
      if (!sitePath || sitePath === '/') {
        return { categories: [], contentSlug: '' }
      }

      // Normalize path and split into segments
      const normalizedPath = sitePath.replace(/\/+$/, '').replace(/^\/+/, '/')
      const segments = normalizedPath.split('/').filter(Boolean)

      if (segments.length === 0) {
        return { categories: [], contentSlug: '' }
      }

      // Last segment is content slug, others are category slugs
      const contentSlug = segments[segments.length - 1]
      const categorySegments = segments.slice(0, -1)

      if (categorySegments.length === 0) {
        return { categories: [], contentSlug }
      }

      // Get categories (from cache or DB)
      const allCategories = categoryCache || await DSL.CmsCategory.findMany()

      // Build lookup map with slug::parentId key for precise matching
      const keyOf = (slug: string, parentId?: number | null) => `${slug}::${parentId ?? 'root'}`
      const categoryMap = new Map(
        allCategories.map(cat => [keyOf(cat.slug, cat.parentId ?? null), cat])
      )

      // Build category hierarchy from path segments
      const categories = []
      let currentParentId: number | null = null

      for (const segment of categorySegments) {
        const match = categoryMap.get(keyOf(segment, currentParentId))

        if (match) {
          categories.push({
            id: match.id,
            name: match.name,
            slug: match.slug,
            parentId: match.parentId ?? undefined
          })
          currentParentId = match.id
        } else {
          logger.warn('[CmsMethods] Category not found for path segment', {
            segment,
            expectedParent: currentParentId,
            sitePath
          })
          break
        }
      }

      logger.debug('[CmsMethods] Parsed site path', {
        sitePath,
        segments,
        categorySegments,
        contentSlug,
        foundCategories: categories.length
      })

      return { categories, contentSlug }
    } catch (error: any) {
      logger.error('[CmsMethods] Error parsing site path', { sitePath, error })
      return { categories: [], contentSlug: sitePath.split('/').pop() || '' }
    }
  },

  async updateCategoriesFromPath(sitePath: string): Promise<ICmsCategory[]> {
  const { categories } = await this.parseSitePathToCategories(sitePath)
  return categories
},
  /**
   * Sync categories from site path when loading content item
   * @param cmsItem - The CMS item to sync categories for
   * @returns Updated CMS item with synced categories
   */
  async syncCategoriesFromSitePath(cmsItem: Partial<ICmsItem>): Promise<Partial<ICmsItem>> {
    try {
      if (!cmsItem.sitePath) {
        return cmsItem
      }

      const { categories } = await this.parseSitePathToCategories(cmsItem.sitePath)

      // Update the item's categories if they differ from parsed categories
      const currentCategoryIds = (cmsItem.categories || []).map(c => c.id).sort()
      const parsedCategoryIds = categories.map(c => c.id).sort()

      const categoriesMatch = currentCategoryIds.length === parsedCategoryIds.length &&
        currentCategoryIds.every((id, index) => id === parsedCategoryIds[index])

      if (!categoriesMatch) {
        logger.debug('[CmsMethods] Syncing categories from site path', {
          sitePath: cmsItem.sitePath,
          currentCategories: currentCategoryIds,
          parsedCategories: parsedCategoryIds
        })

        cmsItem.categories = categories
      }

      return cmsItem
    } catch (error: any) {
      logger.error('[CmsMethods] Error syncing categories from site path', {
        sitePath: cmsItem.sitePath,
        error
      })
      return cmsItem
    }
  },

  /**
   * Enhanced unique site path generation that ensures slug matches path
   * @param categories - Array of categories with id, name, and slug
   * @param contentSlug - The base slug for the content item
   * @param excludeId - Optional CMS item ID to exclude from uniqueness check
   * @returns Promise that resolves to { sitePath, finalSlug } where finalSlug matches path
   */
  async generateUniqueSitePathWithSlug(
    categories: Array<{ id: number; name: string; slug: string }>,
    contentSlug: string,
    excludeId?: number
  ): Promise<{ sitePath: string; finalSlug: string }> {
    try {
      if (!contentSlug) {
        contentSlug = 'untitled'
      }

      // Clean the content slug
      const { cleanSlug } = await import('../utils/pathGenerator')
      let finalSlug = cleanSlug(contentSlug)

      // Build category path
      const categoryPath = categories.length > 0
        ? '/' + categories.map(c => c.slug).join('/')
        : ''

      // Try base slug first
      let sitePath = `${categoryPath}/${finalSlug}`
      let counter = 2
      const maxAttempts = 100

      logger.debug('[CmsMethods] generateUniqueSitePathWithSlug - INITIAL PATH CHECK', {
        basePath: sitePath,
        categoryPath,
        finalSlug,
        excludeId
      })

      // Keep trying until we find an available path
      while (!(await this.checkPathAvailability(sitePath, excludeId))) {
        logger.debug('[CmsMethods] generateUniqueSitePathWithSlug - PATH CONFLICT DETECTED', {
          conflictingPath: sitePath,
          tryingCounter: counter,
          maxAttempts
        })
        finalSlug = `${cleanSlug(contentSlug)}-${counter}`
        sitePath = `${categoryPath}/${finalSlug}`

        logger.debug('[CmsMethods] Trying numbered variant', {
          counter,
          finalSlug,
          sitePath
        })

        counter++

        if (counter > maxAttempts) {
          throw new Error(`Could not generate unique path within ${maxAttempts} attempts for: ${contentSlug}`)
        }
      }

      logger.debug('[CmsMethods] Generated unique path with matching slug', {
        sitePath,
        finalSlug,
        categories: categories.map(c => c.slug)
      })

      return { sitePath, finalSlug }

    } catch (error: any) {
      logger.error('[CmsMethods] Error generating unique site path with slug', {
        categories: categories.map(c => c.name),
        contentSlug,
        excludeId,
        error
      })
      throw error
    }
  },

  // Layout methods
  async getAvailableLayouts(): Promise<Array<{ value: string; label: string; description?: string }>> {
    try {
      logger.debug('[CmsMethods] Getting available layouts')

      // Import layoutRegistry dynamically to avoid circular dependencies
      const { layoutRegistry } = await import('@/core/layouts/registry')

      const layouts = layoutRegistry.getAllWithMetadata().map(layout => ({
        value: layout.name,
        label: layout.name,
        description: layout.metadata?.description || `${layout.name} layout`
      }))

      logger.debug('[CmsMethods] Available layouts fetched', {
        count: layouts.length,
        layouts: layouts.map(l => l.value)
      })

      return layouts
    } catch (error) {
      logger.error('[CmsMethods] Error getting available layouts', { error })
      return []
    }
  },



}
