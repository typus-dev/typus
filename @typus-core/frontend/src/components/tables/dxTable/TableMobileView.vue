<script setup lang="ts">
import type { Column, CustomAction } from './tableTypes'

const props = defineProps<{
  paginatedData: Record<string, any>[]
  computedColumns: Column[]
  showActionsColumn: boolean
  showActions: boolean
  animateChanges: boolean
  customActions: CustomAction[]
  getRowKey: (item: Record<string, any>, index: number) => string | number
  getDisplayValue: (item: Record<string, any>, column: Column) => any
  isItemDeleting: (item: Record<string, any>, index: number) => boolean
  isItemPendingDelete: (item: Record<string, any>, index: number) => boolean
  handleRowClick: (item: Record<string, any>, index: number) => void
  handleEdit: (item: Record<string, any>, event: Event) => void
  handleDelete: (item: Record<string, any>, event: Event, index: number) => Promise<void> | void
  handleCustomAction: (action: CustomAction, item: Record<string, any>, event: Event) => Promise<void> | void
}>()
</script>

<template>
  <dxStack spacing="3" class="w-full">
    <TransitionGroup
      v-if="animateChanges"
      name="mobile-item"
      tag="div"
      appear
      class="w-full space-y-3"
    >
      <div
        v-for="(item, index) in paginatedData"
        :key="getRowKey(item, index)"
        :class="[
          'w-full p-3 border-t border-neutral-800 space-y-2 transition-all duration-200',
          isItemDeleting(item, index) ? 'opacity-50 pointer-events-none' : '',
          isItemPendingDelete(item, index) ? 'mobile-item-leave-active' : ''
        ]"
        @click="handleRowClick(item, index)"
      >
        <div
          v-for="(col, colIndex) in computedColumns"
          :key="`${col?.key || colIndex}-${colIndex}`"
          class="flex justify-between w-full"
        >
          <template v-if="col && col.key">
            <span class="font-medium text-sm text-neutral-400">{{ col.title }}:</span>
            <span class="text-sm">{{ getDisplayValue(item, col) }}</span>
          </template>
        </div>
        
        <!-- Mobile actions -->
        <div v-if="showActionsColumn" class="flex justify-end space-x-2 pt-2">
          <dxButton
            v-if="showActions"
            variant="ghost"
            size="sm"
            shape="circle"
            icon-only
            :disabled="isItemDeleting(item, index)"
            @click.stop="e => handleEdit(item, e)"
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
            @click.stop="e => handleDelete(item, e, index)"
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

          <!-- Custom Actions for mobile -->
          <template v-for="action in customActions" :key="action.key">
            <dxButton
              v-if="!action.condition || action.condition(item)"
              :variant="action.variant || 'ghost'"
              size="sm"
              shape="circle"
              icon-only
              :disabled="isItemDeleting(item, index) || (typeof action.loading === 'function' ? action.loading(item) : action.loading)"
              :loading="typeof action.loading === 'function' ? action.loading(item) : action.loading"
              @click.stop="e => handleCustomAction(action, item, e)"
            >
              <dxIcon
                :name="
                  typeof action.icon === 'function' ? action.icon(item) : action.icon
                "
                size="sm"
              />
            </dxButton>
          </template>
        </div>
      </div>
    </TransitionGroup>
    
    <!-- Fallback mobile view without animations -->
    <template v-else>
      <div
        v-for="(item, index) in paginatedData"
        :key="getRowKey(item, index)"
        class="w-full p-3 border-t border-neutral-800 space-y-2"
        @click="handleRowClick(item, index)"
      >
        <div
          v-for="(col, colIndex) in computedColumns"
          :key="`${col?.key || colIndex}-${colIndex}`"
          class="flex justify-between w-full"
        >
          <template v-if="col && col.key">
            <span class="font-medium text-sm text-neutral-400">{{ col.title }}:</span>
            <span class="text-sm">{{ getDisplayValue(item, col) }}</span>
          </template>
        </div>
        
        <!-- Mobile actions -->
        <div v-if="showActionsColumn" class="flex justify-end space-x-2 pt-2">
          <dxButton
            v-if="showActions"
            variant="ghost"
            size="sm"
            shape="circle"
            icon-only
            @click.stop="e => handleEdit(item, e)"
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
            @click.stop="e => handleDelete(item, e, index)"
          >
            <dxIcon name="ri:delete-bin-line" size="sm" />
          </dxButton>

          <!-- Custom Actions for mobile -->
          <template v-for="action in customActions" :key="action.key">
            <dxButton
              v-if="!action.condition || action.condition(item)"
              :variant="action.variant || 'ghost'"
              size="sm"
              shape="circle"
              icon-only
              :disabled="typeof action.loading === 'function' ? action.loading(item) : action.loading"
              :loading="typeof action.loading === 'function' ? action.loading(item) : action.loading"
              @click.stop="e => handleCustomAction(action, item, e)"
            >
              <dxIcon
                :name="
                  typeof action.icon === 'function' ? action.icon(item) : action.icon
                "
                size="sm"
              />
            </dxButton>
          </template>
        </div>
      </div>
    </template>
  </dxStack>
</template>
