<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  spacing?: number | string
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  class?: string | string[]
}

const props = withDefaults(defineProps<Props>(), {
  spacing: 4,
  align: 'start',
  class: ''
})

// Static mapping for Tailwind to detect classes at build time
const spacingMap: Record<string | number, string> = {
  0: 'space-y-0',
  1: 'space-y-1',
  2: 'space-y-2',
  3: 'space-y-3',
  4: 'space-y-4',
  5: 'space-y-5',
  6: 'space-y-6',
  8: 'space-y-8',
  10: 'space-y-10',
  12: 'space-y-12',
  16: 'space-y-16',
}

const stackClasses = computed(() => {
  const spacingClass = spacingMap[props.spacing] || 'space-y-4'

  const baseClasses = [
    'flex',
    'flex-col',
    'w-full',
    spacingClass
  ]

  const alignClasses = {
    'items-start': props.align === 'start',
    'items-center': props.align === 'center',
    'items-end': props.align === 'end',
    'items-stretch': props.align === 'stretch',
    'items-baseline': props.align === 'baseline'
  }

  const customClasses = Array.isArray(props.class) ? props.class : [props.class]

  return [...baseClasses, alignClasses, ...customClasses]
})
</script>

<template>
  <div :class="stackClasses">
    <slot />
  </div>
</template>
