<script setup lang="ts">
import { ref, computed, watch, useAttrs, type PropType } from 'vue'

interface Column {
  key: string
  title: string
  sortable?: boolean
  width?: string
}

interface TableProps {
  columns?: Column[]
  data?: Record<string, any>[]
  loading?: boolean
  rowKey?: string | ((item: Record<string, any>) => string | number)
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  noHeader?: boolean
  noPagination?: boolean
  searchPlaceholder?: string
  embedded?: boolean
  addButton?: boolean
}

const props = withDefaults(defineProps<TableProps>(), {
  columns: undefined,
  data: () => [],
  loading: false,
  rowKey: undefined,
  itemsPerPageOptions: () => [10, 25, 50, 100],
  defaultItemsPerPage: 10,
  noHeader: false,
  noPagination: false,
  searchPlaceholder: 'Search...',
  embedded: false,
  addButton: false
})

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'row-click', item: Record<string, any>): void
  (e: 'sort', payload: { sortBy: string | null; sortDesc: boolean }): void
}>()

type SlotProps = { 
  item?: Record<string, any>; 
  value?: any; 
  columns?: Column[]; 
  data?: Record<string, any>[]; 
}
type ActionSlotProps = { item: Record<string, any> }

defineSlots<{
  [key: string]: (props: SlotProps) => any
  actions: (props: ActionSlotProps) => any
  footer: (props: SlotProps) => any
}>()

const isMobile = ref(false)
const attrs = useAttrs();

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(props.defaultItemsPerPage)
const sortBy = ref<string | null>(null)
const sortDesc = ref(false)

const hasRowClickListener = computed(() => !!attrs.onRowClick || !!attrs['onRow-click']);

const computedColumns = computed<Column[]>(() => {
  if (props.columns && props.columns.length > 0) {
    return props.columns;
  }
  if (Array.isArray(props.data) && props.data.length > 0 && props.data[0]) {
    return Object.keys(props.data[0]).map(key => ({
      title: formatHeader(key),
      key: key,
      sortable: true
    }));
  }
  return [];
})

const safeData = computed(() => Array.isArray(props.data) ? props.data : []);

const sortedData = computed(() => {
  if (!sortBy.value || safeData.value.length === 0) {
    return [...safeData.value];
  }
  const dataCopy = [...safeData.value];
  return dataCopy.sort((a, b) => {
    let valA = a[sortBy.value!];
    let valB = b[sortBy.value!];
    if (valA < valB) return sortDesc.value ? 1 : -1;
    if (valA > valB) return sortDesc.value ? -1 : 1;
    return 0;
  });
})

const filteredData = computed(() => {
  if (!searchQuery.value) return sortedData.value;
  const query = searchQuery.value.toLowerCase();
  return sortedData.value.filter((item) =>
    Object.values(item).some(val => String(val).toLowerCase().includes(query))
  );
})

const totalPages = computed(() => {
  if (itemsPerPage.value <= 0 || filteredData.value.length === 0) return 1;
  return Math.max(1, Math.ceil(filteredData.value.length / itemsPerPage.value));
})

const paginatedData = computed(() => {
  if (itemsPerPage.value <= 0 || filteredData.value.length === 0) return filteredData.value;
  if (currentPage.value > totalPages.value) {
     currentPage.value = totalPages.value;
  }
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredData.value.slice(start, end);
})

const itemsPerPageOptionsFormatted = computed(() =>
    props.itemsPerPageOptions.map(num => ({ label: String(num), value: num }))
)

const formatHeader = (key: string): string => key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim()

const handleSort = (columnKey: string, isSortable?: boolean) => {
  if (!isSortable) return
  if (sortBy.value === columnKey) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = columnKey
    sortDesc.value = false
  }
  currentPage.value = 1
  emit('sort', { sortBy: sortBy.value, sortDesc: sortDesc.value })
}

const getRowKey = (item: Record<string, any>, index: number): string | number => {
  if (typeof props.rowKey === 'function') { return props.rowKey(item); }
  if (typeof props.rowKey === 'string' && item[props.rowKey] !== undefined) { return item[props.rowKey]; }
  return index
}

watch(searchQuery, () => { currentPage.value = 1 })
watch(itemsPerPage, () => { currentPage.value = 1 })
watch(() => props.data, () => {
    currentPage.value = 1;
    if (sortBy.value && !computedColumns.value.some(c => c.key === sortBy.value)) {
        sortBy.value = null;
        sortDesc.value = false;
    }
}, { deep: true })

</script>

<template>
  <div class="t-table-component space-y-4">

    <dxRow v-if="!noHeader" justify="between" align="center" noGutters >
        <dxCol v-if="addButton" cols="auto">
            <dxButton variant="outline" size="sm" @click="$emit('add')" :disabled="loading">
                <dxIcon name="ri:add-line" size="sm" />
                <span>Add</span>
            </dxButton>
        </dxCol>
        <dxCol cols="auto" md="4">
            <dxInput
                v-model="searchQuery"
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
        </dxCol>
    </dxRow>

    <div :class="[
      'table-wrapper',
      !embedded && [
        'theme-colors-background-secondary' || 'bg-slate-800',
        'theme-components-table-border' || 'border border-slate-700',
        'theme-base-radius' || 'rounded-lg',
        'theme-base-shadow' || 'shadow-lg',
        'overflow-hidden'
      ]
    ]">
        <div v-if="loading" class="flex justify-center items-center p-2 text-slate-500">
            <dxIcon name="ri:loader-4-line" size="xl" class="animate-spin" />
            <span class="ml-2">Loading...</span>
        </div>

        <div v-else-if="paginatedData?.length > 0">
             <div :class="'theme-components-table-wrapper' || 'w-full overflow-x-auto'">
                <table v-if="!isMobile" :class="[
                  'theme-components-table-base' || 'min-w-full divide-y divide-slate-700',
                  !embedded ? 'divide-none border-none' : ''
                ]">
                    <thead>
                        <tr v-if="computedColumns.length > 0" :class="[
                          'theme-components-table-header-row' || 'border-b border-slate-700',
                          !embedded ? 'border-b-0' : ''
                        ]">
                            <th
                                v-for="col in computedColumns"
                                :key="col.key"
                                :class="[
                                  'theme-components-table-header-cell' || 'px-4 py-3 text-left font-medium bg-slate-800',
                                  'theme-typography-size-xs' || 'text-xs',
                                  'theme-colors-text-secondary' || 'text-slate-400',
                                  'uppercase tracking-wider text-left',
                                  col.sortable ? 'cursor-pointer hover:bg-opacity-80' : ''
                                ]"
                                :style="{ width: col.width, maxWidth: col.width, minWidth: col.width }"
                                @click="handleSort(col.key, col.sortable)"
                            >
                                <dxFlex align="center" gap="1">
                                    <span>{{ col.title }}</span>
                                    <dxIcon v-if="col.sortable && sortBy === col.key" :name="sortDesc ? 'ri:arrow-down-s-line' : 'ri:arrow-up-s-line'" size="sm" />
                                    <dxIcon v-else-if="col.sortable" name='ri:expand-up-down-line' size="sm" class="text-slate-600" />
                                </dxFlex>
                            </th>
                            <th v-if="$slots.actions" :class="[
                              'theme-components-table-header-cell' || 'px-4 py-3 text-left font-medium bg-slate-800',
                              'theme-typography-size-xs' || 'text-xs',
                              'theme-colors-text-secondary' || 'text-slate-400'
                            ]"></th>
                        </tr>
                    </thead>
                    <tbody :class="[
                      embedded ? 'divide-y' : '',
                      embedded ? 'divide-slate-700' : ''
                    ]">
                        <tr
                            v-for="(item, index) in paginatedData"
                            :key="getRowKey(item, index)"
                            :class="[
                              'theme-components-table-body-row' || 'border-slate-700 hover:bg-slate-700 transition-colors duration-200',
                              !embedded && index < (paginatedData?.length ?? 0) - 1 ? 'border-b' : '',
                              !embedded ? 'border-slate-700' : '',
                              theme?.components?.table?.stripes && index % 2 === 0 ? 'theme-components-table-stripes-even' : '',
                              theme?.components?.table?.stripes && index % 2 !== 0 ? 'theme-components-table-stripes-odd' : '',
                              hasRowClickListener ? 'cursor-pointer' : ''
                            ]"
                            @click="hasRowClickListener && $emit('row-click', item)"
                        >
                            <template v-if="computedColumns.length > 0">
                                <td
                                    v-for="col in computedColumns"
                                    :key="col.key"
                                    :class="[
                                      'theme-components-table-body-cell' || 'px-4 py-3',
                                      'theme-typography-size-sm' || 'text-sm',
                                      'theme-colors-text-primary' || 'text-slate-100',
                                      'align-middle break-words whitespace-nowrap'
                                    ]"
                                    :style="{ width: col.width, maxWidth: col.width, minWidth: col.width }"
                                >
                                    <slot v-if="$slots[col.key]" :name="col.key" :item="item" :value="item[col.key]" />
                                    <template v-else>
                                        <dxFlex v-if="typeof item[col.key] === 'boolean'" align="center">
                                            <dxIcon :name="item[col.key] ? 'ri:check-line' : 'ri:close-line'" :class="item[col.key] ? ('theme-colors-text-success' || 'theme-colors-text-success') : ('theme-colors-text-error' || 'theme-colors-text-error')" size="sm" />
                                        </dxFlex>
                                        <template v-else>{{ item[col.key] }}</template>
                                    </template>
                                </td>
                                <td v-if="$slots.actions" :class="[
                                  'theme-components-table-body-cell' || 'px-4 py-3',
                                  'theme-typography-size-sm' || 'text-sm',
                                  'theme-colors-text-primary' || 'text-slate-100',
                                  'text-right'
                                ]">
                                    <slot name="actions" :item="item" />
                                </td>
                            </template>
                             <td v-else :colspan="100" class="p-2 text-center text-slate-500">No columns defined.</td>
                        </tr>
                    </tbody>
                    <tfoot v-if="$slots.footer">
                         <tr :class="'theme-components-table-footer-row' || 'bg-slate-800'">
                            <slot name="footer" :columns="computedColumns" :data="paginatedData"></slot>
                         </tr>
                     </tfoot>
                </table>
                <dxGrid v-else cols="1" :gap="'theme-layout-grid-gap' || 'gap-6'">
  <div
    v-for="(item, index) in paginatedData"
    :key="getRowKey(item, index)"
    
  >
    <dxStack v-if="computedColumns.length > 0" spacing="2" dense>
      <dxRow
        v-if="$slots.actions"
        align="center"
        justify="end"
        noGutters
     
      >
        <slot name="actions" :item="item" />
      </dxRow>
      <dxLine v-if="$slots.actions" />
      <dxRow
        v-for="col in computedColumns"
        :key="col.key"
        align="center"
        noGutters
    
      >
        <dxCol
          cols="4"
          :class="['theme-colors-text-secondary' || 'text-slate-400', 'theme-typography-size-xs' || 'text-xs', 'font-medium']"
        >
          {{ col.title }}
        </dxCol>
        <dxCol :cols="8" :class="['theme-typography-size-sm' || 'text-sm']">
          <slot
            v-if="$slots[col.key]"
            :name="col.key"
            :item="item"
            :value="item[col.key]"
          />
          <template v-else>
            <dxFlex v-if="typeof item[col.key] === 'boolean'" align="center">
              <dxIcon
                :name="item[col.key] ? 'ri:check-line' : 'ri:close-line'"
                :class="item[col.key] ? ('theme-colors-text-success' || 'theme-colors-text-success') : ('theme-colors-text-error' || 'theme-colors-text-error')"
                size="sm"
              />
            </dxFlex>
            <template v-else>{{ item[col.key] }}</template>
          </template>
        </dxCol>
      </dxRow>
    </dxStack>
    <div v-else class="p-2 text-center text-slate-500 text-sm">No columns defined.</div>
  </div>
</dxGrid>

            </div>
        </div>

        <div v-else :class="['text-center p-2', 'theme-colors-text-secondary' || 'text-slate-500']">
             No data found{{ searchQuery ? ' matching your search' : '' }}.
        </div>

        <dxRow v-if="!noPagination && totalPages > 1 && !loading" justify="end" align="center" :class="[
          'theme-components-table-pagination-wrapper' || 'flex items-center justify-between p-4',
          !embedded ? 'border-t border-slate-700' : ''
        ]" noGutters>
           <nav class="flex items-center gap-1">
                <dxButton
                   :custom-class="'theme-components-table-pagination-button' || 'p-1 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'"
                   size="sm"
                   :disabled="currentPage === 1"
                   @click="currentPage--"
                   iconOnly
                >
                   <dxIcon name="ri:arrow-left-s-line" size="md" />
                </dxButton>
                <span :class="[
                  'theme-components-table-pagination-text' || 'text-sm',
                  'theme-colors-text-secondary' || 'text-slate-400',
                  'px-2'
                ]">
                   Page {{ currentPage }} of {{ totalPages }}
                </span>
                <dxButton
                 :custom-class="'theme-components-table-pagination-button' || 'p-1 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'"
                   size="sm"
                   :disabled="currentPage === totalPages"
                   @click="currentPage++"
                   iconOnly
                >
                   <dxIcon name="ri:arrow-right-s-line" size="md" />
                </dxButton>
                <dxSelect
                    v-if="itemsPerPageOptionsFormatted.length > 1"
                    v-model="itemsPerPage"
                    :options="itemsPerPageOptionsFormatted"
                    size="sm"
                    width="w-28"
                    noGutters
                    labelPosition="left"
                    label="Per page:"
                />
           </nav>
        </dxRow>
    </div>
  </div>
</template>