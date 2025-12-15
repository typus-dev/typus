/* @Tags: Utils, CMS, Content Processing */

import type { ICmsItem } from './types'

/**
 * Extract excerpt from raw HTML/Markdown content
 */
export function extractExcerpt(raw?: string, limit = 180): string {
  if (!raw) return ''

  // 1) Decode HTML entities (<h1> → <h1>)
  const decoded = (() => {
    // DOM-based decoder (safe, no innerHTML injection)
    const doc = new DOMParser().parseFromString(`<x>${raw}</x>`, 'text/html')
    return (doc.documentElement.textContent ?? '').toString()
  })()

  // 2) Strip HTML tags
  const noHtml = decoded.replace(/<[^>]*>/g, ' ')

  // 3) Strip common Markdown artifacts
  const noMd = noHtml
    .replace(/```[\s\S]*?```/g, ' ')      // fenced code
    .replace(/`[^`]*`/g, ' ')             // inline code
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // images
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')  // links
    .replace(/^[#>*+\-\s]+/gm, ' ')       // list/blockquote/heading tokens
    .replace(/[_*~`]/g, ' ')              // emphasis tokens

  // 4) Normalize whitespace
  const text = noMd.replace(/\s+/g, ' ').trim()

  // 5) Soft truncate by word
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const soft = cut.lastIndexOf(' ')
  return (soft > 60 ? cut.slice(0, soft) : cut).trim() + '…'
}

/**
 * Normalize selected category value for API filters
 */
export function normalizeSelectedCategory(val: unknown): number | null {
  // Treat 'all', null, undefined, 0, '0' as no filter
  if (val === 'all' || val == null) return null
  const n = Number(val)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

/**
 * Format cache size in human readable format
 */
export function formatCacheSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB'

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Transform raw CMS item from API to display format
 */
export function transformContentItem(item: any): any {
  console.log("[transformContentItem]",item)
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    category: (item.categories?.length > 0 ? item.categories[0]?.category?.name : 'Uncategorized'),
    tags: (item.tags as any)?.map((t: any) => t.name) || [],
    image_url: (item as any).ogImage?.path || null,
    updated_date: (item as any).updatedAt,
    created_date: (item as any).createdAt,
    publish_date: (item as any).publishAt,
    views: (item as any).views || 0,
    sitePath: item.sitePath,
    categories: item.categories?.map((c: any) => c.category || c) || [],
    excerpt: extractExcerpt((item as any).content),
    excerptHtml: item.content || '',
    cacheInfo: (item as any).cacheInfo
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, locale = 'en-US', format: 'short' | 'long' = 'short'): string {
  const options = format === 'short'
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }

  return new Date(dateString).toLocaleString(locale, options as any)
}

/**
 * Get category badge variant based on category name
 */
export function getCategoryBadgeVariant(category: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' {
  const variants: Record<string, 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
    blog: 'info',
    news: 'error',
    product: 'success',
    guide: 'primary',
    announcement: 'warning'
  }
  return variants[category?.toLowerCase()] || 'info'
}

/**
 * Build sorting order for API calls
 */
export function getSortOrderBy(sortValue: string): any {
  switch (sortValue) {
    case '-updatedAt':
      return { updatedAt: 'desc' }
    case '-createdAt':
      return { createdAt: 'desc' }
    case 'title':
      return { title: 'asc' }
    case '-views':
      return { views: 'desc' }
    default:
      return { updatedAt: 'desc' }
  }
}

/**
 * Generate cache tooltip text
 */
export function getCacheTooltip(content: any): string {
  if (!content.cacheInfo?.exists) {
    return 'Generate cache'
  }
  return `Cached (${formatCacheSize(content.cacheInfo.size)})`
}

/**
 * Generate visible page numbers for pagination
 */
export function generateVisiblePages(currentPage: number, totalPages: number): Array<number | string> {
  const pages: (number | string)[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 4) pages.push('...')
    const start = Math.max(2, currentPage - 2)
    const end = Math.min(totalPages - 1, currentPage + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 3) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)
  }
  return pages
}
