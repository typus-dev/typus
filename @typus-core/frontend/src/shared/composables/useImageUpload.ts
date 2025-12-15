import { ref, reactive } from 'vue'
import { useApi } from './useApi'

export interface ImageUploadOptions {
  maxSizeKb?: number
  isFavicon?: boolean // Flag to trigger favicon variant generation
  onSuccess?: (url: string, variants?: { main: string; apple: string }) => void
  onError?: (error: string) => void
}

export interface ImageUploadState {
  imageUrl: string | null
  imagePreview: string | null
  selectedFile: File | null
  loading: boolean
}

export function useImageUpload(options: ImageUploadOptions = {}) {
  const {
    maxSizeKb = 2048, // 2MB default
    isFavicon = false,
    onSuccess,
    onError
  } = options

  const state = reactive<ImageUploadState>({
    imageUrl: null,
    imagePreview: null,
    selectedFile: null,
    loading: false
  })

  const fileInput = ref<HTMLInputElement | null>(null)

  const triggerFileUpload = () => {
    fileInput.value?.click()
  }

  const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    // Validate size
    if (file.size > maxSizeKb * 1024) {
      const error = `File is too large. Maximum size is ${maxSizeKb / 1024}MB.`
      onError?.(error)
      return
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      const error = 'Only image files are allowed.'
      onError?.(error)
      return
    }

    state.selectedFile = file
    state.imagePreview = URL.createObjectURL(file)

    await uploadImage()
  }

  const uploadImage = async () => {
    if (!state.selectedFile) return

    state.loading = true

    try {
      const formData = new FormData()
      formData.append('file', state.selectedFile)
      formData.append('visibility', 'PUBLIC')
      formData.append('moduleContext', 'system-config')
      formData.append('description', 'Site asset')

      // Add isFavicon flag if this is a favicon upload
      if (isFavicon) {
        formData.append('isFavicon', 'true')
        formData.append('contextId', 'favicon')
      }

      const { data, error } = await useApi('/storage/upload').post(formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (error) {
        throw new Error(error)
      }

      // Construct URL from file ID
      const imageUrl = `/storage/${data.file.id}`
      state.imageUrl = imageUrl

      // Pass variants if available (for favicon)
      const variants = data.variants ? data.variants : undefined
      onSuccess?.(imageUrl, variants)

      // Clear file input
      state.selectedFile = null
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed'
      onError?.(errorMsg)

      // Restore previous preview if upload failed
      state.imagePreview = state.imageUrl
    } finally {
      state.loading = false
    }
  }

  const setImageUrl = (url: string | null) => {
    state.imageUrl = url
    state.imagePreview = url
  }

  return {
    state,
    fileInput,
    triggerFileUpload,
    handleFileChange,
    uploadImage,
    setImageUrl
  }
}
