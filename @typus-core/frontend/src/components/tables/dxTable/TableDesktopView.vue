<script setup lang="ts">
import type { Column, CustomAction } from './tableTypes'

const props = defineProps<{
  paginatedData: Record<string, any>[]
  computedColumns: Column[]
  actionsColumn: Column | undefined
  showActionsColumn: boolean
  showActions: boolean
  animateChanges: boolean
  truncateText: boolean | number
  compact: boolean
  customActions: CustomAction[]
  sortBy: string | null
  sortDesc: boolean
  getRowKey: (item: Record<string, any>, index: number) => string | number
  getColumnStyles: (column: Column) => Record<string, string>
  getCellValue: (item: Record<string, any>, key: string) => any
  getFormattedValue: (item: Record<string, any>, column: Column) => any
  getDisplayValue: (item: Record<string, any>, column: Column) => any
  shouldTruncateFormatted: (item: Record<string, any>, column: Column, maxLength: number) => boolean
  isItemDeleting: (item: Record<string, any>, index: number) => boolean
  isItemPendingDelete: (item: Record<string, any>, index: number) => boolean
  handleSort: (columnKey: string, isSortable?: boolean) => void
  handleRowClick: (item: Record<string, any>, index: number) => void
  handleEdit: (item: Record<string, any>, event: Event) => void
  handleDelete: (item: Record<string, any>, event: Event, index: number) => Promise<void> | void
  handleCustomAction: (action: CustomAction, item: Record<string, any>, event: Event) => Promise<void> | void
}>()

</script>

<template>
  <table
    :class="'theme-components-table-base' || 'min-w-full divide-y divide-neutral-700'"
    style="table-layout: fixed; width: 100%"
  >
    <thead>
      <tr
        v-if="computedColumns.length > 0"
        :class="'theme-components-table-header-row' || 'border-b border-neutral-700'"
      >
        <th
          v-for="col in computedColumns"
          :key="col.key"
          :class="
            compact
              ? 'px-4 py-1 text-left font-medium theme-typography-size-xs'
              : 'theme-components-table-header-cell' ||
                'px-4 py-3 text-left font-medium bg-neutral-800'
          "
          :style="getColumnStyles(col)"
          @click="handleSort(col.key, col.sortable)"
        >
          <dxFlex align="center" gap="1">
            <span :class="compact ? 'theme-typography-size-xs' : 'theme-typography-size-sm'">{{ col.title }}</span>
            <dxIcon
              v-if="col.sortable && sortBy === col.key"
              :name="sortDesc ? 'ri:arrow-down-s-line' : 'ri:arrow-up-s-line'"
              size="sm"
            />
            <dxIcon
              v-else-if="col.sortable"
              name="ri:expand-up-down-line"
              size="sm"
              class="text-neutral-600"
            />
          </dxFlex>
        </th>
        <th
          v-if="showActionsColumn"
          :class="
            compact
              ? 'px-4 py-1 text-right font-medium theme-typography-size-xs'
              : 'theme-components-table-header-cell' ||
                'px-4 py-3 text-right font-medium bg-neutral-800'
          "
          :style="
            actionsColumn
              ? {
                  width: actionsColumn.width,
                  maxWidth: actionsColumn.width,
                  minWidth: actionsColumn.width
                }
              : {}
          "
          >
          <span :class="compact ? 'theme-typography-size-xs' : 'theme-typography-size-sm'">{{
            actionsColumn?.title || 'Actions'
          }}</span>
        </th>
      </tr>
    </thead>

    <TransitionGroup
      v-if="animateChanges"
      name="table-row"
      tag="tbody"
      appear

    >
      <tr
        v-for="(item, index) in paginatedData"
        :key="getRowKey(item, index)"
        :class="[
          'theme-components-table-body-row' || 'hover:bg-neutral-800/50',
          'cursor-pointer transition-all duration-200',
          isItemDeleting(item, index) ? 'opacity-50 pointer-events-none' : '',
          isItemPendingDelete(item, index) ? 'table-row-leave-active' : ''
        ]"
        @click="handleRowClick(item, index)"
        @dblclick="$emit('row-double-click', item)"
      >
        <template v-if="computedColumns.length > 0">
          <td
            v-for="col in computedColumns"
            :key="col.key"
            :class="[
              compact
                ? 'px-4 py-1 theme-typography-size-xs'
                : 'theme-components-table-body-cell' || 'px-4 py-3'
            ]"
            :style="getColumnStyles(col)"
          >
            <div
              :class="col.width ? 'overflow-hidden text-ellipsis whitespace-nowrap' : ''"
              :title="col.width ? String(getFormattedValue(item, col)) : undefined"
            >
              <slot
                v-if="$slots[col.key]"
                :name="col.key"
                :item="item"
                :value="getCellValue(item, col.key)"
                :formatted="getFormattedValue(item, col)"
              />
              <template v-else>
                <dxFlex
                  v-if="typeof getCellValue(item, col.key) === 'boolean'"
                  align="center"
                >
                  <dxIcon
                    :name="getCellValue(item, col.key) ? 'ri:check-line' : 'ri:close-line'"
                    :class="getCellValue(item, col.key) ? 'theme-colors-text-success' : 'theme-colors-text-error'"
                    size="sm"
                  />
                </dxFlex>
                <template v-else>{{ getDisplayValue(item, col) }}</template>
              </template>
            </div>
          </td>
          <td
            v-if="showActionsColumn"
            :class="[
              'text-right',
              compact
                ? 'px-4 py-1 theme-typography-size-xs'
                : 'theme-components-table-body-cell' || 'px-4 py-3'
            ]"
            :style="
              actionsColumn
                ? {
                    width: actionsColumn.width,
                    maxWidth: actionsColumn.width,
                    minWidth: actionsColumn.width
                  }
                : {}
            "
          >
            <slot name="actions" :item="item">
              <!-- Default actions -->
              <dxButton
                v-if="showActions"
                variant="ghost"
                size="sm"
                shape="circle"
                icon-only
                :disabled="isItemDeleting(item, index)"
                @click="e => handleEdit(item, e)"
              >
                <dxIcon name="ri:edit-line" size="sm" />
              </dxButton>
              <dxButton
                v-if="showActions"
                variant="ghost"
                size="sm"
                shape="circle"
                icon-only
                class="theme-colors-text-error"
                :disabled="isItemDeleting(item, index)"
                @click="e => handleDelete(item, e, index)"
              >
                <dxIcon 
                  v-if="isItemDeleting(item, index)"
                  name="ri:loader-4-line" 
                  size="sm" 
                  class="animate-spin" 
                />
                <dxIcon 
                  v-else
                  name="ri:delete-bin-line" 
                  size="sm" 
                />
              </dxButton>

              <!-- Custom Actions -->
              <template v-for="action in customActions" :key="action.key">
                <dxButton
                  v-if="!action.condition || action.condition(item)"
                  :variant="action.variant || 'ghost'"
                  size="sm"
                  shape="circle"
                  icon-only
                  :disabled="isItemDeleting(item, index) || (typeof action.loading === 'function' ? action.loading(item) : action.loading)"
                  :loading="typeof action.loading === 'function' ? action.loading(item) : action.loading"
                  @click="e => handleCustomAction(action, item, e)"
                >
                  <dxIcon
                    :name="
                      typeof action.icon === 'function' ? action.icon(item) : action.icon
                    "
                    size="sm"
                  />
                </dxButton>
              </template>
            </slot>
          </td>
        </template>
        <td v-else :colspan="100" class="p-2 text-center text-neutral-500">
          No columns defined.
        </td>
      </tr>
    </TransitionGroup>

    <!-- Fallback for no animations -->
    <template v-else>
      <tr
        v-for="(item, index) in paginatedData"
        :key="getRowKey(item, index)"
        :class="[
          'theme-components-table-body-row' || 'hover:bg-neutral-800/50',
          'cursor-pointer'
        ]"
        @click="handleRowClick(item, index)"
        @dblclick="$emit('row-double-click', item)"
      >
        <template v-if="computedColumns.length > 0">
          <td
            v-for="col in computedColumns"
            :key="col.key"
            :class="[
              compact
                ? 'px-4 py-1 theme-typography-size-xs'
                : 'theme-components-table-body-cell' || 'px-4 py-3'
            ]"
            :style="getColumnStyles(col)"
          >
            <div
              :class="col.width ? 'overflow-hidden text-ellipsis whitespace-nowrap' : ''"
              :title="col.width ? String(getFormattedValue(item, col)) : undefined"
            >
              <slot
                v-if="$slots[col.key]"
                :name="col.key"
                :item="item"
                :value="getCellValue(item, col.key)"
                :formatted="getFormattedValue(item, col)"
              />
              <template v-else>
                <dxFlex
                  v-if="typeof getCellValue(item, col.key) === 'boolean'"
                  align="center"
                >
                  <dxIcon
                    :name="getCellValue(item, col.key) ? 'ri:check-line' : 'ri:close-line'"
                    :class="getCellValue(item, col.key) ? 'theme-colors-text-success' : 'theme-colors-text-error'"
                    size="sm"
                  />
                </dxFlex>
                <template v-else>{{ getDisplayValue(item, col) }}</template>
              </template>
            </div>
          </td>
          <td
            v-if="showActionsColumn"
            :class="[
              'text-right',
              compact
                ? 'px-4 py-1 theme-typography-size-xs'
                : 'theme-components-table-body-cell' || 'px-4 py-3'
            ]"
            :style="
              actionsColumn
                ? {
                    width: actionsColumn.width,
                    maxWidth: actionsColumn.width,
                    minWidth: actionsColumn.width
                  }
                : {}
            "
          >
            <slot name="actions" :item="item">
              <!-- Default actions -->
              <dxButton
                v-if="showActions"
                variant="ghost"
                size="sm"
                shape="circle"
                icon-only
                @click="e => handleEdit(item, e)"
              >
                <dxIcon name="ri:edit-line" size="sm" />
              </dxButton>
              <dxButton
                v-if="showActions"
                variant="ghost"
                size="sm"
                shape="circle"
                icon-only
                class="theme-colors-text-error"
                @click="e => handleDelete(item, e, index)"
              >
                <dxIcon name="ri:delete-bin-line" size="sm" />
              </dxButton>

              <!-- Custom Actions -->
              <template v-for="action in customActions" :key="action.key">
                <dxButton
                  v-if="!action.condition || action.condition(item)"
                  :variant="action.variant || 'ghost'"
                  size="sm"
                  shape="circle"
                  icon-only
                  :disabled="typeof action.loading === 'function' ? action.loading(item) : action.loading"
                  :loading="typeof action.loading === 'function' ? action.loading(item) : action.loading"
                  @click="e => handleCustomAction(action, item, e)"
                >
                  <dxIcon
                    :name="
                      typeof action.icon === 'function' ? action.icon(item) : action.icon
                    "
                    size="sm"
                  />
                </dxButton>
              </template>
            </slot>
          </td>
        </template>
        <td v-else :colspan="100" class="p-2 text-center text-neutral-500">
          No columns defined.
        </td>
      </tr>
    </template>
  </table>
</template>
