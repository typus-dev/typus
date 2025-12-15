<template>
  <!-- src/core/components/ThemeSwitcherDropdown.vue -->
  <DropdownMenu position="bottom-right" width="w-48" menuClass="py-1" :isFixedPosition="true">
    <template #trigger>
      <dxButton
        variant="ghost"
        size="md"
        shape="circle"
        icon-only
      >
        <dxIcon :name="currentThemeIcon" />
      </dxButton>
    </template>
 
    <template #default>
      <div class="py-1">
        <button
          v-for="themeOption in availableThemes"
          :key="themeOption.name"
          :class="[
            'flex items-center w-full px-4 py-2 gap-2 text-sm',
            'theme-mixins-interactive',
            'theme-colors-text-primary',
            currentTheme === themeOption.name ? 'theme-colors-background-secondary' : ''
          ]"
          @click="selectTheme(themeOption.name)"
        >
          <dxIcon :name="themeOption.icon" :customClass="'theme-colors-text-secondary'" size="sm" class="mr-2" />
          {{ themeOption.title }}
        </button>
      </div>
    </template>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/core/theme/composables/useTheme'

const { currentTheme, setTheme, availableThemes, getThemeIcon } = useTheme()
const currentThemeIcon = computed(() => {
  return getThemeIcon(currentTheme.value)
})

const selectTheme = (themeName: string) => {
  setTheme(themeName as any)
  // Dropdown closes automatically via closeOnClickInside prop of DropdownMenu
}
</script>
