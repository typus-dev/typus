<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: number | string
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  class?: string | string[]
}

const props = withDefaults(defineProps<Props>(), {
  wrap: 'wrap',
  gap: '0',
  justify: 'start',
  align: 'stretch',
  class: ''
})

const rowClasses = computed(() => {
  const classes = [
    'flex flex-row',
    props.wrap === 'wrap' ? 'flex-wrap' : props.wrap === 'wrap-reverse' ? 'flex-wrap-reverse' : 'flex-nowrap',
    `justify-${props.justify}`,
    `items-${props.align}`,
  
  ]

  if (props.gap !== undefined && props.gap !== null && props.gap !== '0') {
    classes.push(typeof props.gap === 'number' || !isNaN(Number(props.gap)) ? `gap-${props.gap}` : `${props.gap}`)
  }

  if (props.class) {
    if (Array.isArray(props.class)) {
      classes.push(...props.class)
    } else {
      classes.push(props.class)
    }
  }

  return classes
})
</script>

<template>
  <!-- dxRow.vue -->
  <div :class="rowClasses">
    <slot />
  </div>
</template>
