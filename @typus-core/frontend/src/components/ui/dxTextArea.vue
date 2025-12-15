<script setup lang="ts">
import DxInput from './dxInput.vue'; // Import the base input component
import { withDefaults, defineProps, defineEmits } from 'vue';

// Define props for dxTextArea, extending dxInput's props
interface Props {
  modelValue?: string | number;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: boolean | string;
  success?: boolean;
  required?: boolean;
  helperText?: string;
  clearable?: boolean; // May not be relevant for textarea, but keep for consistency
  size?: 'sm' | 'md' | 'lg'; // Size might affect font size in textarea
  readonly?: boolean;
  autofocus?: boolean;
  name?: string;
  maxlength?: number;
  minlength?: number;
  labelPosition?: 'top' | 'left' | 'floating';
  rows?: number | string; // Override default rows
  autoResize?: boolean;
  rules?: ((value: string | number) => boolean | string)[];
  validateOnBlur?: boolean;
  validateOnInput?: boolean;
  noGutters?: boolean;
  width?: string;
  customClass?: string;
  autocomplete?: string; // May not be relevant for textarea
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  label: '',
  disabled: false,
  error: false,
  success: false,
  required: false,
  size: 'md',
  clearable: false,
  readonly: false,
  autofocus: false,
  labelPosition: 'floating',
  rows: 10, // Default rows for textarea
  autoResize: false,
  validateOnBlur: true,
  validateOnInput: false,
  noGutters: false,
  width: undefined, // Use dxInput default
  customClass: '',
  autocomplete: 'off'
});

// Define emitted events, primarily for v-model
const emit = defineEmits([
  'update:modelValue',
  'clear',
  'focus',
  'blur',
  'input'
]);

const dxInputRef = ref<InstanceType<typeof DxInput>>();


const validate = () => dxInputRef.value?.validate?.();
const focus = () => dxInputRef.value?.focus?.();

defineExpose({
  validate,
  focus
});
</script>

<template>

  <!-- dxTextArea component -->

  <DxInput
    ref="dxInputRef"
    v-bind="props"
    multiline
    :rows="props.rows"
    @update:modelValue="emit('update:modelValue', $event)"
    @clear="emit('clear')"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
    @input="emit('input', $event)"
    style="height:auto"
  />
</template>
