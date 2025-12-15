<script setup lang="ts">
import { watch, computed } from 'vue'
import { useTableData } from './useTableData'
import { useTableColumns } from './useTableColumns'
import type { TableProps, TableEmits } from './tableTypes'
import TableHeader from './TableHeader.vue'
import TableDesktopView from './TableDesktopView.vue'
import TableMobileView from './TableMobileView.vue'
import TableSearchPagination from './TableSearchPagination.vue'

const props = withDefaults(defineProps<TableProps>(), {
  columns: undefined,
  data: () => [],
  loading: false,
  rowKey: 'id',
  itemsPerPageOptions: () => [10, 20, 50, 100],
  defaultItemsPerPage: 20,
  noHeader: false,
  noPagination: false,
  serverSidePagination: false,
  searchPlaceholder: 'Search...',
  embedded: false,
  defaultActions: false,
  onEdit: undefined,
  onDelete: undefined,
  confirmDeleteMessage: 'Are you sure you want to delete this item?',
  confirmDeleteTitle: 'Confirm Delete',
  compact: false,
  showCreateButton: false,
  createButtonLabel: 'Add',
  editButtonLabel: '',
  deleteButtonLabel: '',
  createButtonIcon: 'ri:add-line',
  editOnRowClick: true,
  showActionsColumn: false,
  customActions: () => [],
  truncateText: 100,
  animateChanges: false,
  animationDuration: 100
})

const emit = defineEmits<TableEmits>()

const {
  searchQuery,
  currentPage,
  itemsPerPage,
  sortBy,
  sortDesc,
  safeData,
  deletingItems,
  pendingDeletes,
  hasRowClickListener,
  sortedData,
  filteredData,
  totalPages,
  paginatedData,
  isItemDeleting,
  isItemPendingDelete,
  getRowKey,
  handleEdit,
  handleDelete,
  handleCustomAction,
  handleCreate,
  handleSort,
  handleRowClick,
  tableContext
} = useTableData(props, emit)

watch(
  () => props.paginationMeta,
  (newMeta, oldMeta) => {

  },
  { deep: true }
)

const {
  isMobile,
  computedColumns,
  actionsColumn,
  showActionsColumn,
  showActions,
  getColumnStyles,
  getCellValue,
  getFormattedValue,
  getDisplayValue,
  shouldTruncateFormatted
} = useTableColumns(props, safeData)

// Add missing tableContainerClasses computed property
const tableContainerClasses = computed(() => {
  if (props.embedded) {
    return ['relative', 'border border-neutral-700 rounded-lg overflow-hidden']
  }
  // Standalone table - add card-like styling
  return [
    'relative',
    'theme-colors-background-secondary',
    'theme-components-table-border',
    'theme-base-radius',
    'theme-base-shadow',
    'overflow-hidden'
  ]
})

// Calculate min-height based on itemsPerPage to prevent layout jumps
const tableMinHeight = computed(() => {
  const rowHeight = props.compact ? 40 : 48 // px per row
  const headerHeight = 44 // px for table header
  const rows = props.paginationMeta?.limit || itemsPerPage.value || 10
  return `${headerHeight + (rows * rowHeight)}px`
})

// Reset page only for client-side pagination when data changes
watch(
  () => safeData.value,
  () => {
    // Don't reset page for server-side pagination - server controls the page
    if (!props.serverSidePagination) {
      currentPage.value = 1
    }
    if (sortBy.value && !computedColumns.value.some(c => c.key === sortBy.value)) {
      sortBy.value = null
      sortDesc.value = false
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="t-table-component">
    <!-- Header with create button only -->
    <TableHeader
      :noHeader="noHeader"
      :showCreateButton="showCreateButton"
      :createButtonLabel="createButtonLabel"
      :createButtonIcon="createButtonIcon"
      :loading="loading"
      @create="handleCreate"
    />

    <!-- Search and pagination above table -->
    <TableSearchPagination
      :noPagination="noPagination"
      :totalPages="totalPages"
      :loading="loading"
      :currentPage="currentPage"
      :itemsPerPage="itemsPerPage"
      :itemsPerPageOptions="itemsPerPageOptions"
      :searchQuery="searchQuery"
      :searchPlaceholder="searchPlaceholder"
      :totalItems="paginationMeta?.total || filteredData.length"
      @update:currentPage="currentPage = $event"
      @update:itemsPerPage="itemsPerPage = $event"
      @update:searchQuery="searchQuery = $event"
    />

    <!-- Table container -->
    <div :class="tableContainerClasses" class="relative" :style="{ minHeight: tableMinHeight }">
      <!-- Loading overlay (shows over existing content) -->
      <div
        v-if="loading"
        class="absolute inset-0 flex justify-center items-center z-10"
      >
        <div class="flex items-center gap-2 px-4 py-2 rounded-lg theme-colors-background-secondary">
          <dxIcon name="ri:loader-4-line" size="xl" class="animate-spin" />
          <span class="theme-colors-text-secondary">Loading...</span>
        </div>
      </div>

      <!-- Table content (visible during loading if has data) -->
      <div v-if="paginatedData?.length > 0" :class="{ 'blur-sm': loading, 'transition-all duration-200': true }">
        <div class="w-full overflow-x-auto">
          <!-- Desktop table view -->
          <TableDesktopView
            v-if="!isMobile"
            :paginatedData="paginatedData"
            :computedColumns="computedColumns"
            :actionsColumn="actionsColumn"
            :showActionsColumn="showActionsColumn"
            :showActions="showActions"
            :animateChanges="animateChanges"
            :truncateText="truncateText"
            :compact="compact"
            :customActions="customActions"
            :sortBy="sortBy"
            :sortDesc="sortDesc"
            :getRowKey="getRowKey"
            :getColumnStyles="getColumnStyles"
            :getCellValue="getCellValue"
            :getFormattedValue="getFormattedValue"
            :getDisplayValue="getDisplayValue"
            :shouldTruncateFormatted="shouldTruncateFormatted"
            :isItemDeleting="isItemDeleting"
            :isItemPendingDelete="isItemPendingDelete"
            :handleSort="handleSort"
            :handleRowClick="handleRowClick"
            :handleEdit="handleEdit"
            :handleDelete="handleDelete"
            :handleCustomAction="handleCustomAction"
          >
            <template v-for="(_, name) in $slots" #[name]="slotProps">
              <slot :name="name" v-bind="slotProps" />
            </template>
          </TableDesktopView>

          <!-- Mobile view -->
          <TableMobileView
            v-else
            :paginatedData="paginatedData"
            :computedColumns="computedColumns"
            :showActionsColumn="showActionsColumn"
            :showActions="showActions"
            :animateChanges="animateChanges"
            :customActions="customActions"
            :getRowKey="getRowKey"
            :getDisplayValue="getDisplayValue"
            :isItemDeleting="isItemDeleting"
            :isItemPendingDelete="isItemPendingDelete"
            :handleRowClick="handleRowClick"
            :handleEdit="handleEdit"
            :handleDelete="handleDelete"
            :handleCustomAction="handleCustomAction"
          />
        </div>
      </div>

      <!-- Empty state (only when no data AND not loading) -->
      <div v-else-if="!loading" :class="['text-center p-2', 'theme-colors-text-secondary' || 'text-neutral-500']">
        No data found{{ searchQuery ? ' matching your search' : '' }}.
      </div>

      <!-- Initial loading state (no data yet) -->
      <div v-else class="flex justify-center items-center p-8 text-neutral-500">
        <dxIcon name="ri:loader-4-line" size="xl" class="animate-spin" />
        <span class="ml-2">Loading...</span>
      </div>


    </div>
  </div>
</template>

<style scoped>
.t-table-component {
  /* Additional styles for text truncation if needed */
  .table-cell-truncated {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* Table row transition animations */
.table-row-enter-active,
.table-row-leave-active {
  transition: all 0.3s ease;
}

.table-row-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.table-row-leave-to {
  opacity: 0;
  transform: translateX(-100%);
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border: none;
}

.table-row-leave-active td {
  border-bottom: none;
}

/* Mobile item transition animations */
.mobile-item-enter-active,
.mobile-item-leave-active {
  transition: all 0.3s ease;
}

.mobile-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.mobile-item-leave-to {
  opacity: 0;
  transform: translateX(-100%);
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
}

/* Smooth height transitions */
.table-row-move,
.mobile-item-move {
  transition: transform 0.3s ease;
}
</style>
