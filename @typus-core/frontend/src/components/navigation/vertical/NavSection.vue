<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePersistStore } from '@/core/store/persistStore'
import RecursiveNavItem from './RecursiveNavItem.vue'

const store = usePersistStore()
const router = useRouter()

const NAV_STATE_KEY = 'nav_open_sections'

const props = defineProps({
  section: {
    type: Object,
    required: true,
    validator: (value: any) => {
      return value.title && Array.isArray(value.items);
    }
  }
})

const toggleSection = () => {
  const state = store.get(NAV_STATE_KEY) || {}
  state[props.section.title] = !props.section.isOpen
  store.set(NAV_STATE_KEY, state)
  if (props.section) {
    (props.section as any).isOpen = !props.section.isOpen;
  }
}
</script>

<template>
  <div :class="['theme-mixins-navigation-spacing']">
    <!-- Section Header -->
    <div
      :class="[
        'theme-mixins-interactive',
        'theme-mixins-navigation-link',
        'flex items-center justify-between',
        'mt-1 mb-1',
        'theme-colors-text-primary',
        'cursor-pointer'
      ]"
      @click="toggleSection"
    >
      <div class="flex items-center justify-start gap-2">
        <dxIcon
          v-if="section.icon"
          :name="section.icon"
          size="sm"
          :customClass="'theme-colors-text-secondary'"
        />
        <span :class="['theme-typography-weight-medium', 'theme-typography-size-sm']">
          {{ section.title }}
        </span>
      </div>
      <dxIcon
        :name="section.isOpen ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'"
        size="sm"
      />
    </div>

    <!-- Section Content -->
    <div v-if="section.isOpen" class="ml-4">
      <!-- Use recursive component for all items -->
      <RecursiveNavItem
        v-for="item in section.items"
        :key="item.title"
        :item="item"
      />
    </div>
  </div>
</template>