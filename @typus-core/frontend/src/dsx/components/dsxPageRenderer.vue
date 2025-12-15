<script setup lang="ts">
import dxGrid from '@/components/layout/dxGrid.vue'
import dxCol from '@/components/layout/dxCol.vue'
import dsxBlockRenderer from './dsxBlockRenderer.vue'

import { onMounted, ref, watch, computed } from 'vue'
import { getComponentName } from '@/shared/utils/componentUtils'

const props = defineProps<{ config: dsxPageConfig }>()

// Validate config
const hasValidConfig = computed(() => {
  // Check if blocks exist
  if (!props.config.blocks || props.config.blocks.length === 0) {
    logger.warn(' [dsxPageRenderer] No blocks found in configuration', {
      title: props.config.title,
      layout: props.config.layout
    })
    return false
  }
  
  // Check if any blocks have no components
  const emptyBlocks = props.config.blocks.filter(block => !block.components || block.components.length === 0)
  if (emptyBlocks.length > 0) {
    logger.warn(' [dsxPageRenderer] Empty blocks found in configuration', {
      title: props.config.title,
      emptyBlockIds: emptyBlocks.map(b => b.id)
    })
  }
  
  return true
})

// Add detailed logging
logger.debug('[dsxPageRenderer] Initializing', {
  title: props.config.title,
  layout: props.config.layout,
  type: props.config.type,
  blocksCount: props.config.blocks?.length || 0,
  columns: props.config.columns,
  gap: props.config.gap
})

// Immediately check for valid config and log warnings
const isValid = hasValidConfig.value

// Track when the component is mounted
onMounted(() => {
  logger.debug('[dsxPageRenderer] Mounted', {
    title: props.config.title,
    blocksCount: props.config.blocks?.length || 0
  })
  
  // Log each block's components
  if (props.config.blocks) {
    props.config.blocks.forEach((block, index) => {
      logger.debug('[dsxPageRenderer] Block details', {
        blockIndex: index + 1,
        totalBlocks: props.config.blocks?.length || 0,
        blockId: block.id,
        componentsCount: block.components?.length || 0,
        componentTypes: block.components?.map(c => getComponentName(c.type)) || []
      })
      
      // Log each component's dataSource
      if (block.components) {
        block.components.forEach((component, compIndex) => {
          logger.debug('[dsxPageRenderer] Component details', {
            blockId: block.id,
            blockIndex: index + 1,
            componentIndex: compIndex + 1,
            totalComponents: block.components?.length || 0,
            componentType: getComponentName(component.type),
            hasDataSource: !!component.dataSource,
            dataSourceType: component.dataSource ? (typeof component.dataSource === 'function' ? 'function' : 'static') : 'none'
          })
        })
      }
    })
  }
})

// Watch for changes to the config
watch(() => props.config, (newConfig) => {
  logger.debug('[dsxPageRenderer] Config changed', {
    title: newConfig.title,
    blocksCount: newConfig.blocks?.length || 0
  })
}, { deep: true })
</script>

<template>
  <!-- file: frontend/src/dsx/components/dsxPageRenderer.vue -->
  <dxGrid :cols="props.config.columns || 1"  sm="2" md="4" lg="6" xl="12"  :gap="props.config.gap || 16" auto-rows>
    <template v-for="block in props.config.blocks" :key="block.id">
      <dxCol
        :span="block.colSpan || 1"
        :style="{ gridRow: `span ${block.rowSpan || 1}` }"
      >
        <dsxBlockRenderer :config="block" />
      </dxCol>
    </template>
  </dxGrid>
</template>