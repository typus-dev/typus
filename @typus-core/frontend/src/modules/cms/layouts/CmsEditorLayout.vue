<!-- src/modules/cms/layouts/CmsEditorLayout.vue -->
<template>
  <div class="flex flex-col min-h-screen">
    <header class="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between h-16">
      <div class="flex items-center gap-4">
        <button 
          class="flex items-center gap-2 text-gray-600 hover:bg-gray-100 p-2 rounded transition-colors duration-200"
          @click="goBack"
        >
          <span class="text-xl">←</span>
          <span>Back</span>
        </button>
        <h1 class="text-xl font-semibold m-0">{{ title }}</h1>
      </div>
      <div>
        <slot name="actions"></slot>
      </div>
    </header>
    
    <div class="flex flex-1 md:flex-row flex-col">
      <main class="flex-1 p-8 max-w-full">
        <slot></slot>
      </main>
      
      <aside 
        v-if="showSidebar" 
        class="w-full  bg-white border-l border-gray-200 p-6 overflow-y-auto"
      >
        <div class="sticky top-6">
          <slot name="sidebar"></slot>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    default: 'Editor'
  },
  showSidebar: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()
const route = useRoute()
// Go back to previous page or to default location
const goBack = () => {
  if (window.history.length > 2) {
    router.back()
  } 
}
</script>
