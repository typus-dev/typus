<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  noPagination: boolean
  totalPages: number
  loading: boolean
  currentPage: number
  itemsPerPage: number
  itemsPerPageOptions: number[]
  searchQuery: string
  searchPlaceholder: string
  totalItems?: number
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:itemsPerPage', value: number): void
  (e: 'update:searchQuery', value: string): void
}>()

const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (value) => emit('update:searchQuery', value)
})

const localItemsPerPage = computed({
  get: () => props.itemsPerPage,
  set: (value) => emit('update:itemsPerPage', value)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page)
  }
}

const paginationInfo = computed(() => {
  const total = props.totalItems || 0
  const start = total > 0 ? (props.currentPage - 1) * props.itemsPerPage + 1 : 0
  const end = Math.min(props.currentPage * props.itemsPerPage, total)

  return {
    start,
    end,
    total
  }
})
</script>

<template>
  <dxFlex justify="between" align="center" class="mb-4" noGutters>
    <!-- Search on the left -->
    <dxFlexCol cols="auto" md="4">
      <dxInput
        v-model="localSearchQuery"
        :placeholder="searchPlaceholder"
        size="sm"
        width="w-full"
        noGutters
        :disabled="loading"
      >
        <template #prefix>
          <dxIcon name="ri:search-line" size="sm" />
        </template>
      </dxInput>
    </dxFlexCol>

    <!-- Pagination on the right -->
    <dxFlexCol v-if="!noPagination" cols="auto">
      <dxFlex align="center" gap="2" noGutters>
        <!-- Arrow buttons -->
        <dxButton
          variant="ghost"
          size="sm"
          iconOnly
          :disabled="currentPage === 1 || loading"
          @click="goToPage(currentPage - 1)"
        >
          <dxIcon name="ri:arrow-left-s-line" size="sm" />
        </dxButton>

        <!-- Page info -->
        <dxText
          :text="`Page ${currentPage} of ${totalPages}`"
          tag="p"
          color="tertiary"
          customClass="text-sm !mb-0"
        />

        <dxButton
          variant="ghost"
          size="sm"
          iconOnly
          :disabled="currentPage === totalPages || loading"
          @click="goToPage(currentPage + 1)"
        >
          <dxIcon name="ri:arrow-right-s-line" size="sm" />
        </dxButton>

        <!-- Items per page -->
        <dxText
          text="Per page:"
          tag="p"
          color="tertiary"
          customClass="text-sm ml-4 !mb-0"
        />
        <dxSelect
          v-model="localItemsPerPage"
          :options="itemsPerPageOptions.map(n => ({ value: n, label: String(n) }))"
          size="sm"
          width="w-20"
          :disabled="loading"
          noGutters
        />
      </dxFlex>
    </dxFlexCol>
  </dxFlex>
</template>
