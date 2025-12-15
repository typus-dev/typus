<!-- src/components/dxModal.vue -->
<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: Boolean,
  title: String,
  maxWidth: {
    type: String,
    default: 'md'
  },
  closeOnClickOutside: {
    type: Boolean,
    default: false
  },
  contentAlign: {
    type: String,
    default: 'stretch',
    validator: (value) => ['start', 'center', 'stretch'].includes(value)
  },
  maxHeight: {
    type: String,
    default: '80vh'
  }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
}

const handleEscape = e => {
  if (e.key === 'Escape' && props.show) {
    handleClose()
  }
}

const handleOutsideClick = () => {
  if (props.closeOnClickOutside) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

// Calculate max width class based on prop
const getMaxWidthClass = () => {
  const widthMap = {
    'sm': 'max-w-sm', // 24rem
    'md': 'max-w-md', // 28rem
    'lg': 'max-w-lg', // 32rem
    'xl': 'max-w-xl', // 36rem
    '2xl': 'max-w-2xl', // 42rem
    'full': 'max-w-full'
  }

  return widthMap[props.maxWidth] || 'max-w-xl'
}
</script>

<template>
  <teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="handleOutsideClick"
    >
      <div
        :class="[
          'w-full bg-neutral-900 rounded-lg shadow-lg flex flex-col',
          getMaxWidthClass(),
          `max-h-[${maxHeight}]`
        ]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-700 shrink-0">
          <h3 class="text-lg font-medium text-neutral-100">{{ title }}</h3>
          <button
            class="p-1 text-neutral-400 rounded-md hover:bg-neutral-800 hover:text-neutral-300"
            @click="handleClose"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Content -->
        <div
          :class="[
            'overflow-auto w-full flex-grow custom-scrollbar',
            {
              'items-start': contentAlign === 'start',
              'items-center': contentAlign === 'center',
              'items-stretch': contentAlign === 'stretch'
            }
          ]"
        >
          <slot></slot>
        </div>
        
        <!-- Footer -->
        <div
          v-if="$slots.footer"
          class="px-6 py-4 bg-neutral-800 border-t border-neutral-700 shrink-0 rounded-b-lg"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #262626; /* neutral-800 */
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #525252; /* neutral-600 */
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #737373; /* neutral-500 */
}
</style>