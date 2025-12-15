<route lang="json">
{
  "name": "cms-editor",
  "path": "/cms/editor/:id?",
  "meta": {
    "layout": "private",
    "subject": "cms-content"
  }
}
</route>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessages } from '@/shared/composables/useMessages'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { logger } from '@/core/logging/logger'
import type { ICmsItem, ICmsItemType } from '../types'
import { eventBus } from '@/core/events'

// Components
import dxContainer from '@/components/layout/dxContainer.vue'
import dxStack from '@/components/layout/dxStack.vue'
import dxGrid from '@/components/layout/dxGrid.vue'
import dxFlex from '@/components/layout/dxFlex.vue'
import dxSpinner from '@/components/ui/dxSpinner.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxContentEditorLayout from '@/components/ui/dxContentEditorLayout.vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'
import dxDateTime from '@/components/ui/dxDateTime.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'
import dxBadge from '@/components/ui/dxBadge.vue'

import ContentSidebar from '../components/ContentSidebar.vue'
import SeoSidebar from '../components/SeoSidebar.vue'
import MetadataEditor from '../components/MetadataEditor.vue'
import CategoryPicker from '../components/CategoryPicker.vue'

const router = useRouter()
const route = useRoute()
const { errorMessage, successMessage } = useMessages()
const { isMobile, isTablet, isDesktop } = useBreakpoint()

// Mode
const isCreateMode = computed(() => !route.params.id || route.params.id === 'create')
const cmsItemId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref<'content' | 'seo'>('content')
const showContentDrawer = ref(false)
const showSeoDrawer = ref(false)

const getDefaultFormData = (): Partial<ICmsItem> => ({
  title: '',
  slug: '',
  sitePath: '',
  type: undefined,
  status: 'draft',
  content: '',
  isPublic: false,
  publishAt: null,
  updatedAt: new Date().toISOString(),
  categories: [] as any[],
  layout: 'default' as string,

  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  canonicalUrl: '',
  robotsMeta: 'index,follow',

  ogTitle: '',
  ogDescription: '',
  ogImageId: null,

  schemaType: 'WebPage',
  structuredData: null,

  sitemapPriority: 0.5,
  sitemapChangefreq: 'monthly',
  includeInSitemap: true
})

const cmsItemData = ref<ICmsItem>(getDefaultFormData())

// Postponed indicator: true when publishAt is in the future
const isPostponed = computed(() => {
  const v = cmsItemData.value.publishAt as any
  if (!v) return false
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return false
  return d.getTime() > Date.now()
})

const mediaOptions = ref<Array<{ value: number; label: string; url?: string }>>([])
const categoryOptions = ref<Array<{ value: number; label: string }>>([])
const categories = ref<Array<{ id: number | string; name: string; slug: string; parentId?: number | string | null }>>([])
const availableLayouts = ref<Array<{ value: string; label: string; description?: string }>>([])

// Cache
const cacheInfo = ref<{ exists: boolean; size?: number; lastModified?: Date; url?: string }>({ exists: false })
const cacheLoading = ref(false)

// Path generation state
const isGeneratingPath = ref(false)
const pathLoading = ref(false)
const pathError = ref<string | null>(null)
const generatedPath = ref<string>('')           // last suggested path
const isPathManuallyEdited = ref(false)         // true only if user typed a different sitePath

const suppressAuto = ref(false)
const isHydratingFromPath = ref(false)

// Guard
const pathUpdateDebounce = ref(false)
const normalizeId = (id: string | number | undefined | null) => String(id ?? '')

// ===== Lifecycle
// Store unsubscribe function for cleanup
let unsubscribeNotification: (() => void) | null = null

onMounted(async () => {
  if (!isCreateMode.value) {
    await fetchCmsItemData()
    await fetchCacheInfo()
  }
  await fetchMediaOptions()
  await fetchCategoryOptions()
  await fetchCategories() // will try to regenerate path if slug+categories exist
  await fetchAvailableLayouts() // Load layout options for selector

  // Listen for cache generation completion notifications
  unsubscribeNotification = (eventBus as any).on('notification:realtime', async (notification: any) => {
    logger.debug('[CmsEditor] Received notification', notification)
    // Notification data is wrapped in notification.data or directly in notification
    const data = notification?.data || notification

    // taskType is in metadata
    const taskType = data?.metadata?.taskType || data?.taskType
    const taskStatus = data?.metadata?.type || data?.type

    logger.debug('[CmsEditor] Unwrapped data', {
      taskType,
      taskStatus,
      hasMetadata: !!data?.metadata,
      metadataKeys: data?.metadata ? Object.keys(data.metadata) : []
    })

    if (taskType === 'cache_generation_task' && taskStatus === 'success') {
      logger.info('[CmsEditor] Cache generation completed, refreshing cache info', data)
      await fetchCacheInfo()
    } else {
      logger.debug('[CmsEditor] Notification not for cache generation', {
        taskType,
        taskStatus,
        allKeys: Object.keys(data || {})
      })
    }
  })
})

onBeforeUnmount(() => {
  if (unsubscribeNotification) {
    unsubscribeNotification()
  }
})

watch(
  () => route.params.id,
  async newId => {
    if (newId && newId !== 'create') {
      await fetchCmsItemData()
      await fetchCacheInfo()
    } else {
      resetForm()
    }
  }
)

// ===== Data loading
function resetForm() {
  cmsItemData.value = getDefaultFormData()
  cacheInfo.value = { exists: false }
  error.value = null
}

async function fetchCmsItemData() {
  if (isCreateMode.value) return
  loading.value = true
  error.value = null

  try {
    isHydratingFromPath.value = true

    logger.debug('[CmsEditor] Fetching CMS item data for ID:', cmsItemId.value)
    const data = await CmsMethods.getContentItemData({ id: cmsItemId.value })

    logger.debug('[CmsEditor] Raw data received from backend:', {
      id: data?.id,
      layout: data?.layout,
      hasLayout: data && 'layout' in data,
      layoutValue: data?.layout,
      layoutType: typeof data?.layout,
      allKeys: data ? Object.keys(data) : [],
    })

    if (data) {
      cmsItemData.value = {
        ...data,
        publishAt: data.publishAt ? (typeof data.publishAt === 'string' ? new Date(data.publishAt) : data.publishAt as Date) : null,
        updatedAt: data.updatedAt || new Date().toISOString(),
        isPublic: data.status === 'published' || data.status === 'scheduled',
        type: typeof data.type === 'string' ? data.type : (data.type as any)?.name || '',
        layout: data.layout, // Add layout field from data
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        metaKeywords: data.metaKeywords || '',
        canonicalUrl: data.canonicalUrl || '',
        robotsMeta: data.robotsMeta || 'index,follow',
        ogTitle: data.ogTitle || '',
        ogDescription: data.ogDescription || '',
        schemaType: data.schemaType || 'WebPage',
        sitemapPriority: data.sitemapPriority || 0.5,
        sitemapChangefreq: data.sitemapChangefreq || 'monthly',
        includeInSitemap: data.includeInSitemap !== false,
        //categories: Array.isArray(data.categories) ? data.categories : []
      }

      const { categories } = await CmsMethods.parseSitePathToCategories(data.sitePath)
      cmsItemData.value.categories = categories

      logger.debug('[CmsEditor] Layout field processing:', {
        originalLayout: data.layout,
        cmsItemDataLayout: cmsItemData.value.layout,
        availableLayouts: availableLayouts.value.length,
        cmsItemDataKeys: Object.keys(cmsItemData.value),
      })

      logger.debug('[CmsEditor] Content item loaded with layout:', cmsItemData.value.layout)
    } else {
      error.value = 'Content item not found.'
      errorMessage('Content item not found.')
    }
  } catch (e: any) {
    logger.error('[CmsEditor] Error fetching content item data', e)
    error.value = e.message || 'Failed to load content item.'
    errorMessage(e.message || 'Failed to load content item.')
  } finally {
    loading.value = false
    await nextTick()
    isHydratingFromPath.value = false
  }
}

async function fetchMediaOptions() {
  try {
    mediaOptions.value = await CmsMethods.getMediaOptions()
  } catch (e: any) {
    logger.error('[CmsEditor] Error fetching media options', e)
  }
}

async function fetchCategoryOptions() {
  try {
    const cats = await CmsMethods.getCategoryOptions()
    logger.debug('[CmsEditor] fetchCategoryOptions', cats)
    categoryOptions.value = cats
  } catch (e: any) {
    logger.error('[CmsEditor] Error fetching category options', e)
  }
}

// Fetch real categories for CategoryPicker
async function fetchCategories() {
  try {
    const hierarchy = await CmsMethods.getCategoriesHierarchy()
    categories.value = hierarchy.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null
    }))
    // Ensure parent-first order
    categories.value.sort((a, b) => ((a.parentId ? 1 : 0) - (b.parentId ? 1 : 0)))

    console.log('[CmsEditor] Real categories loaded:', {
      count: categories.value.length,
      categories: categories.value.map(c => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId }))
    })

    reconcileTempCategories()

    // If we have slug, always suggest path (even if categories are empty)
//if (isCreateMode.value && cmsItemData.value.slug?.trim()) {
// await generateSitePath()
//}
  } catch (e: any) {
    logger.error('[CmsEditor] Error fetching categories for CategoryPicker', e)
    console.error('[CmsEditor] Failed to load real categories, will fall back to mock data')
  }
}

// Replace temporary optimistic categories with real ones by name+parentId
function reconcileTempCategories() {
  const current = cmsItemData.value.categories || []
  if (!current.length) return
  let changed = false

  const byKey = (c: any) => `${(c.name || '').toLowerCase()}::${normalizeId(c.parentId)}`
  const realMap = new Map(categories.value.map(c => [byKey(c), c]))

  const next = current.map((sel: any) => {
    const key = byKey(sel)
    const real = realMap.get(key)
    if (real && normalizeId(real.id) !== normalizeId(sel.id)) {
      changed = true
      return { id: real.id, name: real.name, slug: real.slug, parentId: real.parentId }
    }
    return sel
  })

  if (changed) {
    cmsItemData.value.categories = next
  }
}

// ===== Validation & Save
function validateContentItem(): string | null {
  if (!cmsItemData.value.title?.trim()) return 'Title is required'
  if (!cmsItemData.value.slug?.trim()) return 'Slug is required'
  if (!cmsItemData.value.sitePath?.trim()) return 'Site Path is required'
  return null
}

async function saveContentItem() {
  const validationError = validateContentItem()


  if (validationError) { errorMessage(validationError); return }

  loading.value = true
  try {
    const dataToSave: any = { ...cmsItemData.value }

    logger.debug("[dataToSave].cmsItemData",cmsItemData.value)
        logger.debug("[dataToSave].dataToSave",dataToSave)
    if (dataToSave.isPublic) {
      if (dataToSave.publishAt && new Date(dataToSave.publishAt) > new Date()) {
        dataToSave.status = 'scheduled'
      } else {
        dataToSave.status = 'published'
        dataToSave.publishedAt = new Date().toISOString()
      }
    } else {
      dataToSave.status = 'draft'
      dataToSave.publishedAt = null
    }

    if (dataToSave.publishAt instanceof Date) {
      dataToSave.publishAt = dataToSave.publishAt.toISOString()
    }

    if (typeof dataToSave.type === 'object' && dataToSave.type !== null) {
      dataToSave.type = (dataToSave.type as ICmsItemType).name
    }

    dataToSave.categoryIds = cmsItemData.value.categories?.map(c => c.id) || []


   logger.debug("[dataToSave].dataToSave-2",dataToSave)
 if (isCreateMode.value) {
  await CmsMethods.createContentItem(dataToSave)
  router.push('/cms/content')
} else {
      await CmsMethods.updateContentItem(dataToSave, { id: cmsItemId.value })
    }

     successMessage('Content saved successfully') 
  } catch (e: any) {
    logger.error('[CmsEditor] Error saving content item', e)
    errorMessage(e.message || 'Failed to save content item.')
  } finally {
    loading.value = false
  }
}

async function saveAndClose() {
  await saveContentItem()
  if (!error.value) {
    goToList()
  }
}

// ===== Cache

async function fetchCacheInfo() {
  if (isCreateMode.value) return
  cacheLoading.value = true
  try {
    // Always fetch from API to get latest cache status
    const freshCacheInfo = await CmsMethods.getCacheInfo(parseInt(cmsItemId.value))
    cacheInfo.value = freshCacheInfo
    logger.info('[CmsEditor] Cache info fetched from API', { cacheInfo: cacheInfo.value, exists: cacheInfo.value.exists })
  } catch (e: any) {
    logger.error('[CmsEditor] Error fetching cache info', e)
    cacheInfo.value = { exists: false }
  } finally {
    cacheLoading.value = false
  }
}

async function clearCache() {
  if (isCreateMode.value) return
  cacheLoading.value = true
  try {
    await CmsMethods.clearCache(parseInt(cmsItemId.value))
    cacheInfo.value = { exists: false }
    successMessage('Cache cleared successfully')
  } catch (e: any) {
    logger.error('[CmsEditor] Error clearing cache', e)
    errorMessage(e.message || 'Failed to clear cache.')
  } finally {
    cacheLoading.value = false
  }
}

async function generateCache() {
  if (isCreateMode.value) return
  cacheLoading.value = true
  try {
    await CmsMethods.generateCache(parseInt(cmsItemId.value))
    successMessage('Cache generation task queued. You will receive a notification when complete.')
    logger.info('[CmsEditor] Cache generation task queued successfully')
  } catch (e: any) {
    logger.error('[CmsEditor] Error generating cache', e)
    errorMessage(e.message || 'Failed to generate cache.')
  } finally {
    cacheLoading.value = false
  }
}

async function generateFastCache() {
  if (isCreateMode.value) return
  cacheLoading.value = true
  try {
    const result = await CmsMethods.generateFastCache(parseInt(cmsItemId.value))
    logger.debug('[CmsEditor] Fast cache API result', result)
    await fetchCacheInfo()
    const renderMs = typeof result?.renderTime === 'number' ? result.renderTime : 0
    const sizeKb = typeof result?.size === 'number' ? (result.size / 1024).toFixed(1) : '0.0'
    successMessage(`Static page saved in ${renderMs}ms (${sizeKb}KB)`)
    logger.info('[CmsEditor] Fast cache generated successfully', result)
  } catch (e: any) {
    logger.error('[CmsEditor] Error generating fast cache', e)
    errorMessage(e.message || 'Failed to generate fast cache.')
  } finally {
    cacheLoading.value = false
  }
}

// ===== PATH GENERATION CORE

/**
 * Always generate a unique site path when slug exists.
 * If categories are empty -> path is `/${slug}` (uniqueness still checked via CmsMethods).
 */
async function generateSitePath() {
  if (isGeneratingPath.value) {
    console.log('[CmsEditor] Skipping generateSitePath - already running')
    return
  }

  const cats = (cmsItemData.value.categories || []).filter(Boolean)
  const slug = cmsItemData.value.slug?.trim()

  if (!slug) {
    console.log('[CmsEditor] Skipping generateSitePath - slug is empty')
    generatedPath.value = ''
    return
  }

  isGeneratingPath.value = true
  pathLoading.value = true
  pathError.value = null

  try {
    suppressAuto.value = true

    const categoryPathItems = cats.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug
    }))

    const { sitePath, finalSlug } = await CmsMethods.generateUniqueSitePathWithSlug(
      categoryPathItems,
      slug,
      !isCreateMode.value ? parseInt(cmsItemId.value) : undefined
    )

    logger.debug('[CmsEditor] Path and slug generated', { sitePath, finalSlug })
    
    // Update both path and slug to maintain consistency
    cmsItemData.value.sitePath = sitePath
    cmsItemData.value.slug = finalSlug
    generatedPath.value = sitePath

    cmsItemData.value.categories = await CmsMethods.updateCategoriesFromPath(sitePath)

  } catch (e: any) {
    console.error('[CmsEditor] Error generating site path', e)
    pathError.value = e.message || 'Failed to generate site path'
    generatedPath.value = ''
  } finally {
    pathLoading.value = false
    await nextTick()
    suppressAuto.value = false
    setTimeout(() => { isGeneratingPath.value = false }, 50)
  }
}


// ===== Watchers that trigger path generation

// 1) Categories change → always regenerate and reset manual override
watch(() => cmsItemData.value.categories, async (newCategories, oldCategories) => {
  if (suppressAuto.value || isHydratingFromPath.value) return

  const ids = (x: any[]) => JSON.stringify((x || []).map(c => normalizeId(c?.id)).filter(Boolean).sort())
  const oldIds = ids(oldCategories || [])
  const newIds = ids(newCategories || [])

  console.log('[CmsEditor] Category change detected:', {
    oldIds, newIds, changed: oldIds !== newIds,
    oldCount: oldCategories?.length || 0,
    newCount: newCategories?.length || 0
  })

  if (oldIds === newIds) {
    console.log('[CmsEditor] No category IDs changed, skipping path generation')
    return
  }

  // User changed categories → re-enable auto
  isPathManuallyEdited.value = false
  await generateSitePath()
}, { deep: true })

// 2) Slug change → regenerate if not manually overridden
watch(() => cmsItemData.value.slug, async (newSlug, oldSlug) => {
  if (newSlug === oldSlug) return
  if (suppressAuto.value || isHydratingFromPath.value || isPathManuallyEdited.value) return
  
  console.log('=== SLUG WATCHER TRIGGERED ===', { oldSlug, newSlug })
  await generateSitePath()
})

// 3) Track manual edits to sitePath (strict comparison to our suggestion)
watch(() => cmsItemData.value.sitePath, (newPath, oldPath) => {
  if (!oldPath || suppressAuto.value || isHydratingFromPath.value) return
  if (!generatedPath.value) return
  
  if (newPath !== generatedPath.value) {
    isPathManuallyEdited.value = true
    console.log('[CmsEditor] Manual path edit detected:', { newPath, generatedPath: generatedPath.value })
  }
})

// ===== UI helpers
function goToList() {
  router.go(-1)
}

function previewContent() {
  if (cmsItemData.value?.sitePath) {
    window.open(cmsItemData.value.sitePath, '_blank')
  }
}

// Title/Slug helpers → no direct rewriting of sitePath; trigger generator instead
function updateTitle(value: string) {
  if (suppressAuto.value || isHydratingFromPath.value) {
    cmsItemData.value.title = value
    return
  }

  cmsItemData.value.title = value
  if (value && isCreateMode.value) {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    cmsItemData.value.slug = slug
  }
}

function updateSlug(value: string) {
  if (suppressAuto.value || isHydratingFromPath.value) {
    cmsItemData.value.slug = value
    return
  }

  cmsItemData.value.slug = value
}
// CategoryPicker → parent sync
function onCategoriesUpdate(newCategories: any[]) {
  console.log('[CmsEditor] CategoryPicker update received:', newCategories?.length || 0)
  cmsItemData.value.categories = newCategories
}

function resolveParentId(raw: string | number | null | undefined): number | undefined {
  if (raw === null || raw === undefined) return undefined
  const s = String(raw)
  // ignore optimistic temp IDs coming from the picker
  if (s.startsWith('temp-')) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
async function fetchAvailableLayouts() {
  try {
    availableLayouts.value = await CmsMethods.getAvailableLayouts()
    logger.debug('[CmsEditor] Available layouts loaded', { count: availableLayouts.value.length })
  } catch (e: any) {
    logger.error('[CmsEditor] Error loading available layouts', e)
  }
}

// Category created in picker → refresh + reconcile + regenerate
async function onCategoriesCreate(createdCategory: { name: string; parentId?: string | number | null }) {
  try {
    console.log('=== CategoryPicker create EVENT TRIGGERED ===', { createdCategory })

    suppressAuto.value = true

    // 1) Create in DB with a real parentId (ignore "temp-..." optimistic values)
    const parentId = resolveParentId(createdCategory.parentId)
    const newCat = await CmsMethods.createCategoryWithParent(createdCategory.name, parentId)

    // 2) Refresh real categories list
    const hierarchy = await CmsMethods.getCategoriesHierarchy()
    categories.value = hierarchy.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null
    }))
    categories.value.sort((a, b) => ((a.parentId ? 1 : 0) - (b.parentId ? 1 : 0)))

    // 3) Ensure the new category is selected in the model
    const hasNew = (cmsItemData.value.categories || []).some((c: any) => String(c.id) === String(newCat.id))
    if (!hasNew) {
      const newEntry = {
        id: newCat.id,
        name: newCat.name,
        slug: newCat.slug,
        parentId: newCat.parentId ?? null
      }
      cmsItemData.value.categories = [...(cmsItemData.value.categories || []), newEntry]
    }

    // 4) Re-enable auto path suggestion and regenerate
    isPathManuallyEdited.value = false

  } catch (e: any) {
    logger.error('[CmsEditor] Error creating category from picker', e)
    errorMessage?.(e?.message || 'Failed to create category')
  } finally {
    await nextTick()
    suppressAuto.value = false
    await generateSitePath()
  }
}
</script>

<template>

  <!-- Mobile Layout -->
  <div v-if="isMobile" class="min-h-screen">
    <!-- Mobile Header -->
    <div
      :class="['theme-colors-background-secondary', 'theme-border'.primary]"
      class="border-b px-4 py-3 sticky top-0"
    >
      <div class="text-center mb-3">
        <h1 :class="['text-lg font-semibold', 'theme-colors-text-primary']">
          {{ isCreateMode ? 'Create Content' : 'Edit Content' }}
        </h1>
      </div>
      <dxFlex justify="between" align="center">
        <dxButton @click="goToList" variant="secondary" size="sm">
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:arrow-left-line" size="sm" :class="iconColor" />
          </template>
          Cancel
        </dxButton>

        <dxButton @click="saveContentItem" variant="primary" size="sm" :disabled="loading">
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:save-line" size="sm" :class="iconColor" />
          </template>
          Save
        </dxButton>
        <dxButton @click="saveAndClose" variant="secondary" size="sm" :disabled="loading">
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:save-line" size="sm" :class="iconColor" />
          </template>
          Save & Close
        </dxButton>
      </dxFlex>
    </div>

    <!-- Mobile Tabs -->
    <div
      :class="['theme-colors-background-secondary', 'theme-border'.primary]"
      class="border-b px-4 sticky top-14"
    >
      <dxFlex gap="6" class="h-12 overflow-x-auto">
        <button
          @click="activeTab = 'content'"
          :class="[
            'border-b-2 pb-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
            activeTab === 'content'
              ? 'theme-colors-text-accent theme-colors-border-accent'
              : 'theme-colors-text-secondary hover:theme-colors-text-primary border-transparent'
          ]"
        >
          <dxIcon name="ri:file-text-line" size="sm" />
          Content
        </button>
        <button
          @click="activeTab = 'seo'"
          :class="[
            'border-b-2 pb-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
            activeTab === 'seo'
              ? 'theme-colors-text-accent theme-colors-border-accent'
              : 'theme-colors-text-secondary hover:theme-colors-text-primary border-transparent'
          ]"
        >
          <dxIcon name="ri:search-eye-line" size="sm" />
          SEO
        </button>
      </dxFlex>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-20">
      <dxSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center py-20">
      <dxStack align="center" spacing="4">
        <dxIcon name="ri:error-warning-fill" :class="'theme-colors-text-error'" size="lg" />
        <p :class="'theme-colors-text-primary'">{{ error }}</p>
        <dxButton @click="goToList" variant="primary">Return to List</dxButton>
      </dxStack>
    </div>

    <!-- Mobile Content -->
    <div v-else class="pb-20">
      <!-- Always Visible Title -->
      <div class="p-4 pb-0">
        <div
          :class="['theme-colors-background-secondary', 'theme-border'.primary]"
          class="rounded-lg border p-4"
        >
          <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Title *</label>
          <dxInput
            :model-value="cmsItemData.title"
            @update:model-value="updateTitle"
            placeholder="Content Title"
            :class="!cmsItemData.title?.trim() ? 'theme-colors-border-error' : ''"
          />
          <div v-if="!cmsItemData.title?.trim()" :class="['text-xs mt-1', 'theme-colors-text-error']">
            Title is required
          </div>
        </div>
      </div>

      <!-- Content Tab -->
      <div v-if="activeTab === 'content'" class="p-4 space-y-6">
        <!-- Quick Settings Button -->
        <dxButton @click="showContentDrawer = true" variant="outline" class="w-full">
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:settings-3-line" size="sm" :class="iconColor" />
          </template>
          Content Settings
        </dxButton>

        <!-- Editor -->
        <div
          :class="['theme-colors-background-secondary', 'theme-border'.primary]"
          class="rounded-lg border"
        >
          <dxContentEditorLayout v-model="cmsItemData.content" class="w-full" />
        </div>
      </div>

      <!-- SEO Tab -->
      <div v-if="activeTab === 'seo'" class="p-4 space-y-6">
        <!-- Quick SEO Button -->
        <dxButton @click="showSeoDrawer = true" variant="outline" class="w-full">
          <template #prefix="{ iconColor }">
            <dxIcon name="ri:search-eye-line" size="sm" :class="iconColor" />
          </template>
          SEO Settings
        </dxButton>

        <!-- Metadata Editor -->
        <div
          :class="['theme-colors-background-secondary', 'theme-border'.primary]"
          class="rounded-lg border md:p-4"
        >
          <MetadataEditor v-model="cmsItemData" />
        </div>
      </div>
    </div>

    <!-- Content Drawer -->
    <div v-if="showContentDrawer" class="fixed inset-0 z-50 overflow-hidden">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showContentDrawer = false"></div>
      <div
        class="absolute bottom-0 left-0 right-0 rounded-t-lg max-h-[80vh] overflow-y-auto"
        :class="'theme-colors-background-secondary'"
      >
        <div :class="['p-4 border-b flex justify-between items-center', 'theme-border'.primary]">
          <h3 :class="['text-lg font-semibold', 'theme-colors-text-primary']">Content Settings</h3>
          <dxButton @click="showContentDrawer = false" variant="secondary" size="sm">
            <dxIcon name="ri:close-line" size="sm" />
          </dxButton>
        </div>
        <div class="p-4 space-y-4">
          <!-- Title -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Title *</label>
            <dxInput
              :model-value="cmsItemData.title"
              @update:model-value="updateTitle"
              placeholder="Content Title"
            />
          </div>

          <!-- Slug -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Slug *</label>
            <dxInput
              :model-value="cmsItemData.slug"
              @update:model-value="updateSlug"
              placeholder="content-slug"
              :class="!cmsItemData.slug?.trim() ? 'theme-colors-border-error' : ''"
            />
            <div v-if="!cmsItemData.slug?.trim()" :class="['text-xs mt-1', 'theme-colors-text-error']">
              Slug is required
            </div>
          </div>

          <!-- Site Path -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Site Path *</label>
<dxInput
  :model-value="cmsItemData.sitePath"
  placeholder="/page-url"
  :disabled="true"
  
  :loading="pathLoading"
  :error="!cmsItemData.sitePath?.trim()"
/>
            <div v-if="!cmsItemData.sitePath?.trim()" :class="['text-xs mt-1', 'theme-colors-text-error']">
              Site Path is required
            </div>
          </div>

          <!-- Publication Switch -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Publication</label>
            <div class="flex items-center justify-between p-3 rounded-lg">
              <span :class="['text-sm', 'theme-colors-text-primary']">Draft</span>
              <dxSwitch
                :model-value="cmsItemData.isPublic"
                @update:model-value="val => (cmsItemData.isPublic = val)"
                class="mb-0 self-center"
              />
              <span :class="['text-sm', 'theme-colors-text-primary']">Published</span>
            </div>
          </div>

          <!-- Categories -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Categories</label>
            <CategoryPicker
              v-model="cmsItemData.categories"
              :nodes="categories"
              :can-create="true"
              class="w-full"
              @update:modelValue="onCategoriesUpdate"
              @create="onCategoriesCreate"
            />
          </div>

          <!-- Layout Selection -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Layout</label>
            <dxSelect
              v-model="cmsItemData.layout"
              :options="availableLayouts"
              placeholder="Select layout"
              class="w-full"
            />
            <div class="text-xs text-gray-500 mt-1">
              Choose which layout to use for this page
            </div>
          </div>

          <!-- Publish Date -->
          <div>
            <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Schedule</label>
            <dxDateTime
              :model-value="cmsItemData.publishAt"
              @update:model-value="val => (cmsItemData.publishAt = val ? new Date(val as any) : null)"
              :showCalendar="true"
              :showTime="true"
              :openOnMount="true"
              :dropdown="false"
            />
            <div v-if="isPostponed" class="mt-2">
              <dxBadge variant="warning" size="sm">Postponed</dxBadge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SEO Drawer -->
    <div v-if="showSeoDrawer" class="fixed inset-0 z-50 overflow-hidden">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showSeoDrawer = false"></div>
      <div
        class="absolute bottom-0 left-0 right-0 rounded-t-lg max-h-[80vh] overflow-y-auto"
        :class="'theme-colors-background-secondary'"
      >
        <div :class="['p-4 border-b flex justify-between items-center', 'theme-border'.primary]">
          <h3 :class="['text-lg font-semibold', 'theme-colors-text-primary']">SEO Settings</h3>
          <dxButton @click="showSeoDrawer = false" variant="secondary" size="sm">
            <dxIcon name="ri:close-line" size="sm" />
          </dxButton>
        </div>
        <div class="p-4">
          <SeoSidebar v-model="cmsItemData" :media-options="mediaOptions" />
        </div>
      </div>
    </div>
  </div>

  <!-- Desktop Layout -->
  <div v-else class="h-screen flex flex-col">
    <!-- Top Row: Action Buttons -->
    <div
      :class="['theme-colors-background-secondary', 'theme-border'.primary]"
      class="border-b px-6 py-3 flex-shrink-0"
    >
      <dxFlex justify="between" align="center">
        <dxFlex gap="3" align="center">
          <dxButton @click="goToList" variant="secondary" size="sm">
            <template #prefix="{ iconColor }">
              <dxIcon name="ri:arrow-left-line" size="sm" :class="iconColor" class="mr-1" />
            </template>
            Cancel
          </dxButton>
          <dxButton @click="previewContent" variant="secondary" size="sm" :disabled="isCreateMode">
            <template #prefix="{ iconColor }">
              <dxIcon name="ri:eye-line" size="sm" :class="iconColor" class="mr-1" />
            </template>
            Preview
          </dxButton>
          <dxButton @click="saveContentItem" variant="primary" size="sm" :disabled="loading">
            <template #prefix="{ iconColor }">
              <dxIcon name="ri:save-line" size="sm" :class="iconColor" class="mr-1" />
            </template>
            {{ isCreateMode ? 'Create' : 'Save' }}
          </dxButton>
          <dxButton @click="saveAndClose" variant="secondary" size="sm" :disabled="loading">
            <template #prefix="{ iconColor }">
              <dxIcon name="ri:save-line" size="sm" :class="iconColor" class="mr-1" />
            </template>
            Save & Close
          </dxButton>
        </dxFlex>
      </dxFlex>
    </div>

    <!-- Second Row: Tabs -->
    <div
      :class="['theme-colors-background-secondary', 'theme-border'.primary]"
      class="border-b px-6 flex-shrink-0"
    >
      <dxFlex gap="12" class="h-12">
        <button
          @click="activeTab = 'content'"
          :class="[
            'border-b-2 pb-2 font-medium transition-colors flex items-center gap-2 w-24',
            activeTab === 'content'
              ? 'theme-colors-text-accent theme-colors-border-accent'
              : 'theme-colors-text-secondary hover:theme-colors-text-primary border-transparent hover:border-gray-300'
          ]"
        >
          <dxIcon name="ri:file-text-line" size="sm" />
          Content
        </button>
        <button
          @click="activeTab = 'seo'"
          :class="[
            'border-b-2 pb-2 font-medium transition-colors flex items-center gap-2 w-24',
            activeTab === 'seo'
              ? 'theme-colors-text-accent theme-colors-border-accent'
              : 'theme-colors-text-secondary hover:theme-colors-text-primary border-transparent hover:border-gray-300'
          ]"
        >
          <dxIcon name="ri:search-eye-line" size="sm" />
          SEO
        </button>
      </dxFlex>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <dxSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <dxStack align="center" spacing="4">
        <dxIcon name="ri:error-warning-fill" :class="'theme-colors-text-error'" size="lg" />
        <p :class="'theme-colors-text-primary'">{{ error }}</p>
        <dxButton @click="goToList" variant="primary">Return to List</dxButton>
      </dxStack>
    </div>

    <!-- Main Content Area -->
    <div v-else class="w-full">
      <!-- Content Tab -->
      <div v-if="activeTab === 'content'" class="flex">
        <!-- Content Sidebar -->
        <div
          :class="[
            'border-r flex-shrink-0',
            'theme-colors-background-secondary',
            'theme-border'.primary,
            isMobile ? 'w-full' : 'w-80'
          ]"
        >
          <div class="p-6 space-y-6">
            <div>
              <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Title *</label>
              <dxInput
                :model-value="cmsItemData.title"
                @update:model-value="updateTitle"
                placeholder="Content Title"
              />
            </div>

            <div>
              <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Slug</label>
              <dxInput
                :model-value="cmsItemData.slug"
                @update:model-value="updateSlug"
                placeholder="content-slug"
              />
            </div>

            <div>
              <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Site Path *</label>
              <dxInput
                v-model="cmsItemData.sitePath"
                :disabled="true"
                placeholder="/page-url"
                :loading="pathLoading"
                :error="!cmsItemData.sitePath?.trim()"
              />
              <div v-if="!cmsItemData.sitePath?.trim()" class="text-xs mt-1 theme-colors-text-error">
                Site Path is required
              </div>
              <!-- Preview of generated path -->
              <div v-if="generatedPath && !isPathManuallyEdited" class="mt-2 flex items-center gap-2">
            
                <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                  {{ generatedPath }}
                </code>
              </div>
              <!-- Path error -->
              <div v-if="pathError" class="mt-2 flex items-center gap-1 text-xs theme-colors-text-error">
                <dxIcon name="ri:error-warning-line" size="xs" />
                <span>{{ pathError }}</span>
              </div>
            </div>


            <div>
              <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Publication</label>
              <div class="space-y-3">
                <div
                  :class="[
                    'flex items-center justify-between p-3 rounded-lg',
                    'theme-colors-background-tertiary'
                  ]"
                >
                  <div class="flex items-center space-x-2">
                    <div :class="['w-2 h-2 rounded-full', 'theme-colors-text-disabled']"></div>
                    <span :class="['text-sm', 'theme-colors-text-primary']">Draft</span>
                  </div>
                  <dxSwitch
                    :model-value="cmsItemData.isPublic"
                    @update:model-value="val => (cmsItemData.isPublic = val)"
                    class="mb-0 self-center"
                  />
                  <div class="flex items-center space-x-2">
                    <div :class="['w-2 h-2 rounded-full', 'theme-colors-text-success']"></div>
                    <span :class="['text-sm', 'theme-colors-text-primary']">Published</span>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span :class="['text-xs', 'theme-colors-text-tertiary']">Schedule:</span>
                  </div>

                  <div :class="['rounded-lg p-3', 'theme-colors-background-tertiary']">
                    <dxDateTime
                      :model-value="cmsItemData.publishAt"
                      @update:model-value="val => (cmsItemData.publishAt = val ? new Date(val as any) : null)"
                      :showCalendar="true"
                      :showTime="true"
                      :openOnMount="true"
                      :dropdown="false"
                    />
                    <div v-if="isPostponed" class="mt-2">
                      <dxBadge variant="warning" size="sm">Postponed</dxBadge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Layout Selection -->
            <div>
              <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Layout</label>
              <dxSelect
                v-model="cmsItemData.layout"
                :options="availableLayouts"
                placeholder="Select layout"
                class="w-full"
              />
              <div class="text-xs text-gray-500 mt-1">
                Choose which layout to use for this page
              </div>
            </div>

            <!-- Cache section only for edit mode -->
            <div v-if="!isCreateMode && cmsItemData.isPublic">
              <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">Cache</label>

              <div class="space-y-2">
                <!-- Static Export Button -->
                <dxButton
                  @click="generateFastCache"
                  variant="primary"
                  class="w-full"
                  :disabled="cacheLoading"
                  :loading="cacheLoading"
                >
                  <div class="flex items-center justify-center gap-2">
                    <dxIcon name="ri:save-line" size="sm" />
                    <span>Save static page</span>
                  </div>
                </dxButton>

                <!-- Puppeteer Cache Button (slower but complete) -->
                <dxButton
                  v-if="!cacheInfo.exists"
                  @click="generateCache"
                  variant="secondary"
                  class="w-full"
                  :disabled="cacheLoading"
                  :loading="cacheLoading"
                >
                  <div class="flex items-center justify-center gap-2">
                    <dxIcon name="ri:flashlight-line" size="sm" />
                    <span>Full Cache (3-5s)</span>
                  </div>
                </dxButton>

                <!-- Clear Cache Button -->
                <div v-if="cacheInfo.exists" class="space-y-2">
                  <div class="text-xs flex flex-col gap-1 theme-colors-text-secondary">
                    <div>
                      Saved:
                      {{
                        new Date(cacheInfo.lastModified).toLocaleString(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      }}
                      • {{ (cacheInfo.size / 1024).toFixed(1) }}KB
                    </div>
                    <a
                      v-if="cacheInfo.url"
                      :href="cacheInfo.url"
                      target="_blank"
                      rel="noopener"
                      class="theme-colors-text-accent underline"
                    >
                      Open static HTML
                    </a>
                  </div>
                  <dxButton
                    @click="clearCache"
                    variant="danger"
                    class="w-full"
                    :disabled="cacheLoading"
                    :loading="cacheLoading"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <dxIcon name="ri:delete-bin-line" size="sm" />
                    <span>Delete static copy</span>
                    </div>
                  </dxButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Editor -->

        <div class="flex-1 flex justify-center theme-colors-background-primary">
          <div class="w-full max-w-6xl px-6">
            <div
              :class="['theme-colors-background-secondary', 'theme-border'.primary]"
              class="flex flex-col border-l border-r"
            >
      <!-- Title and Category in one row -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4 items-start">
        <div class="flex-1">
          <dxInput
            :model-value="cmsItemData.title"
            @update:model-value="updateTitle"
            placeholder="Content Title"
            size="lg"
            :error="!cmsItemData.title?.trim()"
          />
        </div>
        <div class="flex-1">
          <CategoryPicker
            v-model="cmsItemData.categories"
            :nodes="categories"
            :can-create="true"
            size="lg"
            placeholder="Select category"
            noGutters
            @update:modelValue="onCategoriesUpdate"
            @create="onCategoriesCreate"
          />
        </div>
      </div>

      <!-- Editor -->
      <div class="w-full">
        <dxContentEditorLayout v-model="cmsItemData.content" class="w-full" />
      </div>
    </div>
  </div>
</div>

      </div>

      <!-- SEO Tab -->
      <div v-if="activeTab === 'seo'" class="flex">
        <!-- SEO Sidebar -->
        <div
          :class="[
            'border-r flex-shrink-0',
            'theme-colors-background-secondary',
            'theme-border'.primary,
            isMobile ? 'w-full' : 'w-80'
          ]"
        >
          <SeoSidebar v-model="cmsItemData" :media-options="mediaOptions" />
        </div>

        <!-- Metadata Editor -->
        <div class="flex-1 flex justify-center items-start">
          <div class="p-4 w-full max-w-6xl">
            <div
              :class="['theme-colors-background-secondary', 'theme-border'.primary]"
              class="rounded-lg border shadow-sm"
            >
              <MetadataEditor v-model="cmsItemData" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
