<script setup lang="ts">
import { computed } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

// Define button types
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'warning'
  | 'ghost'
  | 'link'
  | 'info'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
type ButtonShape = 'default' | 'square' | 'circle'

// Define component props
interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: ButtonShape
  iconOnly?: boolean
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  customClass?: string,
  label?: string,
  isSubmitButton?: boolean
  autoIconColor?: boolean
}

// Set default prop values
const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  shape: 'default',
  iconOnly: false,
  disabled: false,
  loading: false,
  type: 'button',
  customClass: '',
  isSubmitButton: false,
  autoIconColor: true,
})

// Access theme configuration
// Map shape prop to Tailwind classes, using theme's base radius as fallback for 'default'
const shapeClasses = {
  default: 'theme-base-radius',
  square: 'rounded-none',
  circle: 'rounded-full'
}

// Auto icon color based on button variant
const iconColorClass = computed(() => {
  if (!props.autoIconColor) return ''
  
  const darkVariants = ['primary', 'danger', 'warning', 'info']
  const lightVariants = ['secondary', 'outline', 'ghost', 'link']
  
  if (darkVariants.includes(props.variant)) {
    return 'theme-colors-text-contrast'
  } else if (lightVariants.includes(props.variant)) {
    return 'theme-colors-text-secondary'
  }
  
  return ''
})

// Calculate spinner size and margin based on button size and type (iconOnly or regular)
const spinnerClasses = computed(() => {
  const { size, iconOnly } = props
  // Define margin classes mapping for spinner when not iconOnly
  const marginClasses: Record<ButtonSize, string> = {
    'xs': 'mr-1.5',
    'sm': 'mr-2',
    'md': 'mr-2.5',
    'lg': 'mr-3',
    'xl': 'mr-3.5',
    '2xl': 'mr-4',
    '3xl': 'mr-5',
    '4xl': 'mr-6'
  }
  // Define size classes mapping for spinner in regular buttons
  const regularSizeClasses: Record<ButtonSize, string> = {
    'xs': 'w-4 h-4',
    'sm': 'w-5 h-5',
    'md': 'w-6 h-6',
    'lg': 'w-7 h-7',
    'xl': 'w-8 h-8',
    '2xl': 'w-9 h-9',
    '3xl': 'w-10 h-10',
    '4xl': 'w-11 h-11'
  }
  // Define size classes mapping for spinner in iconOnly buttons
  const iconOnlySizeClasses: Record<ButtonSize, string> = {
    'xs': 'w-3 h-3',
    'sm': 'w-4 h-4',
    'md': 'w-5 h-5',
    'lg': 'w-6 h-6',
    'xl': 'w-7 h-7',
    '2xl': 'w-8 h-8',
    '3xl': 'w-9 h-9',
    '4xl': 'w-10 h-10'
  }
  // Determine margin based on whether the button is iconOnly
  const margins = !iconOnly ? marginClasses[size as ButtonSize] : ''
  // Determine spinner size based on whether the button is iconOnly
  const sizes = iconOnly ? iconOnlySizeClasses[size as ButtonSize] : regularSizeClasses[size as ButtonSize]

  return [margins, sizes] // Return array of margin and size classes
})

const buttonType = computed(() => (props.isSubmitButton ? 'submit' : props.type))

/** Remove focus after click */
function handleClick(event: MouseEvent) {
  (event.currentTarget as HTMLElement).blur()
}
</script>

<template>
  <!-- dxButton.vue Component -->
  <button @click="handleClick" :type="buttonType" :disabled="disabled || loading" :class="[
    'theme-mixins-interactive',
    'theme-components-button-base',
    !iconOnly && 'theme-components-button-minWidth',
    themeClass('components', 'button', 'variants', variant),
    iconOnly
      ? themeClass('components', 'button', 'iconOnly', size)
      : themeClass('components', 'button', 'size', size),
    !iconOnly &&
    !['link', 'ghost'].includes(props.variant) &&
    themeClass('components', 'button', 'spacing', size),
    fullWidth && 'w-full',
    loading && 'opacity-75 cursor-not-allowed',
    customClass,
    props.shape !== 'default' && shapeClasses[props.shape],
    props.shape !== 'circle' && 'theme-components-button-radius'
  ]">
    <!-- Prefix Slot: Typically used for icons or the loading spinner -->
    <slot name="prefix" :iconColor="iconColorClass">
      <!-- Loading Spinner: Displayed instead of prefix content when loading=true -->
      <span v-if="loading" class="animate-spin" :class="[spinnerClasses, iconColorClass]" role="status" aria-live="polite">
        <!-- Simple SVG Spinner -->
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-full h-full">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
            :stroke-width="size === 'xs' ? 3 : size === 'sm' ? 3.5 : 4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <span class="sr-only">Loading...</span> <!-- Accessibility text for spinner -->
      </span>
    </slot>

    <!-- Default Slot: Contains the main button content (e.g., text). Not rendered when loading. -->
    <template v-if="!loading">
      <slot :iconColor="iconColorClass">{{ label }}</slot>
    </template>

    <!-- Suffix Slot: Typically used for trailing icons -->
    <slot name="suffix" :iconColor="iconColorClass"></slot>
  </button>
</template>
