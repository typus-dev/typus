<script setup lang="ts">
import { computed } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'

type TabId = 'edit' | 'document' | 'blocks' | 'html' | 'markdown'

const tabs: Array<{ id: TabId; icon: string; title: string }> = [
  { id: 'edit', icon: 'ri:edit-2-line', title: 'Edit' },
  { id: 'document', icon: 'ri:file-text-line', title: 'Document' },
  { id: 'blocks', icon: 'ri:layout-grid-line', title: 'Blocks' },
  { id: 'html', icon: 'ri:code-s-slash-line', title: 'HTML' },
  { id: 'markdown', icon: 'ri:markdown-line', title: 'Markdown' },
]

const props = defineProps<{ modelValue: TabId }>()
const emit = defineEmits<{ 'update:modelValue': [TabId] }>()
const activeTab = computed(() => props.modelValue)

const setTab = (id: TabId) => emit('update:modelValue', id)
</script>

<template>
  <nav class="dxce-tabs" aria-label="View mode selector">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      :class="[
        'dxce-tab border rounded-md px-3 py-1 inline-flex items-center gap-2 text-sm transition-colors duration-150',
        'theme-border'.primary,
        'theme-colors-text-primary',
        activeTab === tab.id ? 'theme-colors-background-tertiary' : 'bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
      ]"
      :aria-pressed="activeTab === tab.id"
      :title="tab.title"
      @click="setTab(tab.id)"
    >
      <dxIcon :name="tab.icon" size="sm" />
      <span class="uppercase tracking-wide text-xs font-medium">{{ tab.title }}</span>
    </button>
  </nav>
</template>

<style scoped>
.dxce-tabs {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.dxce-tab {
  line-height: 1;
}
</style>
