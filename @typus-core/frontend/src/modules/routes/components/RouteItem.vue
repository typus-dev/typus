<template>
  <dxCard 
    :variant="'flat'" 
    :theme="theme" 
    :class="['theme-layout-spacing-margin', { 'has-children': hasChildren }]"
    :noPadding="true"
    background="secondary"
  >
    <dxFlex align="center" :style="{ paddingLeft: `${level * 20 + 10}px` }" class="p-2 w-full">
      <dxIcon name="ri:drag-move-2-line" :class="['theme-colors-text-tertiary', 'cursor-move drag-handle']" />
      
      <dxButton 
        v-if="hasChildren" 
        @click="toggleExpand" 
        iconOnly 
        variant="ghost" 
        size="xs"
      >
        <dxIcon :name="expanded ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'" />
      </dxButton>
      <dxStack v-else class="w-6 h-6"></dxStack>
      
      <dxFlex direction="col" grow class="min-w-0 mx-2">
        <span :class="['theme-typography-weight-medium', 'truncate']">{{ route.name }}</span>
        <span :class="['theme-typography-size-sm', 'theme-colors-text-secondary', 'truncate']">{{ route.path }}</span>
      </dxFlex>
      
      <dxFlex gap="2" class="mr-2">
        <dxBadge v-if="route.component" variant="secondary" size="sm">
          {{ route.component }}
        </dxBadge>
        <dxBadge v-if="!route.isActive" variant="error" size="sm">
          Inactive
        </dxBadge>
      </dxFlex>
      
      <dxFlex gap="1" >
        <dxButton @click.stop="addChild" iconOnly shape="circle" size="sm" variant="ghost" title="Add child route">
          <dxIcon name="ri:add-line" :class="'theme-colors-text-success'" />
        </dxButton>
        <dxButton @click.stop="edit" iconOnly shape="circle" size="sm" variant="ghost" title="Edit route">
          <dxIcon name="ri:edit-line" :class="'theme-colors-text-info'" />
        </dxButton>
        <dxButton @click.stop="remove" iconOnly shape="circle" size="sm" variant="ghost" title="Delete route">
          <dxIcon name="ri:delete-bin-line" :class="'theme-colors-text-error'" />
        </dxButton>
      </dxFlex>
    </dxFlex>
    
    <dxStack v-if="expanded && hasChildren" :class="'theme-layout-spacing-margin'">
      <draggable
        v-model="route.children"
        group="routes"
        item-key="id"
        :class="'theme-layout-spacing-padding'"
        ghost-class="opacity-50"
        handle=".drag-handle"
      >
        <template #item="{ element }">
          <route-item
            :route="element"
            :level="level + 1"
            :theme="theme"
            @edit="onEdit"
            @delete="onDelete"
            @add-child="onAddChild"
          />
        </template>
      </draggable>
    </dxStack>
  </dxCard>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue'
import draggable from 'vuedraggable'
import { useTheme } from '@/core/theme/composables/useTheme'

// Define props and emits
const props = defineProps({
 route: {
   type: Object,
   required: true
 },
 level: {
   type: Number,
   default: 0
 },
 theme: {
   type: Object,
   default: () => useTheme().theme
 }
})

const emit = defineEmits(['edit', 'delete', 'add-child'])

// Component state
const expanded = ref(true)
// Computed properties
const hasChildren = computed(() => {
 return props.route.children && props.route.children.length > 0
})

// Methods
function toggleExpand() {
 expanded.value = !expanded.value
}

function edit() {
 emit('edit', props.route)
}

function remove() {
 emit('delete', props.route)
}

function addChild() {
 emit('add-child', props.route)
}

function onEdit(route: any) {
 emit('edit', route)
}

function onDelete(route: any) {
 emit('delete', route)
}

function onAddChild(route: any) {
 emit('add-child', route)
}
</script>
