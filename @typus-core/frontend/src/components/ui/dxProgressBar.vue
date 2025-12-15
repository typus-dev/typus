<!-- file: shared/components/ui/dxProgressBar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { themeClass } from '@/shared/utils/themeClass'

interface Props {
  value: number;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: boolean;
  showValue?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  variant: 'primary',
  size: 'md',
  label: false,
  showValue: false,
});

const clampedValue = computed(() => Math.max(0, Math.min(100, props.value)));

const progressStyle = computed(() => ({
  width: `${clampedValue.value}%`,
}));

const variantMap = {
  primary: 'accent',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

const trackClass = computed(() => 'theme-colors-background-tertiary')

const barClass = computed(() => {
  const themeVariant = variantMap[props.variant] || 'accent'
  return [
    themeClass('colors', 'background', themeVariant),
    themeClass('components', 'progressbar', 'size', props.size),
    'theme-base-animation-duration',
    'theme-layout-radius',
    'transition-all ease-in-out'
  ]
})

const labelClass = computed(() => 'theme-colors-text-contrast')
</script>

<template>
  <div :class="['w-full overflow-hidden', trackClass, 'theme-layout-radius']">
    <div
      :class="[barClass, 'relative']"
      :style="progressStyle"
      role="progressbar"
      :aria-valuenow="clampedValue"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span
        v-if="props.label && props.showValue"
        :class="[
          labelClass,
          'absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-medium leading-none'
        ]"
       >
         {{ clampedValue.toFixed(0) }}%
       </span>
       <span v-else class="sr-only">{{ clampedValue.toFixed(0) }}%</span>
    </div>
  </div>
</template>
