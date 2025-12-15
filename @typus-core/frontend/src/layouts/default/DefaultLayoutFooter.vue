<!-- DefaultLayoutFooter.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AppLogo from '@/components/base/AppLogo.vue'
import manifestData from '../../../../../typus-manifest.json'

const typusVersion = ref(manifestData.app_version)
const linkHoverClass = 'hover:theme-colors-text-primary'

const openContactForm = () => {
  console.debug('Contact form disabled - CRM plugin removed')
  // TODO: Implement core contact functionality or remove button
}
</script>

<template>
  <footer class="py-4 mt-6 border-t theme-colors-background-primary theme-colors-border-primary bg-opacity-80">
    <div class="w-full max-w-7xl mx-auto px-6">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <!-- Logo Section -->
        <div class="flex items-center mb-4 md:mb-0">
          <AppLogo size="sm" />
        </div>

        <!-- Links Section -->
        <div class="flex flex-wrap justify-center space-x-6 mb-4 md:mb-0 theme-colors-text-secondary">
<slot name="links">
  <div class="w-full flex flex-col md:flex-row md:items-center md:justify-center md:space-x-6 text-center space-y-2 md:space-y-0">
    
    <div class="flex flex-wrap justify-center space-x-6">
      <a href="/about" :class="[linkHoverClass, 'transition']">About</a>
      <a href="/contact" :class="[linkHoverClass, 'transition']">Contact</a>
      <a href="/terms-of-service" :class="[linkHoverClass, 'transition']">Terms</a>
      <a href="/privacy-policy" :class="[linkHoverClass, 'transition']">Privacy</a>
    </div>

    <!-- Crafted at night -->
    <div class="text-sm text-gray-400">Crafted at night in Chicago</div>

    <!-- Sitemap link -->
    <a
      href="/sitemap.xml"
      class="text-sm text-gray-400 whitespace-nowrap hover:text-gray-300 transition"
      target="_blank"
      rel="noopener"
    >
      Typus © 2025  {{ typusVersion }}
    </a>
    
  </div>
</slot>


        </div>

        <!-- Social Section -->
        <div class="flex space-x-4">
          <slot name="social">
            <button 
              @click="openContactForm"
              :class="['theme-colors-text-secondary', linkHoverClass, 'transition', 'cursor-pointer']"
              title="Contact Us"
            >
              <dxIcon name="ri:mail-line" size="md" />
            </button>
          </slot>
        </div>
      </div>

      <!-- Copyright -->
      <div class="text-center mt-4 theme-colors-text-secondary theme-typography-size-sm">
        <slot name="copyright" />
      </div>
    </div>
  </footer>
</template>
