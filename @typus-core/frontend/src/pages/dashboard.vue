<route lang="json">
{
  "name": "dashboard",
  "path": "/dashboard",
  "meta": {
    "layout": "private",
    "title": "Dashboard",
    "subject": "dashboard",
    "requiresAuth": true
  }
}
</route>

<script setup lang="ts">
import { useTheme } from '@/core/theme/composables/useTheme'
import dxCard from '@/components/ui/dxCard.vue'

const { availableThemes } = useTheme()
</script>

<template>
</template>

<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}
code {
  font-family: 'Courier New', monospace;
}
</style>
