<script setup lang="ts">
import { computed } from 'vue'

type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type Direction = 'row' | 'col' | 'column'
type Wrap = 'wrap' | 'nowrap' | 'wrap-reverse'

interface Props {
  direction?: Direction
  wrap?: Wrap
  gap?: number | string
  justify?: Justify
  align?: Align
  class?: string | string[]
  center?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'row',
  wrap: 'nowrap',
  gap: '0',
  justify: 'start',
  align: 'stretch',
  class: '',
  center: false
})

// Static mapping for Tailwind to detect classes at build time
const gapMap: Record<string | number, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
  16: 'gap-16'
}

const justifyMap: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}

const alignMap: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline'
}

const normalizedDirection = computed(() =>
  props.direction === 'col' || props.direction === 'column' ? 'col' : 'row'
)

const flexClasses = computed(() => {
  const classes = [
    'flex',
    'w-full',
    normalizedDirection.value === 'col' ? 'flex-col' : 'flex-row',
    props.wrap === 'wrap' ? 'flex-wrap' : props.wrap === 'wrap-reverse' ? 'flex-wrap-reverse' : 'flex-nowrap',
    props.center ? 'justify-center' : justifyMap[props.justify],
    props.center ? 'items-center' : alignMap[props.align]
  ]

  if (props.gap !== undefined && props.gap !== null && props.gap !== '0') {
    const gapClass = gapMap[props.gap]
    if (gapClass) {
      classes.push(gapClass)
    } else if (typeof props.gap === 'string' && isNaN(Number(props.gap))) {
      // Allow custom gap classes passed as strings
      classes.push(props.gap)
    }
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
  <!-- dxFlex.vue -->  
  <div :class="flexClasses">
    <slot />
  </div>
</template>
