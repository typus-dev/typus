<script setup lang="ts">
const props = withDefaults(defineProps<{ active?: boolean; title?: string }>(), {
  active: false,
  title: 'Drag to resize',
})
const emit = defineEmits<{ down: [e: PointerEvent] }>()
const onDown = (e: PointerEvent) => { e.stopPropagation(); e.preventDefault(); emit('down', e) }
</script>

<template>
  <div class="resize-handle" :class="{ active: props.active }" :title="props.title" @pointerdown="onDown" />
</template>

<style scoped>
/* uses parent CSS for .resize-handle */
</style>

