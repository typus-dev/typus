<!-- dxKebabMenu.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MoreVertical } from 'lucide-vue-next'

interface MenuItem {
  label: string
  action: () => void
}

interface Props {
  items: MenuItem[]
}

const props = defineProps<Props>()
const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const closeMenu = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div ref="menuRef" class="relative">
    <button
      @click="isOpen = !isOpen"
      class="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
      type="button"
    >
      <MoreVertical class="w-5 h-5 text-gray-500" />
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10"
    >
    <button
  v-for="(item, index) in items"
  :key="index"
  @click.stop="() => {
    item.action();
    isOpen = false;  
  }"
  class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
  type="button"
>
  {{ item.label }}
</button>
    </div>
  </div>
</template>