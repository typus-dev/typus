
<script setup lang="ts">
import { computed } from 'vue'
import { useAppConfig } from '@/shared/composables/useAppConfig'
interface Props {

  scale?: 'small' | 'large';
}
const props = withDefaults(defineProps<Props>(), {
  scale: 'large', 
});
const appConfig = useAppConfig()
const headingTag = computed(() => (props.scale === 'large' ? 'h1' : 'h2'));
const textClasses = computed(() => {
  const base = 'font-semibold flex items-center whitespace-nowrap';
  const sizeClass = props.scale === 'large' ? 'text-xl' : 'text-base'; 
  return `${base} ${sizeClass}`;
});
const effectiveIconSize = computed(() => {
  return props.scale === 'large' ? (appConfig.logo.size || 'md') : 'sm'; 
});
const stackClasses = computed(() => {
  return props.scale === 'large' ? 'mb-6' : 'mb-4'; 
});
</script>
<template>
  <dxStack align="center" :customClass="stackClasses">
    <component :is="headingTag" :class="textClasses">
      <dxIcon
        :name="appConfig.logo.icon"
        :size="effectiveIconSize"
        customClass="mr-2" 
      />
      {{ appConfig.name }}
    </component>
  </dxStack>
</template>
<style scoped>
</style>