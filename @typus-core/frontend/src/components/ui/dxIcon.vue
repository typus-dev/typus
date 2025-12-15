<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { themeClass } from '@/shared/utils/themeClass'

interface Props {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
  customClass: '',
  name: ''
})
</script>

<template>
  <Icon 
    :icon="props.name"
    :class="[
      themeClass('icons', 'size', props.size),
      themeClass('icons', 'color', props.color),
      customClass
    ]" 
  />
</template>
