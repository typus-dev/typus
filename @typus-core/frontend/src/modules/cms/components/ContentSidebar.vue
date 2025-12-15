<script setup lang="ts">
import { ref, defineProps, defineEmits, watch, onUnmounted } from 'vue'
import type { ICmsItem } from '../types'

// Components
import dxInput from '@/components/ui/dxInput.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'
import dxDateTime from '@/components/ui/dxDateTime.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxSpinner from '@/components/ui/dxSpinner.vue'

interface Props {
  modelValue: Partial<ICmsItem>
  cacheInfo: {exists: boolean, size?: number, lastModified?: Date, url?: string}
  cacheLoading: boolean
}

interface Emits {
  'update:modelValue': [value: Partial<ICmsItem>]
  'generateCache': []
  'clearCache': []
  'refreshCache': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Cache polling state
const isPolling = ref(false)
const pollAttempts = ref(0)
const cacheError = ref('')
let pollInterval: number | null = null

function updateField(field: keyof ICmsItem, value: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function startCachePolling(expectCacheExists = true) {
  isPolling.value = true
  pollAttempts.value = 0
  cacheError.value = ''
  
  // Start polling every 5 seconds
  pollInterval = setInterval(() => {
    pollAttempts.value++
    
    if (pollAttempts.value >= 10) {
      // Stop polling after 10 attempts (50 seconds)
      stopPolling()
      if (expectCacheExists) {
        cacheError.value = 'Cache generation timeout. Please try again.'
      } else {
        cacheError.value = 'Cache invalidation timeout. Please try again.'
      }
      return
    }
    
    // Check cache status
    emit('refreshCache')
  }, 5000)
}

function stopPolling() {
  isPolling.value = false
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function handleGenerateCache() {
  emit('generateCache')
  startCachePolling(true) // Expect cache to appear
}

function handleClearCache() {
  cacheError.value = ''
  emit('clearCache')
  startCachePolling(false) // Expect cache to disappear
}

// Watch for cache changes to stop polling when expected state is reached
watch(
  () => props.cacheInfo.exists,
  (exists, prevExists) => {
    if (isPolling.value) {
      // If we were waiting for cache to appear and it appeared
      if (exists && !prevExists) {
        stopPolling()
        cacheError.value = ''
      }
      // If we were waiting for cache to disappear and it disappeared
      else if (!exists && prevExists) {
        stopPolling()
        cacheError.value = ''
      }
    }
  }
)

// Cleanup on unmount
onUnmounted(() => {
  stopPolling()
})

// Watch sitePath changes and automatically update canonicalUrl
watch(
  () => props.modelValue.sitePath,
  (newSitePath) => {
    if (newSitePath) {
      // Use current origin instead of env variable (dynamic, works everywhere)
      const baseUrl = window.location.origin
      const newCanonicalUrl = newSitePath.startsWith('http')
        ? newSitePath
        : `${baseUrl}${newSitePath}`

      // Only update if canonicalUrl is different to avoid infinite loops
      if (props.modelValue.canonicalUrl !== newCanonicalUrl) {
        updateField('canonicalUrl', newCanonicalUrl)
      }
    }
  }
)

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A'
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <aside :class="['theme-border'.primary, 'theme-colors-background-secondary', 'border-r p-6']">
    <div class="space-y-6">
      <div>
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Title *
        </label>
        <dxInput 
          :model-value="modelValue.title" 
          @update:model-value="(val) => updateField('title', val)"
          placeholder="Content Title" 
        />
      </div>

      <div>
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Slug
        </label>
        <dxInput 
          :model-value="modelValue.slug" 
          @update:model-value="(val) => updateField('slug', val)"
          placeholder="content-slug" 
        />
      </div>

      <div>
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Site Path *
        </label>
        <dxInput 
          :model-value="modelValue.sitePath" 
          @update:model-value="(val) => updateField('sitePath', val)"
          placeholder="/page-url" 
        />
        <p :class="['text-xs mt-1', 'theme-colors-text-tertiary']">
          Full URL path for this content (automatically updates canonical URL)
        </p>
      </div>

      <div>
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Publication
        </label>
        <div class="space-y-3">
          <!-- Toggle Switch -->
          <div :class="['flex items-center justify-between p-3 rounded-lg', 'theme-colors-background-tertiary']">
            <div class="flex items-center space-x-2">
              <div :class="['w-2 h-2 rounded-full', 'theme-colors-text-disabled']"></div>
              <span :class="['text-sm', 'theme-colors-text-primary']">Draft</span>
            </div>
            <dxSwitch 
              :model-value="modelValue.isPublic" 
              @update:model-value="(val) => updateField('isPublic', val)"
              class="pt-4"
            />
            <div class="flex items-center space-x-2">
              <div :class="['w-2 h-2 rounded-full', 'theme-colors-text-success']"></div>
              <span :class="['text-sm', 'theme-colors-text-primary']">Published</span>
            </div>
          </div>
          
          <!-- Schedule Section -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span :class="['text-xs', 'theme-colors-text-tertiary']">Schedule:</span>
            </div>
            
            <div :class="['rounded-lg p-3', 'theme-colors-background-tertiary']">
              <dxDateTime 
                :model-value="modelValue.publishAt" 
                @update:model-value="(val) => updateField('publishAt', val)"
                :showCalendar="true" 
                :showTime="true" 
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="modelValue.isPublic">
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Cache
        </label>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center space-x-2">
              <div :class="[
                'w-2 h-2 rounded-full',
                cacheInfo.exists ? 'theme-colors-text-success' : 'theme-colors-text-disabled'
              ]"></div>
              <span :class="'theme-colors-text-primary'">
                {{ cacheInfo.exists ? 'Cached' : 'Not Cached' }}
              </span>
            </div>
            <span :class="['text-xs', 'theme-colors-text-tertiary']">
              {{ formatFileSize(cacheInfo.size) }}
            </span>
          </div>
          
          <div v-if="cacheInfo.exists && cacheInfo.lastModified" :class="['text-xs', 'theme-colors-text-tertiary']">
            Last cached: {{ formatDate(cacheInfo.lastModified) }}
          </div>
          
         
          <!-- Error message -->
          <div v-if="cacheError" :class="['p-2 border rounded text-sm', 'theme-colors-background-errorHover', 'theme-colors-border-error', 'theme-colors-text-error']">
            {{ cacheError }}
          </div>
          
          <div class="space-y-1">
            <dxButton 
              v-if="!cacheInfo.exists" 
              @click="handleGenerateCache" 
              variant="primary" 
              size="sm" 
              class="w-full"
              :disabled="cacheLoading || isPolling"
              :loading="cacheLoading || isPolling"
            >
              Generate Cache
            </dxButton>
            
            <dxButton 
              v-if="cacheInfo.exists"
              @click="handleClearCache" 
              variant="danger" 
              size="sm" 
              class="w-full"
              :disabled="cacheLoading || isPolling"
              :loading="cacheLoading || isPolling"
            >
              Invalidate Cache
            </dxButton>
            
            <dxButton 
              @click="emit('refreshCache')" 
              variant="secondary" 
              size="sm" 
              class="w-full"
              :disabled="cacheLoading || isPolling"
            >
              Refresh Status
            </dxButton>
          </div>
        </div>
      </div>

      <div>
        <label :class="['block text-sm font-medium mb-2', 'theme-colors-text-primary']">
          Last Updated
        </label>
        <p :class="['text-sm', 'theme-colors-text-secondary']">{{ formatDate(modelValue.updatedAt) }}</p>
      </div>
    </div>
  </aside>
</template>