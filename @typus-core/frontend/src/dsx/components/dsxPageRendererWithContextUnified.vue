<template>
  <div 
    class="dsx-page w-full min-h-screen p-4"
    :class="[
      `dsx-page-${config.layout || 'default'}`, 
      `dsx-page-${config.type || 'grid'}`,
      config.class
    ]"
    :data-theme="activeTheme || undefined"
  >
    <div v-if="isLoading" class="flex justify-center items-center min-h-48">
      <div :class="[
        'w-8 h-8 border-2 rounded-full animate-spin',
        'theme-colors-border-primary',
        'border-t-green-600'
      ]"></div>
    </div>

    <div v-else-if="error" :class="[
      'p-4 border rounded-lg',
      'theme-colors-background-error' || 'theme-colors-background-error',
      'theme-colors-border-error'
    ]">
      <p :class="[
        'm-0',
        'theme-colors-text-error' || 'theme-colors-text-error'
      ]">{{ error.message }}</p>
    </div>
    
    <template v-else>
      <div :class="'theme-layout-container-base'">
        <dxGrid 
          :cols="config.columns || 1"  
  :md="config.md"
  :lg="config.lg" 
  :xl="config.xl"       
          :gap="config.gap || 16" 
          auto-rows
        >
          <template v-for="(block, index) in enhancedBlocks" :key="`block-${block.id || index}`">
       
            <dxCol
              :span="block.colSpan || 1"
              :style="{ 
                gridRow: `span ${block.rowSpan || 1}`,
                ...((block.align || block.justify) && { display: 'flex' }),
                ...(block.align && { 
                  justifyContent: block.align === 'left' ? 'flex-start' : 
                                 block.align === 'right' ? 'flex-end' : 
                                 block.align === 'stretch' ? 'stretch' :
                                 'center'
                }),
                ...(block.justify && { 
                  alignItems: block.justify === 'start' ? 'flex-start' : 
                             block.justify === 'end' ? 'flex-end' : 
                             block.justify === 'stretch' ? 'stretch' :
                             'center'
                }),
                ...(block.style || {})
              }"
              :class="[block.class]"
            >
              <dsxBlockRendererWithContextUnified
                :config="block"
                :pageData="pageData"
                :debug="debug"
              />
            </dxCol>
          </template>
        </dxGrid>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, provide, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { DSL } from '@/dsl/client'
import { useActiveTheme } from '@/shared/composables/useActiveTheme'

import type { dsxPageConfig, UnifiedContext } from '@/dsx/types/'
import dsxBlockRendererWithContextUnified from './dsxBlockRendererWithContextUnified.vue'
import dxGrid from '@/components/layout/dxGrid.vue'
import dxCol from '@/components/layout/dxCol.vue'

const props = defineProps<{
  config: dsxPageConfig;
  debug?: boolean;
}>()

const route = useRoute()
const activeTheme = useActiveTheme()

const pageData = ref<any>(null)
const isLoading = ref(false)
const error = ref<any>(null)

const pageContext = ref({
  state: {
    pageData: pageData.value,
    isLoading: isLoading.value,
    errors: error.value,
    route: route
  },
  config: props.config,
  methods: {
    reload: () => loadPageData(),
    setPageData: (data: any) => {
      pageData.value = data
      updatePageContext()
    }
  }
})

provide('pageContext', pageContext)
const enhancedBlocks = computed(() => {
  return props.config.blocks.map(block => {
    let components = [...(block.components || [])];
    
    // If exists fieldFilter, generate from the model
    if (block.fieldFilter && props.config.contextConfig?.model) {
      const modelFields = generateFieldsFromModel(
        props.config.contextConfig.model, 
        block.fieldFilter,
        block.fieldOverrides
      );
      components = [...components, ...modelFields];
    }
    
    return { ...block, components };
  });
});

const createPageUnifiedContext = (data: any): UnifiedContext => {
  return {
    page: {
      data: data || {},
      config: props.config,
      state: { 
        isLoading: isLoading.value, 
        errors: error.value 
      }
    },
    block: {
      data: data || {},
      config: props.config,
      state: { 
        isChanged: false, 
        mode: 'view'
      },
      methods: {
        save: () => Promise.resolve(),
        validate: () => true
      }
    },
    component: {
      data: data,
      config: props.config
    }
  }
}

const updatePageContext = () => {
  pageContext.value = {
    ...pageContext.value,
    state: {
      pageData: pageData.value,
      isLoading: isLoading.value,
      errors: error.value,
      route: route
    }
  }
}

const loadPageData = async () => {
  isLoading.value = true
  error.value = null

  try {
    let data = {}
    
    const unifiedContext = createPageUnifiedContext(data)

    if (props.config.beforeDataFetchUnified) {
      await props.config.beforeDataFetchUnified(unifiedContext)
    }

    if (props.config.hooks?.beforeLoad) {
      await props.config.hooks.beforeLoad()
    }

    if (props.config.contextConfig?.model && props.config.contextConfig?.recordId) {
      const modelConfig = props.config.contextConfig.model
      const recordId = props.config.contextConfig.recordId
      
      try {
        let modelName: string
        if (typeof modelConfig === 'string') {
          modelName = modelConfig
        } else if (modelConfig && typeof modelConfig === 'object' && 'name' in modelConfig) {
          modelName = (modelConfig as any).name
        } else {
          throw new Error('Invalid model configuration')
        }

        if (DSL[modelName] && DSL[modelName].findById) {
          data = await DSL[modelName].findById(recordId)
          console.log(`[Unified Page] Loaded data from ${modelName}:`, data)
        } else {
          console.warn(`[Unified Page] DSL method not found for model: ${modelName}`)
          data = {}
        }
      } catch (modelError) {
        console.error('[Unified Page] Error loading from model:', modelError)
        data = {}
      }
    }
    
    if (props.config.dataSource) {
      if (typeof props.config.dataSource === 'function') {
        data = await props.config.dataSource()
      } else {
        data = props.config.dataSource
      }
    }

    pageData.value = data
    updatePageContext()

    const updatedUnifiedContext = createPageUnifiedContext(data)

    if (props.config.afterDataFetchUnified) {
      await props.config.afterDataFetchUnified(updatedUnifiedContext)
    }

    if (props.config.afterDataFetch) {
      const transformedData = await props.config.afterDataFetch(data)
      if (transformedData !== undefined) {
        data = transformedData
        pageData.value = data
        updatePageContext()
      }
    }

    if (props.config.hooks?.onLoad) {
      await props.config.hooks.onLoad(data)
    }

    if (props.config.hooks?.afterLoad) {
      await props.config.hooks.afterLoad(data)
    }

  } catch (err) {
    error.value = err as Error
    console.error('Error loading page data:', err)
    
    if (props.config.hooks?.onError) {
      await props.config.hooks.onError(err)
    }
  } finally {
    isLoading.value = false
    updatePageContext()
  }
}

watch(() => route.params, async () => {
  if (props.config.contextConfig?.recordId === 'route') {
    await loadPageData()
  }
}, { deep: true })

onMounted(async () => {
  await loadPageData()
})
</script>
