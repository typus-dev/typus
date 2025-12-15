<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

import DefaultLayoutHeader from '@/layouts/default/DefaultLayoutHeader.vue';
import DefaultLayoutFooter from '@/layouts/default/DefaultLayoutFooter.vue';
import { logger } from '@/core/logging/logger';

const route = useRoute();

const isCached = computed(() => {
  return window.__IS_CACHED_PAGE__ && route.path === window.__CACHED_ROUTE__?.path
})

const cachedContent = ref('')

onMounted(async () => {
  logger.debug('DefaultLayout mounted', {
    isCached: isCached.value,
    routePath: route.path,
    cachedRoutePath: window.__CACHED_ROUTE__?.path,
    isCachedPage: window.__IS_CACHED_PAGE__
  }, 'DefaultLayout')

  if (isCached.value && window.__ORIGINAL_MAIN_CONTENT__) {
    cachedContent.value = window.__ORIGINAL_MAIN_CONTENT__
  }
});
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <DefaultLayoutHeader>
      <template #navigation>
        <nav class="flex items-center gap-3">
          <a
            href="/#features"
            class="theme-colors-text-secondary theme-interactions-states-hover theme-typography-size-lg theme-typography-weight-medium theme-interactions-transition-property theme-interactions-transition-duration theme-components-button-base theme-components-button-spacing-lg theme-base-radius hover:theme-colors-background-hover focus:theme-colors-ring-focus focus:ring-2 focus:outline-none"
          >Features</a>
          <a
            href="/#stack"
            class="theme-colors-text-secondary theme-interactions-states-hover theme-typography-size-lg theme-typography-weight-medium theme-interactions-transition-property theme-interactions-transition-duration theme-components-button-base theme-components-button-spacing-lg theme-base-radius hover:theme-colors-background-hover focus:theme-colors-ring-focus focus:ring-2 focus:outline-none"
          >Stack</a>
          <a
            href="/#faq"
            class="theme-colors-text-secondary theme-interactions-states-hover theme-typography-size-lg theme-typography-weight-medium theme-interactions-transition-property theme-interactions-transition-duration theme-components-button-base theme-components-button-spacing-lg theme-base-radius hover:theme-colors-background-hover focus:theme-colors-ring-focus focus:ring-2 focus:outline-none"
          >FAQ</a>
          <a
            href="/about"
            class="theme-colors-text-secondary theme-interactions-states-hover theme-typography-size-lg theme-typography-weight-medium theme-interactions-transition-property theme-interactions-transition-duration theme-components-button-base theme-components-button-spacing-lg theme-base-radius hover:theme-colors-background-hover focus:theme-colors-ring-focus focus:ring-2 focus:outline-none"
          >About</a>
        </nav>
      </template>
    </DefaultLayoutHeader>

    <template v-if="!isCached">
      <div class="flex flex-1 justify-center">
        <main class="w-full max-w-7xl mx-auto px-6 py-6 overflow-y-auto">
          <slot></slot>
        </main>
      </div>
    </template>
    <template  v-else>
      <div class="flex flex-1 justify-center">
        <main class="w-full max-w-7xl mx-auto px-6 py-6 overflow-y-auto">
              <div v-html="cachedContent"></div>
        </main>
      </div>
    </template>    

    <DefaultLayoutFooter>
      <template #logo><slot name="footerLogo" /></template>
      <template #description><slot name="footerDescription" /></template>
      <template #links><slot name="footerLinks" /></template>
      <template #newsletter><slot name="footerNewsletter" /></template>
      <template #contact><slot name="footerContact" /></template>
      <template #social><slot name="footerSocial" /></template>
      <template #copyright><slot name="footerCopyright" /></template>
    </DefaultLayoutFooter>
  </div>
</template>
