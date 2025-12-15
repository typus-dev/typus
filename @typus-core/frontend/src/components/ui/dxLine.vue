<script setup lang="ts">
interface Props {
  colorClass?: string
  thicknessClass?: string
  marginClass?: string
  shadowClass?: string
  customClass?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div
    :class="[
      'w-full',
      props.colorClass || 'theme-colors-border-primary',
      props.thicknessClass || 'border-t',
      props.marginClass || '',
      props.shadowClass || 'theme-base-shadow',
      props.customClass
    ]"
  />
</template>
