/* @Tags: routing, theme */

<script setup lang="ts">
import '@styles/base.css'
import '@styles/tailwind.css'
import '@styles/main.css'
import TErrorModal from '@/components/base/ErrorModal.vue'
import { useErrorUIManager } from '@/core/errors/useErrorUIManager'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import { LayoutWrapper } from '@/core/layouts'
import { useTheme } from '@/core/theme/composables/useTheme'
import PluginGlobals from '@/core/plugins/PluginGlobals.vue'

const bp = useBreakpoint()
useErrorUIManager()
useTheme() // ensure theme watcher runs even without explicit switcher
</script>

<template>
  <div
    :class="[
      'app',
      'theme-typography-fontFamily-base',
      'theme-colors-background-primary',
      'theme-colors-text-primary',
      'theme-mixins-gridPattern'
    ]"
  >
    <ErrorBoundary>
      <Suspense>
        <ErrorBoundary>
          <LayoutWrapper>
            <router-view :key="$route.fullPath" v-slot="{ Component }">
              <Suspense>
                <ErrorBoundary>
                  <component :is="Component" />
                </ErrorBoundary>
              </Suspense>
            </router-view>
          </LayoutWrapper>
        </ErrorBoundary>
      </Suspense>
    </ErrorBoundary>
  </div>
  <dxModalsContainer />
  <dxToastsContainer />
  <TErrorModal />
  <PluginGlobals />
</template>

<style>
.app {
  min-height: 100vh;
}
</style>
