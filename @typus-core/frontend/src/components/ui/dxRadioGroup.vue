<!-- src/shared/components/ui/dxRadioGroup.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number
  options: Option[]
  label?: string
  disabled?: boolean
  required?: boolean
  customClass?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
  label: '',
  disabled: false,
  required: false,
  customClass: '',
  name: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const groupName = computed(() => {
  return props.name || `radio-group-${Math.random().toString(36).substring(7)}`
})

const updateValue = (value: string | number) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div :class="['radio-group', customClass]">
    <label
      v-if="label"
      :class="[
        'theme-typography-weight-medium',
        'theme-typography-size-base',
        'theme-colors-text-primary',
        'block mb-2'
      ]"
    >
      {{ label }}
      <span v-if="required" class="theme-colors-text-error ml-1">*</span>
    </label>
    
    <div class="flex flex-col space-y-2">
      <div 
        v-for="option in options" 
        :key="option.value" 
        class="flex items-center"
      >
        <input
          type="radio"
          :id="`${groupName}-${option.value}`"
          :name="groupName"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="disabled"
          class="sr-only"
          @change="updateValue(option.value)"
        />
        <label 
          :for="`${groupName}-${option.value}`" 
          class="flex items-center cursor-pointer"
          :class="{ 'opacity-50 cursor-not-allowed': disabled }"
        >
          <span 
            class="w-5 h-5 inline-flex items-center justify-center mr-2 rounded-full border"
            :class="[
              modelValue === option.value 
                ? 'theme-colors-border-primary' 
                : 'theme-colors-border-secondary',
              'theme-base-radius'
            ]"
          >

         
            <span 
              v-if="modelValue === option.value" 
              class="w-2.5 h-2.5 rounded-full"
              :class="'theme-colors-background-accent'"
            ></span>
          </span>
          
          <span class="theme-colors-text-primary theme-typography-size-base">{{ option.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
