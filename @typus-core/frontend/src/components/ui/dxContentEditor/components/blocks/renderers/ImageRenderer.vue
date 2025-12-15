<script setup lang="ts">
interface Props { html?: string; src?: string; readonly?: boolean; contentStyle?: any }
const props = withDefaults(defineProps<Props>(), { readonly: false })
</script>

<template>
  <div class="image">
    <img :src="props.src || props.html || ''" :style="props.contentStyle" alt="" />
  </div>
</template>

<style scoped>
.image img { display: block; width: 100%; height: auto; object-fit: cover; }
</style>

