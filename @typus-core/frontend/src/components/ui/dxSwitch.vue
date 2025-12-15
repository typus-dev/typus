<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Boolean, Number],
    default: false
  },
  disabled: Boolean,
  label: String,
  description: String,
  size: {
    type: String,
    default: 'md',
    validator: (v: string) => ['sm', 'md', 'lg'].includes(v)
  },
  labelPosition: {
    type: String,
    default: 'right',
    validator: (v: string) => ['left', 'right'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue'])
const SWITCH_SIZE_TOKENS = {
  sm: {
    font: 'theme-typography-size-sm',
    description: 'theme-typography-size-xs',
    trackWidth: '2rem',
    trackHeight: '1rem',
    handleSize: '0.75rem',
    translateChecked: '1rem'
  },
  md: {
    font: 'theme-typography-size-base',
    description: 'theme-typography-size-sm',
    trackWidth: '3rem',
    trackHeight: '1.5rem',
    handleSize: '1.25rem',
    translateChecked: '1.5rem'
  },
  lg: {
    font: 'theme-typography-size-lg',
    description: 'theme-typography-size-base',
    trackWidth: '4rem',
    trackHeight: '2rem',
    handleSize: '1.75rem',
    translateChecked: '2rem'
  }
} as const

const switchId = `dx-switch-${Math.random().toString(36).substring(7)}`

const resolvedSize = computed<'sm' | 'md' | 'lg'>(() => {
  if (props.size === 'sm' || props.size === 'lg') return props.size
  return 'md'
})

const sizeConfig = computed(() => {
  const config = SWITCH_SIZE_TOKENS[resolvedSize.value]
  if (!config) {
    console.warn('[dxSwitch] Invalid size provided:', props.size, '— falling back to md')
    return SWITCH_SIZE_TOKENS.md
  }
  return config
})
const sizeFontClass = computed(() => sizeConfig.value?.font || SWITCH_SIZE_TOKENS.md.font)
const sizeDescriptionClass = computed(() => sizeConfig.value?.description || SWITCH_SIZE_TOKENS.md.description)

const trackStyle = computed(() => ({
  width: sizeConfig.value?.trackWidth || SWITCH_SIZE_TOKENS.md.trackWidth,
  height: sizeConfig.value?.trackHeight || SWITCH_SIZE_TOKENS.md.trackHeight
}))

const handleStyle = computed(() => ({
  width: sizeConfig.value?.handleSize || SWITCH_SIZE_TOKENS.md.handleSize,
  height: sizeConfig.value?.handleSize || SWITCH_SIZE_TOKENS.md.handleSize,
  transform: props.modelValue
    ? `translateX(${sizeConfig.value?.translateChecked || SWITCH_SIZE_TOKENS.md.translateChecked})`
    : 'translateX(0)'
}))
</script>

<template>
  <div :class="['dx-switch-container inline-flex items-center m-0 align-middle']">
    <div v-if="label && labelPosition === 'left'" class="flex flex-col mr-2 text-right">
      <label :for="switchId" :class="['theme-typography-weight-medium', sizeFontClass, 'theme-colors-text-primary', 'cursor-pointer']">{{ label }}</label>
      <span v-if="description" :class="[sizeDescriptionClass, 'theme-colors-text-secondary', 'cursor-pointer']">{{ description }}</span>
    </div>
    <button
      :id="switchId"
      type="button"
      :class="[
        'theme-components-switch-base',
        // Prefer component-specific tokens; fall back to generic background tokens
        modelValue 
          ? ('theme-components-switch-checked' || 'theme-colors-background-accent')
          : ('theme-components-switch-default' || 'theme-colors-background-tertiary'),
        { ['theme-interactions-disabled']: disabled }
      ]"
      :style="trackStyle"
      :disabled="disabled"
      @click="emit('update:modelValue', !modelValue)"
      role="switch"
      :aria-checked="modelValue ? 'true' : 'false'"
    >
      <span
        :class="[
          'theme-components-switch-handle',
          'pointer-events-none inline-block transform rounded-full shadow ring-0 transition duration-200 ease-in-out'
        ]"
        :style="handleStyle"
        aria-hidden="true"
      />
    </button>
    <div v-if="label && labelPosition === 'right'" class="flex flex-col ml-2">
      <label :for="switchId" :class="['theme-typography-weight-medium', sizeFontClass, 'theme-colors-text-primary', 'cursor-pointer']">{{ label }}</label>
      <span v-if="description" :class="[sizeDescriptionClass, 'theme-colors-text-secondary', 'cursor-pointer']">{{ description }}</span>
    </div>
  </div>
</template>
