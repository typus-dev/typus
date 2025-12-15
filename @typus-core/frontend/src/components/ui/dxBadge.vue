<script setup lang="ts">
import { computed } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'outline'
type BadgeSize = 'xs' |  'sm' | 'md' | 'lg'

interface Props {
  variant?: BadgeVariant
  size?: BadgeSize
  customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md'
})

const badgeClasses = computed(() => {
  return [
    'theme-components-badge-base',
    'theme-layout-radius',
    themeClass('components', 'badge', 'variants', props.variant),
    themeClass('components', 'badge', 'size', props.size),
    props.customClass
  ].filter(Boolean)
})
</script>

<template>
  <span :class="badgeClasses">
    <slot></slot>
  </span>
</template>
