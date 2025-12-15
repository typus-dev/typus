<route lang="json">{
  "name": "cms-content",
  "path": "/cms/content",
  "meta": {
    "layout": "private",
    "subject": "cms"
  }
}</route>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { CmsMethods } from '../methods/cms.methods.dsx'
import { formatUtils } from '@/shared/utils/format'
import { useToasts } from '@/shared/composables/useToasts'
import { useModals } from '@/shared/composables/useModals'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import DxTabs from '@/components/ui/dxTabs.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

const router = useRouter()
const { successToast, errorToast } = useToasts()
const { confirmModal } = useModals()

// Active tab
const activeTab = ref<'content' | 'static'>('content')

// CMS Content
const pageData = reactive({
  items: [],
  loading: false,
  error: null as string | null
})

// Static Pages
const staticData = reactive({
  items: [] as any[],
  loading: false,
  scanning: false,
  unregistered: [] as any[]
})

// Upload state
const uploadLoading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Tabs config
const tabs = computed(() => [
  { key: 'content', label: 'Content', badge: pageData.items.length || undefined },
  { key: 'static', label: 'Static Pages', badge: allStaticPages.value.length || undefined }
])

// Merged static pages (registered + unregistered)
const allStaticPages = computed(() => {
  // Get registered paths to filter out duplicates
  const registeredPaths = new Set(staticData.items.map((item: any) => item.path))

  const registered = staticData.items.map((item: any) => ({
    ...item,
    _registered: true,
    _filePath: item.meta?.originalFilename || item.name,
    _fileName: item.name,
    _createdAt: item.createdAt
  }))

  // Filter out already registered paths
  const unregistered = staticData.unregistered
    .filter((item: any) => !registeredPaths.has(item.routePath))
    .map((item: any) => ({
      path: item.routePath,
      name: item.fileName,
      component: 'StaticHtml',
      meta: {},
      _registered: false,
      _filePath: item.filePath,
      _fileName: item.fileName,
      _routePath: item.routePath,
      _createdAt: null
    }))

  return [...registered, ...unregistered]
})

// CMS Content columns
const columns = [
  { key: 'id', title: 'ID', sortable: true, width: '80px' },
  { key: 'title', title: 'Title', sortable: true, width: '200px' },
  { key: 'type', title: 'Type', sortable: true, width: '100px' },
  { key: 'status', title: 'Status', sortable: true, width: '100px' },
  { key: 'categories', title: 'Categories', sortable: false, width: '150px' },
  { key: 'sitePath', title: 'Site Path', sortable: true, width: '300px' },
  { key: 'publishedAt', title: 'Published', sortable: true, formatter: formatUtils.timeAgo, width: '150px' },
  { key: 'actions', title: 'Actions', width: '120px' }
]

// Static Pages columns
const staticColumns = [
  { key: '_filePath', title: 'File', sortable: true },
  { key: 'path', title: 'Route', sortable: true, width: '150px' },
  {
    key: '_registered',
    title: 'Status',
    sortable: true,
    width: '120px',
    formatter: (val: boolean) => val ? 'Registered' : 'Not registered'
  },
  {
    key: '_createdAt',
    title: 'Created',
    sortable: true,
    width: '150px',
    formatter: (val: string | null) => val ? formatUtils.timeAgo(val) : '-'
  }
]

// Static Pages custom actions
const staticCustomActions = [
  {
    key: 'register',
    label: 'Register',
    icon: 'ri:add-circle-line',
    variant: 'primary' as const,
    condition: (item: any) => !item._registered,
    onClick: (item: any) => registerFile(item)
  },
  {
    key: 'view',
    label: 'View',
    icon: 'ri:external-link-line',
    variant: 'ghost' as const,
    condition: (item: any) => item._registered,
    onClick: (item: any) => window.open(item.path, '_blank')
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'ri:delete-bin-line',
    variant: 'ghost' as const,
    condition: (item: any) => item._registered,
    onClick: (item: any) => deleteStaticPage(item)
  }
]

// Load CMS items
const loadItems = async () => {
  pageData.loading = true
  pageData.error = null
  pageData.items = await CmsMethods.getContentItems()
  pageData.loading = false
}

// Load Static Pages
const loadStaticPages = async () => {
  staticData.loading = true
  const { data, error } = await useApi('/cms/static-pages').get()
  if (!error) {
    staticData.items = data || []
  }
  staticData.loading = false
}

// Scan for unregistered files
const scanUnregistered = async () => {
  staticData.scanning = true
  const { data, error } = await useApi('/cms/static-pages/scan').get()
  if (error) {
    errorToast('Scan failed: ' + (error.message || error))
  } else {
    staticData.unregistered = data || []
    if (staticData.unregistered.length > 0) {
      successToast(`Found ${staticData.unregistered.length} unregistered file(s)`)
    } else {
      successToast('All files are registered')
    }
  }
  staticData.scanning = false
}

// Register a file
const registerFile = async (file: any) => {
  const routePath = file._routePath || file.path
  const { error } = await useApi('/cms/static-pages/register').post({
    routePath,
    filePath: file._filePath,
    name: file._fileName || file.name || 'Unnamed'
  })
  if (error) {
    errorToast('Registration failed: ' + (error.message || error))
  } else {
    successToast(`Registered: ${routePath}`)
    // Filter by routePath (original field in unregistered items)
    staticData.unregistered = staticData.unregistered.filter((f: any) => f.routePath !== routePath)
    await loadStaticPages()
  }
}

// Upload functions
const triggerUpload = () => {
  fileInputRef.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || !input.files[0]) return

  const file = input.files[0]
  const name = file.name.replace(/\.html?$/i, '')
  const routePath = '/' + name.toLowerCase().replace(/\s+/g, '-')

  uploadLoading.value = true

  // Read file content
  const content = await file.text()

  const { error } = await useApi('/cms/static-pages/upload').post({
    path: routePath,
    name,
    content,
    meta: { originalFilename: file.name }
  })

  if (error) {
    errorToast('Upload failed: ' + (error.message || error))
  } else {
    successToast(`Uploaded: ${routePath}`)
    await loadStaticPages()
  }

  uploadLoading.value = false
  // Reset input
  input.value = ''
}

// Delete a static page (unregister route, keep files)
const deleteStaticPage = async (page: any) => {
  const confirmed = await confirmModal(
    `Unregister route "${page.path}"? The file will remain on disk.`,
    { title: 'Unregister Route' }
  )
  if (!confirmed) return

  const { error } = await useApi('/cms/static-pages/delete').del({ data: { path: page.path } })
  if (error) {
    errorToast('Delete failed: ' + (error.message || error))
  } else {
    successToast('Route unregistered')
    await loadStaticPages()
  }
}

const handleCreate = () => {
  router.push('/cms/editor/create')
}

const handleEdit = (item: any) => {
  router.push(`/cms/editor/${item.id}`)
}

const handleDelete = async (item: any) => {
  await CmsMethods.deleteContentItem(item.id)
  await loadItems()
}

const handleRowClick = (item: any) => {
  router.push(`/cms/editor/${item.id}`)
}

onMounted(() => {
  loadItems()
  loadStaticPages()
})
</script>

<template>
  <div>
    <PageHeader
      title="Content Management"
      subtitle="Manage all content items"
    >
      <template #actions>
        <dxButton v-if="activeTab === 'content'" variant="primary" @click="handleCreate">
          <template #prefix>
            <dxIcon name="ri:add-line" />
          </template>
          Create
        </dxButton>
        <template v-if="activeTab === 'static'">
          <dxButton variant="secondary" @click="triggerUpload" :loading="uploadLoading">
            <template #prefix>
              <dxIcon name="ri:upload-2-line" />
            </template>
            Upload
          </dxButton>
          <dxButton variant="primary" @click="scanUnregistered" :loading="staticData.scanning">
            <template #prefix>
              <dxIcon name="ri:search-line" />
            </template>
            Scan Files
          </dxButton>
          <!-- Hidden file input -->
          <input
            ref="fileInputRef"
            type="file"
            accept=".html,.htm"
            class="hidden"
            @change="handleFileUpload"
          />
        </template>
      </template>
    </PageHeader>

    <dxCard>
      <!-- Tabs -->
      <DxTabs
        :tabs="tabs"
        :model-value="activeTab"
        variant="underline"
        @update:model-value="(val: string) => activeTab = val as 'content' | 'static'"
      />

      <!-- Content Tab -->
      <div v-if="activeTab === 'content'">
        <dxTable
          :data="pageData.items"
          :columns="columns"
          :loading="pageData.loading"
          :actions="true"
          confirm-delete-message="Are you sure you want to delete this content item?"
          confirm-delete-title="Delete Content Item"
          @update="handleEdit"
          @delete="handleDelete"
          @row-click="handleRowClick"
        />
      </div>

      <!-- Static Pages Tab -->
      <div v-if="activeTab === 'static'">
        <dxTable
          :data="allStaticPages"
          :columns="staticColumns"
          :loading="staticData.loading"
          :custom-actions="staticCustomActions"
          row-key="path"
        />
      </div>
    </dxCard>
  </div>
</template>
