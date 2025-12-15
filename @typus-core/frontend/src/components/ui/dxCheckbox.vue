<script setup lang="ts">
import { computed } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

const props = defineProps({
  modelValue: Boolean,
  disabled: Boolean,
  id: String,
  size: {
    type: String,
    default: 'md',
    validator: v => ['xs', 'sm', 'md', 'lg'].includes(v)
  },
  label: String,
  labelPosition: {
    type: String,
    default: 'right',
    validator: v => ['left', 'right'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue'])

const sizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
}

const LABEL_TYPOGRAPHY: Record<string, string> = {
  xs: 'theme-typography-size-xs',
  sm: 'theme-typography-size-sm',
  md: 'theme-typography-size-base',
  lg: 'theme-typography-size-lg'
}

const labelClass = computed(() => LABEL_TYPOGRAPHY[props.size] || LABEL_TYPOGRAPHY.md)

</script>

<template>
  <!-- file: shared\components\ui\dxCheckbox.vue -->
  <label class="inline-flex items-center whitespace-nowrap">
    <template v-if="labelPosition === 'left' && label">
      <span :class="['mr-2', labelClass]">{{ label }}</span>
    </template>

    <input
      type="checkbox"
      :id="props.id"
      :checked="modelValue"
      :disabled="disabled"
      class="sr-only"
      @change="emit('update:modelValue', !modelValue)"
    />
    <div
      :class="[
        'theme-components-checkbox-base',
        themeClass('components', 'checkbox', 'border', modelValue ? 'checked' : 'default'),
        themeClass('components', 'checkbox', 'background', modelValue ? 'checked' : 'default'),
        sizes[size],
        { ['theme-interactions-disabled']: disabled }
      ]"
    ></div>

    <template v-if="labelPosition === 'right' && label">
      <span :class="['ml-2', labelClass]">{{ label }}</span>
    </template>
  </label>
</template>
