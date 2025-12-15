<!-- dxCard2.vue  -->


<script setup lang="ts">
import { computed } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

type BackgroundOption = boolean | 'primary' | 'secondary' | 'tertiary' | 'accent';

interface Props {
  title?: string
  variant?: 'elevated' | 'outlined' | 'flat' | 'gradient' | 'transparent'
  customClass?: Array<string> | string
  bordered?: boolean
  background?: BackgroundOption
  noPadding?: boolean // Controls only content area padding
  fullHeight?: boolean
  tag?: string // Allow rendering as different root element
  htmlContent?: string // New prop for HTML content
}
const props = withDefaults(defineProps<Props>(), {
  title: '',
  variant: 'elevated',
  customClass: '',
  bordered: true,
  background: false, // Default: use theme-components-card-base background (supports glass)
  noPadding: false,
  fullHeight: false,
  tag: 'div', // Default to div
  htmlContent: '', // Default value for htmlContent
})

const emit = defineEmits(['click'])

// Glassmorphism is now controlled entirely via CSS variables in theme tokens
// No data-attributes or JavaScript logic needed - just use theme classes
const cardBaseClasses = computed(() => {
  return [
    'flex flex-col w-full',
    'theme-layout-radius',
    'theme-components-card-base'
  ];
})

const backgroundClass = computed(() => {
  logger.debug('backgroundClass computing', { backgroundPropValue: props.background })

  // When false: don't add any background class, let theme-components-card-base handle it (supports glass)
  if (props.background === false) {
    return props.variant === 'gradient' ? 'theme-colors-gradients-primary' : '';
  }

  // Handle true (use secondary) or specific color names
  const bgKey = props.background === true ? 'secondary' : props.background;
  return themeClass('colors', 'background', bgKey || 'secondary') || 'theme-colors-background-secondary';
})

const cardVariantClass = computed(() => {
  return props.variant ? themeClass('components', 'card', 'variants', props.variant) : ''
})

const borderOverrideClass = computed(() => {
  if (!props.bordered) {
    return 'border-0'
  }
  if (!props.variant) {
    return 'border theme-colors-border-primary'
  }
  return ''
})


const headerClass = computed(() => {
   // Header usually includes padding and border-bottom
   return 'theme-components-card-header';
})

const contentClass = computed(() => {
   // Content *only* handles padding if not disabled
   return props.noPadding ? 'flex-1' : ['flex-1', 'theme-components-card-content'];
})

const footerClass = computed(() => {
  // Footer usually includes padding and border-top
  return 'theme-components-card-footer';
})

const handleClick = (event: MouseEvent) => {
    emit('click', event);
}
</script>

<template>

  <component
    :is="props.tag"
    :class="[
      cardBaseClasses,
      backgroundClass,
      cardVariantClass,
      borderOverrideClass,
      customClass,
      props.fullHeight ? 'h-full' : '',

    ]"
    @click="handleClick"
  >
    <div
      v-if="title || $slots.header"
      :class="[headerClass]"
    >
      <slot name="header">
        <h3 :class="['theme-typography-size-md', 'theme-typography-weight-semibold', 'theme-colors-text-primary']">{{ title }}</h3>
      </slot>
    </div>

    <div :class="[contentClass]">
      <!-- If htmlContent is provided, render it; otherwise, render the default slot -->
      <div v-if="htmlContent" v-html="htmlContent"></div>
      <slot v-else></slot>
    </div>

    <div
      v-if="$slots.footer"
      :class="[footerClass, 'mt-auto']"
    >
      <slot name="footer"></slot>
    </div>
  </component>
</template>
