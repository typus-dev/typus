<script setup>
import { ref } from 'vue'

const isMenuOpen = ref(false)

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: items => items.every(item => 'title' in item && 'path' in item)
  }
})
</script>
<template>
  <!-- Desktop Navigation -->
  <nav class="hidden md:block w-full mx-auto">
    <ul :class="['theme-layout-flex-center', 'theme-layout-stack-horizontal']">
      <li v-for="item in items" :key="item.path">
        <router-link
          :to="item.path"
          :class="[
            'theme-typography-size-base',
            'theme-typography-weight-medium',
            'theme-colors-text-primary',
            'theme-mixins-interactive',
            'router-link-active:text-theme-colors-text-primary'
          ]"
        >
          {{ item.title }}
        </router-link>
      </li>
    </ul>
  </nav>

  <!-- Mobile Menu Button -->
  <div class="order-last md:hidden">
    <button
      :class="[
        'theme-components-button-base',
        'theme-components-button-size-sm',
        'theme-components-button-variants-ghost'
      ]"
      @click="isMenuOpen = !isMenuOpen"
    >
      <dxIcon
        :name="isMenuOpen ? 'ri:close-line' : 'ri:menu-line'"
        :size="'theme-icons-size-md'"
      />
    </button>
  </div>

  <!-- Mobile Navigation -->
  <div
    v-if="isMenuOpen"
    :class="[
      'fixed top-0 right-0 md:hidden transform w-56',
      isMenuOpen ? 'translate-x-0' : 'translate-x-full',
      'theme-mixins-surface',
      'theme-colors-background-primary',
      'theme-colors-border-primary'
    ]"
  >
    <div
      :class="[
        'theme-layout-flex-between',
        'theme-base-spacing-sm',
        'border-b theme-colors-border-primary'
      ]"
    >
      <button
        :class="[
          'theme-components-button-base',
          'theme-components-button-size-sm',
          'theme-components-button-variants-ghost'
        ]"
        aria-label="Close menu"
        @click="isMenuOpen = false"
      >
        <dxIcon name="ri:close-line" :size="'theme-icons-size-md'" />
      </button>
    </div>

    <ul :class="'theme-layout-flex-col'">
      <li v-for="(item, index) in items" :key="item.path">
        <router-link
          :to="item.path"
          :class="[
            'theme-base-spacing-sm',
            'block w-full',
            'theme-colors-text-primary',
            'theme-colors-background-primary',
            'theme-interactions-hover',
            'theme-typography-size-base'
          ]"
          @click="isMenuOpen = false"
        >
          {{ item.title }}
        </router-link>
        <div
          v-if="index !== items.length - 1"
          :class="['h-[1px] mx-4', 'theme-colors-border-primary']"
        />
      </li>
    </ul>
  </div>
</template>
