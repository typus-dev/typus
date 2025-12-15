<script setup lang="ts">
interface Props {
  src: string
  alt?: string
  fullWidth?: boolean
  height?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="overflow-hidden w-full" :style="{ height: props.height || 'auto' }">
    <img
      :src="props.src"
      :alt="props.alt || ''"
      class="object-cover w-full h-full"
      :class="{ 'w-full': props.fullWidth }"
      loading="lazy"
    />
  </div>
</template>
