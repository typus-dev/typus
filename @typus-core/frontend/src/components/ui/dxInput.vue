<script setup lang="ts">
import type { ValidationRule, RegisterFormElement } from '@/components/ui/types/dxInput'

interface Props {
  modelValue?: string | number
  type?:
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'date'
    | 'time'
    | 'datetime-local'
  placeholder?: string
  label?: string
  disabled?: boolean 
  error?: boolean | string
  success?: boolean // Apply success state styling
  required?: boolean
  helperText?: string
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean 
  autofocus?: boolean
  name?: string
  min?: number | string
  max?: number | string
  step?: number | string
  pattern?: string
  autocomplete?: string
  maxlength?: number
  minlength?: number
  labelPosition?: 'top' | 'left' | 'floating'
  multiline?: boolean
  rows?: number | string
  autoResize?: boolean
  rules?: ValidationRule[]
  validateOnBlur?: boolean
  validateOnInput?: boolean
  noGutters?: boolean // Controls bottom margin
  width?: string
  customClass?: string,
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  error: false,
  success: false,
  required: false,
  size: 'md',
  clearable: false,
  readonly: false,
  autofocus: false,
  labelPosition: 'floating',
  multiline: false,
  rows: 3,
  autoResize: true,
  validateOnBlur: true,
  validateOnInput: false,
  noGutters: false, // Default to having margin-bottom
  //width: 'w-full',
  customClass: '',
  autocomplete: 'off',
  loading: false
})

const autoCompleteAttr = computed(() => {
  if (props.autocomplete) return props.autocomplete
  if (props.type === 'password') return 'nope-password'
  if (props.type === 'email') return 'nope'
  if (props.type === 'tel') return 'off'
  if (props.type === 'search') return 'off'
  return 'off'
})

const emit = defineEmits([
  'update:modelValue',
  'clear',
  'focus',
  'blur',
  'input'
])
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>()
const isFocused = ref(false)
const validationError = ref<string | boolean>(false)

const shouldFloatLabel = computed(() => {

  return isFocused.value || (props.modelValue != null && props.modelValue !== '')
})

const validate = () => {

  if (props.required && (props.modelValue == null || props.modelValue === '')) {
    validationError.value = `${props.label || 'Field'} is required`
    return false
  }
  if (!props.rules?.length) {
    validationError.value = false
    return true
  }
  for (const rule of props.rules) {
    const result = rule(props.modelValue!)
    if (result !== true) {
      validationError.value = result
      return false
    }
  }
  validationError.value = false
  return true
}

const showError = computed(() => {
  return props.error || validationError.value
})

const inputStateClass = computed(() => {
  if (props.disabled) return 'theme-components-input-states-disabled'
  if (showError.value) return 'theme-components-input-states-error'
  if (props.success) return 'theme-components-input-states-success'
  return 'theme-components-input-states-default'
})

const textareaStateClass = computed(() => {
  if (props.disabled) return 'theme-components-textarea-states-disabled'
  if (showError.value) return 'theme-components-textarea-states-error'
  if (props.success) return 'theme-components-textarea-states-success'
  return 'theme-components-textarea-states-default'
})

const errorMessage = computed(() => {
  if (typeof props.error === 'string') return props.error
  if (typeof validationError.value === 'string') return validationError.value
  return ''
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  let value: string | number = target.value
  if (props.type === 'number' && value !== '') {
    value = Number(value)
  }
  emit('update:modelValue', value)
  emit('input', event)
  if (props.validateOnInput) {
    validate()
  }

  
  if (props.multiline && props.autoResize) {

    adjustHeight()
  }
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
  if (props.validateOnBlur) {
    validate()
  }
}


const showClearButton = computed(
  () =>
    props.clearable &&
    props.modelValue !== '' &&
    !props.disabled &&
    !props.readonly &&
    props.type !== 'search'
)

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  validationError.value = false; // Clear validation error on clear
  inputRef.value?.focus()
}

const adjustHeight = () => {
  if (!props.multiline || !props.autoResize || !inputRef.value) return
  const textarea = inputRef.value as HTMLTextAreaElement
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

const DEFAULT_SIZE_TOKEN = {
  fontClass: 'theme-typography-size-base',
  height: 'var(--control-height-md, 2.75rem)',
  paddingY: 'var(--spacing-sm, 0.75rem)',
  paddingX: 'var(--spacing-md, 1rem)'
}

const CONTROL_SIZE_TOKENS: Record<string, { fontClass: string; height: string; paddingY: string; paddingX: string }> = {
  sm: {
    fontClass: 'theme-typography-size-sm',
    height: 'var(--control-height-sm, 2.25rem)',
    paddingY: 'var(--spacing-xs, 0.5rem)',
    paddingX: 'var(--spacing-sm, 0.75rem)'
  },
  md: {
    fontClass: 'theme-typography-size-base',
    height: 'var(--control-height-md, 2.75rem)',
    paddingY: 'var(--spacing-sm, 0.75rem)',
    paddingX: 'var(--spacing-md, 1rem)'
  },
  lg: {
    fontClass: 'theme-typography-size-lg',
    height: 'var(--control-height-lg, 3.25rem)',
    paddingY: 'var(--spacing-md, 1rem)',
    paddingX: 'var(--spacing-lg, 1.25rem)'
  }
}

const sizeConfig = computed(() => {
  const key = (props.size ?? 'md') as keyof typeof CONTROL_SIZE_TOKENS
  return CONTROL_SIZE_TOKENS[key] || DEFAULT_SIZE_TOKEN
})

const sizeFontClass = computed(() => sizeConfig.value?.fontClass || DEFAULT_SIZE_TOKEN.fontClass)
const sizeHeight = computed(() => sizeConfig.value?.height || DEFAULT_SIZE_TOKEN.height)
const sizePaddingY = computed(() => sizeConfig.value?.paddingY || DEFAULT_SIZE_TOKEN.paddingY)
const sizePaddingX = computed(() => sizeConfig.value?.paddingX || DEFAULT_SIZE_TOKEN.paddingX)

const sizeInlineStyle = computed(() => ({
  height: sizeHeight.value,
  paddingTop: sizePaddingY.value,
  paddingBottom: sizePaddingY.value,
  paddingLeft: sizePaddingX.value,
  paddingRight: sizePaddingX.value,
  lineHeight: `calc(${sizeHeight.value} - (2 * ${sizePaddingY.value}))`
}))

// --- Validation registration (no changes) ---
const registerFormElement = inject<RegisterFormElement | null>('registerFormElement', null)
onMounted(() => {
  if (registerFormElement) {
    registerFormElement({ validate, name: props.name || props.label || `input-${Date.now()}` }) // Pass name for better form mgmt
  }
  if (props.multiline && props.autoResize) {
      // Initial adjust after mount
      nextTick(adjustHeight);
  }
    if (props.autofocus) {
      inputRef.value?.focus();
  }
})

watch(() => props.modelValue, () => {

    if (props.multiline && props.autoResize) {
        // Adjust height when modelValue changes externally
        nextTick(adjustHeight);
    }
});

defineExpose({ validate, focus: () => inputRef.value?.focus() });


</script>

<template>

  <div
    :class="[
      labelPosition === 'left' ? 'flex items-center gap-4' : '',
      !props.noGutters ? 'mb-4' : '',
      width,
      customClass
    ]"
  >
    <!-- Non-floating Label -->
    <label
      v-if="label && labelPosition !== 'floating'"
      :class="[
        labelPosition === 'top'
          ? 'theme-components-input-label block mb-1'
          : 'theme-components-input-label min-w-[100px] flex items-center m-0',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        showError ? 'theme-colors-text-error' : ''
      ]"
    >
      {{ label }}
      <span v-if="required" class="theme-colors-text-error">*</span>
    </label>

    <div class="flex-1">
      <div
  :class="[
    'relative',
    { 'has-prefix': $slots.prefix, 'has-suffix': $slots.suffix || showClearButton }
  ]"
>
        <!-- Prefix Slot -->
        <div
          v-if="$slots.prefix"
          :class="[
              'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none',
               'theme-colors-text-secondary' || 'text-gray-500' // Use theme color if available
          ]"
        >
          <slot name="prefix" />
        </div>

        <!-- Textarea -->
        <textarea
          v-if="multiline"
          ref="inputRef"
          :value="modelValue"
          :placeholder="labelPosition === 'floating' ? ' ' : placeholder"
          :disabled="disabled"
          :required="required"
          :readonly="readonly"
          :name="name"
          :autocomplete="autocomplete"
          :maxlength="maxlength"
          :minlength="minlength"
          :autofocus="autofocus"
          :rows="rows"
          :class="[
            'theme-components-textarea-base',
            'theme-components-textarea-field',
            sizeFontClass,
            textareaStateClass.value,
            isFocused && 'theme-components-textarea-states-focus',
            $slots.prefix && 'pl-12',
            ($slots.suffix || showClearButton) && 'pr-10',
'min-h-0',
  autoResize ? 'resize-none overflow-hidden' : 'resize-y overflow-auto',
          ]"
          :style="sizeInlineStyle"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
        />

        <!-- Standard Input -->
<input
        v-else
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="labelPosition === 'floating' ? ' ' : placeholder"
        :disabled="disabled"
        :required="required"
        :readonly="readonly"
        :name="name"
        :min="min"
        :max="max"
        :step="step"
        :pattern="pattern"
        :autocomplete="autoCompleteAttr"
        :maxlength="maxlength"
        :minlength="minlength"
        :autofocus="autofocus"
        :class="[
          'theme-components-input-base',
          'theme-components-input-field',
          sizeFontClass,
          isFocused && 'theme-components-input-states-focus',
          inputStateClass.value,
          showError && 'error',
          $slots.prefix && 'pl-12',
          ($slots.suffix || showClearButton) && 'pr-10'
        ]"
        :style="sizeInlineStyle"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />

        <!-- Floating Label -->
        <label
          v-if="label && labelPosition === 'floating'"
          :class="[
            'absolute transition-all duration-200 pointer-events-none origin-[0] bg-inherit px-1 py-[1px] rounded-sm text-xs font-medium',
            // Disabled state
            disabled ? 'opacity-50' : '',
            // Error state
            showError ? 'theme-colors-text-error' : '',
            // Focused state
            'text-gray-400'
          ]"
          :style="shouldFloatLabel
            ? { top: '2px', transform: 'scale(0.75) translateY(-4px)', left: $slots.prefix ? '2.5rem' : '0.75rem' }
            : { top: '50%', transform: 'translateY(-50%)', left: $slots.prefix ? '2.5rem' : '0.75rem' }"
        >
          {{ label }}
          <span v-if="required" class="theme-colors-text-error">*</span>
        </label>

        <!-- Suffix and Clear Button Container -->
         <div v-if="loading" class="animate-spin">
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
</div>
        <div
          v-if="$slots.suffix || showClearButton"
          :class="['absolute inset-y-0 right-0 pr-3 flex items-center', 'theme-colors-text-secondary' || 'text-gray-500']"
        >
          <!-- Clear Button -->
          <button
            v-if="showClearButton"
            type="button"
            class="cursor-pointer p-1 -mr-1 rounded-full theme-mixins-interactive"
            aria-label="Clear input"
            @click="handleClear"
          >
           <!-- Simple X icon -->
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
           </svg>
          </button>
          <!-- Suffix Slot -->
          <slot v-else name="suffix" />
        </div>
      </div>

      <!-- Helper/Error Text -->
      <div
        v-if="helperText || errorMessage"
        :class="[
          'theme-components-input-helper',
          errorMessage ? 'theme-colors-text-error' : '' // Use error text color directly
        ]"
      >
        {{ errorMessage || helperText }}
      </div>
    </div>
  </div>
</template>

<style scoped>




textarea {
    box-sizing: border-box;
    vertical-align: top;

   
    
}


.has-prefix input,
.has-prefix textarea {
  padding-left: 3rem;
}

.has-suffix input,
.has-suffix textarea {
  padding-right: 3rem;
}

input,
textarea {
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

label {
  transition: all 0.3s ease;
}

.helper-text,
.error-text {
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.3s ease;
}

.helper-text.show,
.error-text.show {
  opacity: 1;
  transform: translateY(0);
}

input.error,
textarea.error {
  animation: pulse-border 1s infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: var(--color-border-error);
  }
  50% {
    opacity: 0.7;
  }
}

input:disabled,
input[readonly] {
  pointer-events: none;
  user-select: none;
  cursor: not-allowed;
}
input[type="search"]::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
  background: none;
  height: 1em;
  width: 1em;
  cursor: pointer;
  mask: url('data:image/svg+xml;utf8,<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>') center / contain no-repeat;
  background-color: #9ca3af;
}
</style>
