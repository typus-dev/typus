<template>
  <!-- COLLAPSED TILE -->
  <div v-if="!uiState.expanded" :style="{ width }" class="quick-composer-tile">
    <dx-card background="secondary" bordered fullHeight class="border-dashed">
      <div class="p-2 flex flex-col items-center text-center gap-2">
<button
  type="button"
  class="text-4xl leading-none px-2 focus:outline-none focus:ring-2 cursor-pointer"
  :class="collapsedPlusButtonClass"
  aria-label="Create new content"
  @click="openBlankComposer"
  @keydown.enter.prevent="openBlankComposer"
  @keydown.space.prevent="openBlankComposer"
>
  +
</button>
        <div class="text-xs opacity-80">{{ collapsedTitle }}</div>

        <!-- Top-level categories as chips (badge or button) -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-1 max-w-full">
          <component
            v-for="category in topLevelCategories"
            :key="category.id"
            :is="chipComponent"
            :title="category.name"
            :variant="chipVariant(category)"
            :size="chipSizeComputed"
            class="rounded-full !px-3 !py-1.5 !text-sm chip"
            :disabled="uiState.loading"
            @click="handlePickTopLevelCategory(category)"
          >
            <div class="flex items-center gap-1.5">
              <dx-icon name="ri:folder-2-line" size="xs" />
              <span class="inline-block max-w-[160px] truncate">{{ category.name }}</span>
            </div>
          </component>
        </div>
      </div>
    </dx-card>
  </div>

  <!-- EXPANDED EDITOR -->
  <div v-else class="quick-composer-expanded w-full">
    <dx-card background="secondary" bordered fullHeight class="border-dashed">

      <div class="flex flex-col gap-4 py-4">
        <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <CategoryPicker
            v-model="formState.categories"
            :nodes="internalCategoryList"
            :can-create="true"
            size="sm"
            placeholder="Select categories"
            noGutters
            class="flex-1"
            @update:modelValue="handleCategoriesUpdate"
            @create="handleCreateCategory"
          />

          <div class="flex items-center gap-2 md:self-start">
            <dx-button size="sm" :disabled="uiState.loading" @click="handleClose">
              Cancel
            </dx-button>
            <dx-button
              variant="primary"
              size="sm"
              :disabled="!canSave || uiState.loading"
              @click="handleSave"
            >
              {{ uiState.loading ? 'Saving...' : 'Save' }}
            </dx-button>
          </div>
        </div>

        <dx-input
          v-model="formState.title"
          placeholder="Enter title..."
          size="sm"
          noGutters
        />

        <DxContentEditorLayout
          v-model="formState.content"
          :min-height="editorMinHeight"
          :min-lines="10"
          auto-grow
          :sticky-toolbar="false"
          :enable-exports="false"
        />
      </div>
    </dx-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect, nextTick } from 'vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import CategoryPicker from './CategoryPicker.vue'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { logger } from '@/core/logging/logger'
import type { ICmsItem } from '../types'
import DxContentEditorLayout from '@/components/ui/dxContentEditorLayout.vue'

interface Category {
  id: number | string
  name: string
  slug: string
  parentId?: number | string | null
}

interface ComponentProps {
  width?: string
  collapsedTitle?: string
  expanded?: boolean
  categories?: Category[]
  initialTitle?: string
  initialContent?: string
  autoGrowMaxPx?: number | null
  /** 'badge' for flat look, 'button' for clickable colored buttons */
  chipMode?: 'badge' | 'button'
  /** 'xs' | 'sm' | 'md' */
  chipSize?: 'xs' | 'sm' | 'md'
}

const props = withDefaults(defineProps<ComponentProps>(), {
  width: '480px',
  collapsedTitle: 'Create New',
  expanded: false,
  categories: () => [],
  initialTitle: '',
  initialContent: '',
  autoGrowMaxPx: null,
  chipMode: 'badge',
  chipSize: 'sm'
})

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  save: [payload: { title: string; content: string; categories: Category[] }]
  cancel: []
  'content-created': []
}>()

/* --------------------------------------
 * Reactive state
 * ------------------------------------ */
const formState = reactive({
  title: props.initialTitle,
  content: props.initialContent,
  categories: [] as Category[]
})


const uiState = reactive({
  expanded: props.expanded,
  selectedTopLevelCategoryId: null as number | string | null,
  loading: false
})

/** Local mirror for categories (to append new ones immediately after creation) */
const internalCategoryList = ref<Category[]>([...props.categories])

/* --------------------------------------
 * Computed values
 * ------------------------------------ */
const topLevelCategories = computed(() =>
  internalCategoryList.value.filter(c => !c.parentId && c.parentId !== 0)
)

const applyModifier = (value?: string, modifier?: string) => {
  if (!value || !modifier) return value ?? ''

  return value
    .split(' ')
    .filter(Boolean)
    .map(token => `${modifier}:${token}`)
    .join(' ')
}

const collapsedPlusButtonClass = computed(() => [
  'theme-colors-text-primary',
  'theme-components-button-radius' || 'theme-base-radius',
  applyModifier('theme-colors-ring-focus', 'focus')
].filter(Boolean).join(' '))

const canSave = computed(() =>
  formState.title.trim().length > 0 && !uiState.loading
)

/** Chip rendering helpers */
import dxBadge from '@/components/ui/dxBadge.vue'
const chipComponent = computed(() => (props.chipMode === 'button' ? dxButton : dxBadge))

function chipVariant(category: Category) {
  if (props.chipMode === 'badge') return 'secondary'
  const palette = ['primary', 'info', 'secondary',  'warning'] as const
  const seed = String(category.id).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return palette[seed % palette.length]
}
const chipSizeComputed = computed(() => props.chipSize)

const editorMinHeight = computed(() => {
  if (props.autoGrowMaxPx && Number.isFinite(props.autoGrowMaxPx)) {
    return `${props.autoGrowMaxPx}px`
  }
  return '18rem'
})

/* --------------------------------------
 * Watchers / synchronization
 * ------------------------------------ */
watchEffect(() => {
  if (props.initialTitle !== undefined) formState.title = props.initialTitle
  if (props.initialContent !== undefined) formState.content = props.initialContent
})

watch(
  () => props.categories,
  (list) => { internalCategoryList.value = [...(list ?? [])] },
  { deep: true, immediate: true }
)

watch(
  () => props.expanded,
  (value) => { uiState.expanded = !!value }
)
watch(
  () => uiState.expanded,
  (value) => emit('update:expanded', value)
)

watch(
  () => uiState.expanded,
  () => {
    logger.debug('watch.uiState.expanded', uiState.expanded)
  }
)

/* --------------------------------------
 * UI helpers
 * ------------------------------------ */
function openComposer() { uiState.expanded = true }

function handleClose() {
  uiState.expanded = false
  uiState.selectedTopLevelCategoryId = null
  formState.title = ''
  formState.content = ''
  formState.categories = []
  emit('cancel')
}

/* --------------------------------------
 * Category actions
 * ------------------------------------ */
function handlePickTopLevelCategory(category: Category) {

  
 uiState.selectedTopLevelCategoryId = category.id


  formState.categories = [category]

    logger.debug("[handlePickTopLevelCategory]",{category,formState,uiState})

     nextTick(() => openComposer())
  
}

function openBlankComposer() {
  // reset selection/state explicitly
  uiState.selectedTopLevelCategoryId = null
  formState.categories = []
  uiState.expanded = true
}

function handleCategoriesUpdate(newCategories: Category[]) {
  formState.categories = newCategories
}

/** Create category immediately and reflect it everywhere */
async function handleCreateCategory(payload: { name: string; parentId?: string | number | null }) {
  try {
    uiState.loading = true
    logger.debug('[QuickComposer] Creating category', { payload })

    const parentId =
      payload.parentId && !String(payload.parentId).startsWith('temp-')
        ? Number(payload.parentId)
        : undefined

    const created = await CmsMethods.createCategoryWithParent(payload.name, parentId)

    // Add to local source if missing
    if (!internalCategoryList.value.some(c => c.id === created.id)) {
      internalCategoryList.value = [
        ...internalCategoryList.value,
        { id: created.id, name: created.name, slug: created.slug, parentId: created.parentId }
      ]
    }

    // Replace temporary selection or append
    const nextSelection = formState.categories.map(cat =>
      (String(cat.id).startsWith('temp-') && cat.name === created.name)
        ? { id: created.id, name: created.name, slug: created.slug, parentId: created.parentId }
        : cat
    )
    if (!nextSelection.some(c => c.id === created.id)) {
      nextSelection.push({ id: created.id, name: created.name, slug: created.slug, parentId: created.parentId })
    }
    formState.categories = nextSelection

    logger.debug('[QuickComposer] Category created', { created })
  } catch (error) {
    logger.error('[QuickComposer] Failed to create category', error)
    throw error
  } finally {
    uiState.loading = false
  }
}

/* --------------------------------------
 * Save flow
 * ------------------------------------ */
function toSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function handleSave() {
  if (!canSave.value) return

  // Safety: do not allow temporary categories in final payload
  if (formState.categories.some(c => String(c.id).startsWith('temp-'))) {
    logger.error('[QuickComposer] Cannot save with temporary categories', {
      temporary: formState.categories.filter(c => String(c.id).startsWith('temp-'))
    })
    return
  }

  try {
    uiState.loading = true
    logger.debug('[QuickComposer] Save start', {
      title: formState.title,
      categories: formState.categories.map(c => ({ id: c.id, name: c.name }))
    })

    const rawSlug = toSlugFromTitle(formState.title)
    const numericCategories = formState.categories.filter(c => typeof c.id === 'number')
    const categoryIds = numericCategories.map(c => c.id as number)

    const categoryPathItems = numericCategories.map(c => ({
      id: c.id as number,
      name: c.name,
      slug: c.slug
    }))

    // Generate unique site path and ensure slug matches it
    const { sitePath, finalSlug } = await CmsMethods.generateUniqueSitePathWithSlug(
      categoryPathItems,
      rawSlug
    )

    const payload: Partial<ICmsItem> & { categoryIds: number[] } = {
      title: formState.title.trim(),
      content: formState.content.trim(),
      status: 'draft',
      type: 'document',
      isPublic: false,
      categories: numericCategories as any,
      categoryIds,
      slug: finalSlug,
      sitePath
    }

    logger.debug('[QuickComposer] Final payload', { payload })

    const result = await CmsMethods.createContentItem(payload)
    logger.debug('[QuickComposer] Content created', { result })

    emit('save', { title: formState.title, content: formState.content, categories: formState.categories })
    emit('content-created')
    handleClose()
  } catch (error) {
    logger.error('[QuickComposer] Failed to save content', error)
  } finally {
    uiState.loading = false
  }
}

/* --------------------------------------
 * Styles and small constants
 * ------------------------------------ */
const width = props.width
const collapsedTitle = props.collapsedTitle
</script>

<style scoped>
.quick-composer-tile :deep(.dx-card),
.quick-composer-expanded :deep(.dx-card) {
  border-style: dashed;
}

/* Pill polish for both badge and button chips */
.chip {
  border-radius: 9999px;
  line-height: 1;
}

.quick-composer-expanded :deep(.dxce-theme) {
  background: transparent;
  color: inherit;
}

.quick-composer-expanded :deep(.dxce-content) {
  padding: 0;
}
</style>
