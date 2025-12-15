<script setup lang="ts">
const props = withDefaults(defineProps<{ title?: string }>(), { title: 'Drag block' })
const emit = defineEmits<{ down: [e: PointerEvent] }>()
const onDown = (e: PointerEvent) => { e.stopPropagation(); e.preventDefault(); emit('down', e) }
</script>

<template>
  <div class="drag-grip" :title="props.title" @pointerdown="onDown" />
  
</template>

<style scoped>
/* visual is provided by parent CSS (.drag-grip) */
</style>

