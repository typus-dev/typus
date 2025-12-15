<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { fetchBlobWithAuth } from '@/shared/composables/useApi'

interface Props {
  fileId: string
  mode?: 'thumbnail' | 'preview' | 'download' | 'custom'
  fileName?: string
  mimeType?: string
  alt?: string
  width?: string
  height?: string
  rounded?: boolean | string
  containerClass?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
  showLabel?: boolean
  showDownload?: boolean
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'thumbnail',
  fileName: '',
  mimeType: '',
  alt: '',
  width: '',
  height: '',
  rounded: true,
  containerClass: '',
  objectFit: 'cover',
  showLabel: undefined,
  showDownload: undefined,
  iconSize: undefined,
})

const blobUrl = ref<string | null>(null)
const loading = ref(true)
const error = ref(false)

// ---------- helpers ----------
const isImage = computed(() =>
  (props.mimeType && props.mimeType.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(props.fileName)
)
const isPdf = computed(() => props.mimeType === 'application/pdf' || props.fileName.toLowerCase().endsWith('.pdf'))
const isDocument = computed(() =>
  props.mimeType.includes('document') || props.mimeType.includes('text') || /\.(doc|docx|txt|rtf)$/i.test(props.fileName)
)

const sizeByMode = computed(() => {
  switch (props.mode) {
    case 'preview':
      return { w: 'w-full', h: 'h-48' }
    case 'download':
      return { w: 'w-16', h: 'h-16' }
    default:
      return { w: 'w-12', h: 'h-12' }
  }
})

const iconSize = computed(() => props.iconSize ?? (props.mode === 'preview' ? 'lg' : props.mode === 'download' ? 'md' : 'sm'))

const rounding = computed(() => {
  if (props.rounded === false) return ''
  if (typeof props.rounded === 'string') return props.rounded
  return props.mode === 'preview' || props.mode === 'download' ? 'rounded-lg' : 'rounded'
})

const outer = computed(() => [
  // container is a fixed box; we center *all* children with CSS grid
  'relative grid place-items-center overflow-hidden',
  props.containerClass,
  props.width || sizeByMode.value.w,
  props.height || sizeByMode.value.h,
  rounding.value,
].filter(Boolean).join(' '))

const imgClass = computed(() => ['block w-full h-full', `object-${props.objectFit}`].join(' '))

async function load() {
  if (!props.fileId || props.fileId === 'undefined' || props.fileId === 'null') return
  loading.value = true
  error.value = false
  try {
    const blob = await fetchBlobWithAuth(`/api/storage/${props.fileId}`)
    if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.fileId, load, { immediate: true })

onUnmounted(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})

function downloadFile() {
  if (!blobUrl.value) return
  const a = document.createElement('a')
  a.href = blobUrl.value
  a.download = props.fileName || `file-${props.fileId}`
  document.body.appendChild(a)
  a.click()
  a.remove()
}
</script>

<template>
  <div :class="outer">
    <!-- Loading -->
    <div v-if="loading" class="grid place-items-center w-full h-full bg-gray-50">
      <div class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="grid place-items-center w-full h-full theme-colors-background-error theme-colors-text-error">
      <div class="flex flex-col items-center">
        <dxIcon name="ri:error-warning-line" :size="iconSize" />
        <span v-if="showLabel ?? props.mode !== 'thumbnail'" class="text-xs mt-1">Error</span>
      </div>
    </div>

    <!-- Image -->
    <img v-else-if="isImage && blobUrl" :src="blobUrl" :alt="alt || fileName || 'File'" :class="imgClass" @error="error = true" />

    <!-- PDF -->
    <div v-else-if="isPdf" class="grid place-items-center w-full h-full theme-colors-background-error">
      <div class="flex flex-col items-center">
        <dxIcon name="ri:file-pdf-line" :size="iconSize" class="theme-colors-text-error" />
        <span v-if="showLabel ?? props.mode !== 'thumbnail'" class="text-xs mt-1 truncate max-w-full">{{ fileName }}</span>
        <button v-if="(showDownload ?? props.mode === 'preview') && blobUrl" @click="downloadFile" class="mt-2 px-2 py-1 theme-colors-background-error text-white text-xs rounded hover:opacity-90">Download</button>
      </div>
    </div>

    <!-- Document -->
    <div v-else-if="isDocument" class="grid place-items-center w-full h-full theme-colors-background-info">
      <div class="flex flex-col items-center">
        <dxIcon name="ri:file-text-line" :size="iconSize" class="theme-colors-text-info" />
        <span v-if="showLabel ?? props.mode !== 'thumbnail'" class="text-xs mt-1 truncate max-w-full">{{ fileName }}</span>
        <button v-if="(showDownload ?? props.mode === 'preview') && blobUrl" @click="downloadFile" class="mt-2 px-2 py-1 theme-colors-background-info text-white text-xs rounded hover:opacity-80">Download</button>
      </div>
    </div>

    <!-- Generic -->
    <div v-else class="grid place-items-center w-full h-full bg-gray-50">
      <div class="flex flex-col items-center">
        <dxIcon name="ri:file-line" :size="iconSize" class="text-gray-600" />
        <span v-if="showLabel ?? props.mode !== 'thumbnail'" class="text-xs mt-1 truncate max-w-full">{{ fileName }}</span>
        <button v-if="(showDownload ?? props.mode === 'preview') && blobUrl" @click="downloadFile" class="mt-2 px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-800">Download</button>
      </div>
    </div>
  </div>
</template>
