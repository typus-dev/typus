// @Tags: API, Classic, FileManager

export const FileManagerMethods = {
  /**
   * Get user files list
   */
  async getFiles() {
    logger.debug('[FileManagerMethods] Fetching files via API')
    const { data } = await useApi('/storage/storage').get()
        logger.debug('[FileManagerMethods] Fetched files via API',data)
    return data?.files || []
  },

  /**
   * Upload files to storage
   */
  async uploadFiles(files: File[]) {
    logger.debug('[FileManagerMethods] Uploading files', { count: files.length })

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await useApi('/storage/storage').post(formData)
      logger.debug('[FileManagerMethods] File uploaded successfully', {
        fileName: file.name,
        size: file.size
      })
    }
  },

  /**
   * View file in new tab
   */
  viewFile(fileId: string) {
    const url = `/storage/${fileId}`
    logger.debug('[FileManagerMethods] Opening file in new tab', { fileId, url })
    window.open(url, '_blank')
  },

  /**
   * Copy file URL to clipboard
   */
  async copyFileUrl(fileId: string) {
    const url = `${window.location.origin}/storage/${fileId}`
    logger.debug('[FileManagerMethods] Copying file URL', { fileId, url })

    await navigator.clipboard.writeText(url)
  },

  /**
   * Toggle file visibility (Private <-> Public)
   */
  async toggleFileVisibility(fileId: string) {
    logger.debug('[FileManagerMethods] Toggling file visibility', { fileId })

    const { data } = await useApi(`/storage/${fileId}/metadata`).put({})
    return data
  },

  /**
   * Delete file
   */
  async deleteFile(fileId: string) {
    logger.debug('[FileManagerMethods] Deleting file', { fileId })
    await useApi(`/storage/${fileId}`).del()
  },

  /**
   * Update file metadata
   */
  async updateFileMetadata(fileId: string, metadata: Record<string, any>) {
    logger.debug('[FileManagerMethods] Updating file metadata', { fileId, metadata })
    const { data } = await useApi(`/storage/${fileId}/metadata`).put(metadata)
    return data
  }
}
