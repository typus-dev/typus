<!-- src/modules/cms/layouts/CmsLayout.vue -->
<template>
  <div class="flex flex-col min-h-screen">
    <header class="bg-primary-700 text-white p-4">
      <div class="flex items-center justify-between">
        <div class="flex-shrink-0">
          <h1 class="text-xl font-bold">CMS</h1>
        </div>
        <div class="flex-1 mx-4">
          <nav>
            <ul class="flex space-x-6">
              <li v-for="item in navigationItems" :key="item.path">
                <router-link 
                  :to="item.path" 
                  class="hover:text-primary-200 transition-colors duration-200"
                >
                  {{ item.title }}
                </router-link>
              </li>
            </ul>
          </nav>
        </div>
        <div class="flex-shrink-0">
          <slot name="actions"></slot>
        </div>
      </div>
    </header>
    
    <div class="flex flex-1">
      <aside class="w-64 bg-gray-100 p-4">
        <nav>
          <ul class="flex flex-col space-y-2">
            <li v-for="item in sidebarItems" :key="item.path">
              <router-link 
                :to="item.path" 
                class="block p-2 rounded hover:bg-gray-200 transition-colors duration-200"
                :class="{ 'bg-primary-100 text-primary-700 font-medium': $route.path.startsWith(item.path) }"
              >
                {{ item.title }}
              </router-link>
            </li>
          </ul>
        </nav>
      </aside>
      
      <main class="flex-1 p-8">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Sample navigation items
const navigationItems = ref([
  { title: 'Dashboard', path: '/cms' },
  { title: 'Content', path: '/cms/content' },
  { title: 'Media', path: '/cms/media' },
])

// Sample sidebar items
const sidebarItems = ref([
  { title: 'Pages', path: '/cms/content/pages' },
  { title: 'Posts', path: '/cms/content/posts' },
  { title: 'Categories', path: '/cms/content/categories' },
  { title: 'Tags', path: '/cms/content/tags' },
])
</script>
