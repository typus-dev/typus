<script setup lang="ts">
import { defineProps, ref, onMounted, onUnmounted, markRaw, computed, h, watch, inject, toRef } from 'vue'
import type { dsxComponentConfig, ComponentSetupClass, BeforeRenderResult } from '@/dsx/types/'
import dxInput from '@/components/ui/dxInput.vue'
import dxSelect from '@/components/ui/dxSelect'
import dxTextArea from '@/components/ui/dxTextArea.vue'
import { getComponentName } from '@/shared/utils/componentUtils'
import { useActiveTheme } from '@/shared/composables/useActiveTheme'

const props = defineProps<{ config: dsxComponentConfig }>()

// Expose logger to template
const templateLogger = logger

const activeTheme = useActiveTheme()

// Render key for theme changes
const renderKey = ref(0)

// Component resolution
const resolvedType = markRaw(props.config.type)

    const resolvedComponentName = typeof props.config.type === 'string' 
  ? props.config.type.toLowerCase() 
  : getComponentName(props.config.type).toLowerCase()

const instance = getCurrentInstance()
const componentId = props.config.id || `${resolvedComponentName}-${instance?.uid}`


watch(activeTheme, () => {
  logger.debug('[dsxComponentRenderer] Theme changed, forcing re-render', {
    newTheme: activeTheme.value,
    componentId
  })
  renderKey.value++
  processBeforeRender()
})

// Validate configuration
if (!props.config.type) {
  logger.warn('[dsxComponentRenderer] Component has no type defined', {
    componentId: componentId
  })
}

// Check data-driven components
const isDataDrivenComponent = 
  resolvedComponentName.toLowerCase().includes('chart') || 
  resolvedComponentName.toLowerCase().includes('table') || 
  resolvedComponentName.toLowerCase().includes('grid') || 
  resolvedComponentName.toLowerCase().includes('list')

if (isDataDrivenComponent && !props.config.dataSource) {
  logger.warn('[dsxComponentRenderer] Data-driven component has no dataSource', {
    componentId: componentId,
    componentName: resolvedComponentName
  })
}

// Component state
const componentRef = ref()
const componentData = ref()
const currentConfig = ref({ ...props.config })
const setupInstance = ref<ComponentSetupClass | null>(null)
const processedConfig = ref(currentConfig.value)

// Enhance config with theme
const enhanceConfigWithTheme = (config: dsxComponentConfig) => {
  const themeName = activeTheme.value || undefined
  return {
    ...config,
    props: {
      ...config.props,
      theme: themeName,
      'data-theme': themeName
    }
  }
}

// Process setup and load data
onMounted(async () => {
  logger.debug('[dsxComponentRenderer] onMounted', { 
    componentName: resolvedComponentName,
    componentId: componentId,
    hasSetup: !!props.config.setup,
    hasDataSource: !!props.config.dataSource,
    currentTheme: activeTheme.value
  })
  
  // Process setup if available
  if (props.config.setup) {
    try {
      if (typeof props.config.setup === 'function') {
        logger.debug('[dsxComponentRenderer] Applying function setup')
        const setupResult = props.config.setup() as Partial<dsxComponentConfig>
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(currentConfig.value, setupResult)
        }
      } else if (typeof props.config.setup === 'object' && typeof props.config.setup.setup === 'function') {
        logger.debug('[dsxComponentRenderer] Applying class setup')
        setupInstance.value = props.config.setup as ComponentSetupClass
        const setupResult = setupInstance.value.setup() as Partial<dsxComponentConfig>
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(currentConfig.value, setupResult)
        }
        
        if (setupInstance.value.onMounted) {
          logger.debug('[dsxComponentRenderer] Calling setup.onMounted')
          await setupInstance.value.onMounted()
        }
        
        if (setupInstance.value.beforeLoad) {
          logger.debug('[dsxComponentRenderer] Calling setup.beforeLoad')
          // @ts-ignore
          await setupInstance.value.beforeLoad(currentConfig.value)
        }
      }
    } catch (error) {
      logger.error('[dsxComponentRenderer] Error applying setup:', { errorDetail: error })
    }
  }
  
  logger.debug('[dsxComponentRenderer] Loading data')
  await loadData()
})

// Cleanup on unmount
onUnmounted(async () => {
  logger.debug('[dsxComponentRenderer] onUnmounted', {
    componentName: resolvedComponentName,
    componentId: componentId
  })
  
  if (setupInstance.value?.beforeUnload) {
    try {
      logger.debug('[dsxComponentRenderer] Calling setup.beforeUnload')
      await setupInstance.value.beforeUnload()
    } catch (error) {
      logger.error('[dsxComponentRenderer] Error in beforeUnload:', { errorDetail: error })
    }
  }
})

// Load data with handlers
const loadData = async () => {
  // @ts-ignore
  let config = currentConfig.value
  
  logger.debug('[dsxComponentRenderer] Loading data', { 
    componentName: resolvedComponentName,
    componentId: componentId,
    hasSetupInstance: !!setupInstance.value,
    hasDirectBeforeDataFetch: typeof config.beforeDataFetch === 'function',
    hasDataSource: !!config.dataSource,
    dataSourceType: config.dataSource ? (typeof config.dataSource === 'function' ? 'function' : 'static') : 'none'
  })
  
  // beforeDataFetch handler
  try {
    if (setupInstance.value?.beforeDataFetch) {
      logger.debug('[dsxComponentRenderer] Calling setup.beforeDataFetch')
      // @ts-ignore
      const modifiedConfig = await setupInstance.value.beforeDataFetch(config) as dsxComponentConfig
      if (modifiedConfig && typeof modifiedConfig === 'object') {
        logger.debug('[dsxComponentRenderer] Config modified by setup.beforeDataFetch')
        config = modifiedConfig
        currentConfig.value = modifiedConfig
      }
    } else if (typeof config.beforeDataFetch === 'function') {
      logger.debug('[dsxComponentRenderer] Calling direct beforeDataFetch')
      // @ts-ignore
      const modifiedConfig = await config.beforeDataFetch(config) as dsxComponentConfig
      if (modifiedConfig && typeof modifiedConfig === 'object') {
        logger.debug('[dsxComponentRenderer] Config modified by direct beforeDataFetch')
        config = modifiedConfig
        currentConfig.value = modifiedConfig
      }
    }
  } catch (error) {
    logger.error('[dsxComponentRenderer] Error in beforeDataFetch handler:', { errorDetail: error })
  }
  
  // Load data from dataSource
  let data
  try {
    if (typeof config.dataSource === 'function') {
      logger.debug('[dsxComponentRenderer] Executing function dataSource', {
        componentName: resolvedComponentName,
        componentId: componentId,
        dataSourceFunction: config.dataSource.toString().substring(0, 200) + '...'
      })
      
      data = await config.dataSource()
      
      logger.debug('[dsxComponentRenderer] Data received from function', { 
        dataType: typeof data,
        isNull: data === null,
        isUndefined: data === undefined,
        isArray: Array.isArray(data),
        isObject: typeof data === 'object' && data !== null && !Array.isArray(data),
        value: data
      })
    } else if (config.dataSource) {
      logger.debug('[dsxComponentRenderer] Using static dataSource')
      data = config.dataSource
      logger.debug('[dsxComponentRenderer] Static data value', { data })
    } else {
      logger.debug('[dsxComponentRenderer] No dataSource provided')
    }
  } catch (error) {
    logger.error('[dsxComponentRenderer] Error loading data:', { errorDetail: error })
    data = null
  }
  
  // afterDataFetch handler
  if (data !== undefined) {
    try {
      if (setupInstance.value?.afterDataFetch) {
        logger.debug('[dsxComponentRenderer] Calling setup.afterDataFetch')
        // @ts-ignore
        const modifiedData = await setupInstance.value.afterDataFetch(data, config)
        if (modifiedData !== undefined) {
          logger.debug('[dsxComponentRenderer] Data modified by setup.afterDataFetch', { 
            originalDataType: typeof data,
            modifiedDataType: typeof modifiedData,
            modifiedData
          })
          data = modifiedData
        }
      } else if (typeof config.afterDataFetch === 'function') {
        logger.debug('[dsxComponentRenderer] Calling direct afterDataFetch')
        // @ts-ignore
        const modifiedData = await config.afterDataFetch(data, config)
        if (modifiedData !== undefined) {
          logger.debug('[dsxComponentRenderer] Data modified by direct afterDataFetch', {
            originalDataType: typeof data,
            modifiedDataType: typeof modifiedData,
            modifiedData
          })
          data = modifiedData
        }
      }
    } catch (error) {
      logger.error('[dsxComponentRenderer] Error in afterDataFetch handler:', { errorDetail: error })
    }
  }
  
  logger.debug('[dsxComponentRenderer] Setting component data', { 
    dataType: typeof data,
    isNull: data === null,
    isUndefined: data === undefined,
    finalData: data
  })
  componentData.value = data
  
  await processBeforeRender()
}

// Process beforeRender handlers and prepare final configuration
const processBeforeRender = async () => {
  // @ts-ignore
  let config = currentConfig.value
  let data = componentData.value
  
  logger.debug('[dsxComponentRenderer] processBeforeRender started', { 
    componentName: resolvedComponentName,
    componentId: componentId,
    hasData: data !== undefined,
    hasSetupInstance: !!setupInstance.value,
    hasDirectBeforeRender: typeof config.beforeRender === 'function',
    currentTheme: activeTheme.value
  })
  
  if (data !== undefined) {
    try {
      if (setupInstance.value?.beforeRender) {
        logger.debug('[dsxComponentRenderer] Calling setup.beforeRender')
        // @ts-ignore
        const result = await setupInstance.value.beforeRender(data, config) as BeforeRenderResult
        if (result && typeof result === 'object') {
          if (result.config && typeof result.config === 'object') {
            logger.debug('[dsxComponentRenderer] Config modified by setup.beforeRender')
            config = result.config
          }
          if (result.data !== undefined) {
            logger.debug('[dsxComponentRenderer] Data modified by setup.beforeRender', {
              originalData: data,
              modifiedData: result.data
            })
            data = result.data
            componentData.value = data
          }
        }
      } else if (typeof config.beforeRender === 'function') {
        logger.debug('[dsxComponentRenderer] Calling direct beforeRender')
        // @ts-ignore
        const result = await config.beforeRender(data, config) as BeforeRenderResult
        if (result && typeof result === 'object') {
          if (result.config && typeof result.config === 'object') {
            logger.debug('[dsxComponentRenderer] Config modified by direct beforeRender')
            config = result.config
          }
          if (result.data !== undefined) {
            logger.debug('[dsxComponentRenderer] Data modified by direct beforeRender', {
              originalData: data,
              modifiedData: result.data
            })
            data = result.data
            componentData.value = data
          }
        }
      } else {
        // Auto-inject data for data-driven components
        const currentComponentName = getComponentName(config.type)
        // @ts-ignore - __name and displayName might not exist on all component types
        const componentDisplayName = config.type?.__name || config.type?.displayName || ''
        
        logger.debug('[dsxComponentRenderer] Component type detection details', {
          componentId: componentId,
          componentName: currentComponentName,
          componentDisplayName,
          componentConstructorName: config.type?.constructor?.name || '',
          componentType: typeof config.type,
          componentStringified: String(config.type),
          componentKeys: Object.keys(config.type || {}),
          componentProto: Object.getPrototypeOf(config.type || {})?.constructor?.name
        })
        
        const isDataDrivenComponent = 
          currentComponentName.toLowerCase().includes('chart') || 
          componentDisplayName.toLowerCase().includes('chart') ||
          currentComponentName.toLowerCase().includes('table') || 
          componentDisplayName.toLowerCase().includes('table') ||
          currentComponentName.toLowerCase().includes('grid') || 
          componentDisplayName.toLowerCase().includes('grid') ||
          currentComponentName.toLowerCase().includes('list') ||
          componentDisplayName.toLowerCase().includes('list') ||
          String(config.type).includes('Chart') ||
          String(config.type).includes('Table') ||
          String(config.type).includes('Grid') ||
          String(config.type).includes('List')
        
        const forceDataInjection = 
          config.id === 'chart-utilization' || 
          config.id === 'chart-geo' ||
          config.id === 'chart-activity' ||
          config.id === 'chart-churn' ||
          config.id === 'chart-auth-errors' ||
          config.id === 'chart-roles'
        
        logger.debug('[dsxComponentRenderer] Data injection decision', {
          componentId: componentId,
          isDataDrivenComponent,
          forceDataInjection,
          willInjectData: isDataDrivenComponent || forceDataInjection
        })
        
        if (isDataDrivenComponent || forceDataInjection) {
          logger.debug('[dsxComponentRenderer] Auto-injecting data into props', {
            componentId: componentId,
            componentName: currentComponentName,
            dataType: typeof data,
            dataKeys: data ? Object.keys(data) : [],
            data: data
          })
          
          if (!config.props) {
            config.props = {}
          }
          
          config.props.data = data
        }
      }
    } catch (error) {
      logger.error('[dsxComponentRenderer] Error in beforeRender handler:', { errorDetail: error })
    }
  }

  // Resolve prop functions
  if (config.props && typeof config.props === 'object' && componentData.value !== undefined) {
    logger.debug('[dsxComponentRenderer] Resolving function props with componentData', { props: Object.keys(config.props) })
    for (const propName in config.props) {
      if (Object.prototype.hasOwnProperty.call(config.props, propName)) {
        const propValue = config.props[propName]
        if (typeof propValue === 'function') {
          try {
            // @ts-ignore
            config.props[propName] = propValue(componentData.value)
            logger.debug(`[dsxComponentRenderer] Resolved prop "${propName}"`, { newValue: config.props[propName] })
          } catch (error) {
            logger.error(`[dsxComponentRenderer] Error resolving prop function "${propName}"`, { errorDetail: error })
            config.props[propName] = undefined
          }
        }
      }
    }
  }
  
  config = enhanceConfigWithTheme(config)
  
  logger.debug('[dsxComponentRenderer] Setting processed config with theme', {
    theme: activeTheme.value
  })
  // @ts-ignore
  processedConfig.value = config
}

// Watch data changes
watch(componentData, async () => {
  logger.debug('[dsxComponentRenderer] componentData changed, triggering processBeforeRender')
  await processBeforeRender()
}, { immediate: false })

// Generate slots
const slots = computed(() => {
  logger.debug('[dsxComponentRenderer] Generating slots')
  // @ts-ignore
  const rawSlots = processedConfig.value.slots || {}
  const result: Record<string, () => any> = {}
  const data = componentData.value

  for (const [name, content] of Object.entries(rawSlots)) {
    result[name] = () => {
      if (typeof content === 'function') {
        const slotContent = content(data)
        logger.debug('[dsxComponentRenderer] Generated dynamic slot content', { 
          slotName: name, 
          contentType: typeof slotContent,
          hasData: data !== undefined
        })
        return slotContent
      } 
      return h('div', {}, content)
    }
  }

  if (!result['default'] && data !== undefined && !rawSlots['default']) {
    logger.debug('[dsxComponentRenderer] Creating default slot with component data')
    result['default'] = () => {
      if (typeof data === 'string') {
        return data
      }
      return JSON.stringify(data)
    }
  }

  return result
})

// Wrapper class
const wrapperClass = computed(() => {
  const themeName = activeTheme.value
  return ['dsx-component-wrapper', themeName ? `theme-${themeName}` : ''].filter(Boolean).join(' ')
})
</script>

<template>
  <div :class="wrapperClass" :data-theme="activeTheme || undefined">
    {{ 
      (resolvedType === dxInput || resolvedType === dxSelect || resolvedType === dxTextArea) ? 
      templateLogger.debug('[dsxComponentRenderer] Props for form component:', { 
        componentName: resolvedComponentName, 
        props: processedConfig.props 
      }) : 
      '' 
    }}
    <component
      v-if="componentData !== undefined || !props.config.dataSource"
      :key="`${props.config.id}-${renderKey}`"
      ref="componentRef"
      :is="resolvedType"
      v-bind="processedConfig.props"
      v-on="processedConfig.events || {}"
    >
      <template
        v-for="(renderFn, name) in slots"
        :key="name"
        #[name]
      >
        <component :is="renderFn" />
      </template>
    </component>
    <div v-else>
      <!-- Loading placeholder -->
    </div>
  </div>
</template>

<style scoped>
.dsx-component-wrapper {
  color: inherit;
  background-color: inherit;
}
</style>
