
  
  <script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useBreakpoint } from '@/shared/composables/useBreakpoint'
  
  const props = defineProps<{
    items: any[]
  }>()
  
  const isVisible = ref(false)
  const isExpanded = ref(false)
  const bp = useBreakpoint()
  
  const position = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })
  
  // Unified dragging function for both mouse and touch events
  const startDragging = (event: MouseEvent | TouchEvent) => {
    isDragging.value = true
    
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY
    
    dragOffset.value = {
      x: clientX - position.value.x,
      y: clientY - position.value.y
    }
    
    if (event instanceof MouseEvent) {
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', stopDragging)
    } else {
      document.addEventListener('touchmove', onDrag, { passive: false })
      document.addEventListener('touchend', stopDragging)
    }
  }
  
  const onDrag = (event: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return
    
    // Prevent default touch behavior (scrolling, zooming)
    if (event instanceof TouchEvent) {
      event.preventDefault()
    }
    
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY
    
    position.value = {
      x: clientX - dragOffset.value.x,
      y: clientY - dragOffset.value.y
    }
  }
  
  const stopDragging = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDragging)
    document.removeEventListener('touchmove', onDrag)
    document.removeEventListener('touchend', stopDragging)
  }
  
  const filtered = computed(() =>
    props.items.filter(item => item != null && item !== '')
  )
  
  const filterObject = (obj: any): any => {
    if (obj === null || obj === undefined) return null
    if (typeof obj !== 'object') return obj
    
    const filtered: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || value === '') continue
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        const filteredValue = filterObject(value)
        if (filteredValue !== null) {
          filtered[key] = filteredValue
        }
      } else {
        filtered[key] = value
      }
    }
    
    return Object.keys(filtered).length ? filtered : null
  }
  
  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      try {
        const filteredValue = filterObject(value)
        if (filteredValue === null) return '[Empty Object]'
        
        return JSON.stringify(filteredValue, null, 2)
          .replace(/,"/g, ',\n"')
          .replace(/{"/g, '{\n"')
          .replace(/}/g, '\n}')
      } catch {
        return '[Complex Object]'
      }
    }
    return String(value)
  }
  </script>

<template>
  <!-- Debug Overlay Component -->
  <div 
    v-if="isVisible" 
    class="absolute z-50 m-1 rounded shadow-lg font-mono text-[10px]"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    @mousedown="startDragging"
    @touchstart="startDragging"
  >
    <div
      v-if="!isExpanded"
      class="bg-gray-900/90 text-gray-300 w-4 h-4 flex items-center justify-center cursor-move rounded touch-none"
      @click="isExpanded = true"
    >
      ⋯
    </div>
    
    <div v-else class="bg-gray-900/90 text-gray-100 p-1.5 rounded cursor-move touch-none">
      <button
        class="absolute top-0 right-0 px-1 text-gray-400 hover:text-gray-200"
        @click.stop="isVisible = false"
      >
        ×
      </button>
      <div
        @click.stop="isExpanded = false"
      >
        <div v-for="(item, index) in filtered" :key="index" class="text-gray-300 select-none">
          {{ formatValue(item) }}
        </div>
        <div class="theme-colors-text-success mt-0.5 select-none">{{ bp.current }}</div>
        <div class="theme-colors-text-warning mt-0.5 select-none">{{ new Date().toLocaleTimeString() }}</div>
      </div>
    </div>
  </div>
</template>