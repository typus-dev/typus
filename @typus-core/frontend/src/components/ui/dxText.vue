<script setup lang="ts">
import { computed } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

interface Props {
  text?: string
  modelValue?: string | number | null
  tag?: string              // h1, p, span, blockquote, etc.
  color?: string            // semantic text color token (e.g., 'primary')
  align?: 'left' | 'center' | 'right'
  customClass?: string
  lineClamp?: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'p',
  color: 'primary',
  align: 'left',
  customClass: '',
  lineClamp: 0
})

// Computed display value - prefer text, fallback to modelValue
const displayValue = computed(() => {
  if (props.text !== undefined) return props.text
  if (props.modelValue !== undefined && props.modelValue !== null) {
    return String(props.modelValue)
  }
  return ''
})
</script>

<template>
  <div v-if="label" class="mb-2">
    <label class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <component
      :is="tag"
      :class="[
        themeClass('typography', 'content', tag),
        themeClass('colors', 'text', color),
        `text-${align}`,
        lineClamp ? `line-clamp-${lineClamp}` : '',
        'theme-typography-lineHeight',
        'theme-typography-letterSpacing',
        customClass,
        'bg-gray-50 px-3 py-2 rounded border'
      ]"
    >
      {{ displayValue }}
    </component>
  </div>
  <component
    v-else
    :is="tag"
    :class="[
      themeClass('typography', 'content', tag),
      themeClass('colors', 'text', color),
      `text-${align}`,
      lineClamp ? `line-clamp-${lineClamp}` : '',
      'theme-typography-lineHeight',
      'theme-typography-letterSpacing',
      customClass
    ]"
  >
    {{ displayValue }}
  </component>
</template>
