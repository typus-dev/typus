<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  noPagination: boolean
  totalPages: number
  loading: boolean
  currentPage: number
  itemsPerPage: number
  itemsPerPageOptions: number[]
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:itemsPerPage', value: number): void
}>()
const localCurrentPage = computed({
  get: () => {
    return props.currentPage
  },
  set: value => {
    emit('update:currentPage', value)
  }
})

const localItemsPerPage = computed({
  get: () => {
    return props.itemsPerPage
  },
  set: value => {
    emit('update:itemsPerPage', value)
  }
})
</script>

<template>
  <dxRow
    v-if="!noPagination && totalPages > 1 && !loading"
    justify="end"
    align="center"
    class="flex items-center p-4"
    noGutters
  >
    <nav class="flex items-center gap-1">
      <dxButton
        variant="outline"
        size="sm"
        :disabled="localCurrentPage === 1"
        @click="localCurrentPage--"
        iconOnly
      >
        <dxIcon name="ri:arrow-left-s-line" size="md" />
      </dxButton>
      <span
        :class="[
          'theme-components-table-pagination-text' || 'text-sm',
          'theme-colors-text-secondary' || 'text-neutral-400',
          'px-2'
        ]"
      >
        Page {{ localCurrentPage }} of {{ totalPages }}
      </span>
      <dxButton
        variant="outline"
        size="sm"
        :disabled="localCurrentPage === totalPages"
        @click="localCurrentPage++"
        iconOnly
      >
        <dxIcon name="ri:arrow-right-s-line" size="md" />
      </dxButton>
      <dxSelect
        v-if="itemsPerPageOptions.length > 1"
        v-model="localItemsPerPage"
        :options="itemsPerPageOptions.map(num => ({ label: String(num), value: num }))"
        size="sm"
        width="w-24"
        noGutters
        class="ml-2"
        labelPosition="left"
      />
    </nav>
  </dxRow>
</template>
