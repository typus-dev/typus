<!-- DefaultLayoutHeader.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppLogo from '@/components/base/AppLogo.vue'

const router = useRouter()

const handleSignUp = () => {
  router.push('/auth/login')
}

const openContactForm = () => {
  console.debug('Contact form disabled - CRM plugin removed')
}
</script>

<template>
  <header class="theme-layout-shell-header bg-opacity-80 sticky top-0 z-10 border-b theme-colors-border-primary theme-colors-background-primary">
    <div class="w-full max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <div class="flex items-center">
        <slot name="logo">
          <AppLogo />
        </slot>
      </div>

      <div class="hidden md:flex items-center gap-3">
        <slot name="navigation" />
      </div>

      <div class="flex items-center gap-3">
        <slot name="actions">
          <button
            @click="openContactForm"
            class="theme-colors-text-secondary hover:theme-colors-text-primary transition cursor-pointer"
            title="Contact Us"
          >
            <dxIcon name="ri:mail-line" size="md" />
          </button>

          <ThemeSwitcherDropdown />

          <dxButton
            variant="outline"
            size="md"
            class="theme-components-button-base theme-components-button-spacing-md"
            @click="handleSignUp"
          >
            Sign Up
          </dxButton>
        </slot>
        <div class="md:hidden">
          <slot name="mobileNavigationButton" />
        </div>
      </div>
    </div>
  </header>
</template>
