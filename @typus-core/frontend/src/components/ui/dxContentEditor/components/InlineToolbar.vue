<script setup lang="ts">
interface Props {
  modelValue: boolean
  anchor?: 'top' | 'bottom'
}
withDefaults(defineProps<Props>(), { anchor: 'top' })
defineEmits<{ 'update:modelValue': [val: boolean] }>()
</script>

<template>
  <div v-show="modelValue" :class="['itoolbar', `itoolbar--${anchor}`]">
    <slot />
  </div>
</template>

<style scoped>
:host { display: contents; }
.itoolbar {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0,0,0,.35);
}
:deep(.popup) { background: var(--surface) !important; border-color: var(--border) !important; }
.itoolbar--top {}
.itoolbar--bottom {}
</style>
