<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'

const bp = useBreakpoint()

const gridRef = ref<HTMLElement>()
const hasRowSpan = ref(false)

onMounted(() => {
  //If any child element has a rowSpan, we need to set auto-rows
  const children = gridRef.value?.children ?? []
  hasRowSpan.value = Array.from(children).some(el =>
    el instanceof HTMLElement && el.style.gridRow?.includes('span')
  )
})

interface Props {
  cols?: number | string
  sm?: number | string
  md?: number | string
  lg?: number | string
  xl?: number | string
  gap?: number | string
  class?: string | string[]
  bordered?: boolean
  rowHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  sm: '', md: '', lg: '', xl: '',
  gap: 4,
  class: '',
  bordered: false,
  rowHeight: ''
})

// Static mapping for Tailwind to detect classes at build time
const colsMap: Record<string | number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  8: 'grid-cols-8',
  12: 'grid-cols-12'
}

const smColsMap: Record<string | number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  6: 'sm:grid-cols-6',
  8: 'sm:grid-cols-8',
  12: 'sm:grid-cols-12'
}

const mdColsMap: Record<string | number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  6: 'md:grid-cols-6',
  8: 'md:grid-cols-8',
  12: 'md:grid-cols-12'
}

const lgColsMap: Record<string | number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  6: 'lg:grid-cols-6',
  8: 'lg:grid-cols-8',
  12: 'lg:grid-cols-12'
}

const xlColsMap: Record<string | number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  6: 'xl:grid-cols-6',
  8: 'xl:grid-cols-8',
  12: 'xl:grid-cols-12'
}

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

const allowedCols = [1, 2, 3, 4, 6, 8, 12]
function checkAllowed(value: any, label: string) {
  if (value && !allowedCols.includes(Number(value))) {
    console.warn(`[dxGrid] Invalid grid columns for ${label}: ${value}`)
  }
}

checkAllowed(props.cols, 'cols')
checkAllowed(props.sm, 'sm')
checkAllowed(props.md, 'md')
checkAllowed(props.lg, 'lg')
checkAllowed(props.xl, 'xl')

const gridClasses = computed(() => {
  const hasManualCols = !!props.cols || !!props.sm || !!props.md || !!props.lg || !!props.xl
  const isReady = bp.current.value !== 'default'
  let baseCols = 'grid-cols-1'

  if (!hasManualCols && isReady) {
    if (bp.isMobile.value) baseCols = 'grid-cols-1'
    else if (bp.isTablet.value) baseCols = 'grid-cols-2'
    else if (bp.isDesktop.value) baseCols = 'grid-cols-4'
  } else if (isReady && props.cols) {
    baseCols = colsMap[props.cols] || 'grid-cols-1'
  }

  const classes = [
    'grid w-full relative items-stretch',
    baseCols,
    'theme-layout-radius'
  ]

  if (props.bordered) classes.push('theme-base-border' ?? '')
  if (props.sm) classes.push(smColsMap[props.sm] || '')
  if (props.md) classes.push(mdColsMap[props.md] || '')
  if (props.lg) classes.push(lgColsMap[props.lg] || '')
  if (props.xl) classes.push(xlColsMap[props.xl] || '')

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
    Array.isArray(props.class)
      ? classes.push(...props.class)
      : classes.push(props.class)
  }

  //Add auto-rows if rowHeight is set or if any child has a rowSpan
  if (props.rowHeight) {
    classes.push(`auto-rows-[${props.rowHeight}]`)
  } else if (hasRowSpan.value) {
    classes.push('auto-rows-min')
  }

  return classes
})
</script>

<template>
  <!-- dxGrid.vue -->
  <div ref="gridRef" :class="gridClasses">
    <slot />
  </div>
</template>

