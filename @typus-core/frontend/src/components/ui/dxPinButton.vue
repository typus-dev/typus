//dxPinButton.vue
<script setup lang="ts">
interface Props {
  isPinned: boolean
  size?: 'xs'|'sm'|'md'|'lg'|'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const emit = defineEmits<{
  (e: 'update:isPinned', value: boolean): void
  (e: 'pin'): void
}>()
</script>

<template>
  <button
    @click="$emit('update:isPinned', !isPinned); $emit('pin')"
    class="p-2 hover:bg-gray-100 rounded-full transition-colors"
    :aria-label="isPinned ? 'Unpin' : 'Pin'"
  >
    <dxIcon
      :name="isPinned ? 'ri:pushpin-fill' : 'ri:pushpin-line'"
      :class="isPinned ? 'theme-colors-text-accent' : 'theme-colors-text-tertiary'"
      :size="size"
    />
  </button>
</template>