<script setup lang="ts">
import { inject, computed, useSlots } from 'vue'

interface Props {
  html?: string              // Raw HTML content (optional now)
  dataValue?: string         // Field name for data binding
  tag?: string              // Wrapper tag: div, section, article, etc.
  customClass?: string      // Additional CSS classes
  style?: Record<string, any>  // Inline styles
}

const props = withDefaults(defineProps<Props>(), {
  html: '',
  tag: 'div',
  customClass: ''
})

const slots = useSlots()

// Inject contexts
const blockContext = inject('blockContext', null)
const pageContext = inject('pageContext', null)

// Computed HTML content with data binding and context support
const computedHtml = computed(() => {
  // 1. Priority: dataValue from context (data binding)
  if (props.dataValue && blockContext?.state?.data?.block?.[props.dataValue]) {
    return blockContext.state.data.block[props.dataValue]
  }
  
  // 2. Fallback: html prop
  if (props.html) return props.html
  
  // 3. Last resort: slot with context
  if (slots.default) {
    const ctx = { 
      blockContext, 
      pageContext,
      data: blockContext?.state?.data?.block || pageContext?.state?.pageData || {}
    }
    
    try {
      const slotResult = slots.default(ctx)
      // Handle different slot return types
      if (typeof slotResult === 'string') return slotResult
      if (Array.isArray(slotResult) && slotResult[0]?.children) {
        return slotResult[0].children
      }
      return String(slotResult)
    } catch (error) {
      console.error('Error executing slot with context:', error)
      return ''
    }
  }
  
  return ''
})
</script>

<template>
  <component
    :is="tag"
    :class="[
      'dsx-raw-html-wrapper',
      customClass
    ]"
    :style="style"
    v-html="computedHtml"
  />
</template>

<style scoped>
.dsx-raw-html-wrapper {
  /* Add any default styles here */
}
</style>