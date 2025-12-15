<script setup lang="ts">
import { computed, watch } from 'vue'
import { useImageUpload } from '@/shared/composables/useImageUpload'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  maxSizeKb: {
    type: Number,
    default: 2048
  },
  width: {
    type: String,
    default: '200px'
  },
  height: {
    type: String,
    default: '200px'
  },
  shape: {
    type: String as () => 'square' | 'circle',
    default: 'square',
    validator: (v: string) => ['square', 'circle'].includes(v)
  },
  isFavicon: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'uploaded': [url: string]
}>()

const { errorMessage, successMessage } = useMessages()

const imageUpload = useImageUpload({
  maxSizeKb: props.maxSizeKb,
  isFavicon: props.isFavicon,
  onSuccess: (url, variants) => {
    if (props.isFavicon && variants) {
      successMessage('Favicon uploaded successfully! Desktop + iOS versions generated.')
    } else {
      successMessage('Image uploaded successfully')
    }
    emit('update:modelValue', url)
    emit('uploaded', url)
  },
  onError: (error) => {
    errorMessage(error)
  }
})

// Set initial value when modelValue changes
watch(() => props.modelValue, (newValue) => {
  logger.debug('[ImageUploader] modelValue changed:', {
    label: props.label,
    oldValue: imageUpload.state.imageUrl,
    newValue: newValue,
    isFavicon: props.isFavicon
  })

  if (newValue && newValue !== imageUpload.state.imageUrl) {
    imageUpload.setImageUrl(newValue)
    logger.debug('[ImageUploader] Updated imageUrl and preview to:', newValue)
  }
}, { immediate: true })

const shapeClass = computed(() => {
  return props.shape === 'circle' ? 'rounded-full' : 'rounded-lg'
})
</script>

<template>
  <div class="image-uploader">
    <label v-if="label" class="block text-sm font-medium mb-2">{{ label }}</label>
    <p v-if="description" class="text-sm text-gray-600 mb-3">{{ description }}</p>

    <div class="flex items-start gap-4">
      <!-- Image Preview -->
      <div
        :class="['overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors', shapeClass]"
        :style="{ width: width, height: height, minWidth: width, minHeight: height }"
      >
        <img
          v-if="imageUpload.state.imagePreview"
          :src="imageUpload.state.imagePreview"
          alt="Preview"
          class="w-full h-full object-cover"
        >
        <div
          v-else
          class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400"
        >
          <dxIcon name="ri:image-line" size="lg" />
        </div>
      </div>

      <!-- Upload Button -->
      <div class="flex flex-col gap-2">
        <dxButton
          @click="imageUpload.triggerFileUpload"
          variant="secondary"
          size="sm"
          :loading="imageUpload.state.loading"
        >
          <dxIcon name="ri:upload-cloud-line" class="mr-2" />
          Choose Image
        </dxButton>

        <p class="text-xs text-gray-500">
          Max {{ maxSizeKb / 1024 }}MB
        </p>
      </div>

      <!-- Hidden File Input -->
      <input
        :ref="imageUpload.fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="imageUpload.handleFileChange"
      />
    </div>
  </div>
</template>

<style scoped>
.image-uploader {
  margin-bottom: 1rem;
}
</style>
