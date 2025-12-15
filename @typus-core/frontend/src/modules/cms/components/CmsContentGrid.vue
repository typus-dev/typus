<template>
  <div class="flex flex-col gap-6">
    <!-- Expanded QuickComposer (full width editor) -->
    <QuickComposer
      v-if="composerOpen"
      class="w-full"
      v-model:expanded="composerOpen"
      :categories="categories"
      :minHeight="quickEditorMinHeight"
      @save="handleQuickSave"
      @cancel="composerOpen = false; $emit('quick-cancel')"
              @content-created="$emit('content-created')"
    />
    
    <!-- Grid with collapsed tile aligned with content cards -->
    <transition-group
      name="card"
      tag="div"
      class="flex flex-wrap gap-6 justify-start"
      :enter-active-class="transitions.enterActive"
      :enter-from-class="transitions.enterFrom"
      :enter-to-class="transitions.enterTo"
      :leave-active-class="transitions.leaveActive"
      :leave-from-class="transitions.leaveFrom"
      :leave-to-class="transitions.leaveTo"
    >
      <!-- Collapsed QuickComposer tile (first left) -->
      <div
        v-if="!composerOpen"
        key="quick-composer"
        class="card-item"
        :style="{ width: cardWidth }"
      >
        <QuickComposer
          width="100%"
          v-model:expanded="composerOpen"
          :categories="categories"
          chipMode="button"
          chipSize="md"
          class="h-full"
          @save="handleQuickSave"
          @cancel="$emit('quick-cancel')"
          @content-created="$emit('content-created')"
        />
      </div>

      <!-- Content cards -->
      <cms-content-card
        v-for="(content, index) in contents"
        :key="content.id"
        :data-index="index"
        :content="content"
        :width="cardWidth"
        @edit-content="$emit('edit-content', $event)"
        @update-status="$emit('update-status', $event)"
        @update-schedule="$emit('update-schedule', $event)"
        @update-title="$emit('update-title', $event)"
        @delete="$emit('delete', $event)"
        @cache-action="$emit('cache-action', $event)"
        @cache-hover-changed="handleCacheHoverChanged"
        @open-external="$emit('open-external', $event)"
      />
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CmsContentCard from './CmsContentCardV2.vue'
import QuickComposer from './QuickComposer.vue'
import { GRID_TRANSITIONS } from '../cms.constants'
import { useCmsCache } from '../composables/useCmsCache'

const cache = useCmsCache()

interface Category {
  id: number | string
  name: string
  slug: string
  parentId?: number | string | null
}

interface Props {
  contents: any[]
  categories?: Category[]
  cardWidth?: string
  quickEditorMinHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  cardWidth: '380px',
  quickEditorMinHeight: '28rem',
  categories: () => []
})

const emit = defineEmits<{
  'edit-content': [content: any]
  'update-status': [data: { id: number; status: string }]
  'update-schedule': [data: { content: any; date: string }]
  'update-title': [data: { id: number; title: string }]
  'delete': [id: number]
  'cache-action': [content: any]
  'open-external': [content: any]
  'quick-save': [payload: { title: string; content: string; categories: Category[] }]
  'quick-cancel': []
  'content-created': []
}>()

/** Collapsed/expanded state for QuickComposer */
const composerOpen = ref(false)

const handleCacheHoverChanged = ({ contentId, isHovered }: { contentId: number; isHovered: boolean }) => {
  cache.setCacheHover(contentId, isHovered)
}

const handleQuickSave = (payload: { title: string; content: string; categories: Category[] }) => {
  emit('quick-save', payload)
  composerOpen.value = false
}

const transitions = computed(() => GRID_TRANSITIONS)
</script>
