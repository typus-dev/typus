<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  code?: string | number
  title: string
  message: string
  showBackButton?: boolean
  variant?: 'error' | 'warning' | 'primary'
  fluid?: boolean
}>()

const router = useRouter()
const codeColorClass = computed(() => {
  switch (props.variant) {
    case 'error':
      return 'theme-colors-text-error' || 'theme-colors-text-error'
    case 'warning':
      return 'theme-colors-text-warning' || 'theme-colors-text-warning'
    case 'primary':
    default:
      return 'theme-colors-text-accent'
  }
})

const handleBack = () => {
  if (window.history.length > 2) {
    router.back()
  } else {
    router.push('/')
  }
}

const handleHome = () => {
  router.push('/')
}
</script>
<template>
  <!--SystemPage.vue-->
  <div class="py-20">
    <div class="w-full max-w-xl mx-auto text-center space-y-6">


      <h1 :class="[
        'theme-typography-size-3xl' || 'text-6xl',
        'theme-typography-weight-bold',
       
      ]">
        {{ code }}
      </h1>

      <div class="space-y-2">
        <h4 class="text-2xl font-semibold" :class="'theme-colors-text-primary'">
          {{ title }}
        </h4>
        <p :class="[
          'theme-colors-text-secondary',
          'theme-typography-size-base',
          'max-w-md mx-auto'
        ]">
          {{ message }}
        </p>
      </div>

      <div class="flex justify-center flex-wrap gap-4">
        <dxButton
          v-if="showBackButton"
          @click="handleBack"
          variant="outline"
        >
          <dxIcon name="ri:arrow-left-line" :class="['theme-components-button-icon-primary']" />&nbsp;
          Back
        </dxButton>
        <dxButton
          @click="handleHome"
          variant="primary"
        >
          <dxIcon name="ri:home-line" :class="['theme-components-button-icon-primary']" />&nbsp;
          Home
        </dxButton>
        <slot name="actions"></slot>
      </div>

    </div>
  </div>
</template>

