<route lang="json">
{
  "name": "file-manager",
  "path": "/file-manager",
  "meta": {
    "layout": "private",
    "subject": "storage"
  }
}
</route>

<script setup lang="ts">
import { DSL } from '@/dsl/client'
import dxLoader from '@/components/ui/dxLoader.vue'

const { errorMessage, confirmMessage } = useMessages()

interface FileRecord {
  id: string
  originalName: string
  mimeType: string
  size: number
  moduleContext?: string
  contextId?: string
  visibility: 'PRIVATE' | 'PUBLIC' | 'RESTRICTED'
  tags?: string[]
  description?: string
  createdAt: string
  storagePath: string
  fileName: string
  userId: number
  storageProvider?: string
  publicUrl?: string
  status?: string
  expiresAt?: string
  deletedAt?: string
  updatedAt?: string
  createdBy?: number
  updatedBy?: number
}

const pageData = reactive({
  files: [] as FileRecord[],
  loading: false,
  error: null as string | null,
  searchQuery: '',
  filterVisibility: 'any',
  filterModuleContext: 'any',
  filterMimeType: 'any',
  currentPage: 1,
  pageSize: 20,
  totalFiles: 0
})

const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showFileDetails = ref(false)
const selectedFile = ref<FileRecord | null>(null)

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  const files = event.dataTransfer?.files
  if (files) handleFileUpload(Array.from(files))
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) handleFileUpload(Array.from(target.files))
}
const handleFileUpload = async (files: File[]) => {
  pageData.loading = true
  pageData.error = null
  
  try {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('visibility', 'PRIVATE')
      
      const result = await useApi('/storage/upload').post(formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (result.error) {
        throw new Error(result.error.message || `Failed to upload ${file.name}`)
      }
    }
    await loadFiles()
  } catch (error) {
    pageData.error = error instanceof Error ? error.message : 'Upload failed'
    logger.error('[FileManager] Upload error:', error)
  } finally {
    pageData.loading = false
  }
}

const loadFiles = async () => {
  pageData.loading = true

  try {
    logger.debug('[FileManager] Loading files with DSL:', {
      page: pageData.currentPage,
      limit: pageData.pageSize
    })

    // Build filter from UI controls
    const filter: any = {
      // IMPORTANT: DSL doesn't auto-filter by userId like API endpoint did
      // We rely on DSL's built-in access control and CASL policies
      // which automatically filter based on user permissions
    }

    if (pageData.filterVisibility && pageData.filterVisibility !== 'any') {
      filter.visibility = pageData.filterVisibility
    }

    if (pageData.filterModuleContext && pageData.filterModuleContext !== 'any') {
      filter.moduleContext = pageData.filterModuleContext
    }

    if (pageData.filterMimeType && pageData.filterMimeType !== 'any') {
      filter.mimeType = { contains: pageData.filterMimeType }
    }

    const queryOptions = {
      orderBy: { createdAt: 'desc' },
      page: pageData.currentPage,
      limit: pageData.pageSize
    }

    // Get both data and total count in parallel (like in dispatcher)
    const [filesResponse, total] = await Promise.all([
      DSL.StorageFile.findMany(filter, ['user'], queryOptions),
      DSL.StorageFile.count(filter)
    ])

    // Extract data from DSL response (DSL returns { data: [...], paginationMeta: {...} })
    const files = filesResponse?.data || filesResponse || []

    pageData.files = files
    pageData.totalFiles = total || 0

    logger.info('[FileManager] Loaded files via DSL:', {
      count: files?.length,
      total,
      currentPage: pageData.currentPage,
      totalPages: Math.ceil(total / pageData.pageSize)
    })
  } catch (error: any) {
    logger.error('[FileManager] Load error:', error)
    errorMessage(error.message || 'Failed to load files')
    pageData.files = []
  }

  pageData.loading = false
}

const goToPage = (page: number) => {
  logger.debug('[FileManager] Going to page:', { from: pageData.currentPage, to: page })
  pageData.currentPage = page
  loadFiles()
}

const handlePageSizeChange = (newSize: number) => {
  logger.debug('[FileManager] Page size changed:', { from: pageData.pageSize, to: newSize })
  pageData.pageSize = newSize
  pageData.currentPage = 1 // Reset to first page when changing page size
  loadFiles()
}

const totalPages = computed(() => Math.ceil(pageData.totalFiles / pageData.pageSize))

const handleViewFile = async (file: FileRecord) => {
  try {
    const blob = await fetchBlobWithAuth(`/storage/${file.id}`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (err) {
    logger.error('[FileManager] View error:', err)
  }
}

const handleDownloadFile = async (file: FileRecord) => {
  try {
    const blob = await fetchBlobWithAuth(`/storage/${file.id}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || `file-${file.id}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (err) {
    logger.error('[FileManager] Download error:', err)
  }
}



const handleCopyUrl = async (file: FileRecord) => {
  const url = `${window.location.origin}/storage/${file.id}`
  await navigator.clipboard.writeText(url)
}

const handleToggleVisibility = async (file: FileRecord) => {
  const newVisibility = file.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'
  await useApi(`/storage/${file.id}/metadata`).put({ visibility: newVisibility })
  await loadFiles()
}


const handleDeleteFile = async (file: FileRecord) => {

     if (!await confirmMessage('Are you sure you want to delete this file?')) return;
  
  await useApi(`/storage/${file.id}`).del()
  await loadFiles()
}

const showFileDetailsModal = (file: FileRecord) => {
  selectedFile.value = file
  showFileDetails.value = true
}

const closeFileDetailsModal = () => {
  showFileDetails.value = false
  selectedFile.value = null
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getOwnerName = (userId: number): string => {
  return `UserId: ${userId}`
}

const filteredFiles = computed(() => {
  if (!Array.isArray(pageData.files)) {
    logger.error('[FileManager] pageData.files is not an array:', pageData.files)
    return []
  }

  return pageData.files.filter(file => {
    const matchesSearch = pageData.searchQuery === '' ||
      file.originalName.toLowerCase().includes(pageData.searchQuery.toLowerCase()) ||
      (file.tags && file.tags.some(tag =>
        tag.toLowerCase().includes(pageData.searchQuery.toLowerCase())
      ))

    const matchesVisibility = pageData.filterVisibility === 'any' ||
      file.visibility === pageData.filterVisibility

    const matchesModuleContext = pageData.filterModuleContext === 'any' ||
      file.moduleContext === pageData.filterModuleContext

    const matchesMimeType = pageData.filterMimeType === 'any' ||
      file.mimeType === pageData.filterMimeType

    return matchesSearch && matchesVisibility && matchesModuleContext && matchesMimeType
  })
})

onMounted(() => {
  loadFiles()
})
</script>

<template>
  
    <div class="p-6">
      <h1 class="text-2xl font-semibold mb-6"
          :class="'theme-colors-text-primary'">Files</h1>

      <!-- Upload Zone -->
      <div
        class="border-2 border-dashed p-10 text-center rounded-lg mb-6 cursor-pointer transition-all duration-300"
        :class="[
          isDragOver
            ? 'theme-colors-border-focus theme-colors-background-accent'
            : 'theme-colors-border-primary theme-colors-background-tertiary',
          'theme-mixins-interactive'
        ]"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="fileInputRef?.click()"
      >
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*"
          @change="handleFileSelect"
          class="hidden"
        />
        <div class="flex flex-col items-center">
          <dxIcon name="ri-upload-2-line" size="md" class="mb-4"
                  :class="'theme-colors-text-tertiary'" />
          <p class="text-lg mb-0 font-medium"
             :class="'theme-colors-text-secondary'">
            Drag & drop files here or click to select
          </p>
          <p class="text-sm mb-0"
             :class="'theme-colors-text-tertiary'">
            Supports images: JPEG, PNG, WebP (max 5MB)
          </p>
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-4 flex gap-3 items-center flex-wrap">
        <dxInput
          v-model="pageData.searchQuery"
          type="text"
          placeholder="Search by name or tags..."
          class="flex-shrink-0"
          width="w-[200px]"
          noGutters
        />

        <dxSelect
          v-model="pageData.filterVisibility"
          :options="[
            { label: 'Any Visibility', value: 'any' },
            { label: 'Private', value: 'PRIVATE' },
            { label: 'Public', value: 'PUBLIC' },
            { label: 'Restricted', value: 'RESTRICTED' }
          ]"
          width="w-[200px]"
          noGutters
        />

        <dxSelect
          v-model="pageData.filterModuleContext"
          :options="[
            { label: 'Any Context', value: 'any' },
            { label: 'Avatar', value: 'avatar' },
            { label: 'Blog', value: 'blog' },
            { label: 'CMS', value: 'cms' },
            { label: 'Context', value: 'context' }
          ]"
          width="w-[200px]"
          noGutters
        />

        <dxSelect
          v-model="pageData.filterMimeType"
          :options="[
            { label: 'Any MIME Type', value: 'any' },
            { label: 'JPEG', value: 'image/jpeg' },
            { label: 'PNG', value: 'image/png' },
            { label: 'WebP', value: 'image/webp' }
          ]"
          width="w-[200px]"
          noGutters
        />
      </div>

      <!-- Pagination Header -->
      <div class="flex items-center justify-end gap-1 mb-4 p-2 min-h-[48px]">
        <template v-if="!pageData.loading && totalPages > 0">
          <dxButton
            variant="outline"
            size="sm"
            :disabled="pageData.currentPage === 1"
            @click="goToPage(pageData.currentPage - 1)"
            iconOnly
          >
            <dxIcon name="ri:arrow-left-s-line" size="md" />
          </dxButton>
          <span
            :class="[
              'theme-components-table-pagination-text',
              'theme-colors-text-secondary',
              'px-2'
            ]"
          >
            Page {{ pageData.currentPage }} of {{ totalPages }}
          </span>
          <dxButton
            variant="outline"
            size="sm"
            :disabled="pageData.currentPage === totalPages"
            @click="goToPage(pageData.currentPage + 1)"
            iconOnly
          >
            <dxIcon name="ri:arrow-right-s-line" size="md" />
          </dxButton>
          <dxSelect
            v-model="pageData.pageSize"
            :options="[10, 20, 50, 100].map(num => ({ label: String(num), value: num }))"
            size="sm"
            width="w-24"
            noGutters
            class="ml-2"
            labelPosition="left"
            @update:modelValue="handlePageSizeChange"
          />
        </template>
        <template v-else-if="pageData.loading">
          <!-- Pagination skeleton -->
          <div class="flex items-center gap-1">
            <div class="w-8 h-8 rounded animate-pulse" :class="'theme-colors-background-tertiary'"></div>
            <div class="w-24 h-4 rounded animate-pulse" :class="'theme-colors-background-tertiary'"></div>
            <div class="w-8 h-8 rounded animate-pulse" :class="'theme-colors-background-tertiary'"></div>
            <div class="w-24 h-8 rounded ml-2 animate-pulse" :class="'theme-colors-background-tertiary'"></div>
          </div>
        </template>
      </div>

      <!-- Files Table with horizontal scroll -->
      <div class="border rounded-lg overflow-hidden relative"
           :class="[
             'theme-colors-background-secondary',
             'theme-colors-border-primary'
           ]">
        <div class="overflow-x-auto">
          <div class="min-w-[1200px]">
            <!-- Header -->
            <div class="grid grid-cols-[80px_2fr_120px_120px_120px_140px_100px_200px] items-center px-4 py-3 font-semibold uppercase text-xs tracking-wider gap-3"
                 :class="[
                   'theme-colors-background-tertiary',
                   'theme-colors-text-secondary'
                 ]">
              <div></div>
              <div>File</div>
              <div>Visibility</div>
              <div>Status</div>
              <div>Owner</div>
              <div>Updated</div>
              <div>Size</div>
              <div>Actions</div>
            </div>

            <!-- Data Rows -->
           <div
  v-for="file in filteredFiles"
  :key="file.id"
  class="grid grid-cols-[80px_2fr_120px_120px_120px_140px_100px_200px] items-start px-4 border-b last:border-b-0 gap-3"
  :class="'theme-colors-border-secondary'"
>
              <!-- Image/Icon Column -->
              <dxSecureAsset
                :fileId="file.id"
                mode="custom"
                :fileName="file.originalName"
                :mimeType="file.mimeType"
                width="w-20"
                height="h-20"
                rounded="rounded"
                :containerClass="'border theme-colors-border-primary'"
                :showLabel="false"
              />

              <!-- File Info Column (3 rows) -->
              <div class="min-w-0">
                <!-- Row 1: File name + info icon -->
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold truncate"
                      :class="'theme-colors-text-primary'">{{ file.originalName }}</span>
                  <dxButton
                    @click="showFileDetailsModal(file)"
                    variant="ghost"
                    size="xs"
                    shape="circle"
                    iconOnly
                    title="Show file details"
                  >
                    <dxIcon name="ri-information-line" size="xs" />
                  </dxButton>
                </div>
                
                <!-- Row 2: Storage path -->
                <div class="text-xs font-mono truncate"
                     :class="'theme-colors-text-tertiary'">
                  {{ file.storagePath }}
                </div>
                
                <!-- Row 3: MIME type + tags -->
                <div class="flex items-center gap-2 text-xs">
                  <span class="font-mono"
                        :class="'theme-colors-text-secondary'">{{ file.mimeType }}</span>
                  <span v-if="file.tags && file.tags.length > 0"
                        :class="'theme-colors-text-tertiary'">•</span>
                  <div v-if="file.tags && file.tags.length > 0" class="flex gap-1">
                    <span :class="'theme-colors-text-tertiary'">Tags:</span>
                    <span
                      v-for="tag in file.tags"
                      :key="tag"
                      class="inline-block border px-1.5 py-0.5 rounded-full text-xs"
                      :class="[
                        'theme-colors-background-accent',
                        'theme-colors-text-accent',
                        'theme-colors-border-info'
                      ]"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <span v-else-if="file.contextId" class="border px-1.5 py-0.5 rounded-full"
                        :class="[
                          'theme-colors-text-accent',
                          'theme-colors-background-accent',
                          'theme-colors-border-info'
                        ]">
                    {{ file.contextId }}
                  </span>
                </div>
              </div>

<!-- Visibility -->
              <div class="flex items-center h-20">
                <dxSwitch
                  :modelValue="file.visibility === 'PUBLIC'"
                  @update:modelValue="() => handleToggleVisibility(file)"
                  size="sm"
                  :label="file.visibility"
                  labelPosition="right"
                />
              </div>

            
<!-- Status -->
<div class="flex items-center h-20">
  <span class="text-sm"
        :class="'theme-colors-text-secondary'">{{ file.status || 'ACTIVE' }}</span>
</div>

              <!-- Owner -->
              <div class="flex items-center h-20">
                <span class="text-sm"
                      :class="'theme-colors-text-secondary'">{{ getOwnerName(file.userId) }}</span>
              </div>

              <!-- Updated -->
              <div class="flex items-center h-20">
                <span class="font-mono text-xs"
                      :class="'theme-colors-text-secondary'">{{ formatDate(file.updatedAt || file.createdAt) }}</span>
              </div>

              <!-- Size -->
              <div class="flex items-center h-20">
                <span class="text-sm"
                      :class="'theme-colors-text-secondary'">{{ formatFileSize(file.size) }}</span>
              </div>

              <!-- Actions -->
              <div class="flex items-center h-20">
                <div class="flex flex-wrap gap-1">
                  <dxButton @click="handleViewFile(file)" variant="ghost" size="sm" shape="square" iconOnly title="View file">
                    <dxIcon name="ri-eye-line" size="sm" />
                  </dxButton>
                  <dxButton @click="handleDownloadFile(file)" variant="ghost" size="sm" shape="square" iconOnly title="Download">
                    <dxIcon name="ri-download-line" size="sm" />
                  </dxButton>
                  <dxButton @click="handleCopyUrl(file)" variant="ghost" size="sm" shape="square" iconOnly title="Copy URL">
                    <dxIcon name="ri-link" size="sm" />
                  </dxButton>
                  <dxButton @click="handleDeleteFile(file)" variant="ghost" size="sm" shape="square" iconOnly title="Delete">
                    <dxIcon name="ri-delete-bin-line" size="sm" />
                  </dxButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- File Details Modal -->
    <div v-if="showFileDetails && selectedFile" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
           :class="'theme-colors-background-secondary'">
        <div class="sticky top-0 border-b px-6 py-4 flex justify-between items-center"
             :class="[
               'theme-colors-background-secondary',
               'theme-colors-border-primary'
             ]">
          <h3 class="text-lg font-semibold"
              :class="'theme-colors-text-primary'">File Details</h3>
          <dxButton @click="closeFileDetailsModal" variant="ghost" size="sm" shape="circle" iconOnly>
            <dxIcon name="ri-close-line" size="md" />
          </dxButton>
        </div>
        
        <div class="px-6 py-4 space-y-6">
          <!-- File Preview -->
          <div class="text-center">
            <dxSecureAsset
              :fileId="selectedFile.id"
              mode="preview"
              :fileName="selectedFile.originalName"
              :mimeType="selectedFile.mimeType"
              class="max-w-xs max-h-48 mx-auto rounded border"
              :class="'theme-colors-border-primary'"
            />
          </div>

          <!-- System Information -->
          <div>
            <h4 class="text-sm font-semibold mb-3"
                :class="'theme-colors-text-primary'">System Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span class="font-medium">ID:</span> <span class="font-mono text-xs">{{ selectedFile.id }}</span></div>
              <div><span class="font-medium">File Name:</span> <span class="font-mono text-xs">{{ selectedFile.fileName }}</span></div>
              <div><span class="font-medium">Storage Provider:</span> {{ selectedFile.storageProvider || 'LOCAL' }}</div>
              <div><span class="font-medium">Storage Path:</span> <span class="font-mono text-xs">{{ selectedFile.storagePath }}</span></div>
            </div>
          </div>

          <!-- Metadata -->
          <div>
            <h4 class="text-sm font-semibold mb-3"
                :class="'theme-colors-text-primary'">Metadata</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span class="font-medium">Original Name:</span> {{ selectedFile.originalName }}</div>
              <div><span class="font-medium">MIME Type:</span> <span class="font-mono">{{ selectedFile.mimeType }}</span></div>
              <div><span class="font-medium">Size:</span> {{ formatFileSize(selectedFile.size) }}</div>
              <div><span class="font-medium">Public URL:</span> {{ selectedFile.publicUrl || '—' }}</div>
            </div>
          </div>

          <!-- Access Settings -->
          <div>
            <h4 class="text-sm font-semibold mb-3"
                :class="'theme-colors-text-primary'">Access Settings</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span class="font-medium">Visibility:</span>
                <span :class="[
                  'ml-2 px-2 py-0.5 rounded text-xs',
                  selectedFile.visibility === 'PUBLIC' ? 'theme-colors-background-success theme-colors-text-success' :
                  selectedFile.visibility === 'PRIVATE' ? 'theme-colors-background-error theme-colors-text-error' :
                  'theme-colors-background-warning theme-colors-text-warning'
                ]">{{ selectedFile.visibility }}</span>
              </div>
              <div><span class="font-medium">Owner:</span> {{ getOwnerName(selectedFile.userId) }}</div>
              <div><span class="font-medium">Module Context:</span> {{ selectedFile.moduleContext || '—' }}</div>
              <div><span class="font-medium">Context ID:</span> {{ selectedFile.contextId || '—' }}</div>
            </div>
          </div>

          <!-- Content -->
          <div>
            <h4 class="text-sm font-semibold mb-3"
                :class="'theme-colors-text-primary'">Content</h4>
            <div class="space-y-3 text-sm">
              <div>
                <span class="font-medium">Tags:</span>
                <div v-if="selectedFile.tags && selectedFile.tags.length > 0" class="mt-1 flex gap-1 flex-wrap">
                  <span
                    v-for="tag in selectedFile.tags"
                    :key="tag"
                    class="inline-block border px-2 py-1 rounded-full text-xs"
                    :class="[
                      'theme-colors-background-accent',
                      'theme-colors-text-accent',
                      'theme-colors-border-info'
                    ]"
                  >
                    {{ tag }}
                  </span>
                </div>
                <span v-else :class="'theme-colors-text-tertiary'">—</span>
              </div>
              <div><span class="font-medium">Description:</span> {{ selectedFile.description || '—' }}</div>
              <div><span class="font-medium">Status:</span>
                <span :class="[
                  'ml-2 px-2 py-0.5 rounded text-xs',
                  (selectedFile.status || 'ACTIVE') === 'ACTIVE'
                    ? 'theme-colors-background-success theme-colors-text-success'
                    : 'theme-colors-background-tertiary theme-colors-text-secondary'
                ]">{{ selectedFile.status || 'ACTIVE' }}</span>
              </div>
            </div>
          </div>

          <!-- Timestamps -->
          <div>
            <h4 class="text-sm font-semibold mb-3"
                :class="'theme-colors-text-primary'">Timestamps</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span class="font-medium">Created:</span> <span class="font-mono text-xs">{{ formatDate(selectedFile.createdAt) }}</span></div>
              <div><span class="font-medium">Updated:</span> <span class="font-mono text-xs">{{ formatDate(selectedFile.updatedAt || selectedFile.createdAt) }}</span></div>
              <div><span class="font-medium">Expires:</span> {{ selectedFile.expiresAt ? formatDate(selectedFile.expiresAt) : '—' }}</div>
              <div><span class="font-medium">Deleted:</span> {{ selectedFile.deletedAt ? formatDate(selectedFile.deletedAt) : '—' }}</div>
            </div>
          </div>

          <!-- Authorship -->
          <div>
            <h4 class="text-sm font-semibold mb-3"
                :class="'theme-colors-text-primary'">Authorship</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span class="font-medium">Created By:</span> {{ getOwnerName(selectedFile.createdBy || selectedFile.userId) }}</div>
              <div><span class="font-medium">Updated By:</span> {{ getOwnerName(selectedFile.updatedBy || selectedFile.userId) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  
</template>

