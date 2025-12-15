<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const { content, position = 'top' } = defineProps<Props>()

const isVisible = ref(false)

// Position classes mapping
const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 translate-x-2 ml-2'
}

// Arrow classes mapping
const arrowClasses = {
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-current border-x-transparent border-b-transparent',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-current border-x-transparent border-t-transparent',
  left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-current border-y-transparent border-r-transparent',
  right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-current border-y-transparent border-l-transparent'
}
</script>

<template>
  <div 
    class="relative inline-flex"
    @mouseenter="isVisible = true"
    @mouseleave="isVisible = false"
    @focus="isVisible = true"
    @blur="isVisible = false"
  >
    <slot />
    
    <!-- Tooltip -->
    <div
      v-show="isVisible"
      class="absolute z-50 px-2 py-1 text-xs whitespace-nowrap"
      :class="[
        positionClasses[position],
        'theme-components-tooltip-base' || 'bg-gray-800 text-white rounded shadow-lg'
      ]"
    >
      {{ content }}
      <!-- Arrow -->
      <div
        class="absolute w-0 h-0 border-4"
        :class="[
          arrowClasses[position],
          'theme-components-tooltip-arrow' || 'border-gray-800'
        ]"
      />
    </div>
  </div>
</template>
