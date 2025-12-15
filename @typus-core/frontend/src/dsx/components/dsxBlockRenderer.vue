<script setup lang="ts">
import dsxComponentRenderer from './dsxComponentRenderer.vue'
import type { dsxBlockConfig, dsxComponentConfig } from '../types' // Corrected import and added dsxComponentConfig
import { computed, onMounted, ref, provide, watch } from 'vue'
import { getComponentName } from '@/shared/utils/componentUtils'
import { logger } from '@/core/logging/logger'; // Import logger

const props = defineProps<{ config: dsxBlockConfig }>()

const blockData = ref()
const isLoading = ref(true)

// CRUD operations for the block
const blockMethods = {
  // Update block data
  updateData: async (newData: any) => {
    logger.debug('[dsxBlockRenderer] updateData START', { blockId: props.config.id }); // Log entry
    // Call beforeDataUpdate if provided
    if (props.config.beforeDataUpdate) {
      const result = await props.config.beforeDataUpdate(blockData.value, newData)
      if (result === false) {
        logger.debug('[dsxBlockRenderer] updateData cancelled by beforeDataUpdate hook', { blockId: props.config.id });
        return // Cancel update
      }
      if (result) newData = result // Modified data
    }
    
    blockData.value = newData
    logger.debug('[dsxBlockRenderer] blockData updated', { blockId: props.config.id });
    
    // Call afterDataUpdate if provided
    if (props.config.afterDataUpdate) {
      await props.config.afterDataUpdate(blockData.value)
    }
    logger.debug('[dsxBlockRenderer] updateData END', { blockId: props.config.id });
  },
  
  // Reload data
  reloadData: async () => {
    logger.debug('[dsxBlockRenderer] reloadData START', { blockId: props.config.id }); // Log entry
    await loadBlockData()
    logger.debug('[dsxBlockRenderer] reloadData END', { blockId: props.config.id });
  },
  
  // Partially update data
  patchData: async (patch: any) => {
    logger.debug('[dsxBlockRenderer] patchData START', { blockId: props.config.id, patch }); // Log entry
    const newData = { ...blockData.value, ...patch }
    await blockMethods.updateData(newData)
    logger.debug('[dsxBlockRenderer] patchData END', { blockId: props.config.id });
  }
}

// Provide block context to child components
provide('blockContext', {
  data: blockData,
  methods: blockMethods,
  config: props.config
})

// Load block data
const loadBlockData = async () => {
  if (props.config.dataSource) {
    try {
      logger.debug('[dsxBlockRenderer] Loading block data', {
        blockId: props.config.id
      })
      
      // Call beforeDataLoad hook if provided
      if (props.config.beforeDataLoad) {
        const result = await props.config.beforeDataLoad()
        if (result === false) {
          isLoading.value = false
          return // Cancel loading
        }
      }
      
      if (typeof props.config.dataSource === 'function') {
        blockData.value = await props.config.dataSource()
      } else {
        blockData.value = props.config.dataSource
      }
      
      // Call afterDataLoad hook if provided
      if (props.config.afterDataLoad) {
        const transformedData = await props.config.afterDataLoad(blockData.value)
        if (transformedData !== undefined) {
          blockData.value = transformedData
        }
      }
      
      logger.debug('[dsxBlockRenderer] Block data loaded', {
        blockId: props.config.id,
        dataType: typeof blockData.value
      })
    } catch (error) {
      logger.error('[dsxBlockRenderer] Error loading block data', {
        blockId: props.config.id,
        error
      })
      
      // Call onDataError hook if provided
      if (props.config.onDataError) {
        await props.config.onDataError(error)
      }
    }
  }
  isLoading.value = false
}

// Enhanced data passing to components
const componentsWithData = computed(() => {
  logger.debug('[dsxBlockRenderer] Computing componentsWithData', { blockId: props.config.id }); // Log entry
  if (!props.config.components) return []
  
  return props.config.components.map((component: dsxComponentConfig) => { // Explicitly type component
    const enhancedComponent = { ...component }
    
    // If component has no own dataSource, pass blockData as prop
    if (!component.dataSource && blockData.value !== undefined) {
      enhancedComponent.props = {
        ...component.props,
        blockData: blockData.value
      }
    }
    
    // Process function props with correct context
    if (component.props) {
      enhancedComponent.props = Object.keys(component.props).reduce((acc, key) => {
        const propValue = component.props![key]
        
        if (typeof propValue === 'function') {
          acc[key] = () => {
            const contextData = component.dataSource ? undefined : blockData.value
            return propValue(contextData)
          }
        } else {
          acc[key] = propValue
        }
        
        return acc
      }, {} as any)
    }
    
    // Add block methods to events if needed
    if (props.config.exposeBlockMethods) {
      enhancedComponent.events = {
        ...component.events,
        'update:blockData': blockMethods.updateData,
        'reload:blockData': blockMethods.reloadData,
        'patch:blockData': blockMethods.patchData
      }
    }
    
    return enhancedComponent
  })
})

// Validation
if (!props.config.components || props.config.components.length === 0) {
  logger.warn('[dsxBlockRenderer] Block has no components', {
    blockId: props.config.id || 'unknown',
    blockTitle: props.config.title || 'Untitled Block'
  })
}

// Logging
logger.debug('[dsxBlockRenderer] Initializing', {
  blockId: props.config.id,
  componentsCount: props.config.components?.length || 0,
  componentTypes: props.config.components?.map((c: dsxComponentConfig) => getComponentName(c.type)) || [], // Explicitly type c
  hasDataSource: !!props.config.dataSource
})

onMounted(async () => {
  logger.debug('[dsxBlockRenderer] Mounted', {
    blockId: props.config.id,
    componentsCount: props.config.components?.length || 0
  })
  
  await loadBlockData()
})

// Watch for dataSource changes
watch(() => props.config.dataSource, async () => {
  logger.debug('[dsxBlockRenderer] DataSource changed, reloading data')
  await loadBlockData()
})

// Determine whether to wrap components
const shouldWrapComponents = computed(() => {
  const shouldWrap = props.config.components && props.config.components.length > 1
  logger.debug('[dsxBlockRenderer] Computed shouldWrapComponents', {
    blockId: props.config.id,
    shouldWrap,
    componentsCount: props.config.components?.length || 0
  })
  return shouldWrap
})
</script>

<template>
  <div v-if="isLoading" class="flex justify-center items-center h-32">
    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
  
  <template v-else>
    <div v-if="shouldWrapComponents" class="flex flex-col h-full w-full">
      <dsxComponentRenderer
        v-for="(component, index) in componentsWithData"
        :key="index"
        :config="{ 
          ...component, 
          props: { 
            ...(component.props || {}), 
            style: props.config.style, 
            class: props.config.class 
          } 
        }"
      />
    </div>
    <template v-else>
      <dsxComponentRenderer
        v-for="(component, index) in componentsWithData"
        :key="index"
        :config="{ 
          ...component, 
          props: { 
            ...(component.props || {}), 
            style: props.config.style, 
            class: props.config.class 
          } 
        }"
      />
    </template>
  </template>
</template>
