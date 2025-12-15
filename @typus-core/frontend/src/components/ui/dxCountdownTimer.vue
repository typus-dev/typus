<!-- CountdownProgress.vue -->
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'update'): void
}>()

const props = withDefaults(defineProps<{
  duration: number,
  autoStart?: boolean
}>(), {
  duration: 5000,
  autoStart: true
})

const width = ref(100)
const intervalId = ref<number>()

function startProgress() {
  if (intervalId.value) clearInterval(intervalId.value)
  width.value = 100
  
  const step = 100 / (props.duration / 100)
  intervalId.value = window.setInterval(() => {
    width.value = Math.max(0, width.value - step)
    if (width.value === 0) {
      emit('update')
      startProgress()
    }
  }, 100)
}

onMounted(() => {
  if (props.autoStart) startProgress()
})

onUnmounted(() => {
  if (intervalId.value) clearInterval(intervalId.value)
})

defineExpose({ startProgress })
</script>

<template>
  <div class="absolute top-0 left-0 right-0 h-0.5">
    <div 
      class="h-full theme-colors-background-accent transition-all duration-100 ease-linear"
      :style="{ width: `${width}%` }"
    />
  </div>
</template>