<route lang="json">{
  "name": "cms-dashboard",
  "path": "/cms/dashboard",
  "meta": {
    "layout": "private",
    "subject": "cms"
  }
}</route>
<template>
  <div class="space-y-6">
      <!-- Filters Panel -->
      <cms-filter-panel
        :status-configs="filters.statusConfigs.value"
        :category-options="filters.categoryOptions.value"
        :sort-options="(filters.sortOptions.value as any)"
        :selected-status="filters.selectedStatus.value"
        :selected-category="filters.selectedCategory.value"
        :selected-sort="filters.sortBy.value"
        @update-status-filter="(value) => { filters.updateStatusFilter(value); content.loadContents(1) }"
        @clear-category="filters.clearCategoryFilter()"
        @update-category="(value) => { filters.selectedCategory.value = value; content.loadContents(1) }"
        @update-sort="(value) => { filters.sortBy.value = value; content.loadContents(1) }"
      />

      <!-- Content Grid -->
      <cms-content-grid
        :contents="content.filteredContents.value"
        :categories="categories"
        @quick-save="onQuickSave"
        @quick-cancel="onQuickCancel"
        @content-created="onContentCreated"
        @edit-content="content.editContent($event)"
        @update-status="updateContentStatus($event)"
        @update-schedule="updateContentSchedule($event)"
        @update-title="updateContentTitle($event)"
        @delete="content.deleteContent($event)"
        @cache-action="handleCacheAction($event)"
        @open-external="content.viewContent($event)"
      />

      <!-- Pagination -->
      <cms-pagination
        v-if="!content.isLoading.value && content.pagination.value.totalPages > 1"
        :current-page="content.pagination.value.currentPage"
        :total-pages="content.pagination.value.totalPages"
        :total="content.pagination.value.total"
        :limit="content.pagination.value.limit"
        @change-page="changePage($event)"
      />

      <!-- Empty State -->
      <div v-else-if="!content.isLoading.value && content.filteredContents.value.length === 0" class="text-center py-12">
        <h3 class="text-xl font-semibold mb-2">
          {{ filters.selectedStatus.value === 'all' ? 'No content found' : 'No content with selected status' }}
        </h3>
        <p>
          {{ filters.selectedStatus.value === 'all'
            ? 'Create your first content item to get started'
            : 'Try changing filters or create new content' }}
        </p>
      </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
// CMS Components
import CmsFilterPanel from '../components/CmsFilterPanel.vue'
import CmsContentGrid from '../components/CmsContentGrid.vue'
import CmsPagination from '../components/CmsPagination.vue'
// CMS Composables
import { useCmsContent } from '../composables/useCmsContent'
import { useCmsFilters } from '../composables/useCmsFilters'
import { useCmsCache } from '../composables/useCmsCache'
import { useCmsState } from '../composables/useCmsState'
// Methods
import { CmsMethods } from '../methods/cms.methods.dsx'

const router = useRouter()

// Initialize composables
const content = useCmsContent()
const filters = useCmsFilters()
const cache = useCmsCache()
const cmsState = useCmsState()

// Categories for QuickComposer
const categories = ref([])

// Load categories
const loadCategories = async () => {
  const hierarchy = await CmsMethods.getCategoriesHierarchy()
  categories.value = hierarchy.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId ?? null
  }))
}

function onContentCreated() {

  content.loadContents(cmsState.state.pagination.currentPage)
}

function onQuickSave({ title, content, categories }) {
  // QuickComposer now handles full creation flow internally
  // This should not be called as composer redirects to editor
  logger.debug('[Dashboard] Quick save completed', { title, categories })
}

function onQuickCancel() {
  // Handle quick editor cancel if needed
}

// Action handlers
const updateContentStatus = async ({ id, status }) => {
  await content.updateContentStatus(id, status)

  if (status !== 'published') {
    await cache.clearCacheForContent(id)
  }
  // Centralized error handler will log and show error modal
}

const updateContentSchedule = ({ content: item, date }) => {
  content.updateContentSchedule(item, date)
}

const updateContentTitle = ({ id, title }) => {
  // Title updates are handled directly by the card component
}

// Handle cache actions
const handleCacheAction = (contentItem) => {
  cache.handleCacheAction(contentItem)
}

const changePage = (page) => {
  content.loadContents(page)
}

// Initialize on mount
onMounted(async () => {
  await Promise.all([
    content.initialize(),
    loadCategories()
  ])
})
</script>
