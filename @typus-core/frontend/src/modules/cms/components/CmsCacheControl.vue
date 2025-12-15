<template>
  <!-- Cache Control -->
  <div
    v-if="content.cacheInfo"
    class="flex items-center gap-1 cursor-pointer transition-colors"
    :class="cacheInfo.exists ? 'theme-colors-text-success hover:theme-colors-text-error' : 'text-gray-400 theme-mixins-interactive'"
    :title="cacheTooltip"
    @mouseenter="$emit('hover-changed', { contentId: content.id, isHovered: true })"
    @mouseleave="$emit('hover-changed', { contentId: content.id, isHovered: false })"
    @click="$emit('cache-action', content)"
  >
    <dx-icon :name="cacheIcon" size="sm" />
    <span v-if="cacheInfo.exists" class="text-xs">
      {{ formatCacheSize(cacheInfo.size) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import { useCmsCache } from '../composables/useCmsCache'

// Props
interface Props {
  content: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'hover-changed': [data: { contentId: number; isHovered: boolean }]
  'cache-action': [content: any]
}>()

// Composables
const { getCacheIcon, getCacheTooltip, formatCacheSize } = useCmsCache()

// Computed
const cacheInfo = computed(() => props.content.cacheInfo || { exists: false })
const cacheIcon = computed(() => getCacheIcon(props.content))
const cacheTooltip = computed(() => getCacheTooltip(props.content))
</script>
