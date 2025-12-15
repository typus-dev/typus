<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNavigationHistory } from './useNavigationHistory'

const router = useRouter()

const props = withDefaults(defineProps<{
  maxItems?: number
  showIcons?: boolean
}>(), {
  maxItems: 5,
  showIcons: false
})

const { history, startTracking, getRecentPages } = useNavigationHistory()

function navigateTo(path: string) {
  router.push(path)
}

// Start tracking on mount
onMounted(() => {
  startTracking()
})

// Recent pages excluding current
const recentPages = computed(() => {
  return getRecentPages(true).slice(0, props.maxItems)
})

// Truncate title to fit button
function truncateTitle(title: string, maxLength = 16): string {
  if (title.length <= maxLength) return title
  return title.slice(0, maxLength - 1) + '…'
}
</script>

<template>
  <div v-if="recentPages.length > 0" class="flex items-center">
    <template v-for="(page, index) in recentPages" :key="page.path">
      <dxIcon
        v-if="index > 0"
        name="ri:arrow-right-s-line"
        size="sm"
        class="theme-colors-text-tertiary mx-1"
      />
      <dxButton
        variant="outline"
        size="xs"
        :title="page.title"
        @click="navigateTo(page.path)"
      >
        <template v-if="showIcons && page.icon" #prefix>
          <dxIcon :name="page.icon" size="xs" />
        </template>
        {{ truncateTitle(page.title) }}
      </dxButton>
    </template>
  </div>
</template>
