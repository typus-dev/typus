<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  html: {
    type: String,
    default: ''
  },
  maxLength: {
    type: Number,
    default: 1000
  },
  className: {
    type: String,
    default: ''
  },
  autoScale: {
    type: Boolean,
    default: true
  }
})

const previewRef = ref<HTMLDivElement | null>(null)
const scaleFactor = ref(1)

// Apply theme classes to HTML content with scaling
const themedHtml = computed(() => {
  if (!props.html) return ''
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = props.html.slice(0, props.maxLength * 6)
  
  // Base font size adjustments for scaling
  const baseSizeClass = 'text-sm' 
  
  // Apply theme classes to elements with scaling adjustments
  const elements = {
    'h1': `${baseSizeClass} font-bold mb-2 leading-tight`,
    'h2': `${baseSizeClass} font-semibold mb-2 leading-tight`,
    'h3': `${baseSizeClass} font-medium mb-1 leading-tight`,
    'h4': `${baseSizeClass} font-medium mb-1 leading-tight`,
    'h5': `${baseSizeClass} font-normal mb-1 leading-tight`,
    'h6': `${baseSizeClass} font-normal mb-1 leading-tight`,
    'p': `${baseSizeClass} mb-2 leading-relaxed`,
    'ul': `${baseSizeClass} mb-2 pl-3`,
    'ol': `${baseSizeClass} mb-2 pl-3`,
    'li': `${baseSizeClass} mb-1`,
    'blockquote': `${baseSizeClass} border-l-2 border-current pl-2 mb-1 italic opacity-75`,
    'code': `${baseSizeClass} bg-current bg-opacity-20 px-1 rounded`,
    'pre': `${baseSizeClass} bg-current bg-opacity-20 p-2 rounded mb-1 overflow-hidden`,
    'a': `${baseSizeClass} underline opacity-80`
  }
  
  Object.entries(elements).forEach(([tag, classes]) => {
    tempDiv.querySelectorAll(tag).forEach(el => {
      el.setAttribute('class', classes)
    })
  })
  
  // Truncate if too long
  let html = tempDiv.innerHTML
  if (html.length > props.maxLength) {
    const truncated = html.slice(0, props.maxLength)
    const lastTag = truncated.lastIndexOf('>')

  }
  
  return html
})

// Auto-scale content to fit container
const calculateScale = async () => {
  if (!props.autoScale || !previewRef.value) return
  
  await nextTick()
  
  const container = previewRef.value
  const containerHeight = container?.clientHeight
  const containerWidth = container?.clientWidth
  
  // Create a temporary element to measure content
  const temp = document.createElement('div')
  temp.innerHTML = themedHtml.value
  temp.style.position = 'absolute'
  temp.style.visibility = 'hidden'
  temp.style.width = `${containerWidth}px`
  temp.style.fontSize = '12px' // Base font size
  document.body.appendChild(temp)
  
  const contentHeight = temp.scrollHeight
  document.body.removeChild(temp)
  
  // Calculate scale factor based on height with more generous limits
  if (contentHeight > containerHeight && containerHeight > 0) {
    const heightScale = containerHeight / contentHeight
    scaleFactor.value = Math.max(0.6, Math.min(1, heightScale * 0.95)) // Min 60%, max 100%, with 5% padding
  } else {
    scaleFactor.value = 1
  }
}

// Watch for changes and recalculate scale
watch([themedHtml, () => props.autoScale], calculateScale)

onMounted(() => {
  calculateScale()
  // Recalculate on resize
  window.addEventListener('resize', calculateScale)
})

// Computed style with scaling
const scaleStyle = computed(() => {
  if (!props.autoScale || scaleFactor.value === 1) return {}
  
  return {
    transform: `scale(${scaleFactor.value})`,
    transformOrigin: 'top left',
    width: `${100 / scaleFactor.value}%`,
    height: `${100 / scaleFactor.value}%`
  }
})
</script>

<template>
  <div 
    ref="previewRef"
    :class="[
      'html-preview overflow-hidden p-2',
      className,
      'theme-colors-text-primary',
      'theme-typography-fontFamily-base'
    ]"
  >
    <div 
      class="preview-content"
      :style="scaleStyle"
      v-html="themedHtml"
    />
  </div>
</template>

<style scoped>
.html-preview {
  /* Remove any unwanted margins/padding from rendered content */
}

.html-preview :deep(*:first-child) {
  margin-top: 0 !important;
}

.html-preview :deep(*:last-child) {
  margin-bottom: 0 !important;
}
</style>