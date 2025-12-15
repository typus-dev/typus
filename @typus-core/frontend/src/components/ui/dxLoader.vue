<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse'
  text?: string
  fullscreen?: boolean
  overlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'spinner',
  fullscreen: false,
  overlay: false
})

const sizeClasses = computed(() => {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }
  return sizes[props.size]
})

const dotSize = computed(() => {
  const sizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  }
  return sizes[props.size]
})

const textSize = computed(() => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }
  return sizes[props.size]
})
</script>

<template>
  <div
    :class="[
      'flex flex-col items-center justify-center gap-3',
      fullscreen ? 'fixed inset-0 z-50' : '',
      overlay ? 'bg-black/20 backdrop-blur-sm' : ''
    ]"
  >
    <!-- Spinner variant -->
    <div
      v-if="variant === 'spinner'"
      :class="[
        sizeClasses,
        'border-2 rounded-full animate-spin',
        'theme-colors-border-primary' || 'border-gray-300',
        'border-t-transparent'
      ]"
    />

    <!-- Dots variant -->
    <div
      v-else-if="variant === 'dots'"
      class="flex gap-1.5"
    >
      <div
        v-for="i in 3"
        :key="i"
        :class="[
          dotSize,
          'rounded-full animate-pulse',
          'theme-colors-background-tertiary' || 'bg-gray-400'
        ]"
        :style="{ animationDelay: `${(i - 1) * 150}ms` }"
      />
    </div>

    <!-- Pulse variant -->
    <div
      v-else-if="variant === 'pulse'"
      :class="[
        sizeClasses,
        'rounded-full animate-pulse',
        'theme-colors-background-tertiary' || 'bg-gray-400'
      ]"
    />

    <!-- Optional text -->
    <div
      v-if="text"
      :class="[
        textSize,
        'theme-colors-text-secondary' || 'text-gray-600'
      ]"
    >
      {{ text }}
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
