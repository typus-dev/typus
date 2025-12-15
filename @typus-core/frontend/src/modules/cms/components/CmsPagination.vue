<template>
  <div v-if="totalPages > 1" class="flex justify-center mt-6">
    <div class="flex items-center gap-2">
      <!-- Previous button -->
      <dx-button
        @click="$emit('change-page', currentPage - 1)"
        :disabled="currentPage <= 1"
        variant="ghost"
        size="sm"
        icon-only
      >
        <dx-icon name="ri:arrow-left-line" size="sm" />
      </dx-button>

      <!-- Page numbers -->
      <template v-for="page in visiblePages" :key="page">
        <dx-button
          v-if="page !== '...'"
          @click="$emit('change-page', page as number)"
          :variant="currentPage === (page as number) ? 'primary' : 'ghost'"
          size="sm"
          class="min-w-[2.5rem]"
        >
          {{ page }}
        </dx-button>
        <span v-else class="px-2">...</span>
      </template>

      <!-- Next button -->
      <dx-button
        @click="$emit('change-page', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        variant="ghost"
        size="sm"
        icon-only
      >
        <dx-icon name="ri:arrow-right-line" size="sm" />
      </dx-button>
    </div>
  </div>

  <!-- Pagination info -->
  <div class="text-center text-sm mt-2">
    Showing {{ startItem }}-{{ endItem }} of {{ total }} items
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import { generateVisiblePages } from '../cms.utils'

// Props
interface Props {
  currentPage: number
  totalPages: number
  total: number
  limit: number
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  totalPages: 1,
  total: 0,
  limit: 20
})

// Emits
const emit = defineEmits<{
  'change-page': [page: number]
}>()

// Computed
const visiblePages = computed(() => generateVisiblePages(props.currentPage, props.totalPages))

const startItem = computed(() => ((props.currentPage - 1) * props.limit) + 1)
const endItem = computed(() => Math.min(props.currentPage * props.limit, props.total))
</script>
