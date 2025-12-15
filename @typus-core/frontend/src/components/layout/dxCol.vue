<script setup lang="ts">
import { computed, onMounted, getCurrentInstance } from 'vue'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'

const { current } = useBreakpoint()

if (import.meta.env.DEV) {
  onMounted(() => {
    const instance = getCurrentInstance()
    if (!instance?.parent?.type?.__name?.includes('dxGrid')) {
      // Pass the component name as part of an object for structured logging
      logger.warn(' [dxCol] Use dxCol only inside dxGrid:', { parentComponent: instance?.parent?.type?.__name })
    }
  })
}

interface Props {
  span?: number | string
  sm?: number | string
  md?: number | string
  lg?: number | string
  xl?: number | string
  order?: number | string
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  class?: string | string[]
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  span: '',
  sm: '',
  md: '',
  lg: '',
  xl: '',
  order: '',
  align: 'stretch',
  class: '',
  bordered: false
})

// Static mapping for Tailwind to detect classes at build time
const colSpanMap: Record<string | number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12'
}

const smColSpanMap: Record<string | number, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  5: 'sm:col-span-5',
  6: 'sm:col-span-6',
  7: 'sm:col-span-7',
  8: 'sm:col-span-8',
  9: 'sm:col-span-9',
  10: 'sm:col-span-10',
  11: 'sm:col-span-11',
  12: 'sm:col-span-12'
}

const mdColSpanMap: Record<string | number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12'
}

const lgColSpanMap: Record<string | number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12'
}

const xlColSpanMap: Record<string | number, string> = {
  1: 'xl:col-span-1',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  6: 'xl:col-span-6',
  7: 'xl:col-span-7',
  8: 'xl:col-span-8',
  9: 'xl:col-span-9',
  10: 'xl:col-span-10',
  11: 'xl:col-span-11',
  12: 'xl:col-span-12'
}

const orderMap: Record<string | number, string> = {
  1: 'order-1',
  2: 'order-2',
  3: 'order-3',
  4: 'order-4',
  5: 'order-5',
  6: 'order-6',
  7: 'order-7',
  8: 'order-8',
  9: 'order-9',
  10: 'order-10',
  11: 'order-11',
  12: 'order-12',
  first: 'order-first',
  last: 'order-last',
  none: 'order-none'
}

const alignMap: Record<string, string> = {
  start: 'self-start',
  center: 'self-center',
  end: 'self-end',
  stretch: 'self-stretch',
  baseline: 'self-baseline'
}

// max col count per breakpoint
const maxCols = computed(() => {
  switch (current.value) {
    case 'xs': return 1
    case 'sm': return 2
    case 'md': return 4
    case 'lg': return 6
    case 'xl': return 8
    case '2xl': return 12
    default: return 1
  }
})


// limit span to maxCols
/**
* CACHE RENDERING BUG - Incorrect colspan generation in cached page chain
* Date: September 1, 2025
*
* Problem: When pages are rendered through the caching chain:
* dsxPageRendererWithContextUnified → dxGrid → dxCol
*
* The normalizedSpan function in dxCol.vue applies maxCols limitation to base 'span'
* prop, causing colSpan: 12 to be truncated to col-span-6 on 'lg' breakpoints
* (where maxCols = 6) instead of rendering the intended col-span-12.
*
* This creates layout inconsistencies between cached and non-cached renders,
* as the cached version uses the breakpoint-limited values while the original
* configuration expects full-width spans.
*
* Root cause: Math.min(span, maxCols.value) in normalizedSpan computed property
* affects all span values regardless of intended layout configuration.
*/
const normalizedSpan = computed(() => {
  const span = Number(props.span)
  /*

  */
  //return isNaN(span) ? undefined : Math.min(span, maxCols.value)
  return isNaN(span) ? undefined : span
})

const colClasses = computed(() => {
  const classes = [
    'box-border',
    'theme-layout-spacing-padding'
  ]

  if (props.bordered) {
    classes.push('theme-base-border' ?? '')
  }

  if (normalizedSpan.value) {
    classes.push(colSpanMap[normalizedSpan.value] || '')
  }

  // responsive spans
  if (props.sm) classes.push(smColSpanMap[props.sm] || '')
  if (props.md) classes.push(mdColSpanMap[props.md] || '')
  if (props.lg) classes.push(lgColSpanMap[props.lg] || '')
  if (props.xl) classes.push(xlColSpanMap[props.xl] || '')

  if (props.order !== '') classes.push(orderMap[props.order] || '')
  if (props.align) classes.push(alignMap[props.align] || '')

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
  <!-- dxCol.vue -->
  <div :class="colClasses">
    <slot />
  </div>
</template>
