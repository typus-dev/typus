<script setup lang="ts">
import dxIcon from '@/components/ui/dxIcon.vue'

defineProps<{
  title?: string
  items: string[]
}>()

</script>

<template>
  <div>
    <div class="font-semibold  mb-2">{{ title }}</div>
    <ul class="list-none space-y-2">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="flex items-start gap-2"
      >
        <dxIcon
          name="ri:information-line"
          class="mt-0.5"
          :size="'theme-icons-size-sm' || '1em'"
          :class="'theme-icons-color-info'"
        />
        <span :class="'theme-components-list-item'">
          {{ item }}
        </span>
      </li>
    </ul>
  </div>
</template>
