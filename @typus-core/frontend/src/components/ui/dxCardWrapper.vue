<script setup lang="ts">
import dxCard from './dxCard.vue';

interface Progress {
  value: number;
  label: string;
  variant: 'success' | 'warning' | 'info' | 'error';
}

interface Content {
  number: number | string;
  progress?: Progress;
}

interface Props {
  title?: string;
  variant?: 'elevated' | 'outlined' | 'flat' | 'gradient' | 'transparent';
  customClass?: Array<string> | string;
  bordered?: boolean;
  background?: boolean | 'primary' | 'secondary' | 'tertiary' | 'accent';
  noPadding?: boolean;
  fullHeight?: boolean;
  tag?: string;
  content?: Content;
  data?: any;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  variant: 'elevated',
  customClass: '',
  bordered: true,
  background: 'secondary',
  noPadding: false,
  fullHeight: false,
  tag: 'div',
  content: undefined,
  data: undefined
});

import { computed } from 'vue';

// Get content from props.content or props.data
const cardContent = computed(() => {
  if (props.content) {
    return props.content;
  }
  
  if (props.data && typeof props.data === 'object') {
    return props.data;
  }
  
  return null;
});

// Format number for display
const formatNumber = (num: number | string): string => {
  if (typeof num === 'number') {
    return num.toLocaleString();
  }
  return num;
};

// Get variant class for progress
const getProgressClass = (variant: string): string => {
  switch (variant) {
    case 'success':
      return 'theme-colors-text-success';
    case 'warning':
      return 'theme-colors-text-warning';
    case 'info':
      return 'theme-colors-text-accent';
    case 'error':
      return 'theme-colors-text-error';
    default:
      return 'text-gray-500';
  }
};
</script>

<template>
  <dxCard
    :title="title"
    :variant="variant"
    :customClass="customClass"
    :bordered="bordered"
    :background="background"
    :noPadding="noPadding"
    :fullHeight="fullHeight"
    :tag="tag"
  >
    <template v-if="cardContent">
      <div class="card-content">
        <div v-if="cardContent.number" class="number text-3xl font-bold mb-2">
          {{ formatNumber(cardContent.number) }}
        </div>
        <div v-if="cardContent.progress" class="progress flex items-center">
          <div class="progress-bar w-24 h-2 bg-gray-700 rounded-full mr-2">
            <div 
              class="h-full rounded-full" 
              :class="getProgressClass(cardContent.progress.variant)"
              :style="{ width: `${cardContent.progress.value}%`, backgroundColor: 'currentColor' }"
            ></div>
          </div>
          <span :class="getProgressClass(cardContent.progress.variant)">
            {{ cardContent.progress.label }}
          </span>
        </div>
      </div>
    </template>
    
    <!-- Pass through any slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </dxCard>
</template>

<style scoped>
.card-content {
  padding: 0.5rem;
}
</style>
