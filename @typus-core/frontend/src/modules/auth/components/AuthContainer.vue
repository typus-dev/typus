<script setup lang="ts">

  const props = withDefaults(defineProps<{ maxWidth?: 'sm' | 'md' | 'lg' | 'xl' }>(), {
    maxWidth: 'md'
})
</script>
<template>
<!-- AuthContainer.vue -->
  <div class="flex-grow flex items-center justify-center px-0">
    <div :class="`w-full max-w-${props.maxWidth}`">

            <slot />

    </div>
  </div>
</template>