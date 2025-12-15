<script setup lang="ts">

const props = defineProps({
  show: Boolean,
  fullScreen: Boolean,
  size: {
    type: String,
    default: 'md'
  }
})

const spinnerSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-4 h-4'
    case 'lg': return 'w-8 h-8'
    case 'xl': return 'w-12 h-12'
    default: return 'w-6 h-6' // md size
  }
})

const containerClasses = computed(() => [
  'flex items-center justify-center',
  'backdrop-filter backdrop-blur-sm',
  props.fullScreen ? 'fixed inset-0 z-[9999]' : 'absolute inset-0'
])
</script>

<template>
  <Teleport to="body" v-if="fullScreen">
    <div v-if="show" :class="containerClasses">
      <div :class="['animate-spin rounded-full border-t-2 theme-colors-border-accent', spinnerSize]"></div>
    </div>
  </Teleport>
  <div v-else-if="show" class="relative w-full h-full">
    <div :class="containerClasses">
      <div :class="['animate-spin rounded-full border-t-2 theme-colors-border-accent', spinnerSize]"></div>
    </div>
  </div>
</template>

<!-- 
Usage:
<dxSpinner :show="isLoading" :full-screen="false" size="md" />

Props:
- show: Boolean - Controls the visibility of the spinner
- fullScreen: Boolean - Determines if the spinner should cover the entire screen or just its parent
- size: String - Controls the size of the spinner ('sm', 'md', 'lg', 'xl')

The spinner will automatically adapt to its container size. For non-fullscreen use,
ensure the parent container has a defined height or uses relative positioning.
-->
