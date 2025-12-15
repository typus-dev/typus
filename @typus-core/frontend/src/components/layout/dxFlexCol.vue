<script setup lang="ts">
// dxFlexCol: Use only inside dxFlex component
import { computed, onMounted, getCurrentInstance } from 'vue'
if (import.meta.env.DEV) {
  onMounted(() => {
    const instance = getCurrentInstance()
    
    if (!instance?.parent?.type?.__name?.includes('dxFlex')) {
       
      logger.warn(' [dxFlexCol] Use dxFlexCol only inside dxFlex')
    }
  })
}

interface Props {
  width?: 'full' | 'auto' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4'
  grow?: boolean
  shrink?: boolean
  basis?: string
  order?: number | string
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  class?: string | string[]
  bordered?: boolean 
}

const props = withDefaults(defineProps<Props>(), {
  width: 'auto',
  grow: false,
  shrink: true,
  basis: '',
  order: '',
  align: 'stretch',
  class: '',
  bordered: false 
})

const colClasses = computed(() => {
  const classes = [
    'box-border',
    'theme-layout-radius',
    'theme-layout-spacing-padding'
  ]
  
  
  if (props.bordered) {
    classes.push('theme-base-border' ?? '')
  }
  
  // Width
  switch (props.width) {
    case 'full':
      classes.push('w-full')
      break
    case 'auto':
      classes.push('w-auto')
      break
    case '1/2':
      classes.push('w-1/2')
      break
    case '1/3':
      classes.push('w-1/3')
      break
    case '2/3':
      classes.push('w-2/3')
      break
    case '1/4':
      classes.push('w-1/4')
      break
    case '3/4':
      classes.push('w-3/4')
      break
  }
  
  // Flex grow/shrink
  if (props.grow) classes.push('flex-grow')
  if (!props.shrink) classes.push('shrink-0')
  
  // Basis
  if (props.basis) classes.push(`basis-${props.basis}`)
  
  // Order
  if (props.order !== '') classes.push(`order-${props.order}`)
  
  // Align
  if (props.align) classes.push(`self-${props.align}`)
  
  // Custom classes
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
  <!-- dxFlexCol.vue -->
  <div :class="colClasses">
    <slot />
  </div>
</template>