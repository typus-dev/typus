<template>
  <!-- file: shared\components\layout\TContainer.vue -->

  <div
    :class="[
      'container',
      { 'mx-auto': !fluid },
      props.customClass,
      'theme-layout-container-base',
      'theme-layout-container-spacing'
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">

interface ContainerProps {
  fluid?: boolean
  customClass?: string
}

const props = withDefaults(defineProps<ContainerProps>(), {
  fluid: false,
  customClass: ''
})
</script>
