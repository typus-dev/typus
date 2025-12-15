<template>
  <div class="flex items-center">
    <div :class="priorityClass" class="w-2 h-2 rounded-full"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  priority: {
    type: Number,
    default: 3
  }
})

const priorityClass = computed(() => {
  const priority = props.priority
  
  if (priority <= 1) {
    return 'theme-colors-background-error0' // Critical priority
  } else if (priority <= 2) {
    return 'theme-colors-background-warning' // High priority
  } else if (priority <= 3) {
    return 'theme-colors-background-warning' // Medium priority
  } else if (priority <= 4) {
    return 'theme-colors-background-success' // Low priority
  } else {
    return 'bg-gray-400' // Very low priority
  }
})
</script>
