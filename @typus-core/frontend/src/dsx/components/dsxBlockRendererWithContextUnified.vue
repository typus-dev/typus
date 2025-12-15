<template>
  <div
    class="dsx-block flex flex-col gap-4 p-4 rounded-lg"
    :class="[
      config.class,
      'theme-colors-background-secondary',
      'theme-colors-border-primary',
      'border shadow-sm'
    ]"
    :style="blockStyle"
    :data-block-id="blockId"
    :data-theme="activeTheme || undefined"
  >
    <h3 v-if="config.title" :class="[
      'dsx-block-title text-xl font-semibold m-0 mb-4',
      'theme-colors-text-primary'
    ]">
      {{ config.title }}
    </h3>
    
    <div v-if="isLoading" class="flex justify-center items-center min-h-24">
      <div :class="[
        'w-6 h-6 border-2 rounded-full animate-spin',
        'theme-colors-border-primary',
        'border-t-green-600'
      ]"></div>
    </div>

    <div v-else-if="error" :class="[
      'p-3 border rounded-lg',
      'theme-colors-background-error',
      'theme-colors-border-error'
    ]">
      <p :class="[
        'text-sm m-0',
        'theme-colors-text-error'
      ]">{{ error.message }}</p>
    </div>
    
    <div v-else class="dsx-block-content flex flex-col gap-3">

      <dsxComponentRendererWithContextUnified
        v-for="(component, index) in enhancedComponents"
        :key="`${blockId}-component-${index}`"
        :config="component"
        :componentData="componentData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, provide, onMounted, watch, inject } from 'vue'

import type { dsxBlockConfig, UnifiedContext } from '@/dsx/types/'
import dsxComponentRendererWithContextUnified from './dsxComponentRendererWithContextUnified.vue'
import { useActiveTheme } from '@/shared/composables/useActiveTheme'

const props = defineProps<{
  config: dsxBlockConfig;
  pageData?: any;
  debug?: boolean;
}>()

const activeTheme = useActiveTheme()
const pageContext = inject('pageContext', null) as any

const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
const blockId = ref(props.config.id || generateId())

const blockData = ref<any>(null)
const isLoading = ref(false)
const error = ref<any>(null)

const enhancedComponents = computed(() => {
  return props.config.components.map((component, index) => ({
    ...component,
    id: component.id || `${blockId.value}-component-${index}`,
    blockId: blockId.value,
    _inheritedData: componentData.value
  }))
})

const componentData = computed(() => {
  
  const data = blockData.value || props.pageData || {}
  console.log('[Block] componentData computed:', data)
  return data
})

const createUnifiedContext = (data?: any): UnifiedContext => {
  return {
    page: {
      data: props.pageData || {},
      config: pageContext?.config || {},
      state: { 
        isLoading: pageContext?.state?.isLoading || false, 
        errors: pageContext?.state?.errors || null 
      }
    },
    block: {
      data: data || blockData.value || props.pageData || {},
      config: props.config,
      state: { 
        isChanged: false, 
        mode: 'view'
      },
      methods: {
        save: () => saveBlockData(),
        validate: () => validateBlockData(),
        reload: () => loadBlockData()
      }
    },
    component: {
      data: data || componentData.value,
      config: props.config
    }
  }
}

const blockContext = ref({
  state: {
    data: {
      block: componentData.value,
      original: componentData.value,
      isChanged: false
    },
    mode: 'view',
    ui: {
      isLoading: isLoading.value,
      isActionLoading: false,
      isAnyLoading: computed(() => isLoading.value)
    },
    errors: error.value,
    _contextInstanceId: `block-${blockId.value}`
  },
  config: props.config,
  methods: {
    saveData: () => saveBlockData(),
    validateData: () => validateBlockData(),
    loadData: () => loadBlockData(),
    clearChanges: () => {
      blockData.value = { ...props.pageData }
      updateBlockContext()
    },
    resetToOriginal: () => {
      blockData.value = { ...props.pageData }
      updateBlockContext()
    }
  },
  record: componentData
})

provide('blockContext', blockContext)
provide('blockId', blockId.value)

const updateBlockContext = () => {
  blockContext.value.state.data.block = componentData.value
  blockContext.value.state.ui.isLoading = isLoading.value
  blockContext.value.state.errors = error.value
}

const loadBlockData = async () => {

  
  if (!props.config.dataSource) {
    blockData.value = props.pageData || {}
    updateBlockContext()
    return
  }

  isLoading.value = true
  error.value = null

  try {

      
    const unifiedContext = createUnifiedContext()

    if (props.config.beforeDataFetchUnified) {
      await props.config.beforeDataFetchUnified(unifiedContext)
    }

    if (props.config.beforeDataLoad) {
      const shouldContinue = await props.config.beforeDataLoad()
      if (shouldContinue === false) {
        isLoading.value = false
        return
      }
    }

    let data

      
    if (typeof props.config.dataSource === 'function') {

        
      console.log('[Block] Calling dataSource function')
      data = await props.config.dataSource()
      console.log('[Block] DataSource returned:', Array.isArray(data) ? `Array(${data.length})` : typeof data)
    } else {
      data = props.config.dataSource
    }
  
    blockData.value = data
    updateBlockContext()

    const updatedUnifiedContext = createUnifiedContext(data)

    if (props.config.afterDataFetchUnified) {
      await props.config.afterDataFetchUnified(updatedUnifiedContext)
    }

    if (props.config.afterDataLoad) {
      const transformedData = await props.config.afterDataLoad(data)
      if (transformedData !== undefined) {
        blockData.value = transformedData
        updateBlockContext()
      }
    }

  } catch (err) {
    error.value = err as Error
    console.error('Error loading block data:', err)
    
    if (props.config.onDataError) {
      await props.config.onDataError(err)
    }
  } finally {
    isLoading.value = false
    updateBlockContext()
  }
}

const saveBlockData = async () => {
  try {
    console.log('Saving block data:', blockData.value)
    return blockData.value
  } catch (err) {
    console.error('Error saving block data:', err)
    throw err
  }
}

const validateBlockData = () => {
  return true
}

const blockStyle = computed(() => {
  const style: Record<string, any> = { ...props.config.style }
  
  if (props.config.colSpan) {
    style.gridColumn = `span ${props.config.colSpan}`
  }
  
  if (props.config.rowSpan) {
    style.gridRow = `span ${props.config.rowSpan}`
  }
  
  if (props.config.align) {
    style.justifySelf = props.config.align
  }
  
  if (props.config.justify) {
    style.alignSelf = props.config.justify
  }
  
  return style
})

watch(() => props.pageData, async (newData, oldData) => {
  
  if (props.config.beforeDataUpdate) {
    const result = await props.config.beforeDataUpdate(oldData, newData)
    if (result === false) return
    if (result !== undefined) {
      blockData.value = result
    } else {
      blockData.value = newData
    }
  } else {
    if (!props.config.dataSource) {
      blockData.value = newData
    }
  }
  
  updateBlockContext()
  
  if (props.config.afterDataUpdate) {
    await props.config.afterDataUpdate(blockData.value)
  }
}, { deep: true })

onMounted(async () => {
  await loadBlockData()
})
</script>
