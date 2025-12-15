import { logger } from '@/core/logging/logger'

interface UploadedImage {
  id: string
  url: string
  mimeType: string
  originalName?: string
}

interface UploadResult {
  images: UploadedImage[]
}

const STORAGE_ENDPOINT = '/storage/upload'
const MODULE_CONTEXT = 'cms-editor'

const normalizeUpload = (raw: any): UploadedImage | null => {
  if (!raw) return null
  const file = raw?.file ?? raw
  const id = file?.id ?? raw?.id
  if (!id) return null
  const url = file?.url || raw?.url || `/storage/${id}`
  return {
    id: String(id),
    url,
    mimeType: file?.mimeType ?? raw?.mimeType ?? 'image/png',
    originalName: file?.originalName ?? file?.fileName ?? raw?.originalName ?? raw?.fileName,
  }
}

export function useEditorImageUploads() {
  const uploadImages = async (files: File[]): Promise<UploadResult> => {
    if (!files.length) return { images: [] }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('moduleContext', MODULE_CONTEXT)
        formData.append('visibility', 'PUBLIC')
        formData.append('contextId', `cms-editor-${Date.now()}-${Math.random()}`)

        try {
          const { data, error } = await useApi(STORAGE_ENDPOINT).post(formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          if (error) {
            logger.error('[EditorUploads] upload error', error)
            throw error
          }
          if (Array.isArray(data?.files) && data.files.length) {
            return normalizeUpload(data.files[0])
          }
          return normalizeUpload(data)
        } catch (err) {
          logger.error('[EditorUploads] upload failed', err)
          throw err
        }
      })
    )

    const images = uploads.filter(Boolean) as UploadedImage[]
    return { images }
  }

  return {
    uploadImages,
  }
}
