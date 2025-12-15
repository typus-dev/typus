<template>
  <div :class="['category-selector w-full flex flex-col justify-center', customClass]">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 ">
      {{ label }}
      <span v-if="required" class="theme-colors-text-error ml-1">*</span>
    </label>

    <!-- Breadcrumbs and Selector -->
    <div class="flex items-center gap-2" style="align-items: center !important;">
      <!-- Path badges -->
      <template v-for="(item, index) in selectedPath" :key="item.id">
        <div class="flex items-center">
          <dxBadge
            variant="secondary"
            size="md"
            :customClass="`flex items-center gap-1 px-3 py-1.5 text-sm md:text-base ${index === selectedPath.length - 1 ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`"
          >
            <span class="max-w-32 truncate" :title="item.name">{{ item.name }}</span>
            <button
              @click="removePath(index)"
              class="ml-1 p-0.5 rounded-sm hover:bg-black hover:bg-opacity-10 transition-colors"
              type="button"
              :title="`Remove ${item.name}`"
            >
              <dxIcon name="ri:close-line" size="sm" />
            </button>
          </dxBadge>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400 text-base md:text-lg">/</span>
        </div>
      </template>

      <!-- Category Selector -->
      <div v-if="!showCreateForm" class="w-48 flex items-center">
        <dxSelect
          ref="selectRef"
          :modelValue="undefined"
          @update:modelValue="handleSelect"
          :options="selectOptions"
          :placeholder="placeholder || 'Select category'"
          size="md"
          :disabled="disabled"
          :loading="loading"
          :error="error"
          filterable
          clearable
          noGutters
        />
      </div>

      <!-- Add Button / Create Form -->
      <template v-if="canCreate">
        <div v-if="showCreateForm" class="flex items-center gap-2">
          <div class="flex items-center">
            <dxInput
              ref="createInput"
              v-model="newName"
              @keydown.enter="createCategory"
              @keydown.escape="cancelCreate"
              placeholder="Category name..."
              size="sm"
              customClass="w-48"
              noGutters
            />
          </div>
          <dxButton
            @click="createCategory"
            :disabled="!newName.trim() || isCreating"
            variant="primary"
            size="xs"
            iconOnly
            shape="circle"
            :loading="isCreating"
            title="Save"
          >
            <dxIcon name="ri:check-line" />
          </dxButton>
          <dxButton
            @click="cancelCreate"
            variant="secondary"
            size="xs"
            iconOnly
            shape="circle"
            title="Cancel"
          >
            <dxIcon name="ri:close-line" />
          </dxButton>
        </div>
        <div v-else class="flex items-center">
          <dxButton
            @click="showCreateForm = true"
            variant="ghost"
            size="sm"
            iconOnly
            shape="circle"
            title="Add category"
          >
            <dxIcon name="ri:add-line" size="sm" />
          </dxButton>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'
import dxBadge from '@/components/ui/dxBadge.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'

interface TreeNode {
  id: string | number
  name: string
  slug?: string
  parentId?: string | number | null
  hasChildren?: boolean
  [key: string]: any
}

interface TreePath {
  id: string | number
  name: string
  slug?: string
  hasChildren?: boolean
}

interface CreatePayload {
  name: string
  parentId?: string | number | null
}

interface CreateResult {
  tempId: string
  category: TreeNode
}

interface Props {
  modelValue?: TreePath[]
  nodes?: TreeNode[]
  loading?: boolean
  error?: string | boolean
  disabled?: boolean
  canCreate?: boolean
  label?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  customClass?: string
  noGutters?: boolean
  helperText?: string
  placeholder?: string
  parentField?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  nodes: () => [],
  loading: false,
  error: false,
  disabled: false,
  canCreate: true,
  label: '',
  required: false,
  size: 'sm',
  customClass: '',
  noGutters: false,
  helperText: '',
  placeholder: 'Select category',
  parentField: 'parentId'
})

const emit = defineEmits<{
  'update:modelValue': [value: TreePath[]]
  'change': [path: TreePath[]]
  'create': [payload: CreatePayload]
}>()

// Mock data fallback
const mockData: TreeNode[] = [
  { id: 1, name: 'News', hasChildren: true, parentId: null, slug: 'news' },
  { id: 2, name: 'Products', hasChildren: true, parentId: null, slug: 'products' },
  { id: 3, name: 'About', hasChildren: false, parentId: null, slug: 'about' },
  { id: 11, name: 'Politics', hasChildren: false, parentId: 1, slug: 'politics' },
  { id: 12, name: 'Sports', hasChildren: false, parentId: 1, slug: 'sports' },
  { id: 21, name: 'Software', hasChildren: true, parentId: 2, slug: 'software' },
  { id: 22, name: 'Hardware', hasChildren: false, parentId: 2, slug: 'hardware' },
  { id: 211, name: 'Web Apps', hasChildren: false, parentId: 21, slug: 'web-apps' },
  { id: 212, name: 'Mobile Apps', hasChildren: false, parentId: 21, slug: 'mobile-apps' }
]

// ===== State
const selectedPath = ref<TreePath[]>([...(props.modelValue || [])])
const showCreateForm = ref(false)
const newName = ref('')
const isCreating = ref(false)
const isInternalUpdate = ref(false)
const emissionDebounce = ref(false)

// Refs
const createInput = ref<HTMLInputElement>()
const selectRef = ref<HTMLInputElement>()

// ===== Computed
const fullSource = computed<TreeNode[]>(() => props.nodes.length > 0 ? props.nodes : mockData)
const normalizeId = (id: string | number | undefined | null) => String(id ?? '')

const currentParentId = computed<string | null>(() => {
  return selectedPath.value.length > 0
    ? normalizeId(selectedPath.value[selectedPath.value.length - 1].id)
    : null
})

const availableCategories = computed(() => {
  return fullSource.value.filter(node => {
    const parentId = normalizeId(node[props.parentField])
    if (currentParentId.value === null) {
      return parentId === '' // root (null/undefined)
    }
    return parentId === currentParentId.value
  })
})

const selectOptions = computed(() => {
  return availableCategories.value.map(cat => ({
    label: cat.hasChildren ? `📁 ${cat.name}` : `📄 ${cat.name}`,
    value: cat.id
  }))
})

/** Build emitted categories from full source (not current level!) */
function buildSelectedCategoriesFromFullSource() {
  const source = fullSource.value
  return selectedPath.value.map(pathItem => {
    const src = source.find(c => normalizeId(c.id) === normalizeId(pathItem.id))
    return {
      id: pathItem.id,
      name: pathItem.name,
      slug: src?.slug || pathItem.name.toLowerCase().replace(/\s+/g, '-'),
      hasChildren: pathItem.hasChildren
    }
  })
}

// ===== Methods
function handleSelect(categoryId: string | number | null) {
  console.log('=== CategoryPicker.handleSelect TRIGGERED ===')
  if (!categoryId || emissionDebounce.value) return

  const cat = availableCategories.value.find(c => normalizeId(c.id) === normalizeId(categoryId))
  if (!cat) {
    console.warn('[CategoryPicker] Category not found in availableCategories')
    return
  }

  const pathItem: TreePath = {
    id: cat.id,
    name: cat.name,
    hasChildren: cat.hasChildren
  }

  emissionDebounce.value = true
  isInternalUpdate.value = true
  selectedPath.value = [...selectedPath.value, pathItem]

  nextTick(() => {
    const selectedCategories = buildSelectedCategoriesFromFullSource()
    emit('update:modelValue', selectedCategories)
    emit('change', selectedCategories)
    setTimeout(() => {
      isInternalUpdate.value = false
      emissionDebounce.value = false
    }, 50)
  })
}

function removePath(index: number) {
  if (emissionDebounce.value) return
  emissionDebounce.value = true
  isInternalUpdate.value = true

  selectedPath.value = selectedPath.value.slice(0, index)

  nextTick(() => {
    const selectedCategories = buildSelectedCategoriesFromFullSource()
    emit('update:modelValue', selectedCategories)
    emit('change', selectedCategories)
    setTimeout(() => {
      isInternalUpdate.value = false
      emissionDebounce.value = false
    }, 50)
  })
}

function cancelCreate() {
  showCreateForm.value = false
  newName.value = ''
}

async function createCategory() {
  console.log('=== CategoryPicker.createCategory TRIGGERED ===')
  const name = newName.value.trim()
  if (!name || isCreating.value) return

  isCreating.value = true
  try {
    const payload: CreatePayload = { name, parentId: currentParentId.value }
    emit('create', payload)

    // Optimistic fallback into mock
    const tempId = `temp-${Date.now()}`
    mockData.push({
      id: tempId,
      name,
      hasChildren: false,
      [props.parentField]: currentParentId.value ? Number(currentParentId.value) : null,
      slug: name.toLowerCase().replace(/\s+/g, '-')
    })

    isInternalUpdate.value = true
    selectedPath.value.push({ id: tempId, name, hasChildren: false })
    nextTick(() => { isInternalUpdate.value = false })
    cancelCreate()
  } finally {
    isCreating.value = false
  }
}

// ===== Watchers
watch(() => props.modelValue, (newVal) => {
  if (isInternalUpdate.value || emissionDebounce.value) return
  const currentIds = JSON.stringify(selectedPath.value.map(p => normalizeId(p.id)))
  const newIds = JSON.stringify((newVal || []).map(p => normalizeId(p.id)))
  if (currentIds !== newIds) {
    selectedPath.value = [...(newVal || [])]
  }
  console.log('[CategoryPicker] Model value updated:', {
    newVal: newVal?.map(cat => ({ id: cat.id, name: cat.name })),
    emissionDebounce: emissionDebounce.value,
    timestamp: new Date().toISOString()
  })
}, { deep: true })

watch(showCreateForm, async (show) => {
  if (show) {
    await nextTick()
    createInput.value?.focus()
  }
})
</script>
