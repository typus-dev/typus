<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppConfig } from '@/shared/composables/useAppConfig'
import { useDynamicConfig } from '@/shared/composables/useDynamicConfig'

const props = defineProps<{ size?: 'sm' | 'md' }>()
const appConfig = useAppConfig()
const { siteName, siteLogoUrl, fetchConfig } = useDynamicConfig()

onMounted(() => {
  fetchConfig()
})

const sizeMap = {
  sm: {
    icon: 'w-12 h-12 text-xs',  
    text: 'text-base',
    gap: 'mr-2',
  },
  md: {
    icon: 'w-12 h-12 text-sm', 
    text: 'text-lg',
    gap: 'mr-4',
  },
}

const currentSize = computed(() => sizeMap[props.size || 'md'])
</script>

<template>
  <div class="flex items-center" :class="currentSize.gap">
    <router-link to="/" class="flex items-center">
      <slot name="logo">
        <div
          :class="[
            'rounded-sm flex items-center justify-center',
          ]"
        >
          <img
            :src="siteLogoUrl || '/favicon/favicon.svg'"
            :class="currentSize.icon"
            :alt="siteName || appConfig.logo.shortName"
          />
        </div>

        <span
          class="ml-2 flex items-baseline space-x-1"
          :class="['theme-typography-size-2xl', 'theme-typography-weight-bold', 'theme-colors-text-primary']"
        >
          <span>{{ siteName || appConfig.logo.shortName }}</span>
          <sup class="text-xs text-gray-400 -ml-1">©</sup>
        </span>
      </slot>
    </router-link>
  </div>
</template>