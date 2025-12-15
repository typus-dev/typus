<!-- src/shared/components/dxToastsContainer.vue -->
<template>
  <div
    v-for="position in positions"
    :key="position"
    :class="getPositionClass(position)"
    class="fixed flex flex-col gap-3 z-50 p-4"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in getToastsByPosition(position)"
        :key="toast.id"
        :class="[
          'theme-layout-radius' || 'rounded-md',
          'theme-base-shadow' || 'shadow-md',
          'theme-colors-background-secondary' || 'bg-neutral-800',
          'theme-colors-border-primary' || 'border border-neutral-700',
          'min-w-[280px] max-w-sm w-fit flex items-center gap-2 relative overflow-hidden px-3 py-2'
        ]"
      >
        <!-- Icon indicator -->
        <div class="flex items-center flex-shrink-0">
          <div v-if="toast.type === 'success'" :class="'theme-colors-text-success' || 'theme-colors-text-success'">
            <dxIcon name="ri:check-line" size="sm" />
          </div>
          <div v-else :class="'theme-colors-text-error' || 'theme-colors-text-error'">
            <dxIcon name="ri:close-line" size="sm" />
          </div>
        </div>

        <!-- Message -->
        <div :class="[
          'text-sm flex-1 break-words',
          'theme-colors-text-primary' || 'text-neutral-100'
        ]" v-html="toast.message"></div>

        <!-- Close button -->
        <button
          @click="closeToast(Number(toast.id))"
          :class="[
            'flex-shrink-0 p-0.5 rounded transition-colors',
            'theme-colors-text-secondary' || 'text-neutral-400',
            'hover:' + ('theme-colors-text-primary' || 'text-neutral-200')
          ]"
        >
          <dxIcon
            name="ri:close-line"
            size="sm"
          />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToasts } from '@/shared/composables/useToasts'

// Get theme and toasts
const { toasts, removeToast } = useToasts()

// Toast positions
const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left']

// Position classes
const getPositionClass = (position: string) => {
  switch (position) {
    case 'top-right': return 'top-0 right-0'
    case 'top-left': return 'top-0 left-0'
    case 'bottom-right': return 'bottom-0 right-0'
    case 'bottom-left': return 'bottom-0 left-0'
    default: return ''
  }
}


// Filter toasts by position
const getToastsByPosition = (position: string) => {
  return toasts.value.filter(toast => toast.options.position === position)
}

// Close toast function
const closeToast = (id: number) => {
  removeToast(id)
}
</script>

<style>
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>