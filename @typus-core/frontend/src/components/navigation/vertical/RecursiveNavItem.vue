/* @Tags: routing, navigation */
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// Use async component to avoid circular reference error
const RecursiveNavItem = defineAsyncComponent(() => import('./RecursiveNavItem.vue'))

const props = defineProps({
  item: {
    type: Object,
    required: true,
    validator: (value: any) => {
      return value.title && (value.path || Array.isArray(value.items))
    }
  }
})

const isExternalLink = (url: string | undefined): boolean => {
  return url ? url.startsWith('http://') || url.startsWith('https://') : false
}

const handleExternalClick = (event: Event, url: string) => {
  event.preventDefault()
  window.open(url, '_blank', 'noopener,noreferrer')
}

const toggleSubSection = () => {
  if (props.item.items) {
    props.item.isOpen = !props.item.isOpen
  }
}
</script>

<template>
  <!-- Nav item -->
  <div>
    <!-- If item has no children, render a simple RouterLink or external link -->
    <template v-if="!item.items">
      <!-- External link -->
      <a
        v-if="isExternalLink(item.path)"
        :href="item.path"
        target="_blank"
        rel="noopener noreferrer"
        @click="handleExternalClick($event, item.path)"
        :class="[
          'theme-layout-flex-between',
          'theme-typography-size-sm',
          'theme-colors-text-primary',
          'theme-mixins-interactive',
          'theme-mixins-navigation-link',
          'rounded-md',
          'mt-1 mb-1',
          'gap-1'
        ]"
      >
        <div :class="['theme-layout-flex-center', 'gap-1']">
          <dxIcon v-if="item.icon" :name="item.icon" size="sm" />
          <span>{{ item.title }}</span>
          <dxIcon name="ri:external-link-line" size="xs" class="opacity-60" />
        </div>
      </a>
      
      <!-- Internal RouterLink -->
      <RouterLink
        v-else
        :to="item.path"
        :class="[
          'theme-layout-flex-between',
          'theme-typography-size-sm',
          'theme-colors-text-primary',
          'theme-mixins-interactive',
          'theme-mixins-navigation-link',
          'rounded-md',
          'mt-1 mb-1',
          'gap-1'
        ]"
      >
        <div :class="['theme-layout-flex-center', 'gap-1']">
          <dxIcon v-if="item.icon" :name="item.icon" size="sm" />
          <span>{{ item.title }}</span>
        </div>
      </RouterLink>
    </template>

    <!-- If item has children, render a toggle section -->
    <div
      v-else
      :class="[
        'theme-layout-flex-between',
        'theme-typography-size-sm',
        'theme-colors-text-primary',
        'theme-mixins-interactive',
        'theme-mixins-navigation-link',
        'cursor-pointer',
        'rounded-md'
      ]"
      @click="toggleSubSection"
    >
      <div :class="['theme-layout-flex-center', 'gap-1']">
        <dxIcon v-if="item.icon" :name="item.icon" size="sm" />
        <span>{{ item.title }}</span>
      </div>
      <dxIcon
        :name="item.isOpen ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'"
        size="sm"
      />
    </div>

    <!-- If item has children and is open, render children recursively -->
    <div
      v-if="item.items && item.isOpen"
      :class="['ml-4']"
    >
      <!-- This is the key recursive part -->
      <template v-for="child in item.items" :key="child.title">
        <!-- If child has its own children, use RecursiveNavItem component -->
        <RecursiveNavItem v-if="child.items" :item="child" />
        
        <!-- If child is a simple link, render appropriate link type -->
        <template v-else>
          <!-- External link -->
          <a
            v-if="isExternalLink(child.path)"
            :href="child.path"
            target="_blank"
            rel="noopener noreferrer"
            @click="handleExternalClick($event, child.path)"
            :class="[
              'theme-layout-flex-start',
              'theme-typography-size-sm',
              'theme-colors-text-primary',
              'theme-mixins-interactive',
              'theme-mixins-navigation-link',
              'mt-1',
              'mb-1',
              'rounded-md',
              'gap-1'
            ]"
          >
            <dxIcon v-if="child.icon" :name="child.icon" size="sm" />
            <span>{{ child.title }}</span>
            <dxIcon name="ri:external-link-line" size="xs" class="opacity-60" />
          </a>
          
          <!-- Internal RouterLink -->
          <RouterLink
            v-else
            :to="child.path"
            :class="[
              'theme-layout-flex-start',
              'theme-typography-size-sm',
              'theme-colors-text-primary',
              'theme-mixins-interactive',
              'theme-mixins-navigation-link',
              'mt-1',
              'mb-1',
              'rounded-md',
              'gap-1'
            ]"
          >
            <dxIcon v-if="child.icon" :name="child.icon" size="sm" />
            <span>{{ child.title }}</span>
          </RouterLink>
        </template>
      </template>
    </div>
  </div>
</template>