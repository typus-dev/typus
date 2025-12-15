/* @Tags: theme */
<template>
  <!-- file: core\components\ThemeSwitcher.vue -->
  <dxButton
    variant="ghost"
    size="sm"
    shape="circle"
    icon-only
    @click="toggleTheme"
  >
    <dxIcon :name="currentTheme === 'light' ? getThemeIcon('dark') : getThemeIcon('light')" />
  </dxButton>
</template>

<script setup lang="ts">
import { useTheme } from '@/core/theme/composables/useTheme'

const { currentTheme, setTheme, getThemeIcon } = useTheme()

const toggleTheme = () => {
  setTheme(currentTheme.value === 'light' ? 'dark' : 'light')
}
</script>
