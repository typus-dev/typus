<script setup lang="ts">
/**
 * @Tags component, dsx, renderer
 * Component renderer with context support
 * Extends dsxComponentRenderer with automatic data binding via blockContext
 */

import { defineProps, ref, onMounted, onUnmounted, markRaw, computed, h, watch, inject, ComputedRef, getCurrentInstance, isRef } from 'vue'

import type { dsxComponentConfig, ComponentSetupClass, BeforeRenderResult, UnifiedContext } from '@/dsx/types/'
import { logger } from '@/core/logging/logger'
import { useActiveTheme } from '@/shared/composables/useActiveTheme'

import dxButton from '@/components/ui/dxButton.vue' // : Import dxButton
import { getComponentName } from '@/shared/utils/componentUtils'

const props = defineProps<{ config: dsxComponentConfig & { dataValue?: string, _hasDataBinding?: boolean, transformer?: Record<string, { afterLoad: (value: any) => any; beforeSave: (value: any) => any; }> }, debug?:Boolean }>()

// Expose logger to template
const templateLogger = logger

// Define PageContext type
interface PageContext {
  state: {
    pageData: Record<string, any>;
    // Potentially other state properties
  };
  // Potentially other methods or properties
}

// : Interface for block state (matching useBlockContext)
interface BlockState {
  _contextInstanceId: string;
  data: {
    original: Record<string, any>;
    block: Record<string, any>;
    isChanged: boolean; // Computed property
  };
  ui: {
    isLoading: boolean;
    isActionLoading: boolean;
    isAnyLoading: boolean; // Computed property
  };
  errors: Record<string, any>;
  mode: string;
}

// Define block context type
interface BlockContext {
  record: Record<string, any>;
  state: BlockState; // Use the defined BlockState interface
  methods: {
    loadData: (id: string | number) => Promise<any>;
    saveData: () => Promise<any>;
    clearChanges: () => void;
    resetToOriginal: () => void;
    validateData: () => boolean;
  };
}

// Get block context if available
const blockContext = inject<BlockContext | null>('blockContext', null)
// Get page context if available
const pageContext = inject<PageContext | null>('pageContext', null);

// Theme management
const activeTheme = useActiveTheme()

// Render key for theme changes
const renderKey = ref(0)

// Component resolution
const resolvedType = markRaw(props.config.type)
const isHtmlElement = typeof props.config.type === 'string';
const componentTag = isHtmlElement ? props.config.type : resolvedType;
const resolvedComponentName = getComponentName(props.config.type)

const instance = getCurrentInstance()
const componentId = props.config.id || `${resolvedComponentName}-${instance?.uid}`

// Watch theme changes and force re-render
watch(activeTheme, () => {
  logger.debug('[dsxComponentRendererWithContext] Theme changed, forcing re-render', {
    newTheme: activeTheme.value,
    componentId
  })
  renderKey.value++
  processBeforeRender()
})

// Validate configuration
if (!props.config.type) {
  logger.warn('[dsxComponentRendererWithContext] Component has no type defined', {
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
  logger.warn('[dsxComponentRendererWithContext] Data-driven component has no dataSource', {
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

// For preserving data binding through processBeforeRender
let boundModelValue: ComputedRef<any> | undefined = undefined;
let boundUpdateModelValueHandler: ((value: any) => void) | undefined = undefined;

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
  logger.debug('[dsxComponentRendererWithContext] onMounted', {
    componentName: resolvedComponentName,
    componentId: componentId,
    hasSetup: !!props.config.setup,
    hasDataSource: !!props.config.dataSource,
    hasDataValue: !!props.config.dataValue,
    hasBlockContext: !!blockContext,
    currentTheme: activeTheme.value
  })



  // Process setup if available
  if (props.config.setup) {
    try {
      if (typeof props.config.setup === 'function') {
        logger.debug('[dsxComponentRendererWithContext] Applying function setup')
        const setupResult = props.config.setup() as Partial<dsxComponentConfig>
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(currentConfig.value, setupResult)
        }
      } else if (typeof props.config.setup === 'object' && typeof props.config.setup.setup === 'function') {
        logger.debug('[dsxComponentRendererWithContext] Applying class setup')
        setupInstance.value = props.config.setup as ComponentSetupClass
        const setupResult = setupInstance.value.setup() as Partial<dsxComponentConfig>
        if (setupResult && typeof setupResult === 'object') {
          Object.assign(currentConfig.value, setupResult)
        }

        if (setupInstance.value.onMounted) {
          logger.debug('[dsxComponentRendererWithContext] Calling setup.onMounted')
          await setupInstance.value.onMounted()
        }

        if (setupInstance.value.beforeLoad) {
          logger.debug('[dsxComponentRendererWithContext] Calling setup.beforeLoad')
          // @ts-ignore
          await setupInstance.value.beforeLoad(currentConfig.value)
        }
      }
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] Error applying setup:', { errorDetail: error })
    }
  }

  // Apply data binding if component has dataValue and blockContext
  if (props.config.dataValue && blockContext) {
    logger.debug('[dsxComponentRendererWithContext] Setting up data binding', {
      componentId: componentId,
      dataValue: props.config.dataValue
    })

    setupDataBinding()
  }

  logger.debug('[dsxComponentRendererWithContext] Loading data')
  await loadData()
})

// Setup data binding with blockContext
const setupDataBinding = () => {
 logger.debug('[dsxComponentRendererWithContext] setupDataBinding', {
   componentId: componentId,
   dataValue: props?.config?.dataValue
 });
 
 if (!props.config.dataValue || !blockContext) return;

 // Ensure props and events objects exist
 if (!currentConfig.value.props) {
   currentConfig.value.props = {};
 }
 if (!currentConfig.value.events) {
   currentConfig.value.events = {};
 }

 const dataValue = props.config.dataValue || '';

 // Get transformer from page context
 const pageTransformer = inject('transformer', null);
 console.log('[pageTransformer]',pageTransformer)

 // Computed modelValue from context
const localComputedModelValue = computed(() => {
  let value;
  if (blockContext && dataValue) {
    value = blockContext.record[dataValue];
  } else if (pageContext && pageContext.state && dataValue) {
    value = pageContext.state.pageData?.[dataValue];
  }

  logger.debug('[dsxComponentRendererWithContext] modelValue computed', {
    componentId: componentId,
    dataValue: dataValue,
    rawValue: value,
    hasTransformer: !!props.config.transformer,
    hasFieldTransformer: !!(props.config.transformer?.[dataValue]),
    hasAfterLoad: !!(props.config.transformer?.[dataValue]?.afterLoad),
    hasAfterDataFetch: !!props.config.afterDataFetch,
    hasPageTransformer: !!pageTransformer,
    hasPageFieldTransformer: !!(pageTransformer?.[dataValue])
  });
  
  // Apply afterDataFetch transformation if exists
  if (value !== undefined && props.config.afterDataFetch) {
    try {
      const transformed = props.config.afterDataFetch(value, props.config);
      logger.debug('[dsxComponentRendererWithContext] Applied afterDataFetch', {
        componentId: componentId,
        originalValue: value,
        transformedValue: transformed
      });
      return transformed !== undefined ? transformed : value;
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] afterDataFetch error:', error);
      return value;
    }
  }
  
  // Apply page transformer.afterLoad if exists for the specific field (priority)
  if (value !== undefined && dataValue && pageTransformer?.[dataValue]?.afterLoad) {
    try {
      const transformed = pageTransformer[dataValue].afterLoad(value);
      logger.debug('[dsxComponentRendererWithContext] Applied page transformer.afterLoad', {
        componentId: componentId,
        dataValue: dataValue,
        originalValue: value,
        transformedValue: transformed
      });
      return transformed !== undefined ? transformed : value;
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] page transformer.afterLoad error:', error);
      return value;
    }
  }
  
  // Apply component transformer.afterLoad if exists for the specific field
  if (value !== undefined && dataValue && props.config.transformer?.[dataValue]?.afterLoad) {
    try {
      const transformed = props.config.transformer[dataValue].afterLoad(value);
      logger.debug('[dsxComponentRendererWithContext] Applied component transformer.afterLoad', {
        componentId: componentId,
        dataValue: dataValue,
        originalValue: value,
        transformedValue: transformed
      });
      return transformed !== undefined ? transformed : value;
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] component transformer.afterLoad error:', error);
      return value;
    }
  }

  logger.debug('[dsxComponentRendererWithContext] No transformation applied', {
    componentId: componentId,
    dataValue: dataValue,
    finalValue: value
  });
  return value;
});
 
 currentConfig.value.props.modelValue = localComputedModelValue;
 boundModelValue = localComputedModelValue;

 logger.debug('[dsxComponentRendererWithContext] Setting computed modelValue prop', {
   componentId: componentId,
   dataValue: dataValue
 });

 // Store original handler if it exists
 const originalHandler = currentConfig.value.events['update:modelValue'];

 // Create combined update handler
 const localUpdateModelValueHandler = (value: any) => {
   logger.debug(`[dsxComponentRendererWithContext] update:modelValue triggered`, { 
     _contextInstanceId: blockContext.state._contextInstanceId,
     componentId, 
     dataValue, 
     value,
     mode: blockContext?.state?.mode 
   });
   
   // Apply page transformer.beforeSave if exists for the specific field (priority)
   let transformedValue = value;
   if (pageTransformer?.[dataValue]?.beforeSave) {
     try {
       transformedValue = pageTransformer[dataValue].beforeSave(value);
       logger.debug(`[dsxComponentRendererWithContext] Applied page beforeSave transformer`, {
         originalValue: value,
         transformedValue: transformedValue,
         dataValue: dataValue
       });
     } catch (error) {
       logger.error('[dsxComponentRendererWithContext] page transformer.beforeSave error:', error);
       transformedValue = value; // fallback to original value
     }
   }
   // Apply component transformer.beforeSave if exists for the specific field
   else if (props.config.transformer?.[dataValue]?.beforeSave) {
     try {
       transformedValue = props.config.transformer[dataValue].beforeSave(value);
       logger.debug(`[dsxComponentRendererWithContext] Applied component beforeSave transformer`, {
         originalValue: value,
         transformedValue: transformedValue,
         dataValue: dataValue
       });
     } catch (error) {
       logger.error('[dsxComponentRendererWithContext] component transformer.beforeSave error:', error);
       transformedValue = value; // fallback to original value
     }
   }
   
   // Standard data binding logic
   if (blockContext && dataValue) {
     blockContext.state.data.block[dataValue] = transformedValue;
     
     logger.debug(`[dsxComponentRendererWithContext] blockContext.state.data.block[dataValue] After update:`, {
       blockValue: blockContext.state.data.block[dataValue]
     });
   }
   
   // Call original handler if it exists
   if (originalHandler && typeof originalHandler === 'function') {
     const ctx = {
       blockId: injectedBlockId,
       componentId,
       model: injectedModel,
       blockContext,
       pageContext,
       save: () => blockContext?.methods?.saveData(),
       reload: () => blockContext?.methods?.loadData(blockContext.state.data.original?.id),
       validate: () => blockContext?.methods?.validateData()
     };
     
     logger.debug('[dsxComponentRendererWithContext] Calling original update:modelValue handler', {
       componentId,
       hasOriginalHandler: true
     });
     
     originalHandler(ctx, value);
   }
 };
 
 currentConfig.value.events['update:modelValue'] = localUpdateModelValueHandler;
 boundUpdateModelValueHandler = localUpdateModelValueHandler;
};

// Cleanup on unmount
onUnmounted(async () => {
  logger.debug('[dsxComponentRendererWithContext] onUnmounted', {
    componentName: resolvedComponentName,
    componentId: componentId
  })

  
  if (setupInstance.value?.beforeUnload) {
    try {
      logger.debug('[dsxComponentRendererWithContext] Calling setup.beforeUnload')
      await setupInstance.value.beforeUnload()
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] Error in beforeUnload:', { errorDetail: error })
    }
  }
})

// Load data with handlers
const loadData = async () => {
  // @ts-ignore
  let config = currentConfig.value

  logger.debug('[dsxComponentRendererWithContext] Loading data', {
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
      logger.debug('[dsxComponentRendererWithContext] Calling setup.beforeDataFetch')
      // @ts-ignore
      const modifiedConfig = await setupInstance.value.beforeDataFetch(config) as dsxComponentConfig
      if (modifiedConfig && typeof modifiedConfig === 'object') {
        logger.debug('[dsxComponentRendererWithContext] Config modified by setup.beforeDataFetch')
        config = modifiedConfig
        currentConfig.value = modifiedConfig
      }
    } else if (typeof config.beforeDataFetch === 'function') {
      logger.debug('[dsxComponentRendererWithContext] Calling direct beforeDataFetch')
      // @ts-ignore
      const modifiedConfig = await config.beforeDataFetch(config) as dsxComponentConfig
      if (modifiedConfig && typeof modifiedConfig === 'object') {
        logger.debug('[dsxComponentRendererWithContext] Config modified by direct beforeDataFetch')
        config = modifiedConfig
        currentConfig.value = modifiedConfig
      }
    }
  } catch (error) {
    logger.error('[dsxComponentRendererWithContext] Error in beforeDataFetch handler:', { errorDetail: error })
  }

  // Load data from dataSource
  let data
  try {
    if (typeof config.dataSource === 'function') {
      logger.debug('[dsxComponentRendererWithContext] Executing function dataSource', {
        componentName: resolvedComponentName,
        componentId: componentId,
        dataSourceFunction: config.dataSource.toString().substring(0, 200) + '...'
      })

      data = await config.dataSource()

      logger.debug('[dsxComponentRendererWithContext] Data received from function', {
        dataType: typeof data,
        isNull: data === null,
        isUndefined: data === undefined,
        isArray: Array.isArray(data),
        isObject: typeof data === 'object' && data !== null && !Array.isArray(data),
        value: data
      })
    } else if (config.dataSource) {
      logger.debug('[dsxComponentRendererWithContext] Using static dataSource')
      data = config.dataSource
      logger.debug('[dsxComponentRendererWithContext] Static data value', { data })
    } else {
      logger.debug('[dsxComponentRendererWithContext] No dataSource provided')
    }
  } catch (error) {
    logger.error('[dsxComponentRendererWithContext] Error loading data:', { errorDetail: error })
    data = null
  }

  // afterDataFetch handler
  if (data !== undefined) {
    try {
      if (setupInstance.value?.afterDataFetch) {
        logger.debug('[dsxComponentRendererWithContext] Calling setup.afterDataFetch')
        // @ts-ignore
        const modifiedData = await setupInstance.value.afterDataFetch(data, config)
        if (modifiedData !== undefined) {
          logger.debug('[dsxComponentRendererWithContext] Data modified by setup.afterDataFetch', {
            originalDataType: typeof data,
            modifiedDataType: typeof modifiedData,
            modifiedData
          })
          data = modifiedData
        }
      } else if (typeof config.afterDataFetch === 'function') {
        logger.debug('[dsxComponentRendererWithContext] Calling direct afterDataFetch')
        // @ts-ignore
        const modifiedData = await config.afterDataFetch(data, config)
        if (modifiedData !== undefined) {
          logger.debug('[dsxComponentRendererWithContext] Data modified by direct afterDataFetch', {
            originalDataType: typeof data,
            modifiedDataType: typeof modifiedData,
            modifiedData
          })
          data = modifiedData
        }
      }
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] Error in afterDataFetch handler:', { errorDetail: error })
    }
  }

  logger.debug('[dsxComponentRendererWithContext] Setting component data', {
    dataType: typeof data,
    isNull: data === null,
    isUndefined: data === undefined,
    finalData: data
  })
  componentData.value = data

  await processBeforeRender()
}

// Inject values once during setup
const injectedBlockId = inject('blockId');
const injectedModel = inject('model');

const processBeforeRender = async () => {
  const blockId = injectedBlockId;
  const model = injectedModel;
  let config = currentConfig.value;
  let data = componentData.value || blockContext?.state?.data?.block || {};

  logger.debug('[dsxComponentRendererWithContext] processBeforeRender', {
    componentName: resolvedComponentName,
    componentId,
    hasData: data !== undefined,
    hasSetupInstance: !!setupInstance.value,
    currentTheme: activeTheme.value
  });


  if (config.props?.columns) {
    console.log(`[${componentId}] Columns BEFORE processing:`, config.props.columns);
    console.log(`[${componentId}] Invalid columns:`, config.props.columns.filter(col => 
      !col || typeof col !== 'object' || !col.key || typeof col.key !== 'string'
    ));
  }

  // Run beforeRender handlers
  if (data !== undefined) {
    try {
      // Setup handler
      if (setupInstance.value?.beforeRender) {
        const result = await setupInstance.value.beforeRender(data, config);
        if (result?.config) config = result.config;
        if (result?.data !== undefined) {
          data = result.data;
          componentData.value = data;
        }
      }
      // Direct handler
      else if (typeof config.beforeRender === 'function') {
        const result = await config.beforeRender(data, config);
        if (result?.config) config = result.config;
        if (result?.data !== undefined) {
          data = result.data;
          componentData.value = data;
        }
      }
      // Auto-inject data for data-driven components
      else {
    const componentName = typeof config.type === 'string'  ? config.type.toLowerCase()  : getComponentName(config.type).toLowerCase()
        const isDataDriven = ['chart', 'table', 'grid', 'list'].some(t =>
          componentName.toLowerCase().includes(t));

        if (isDataDriven) {
          if (!config.props) config.props = {};
          config.props.data = data;
        }
      }
    } catch (error) {
      logger.error('[dsxComponentRendererWithContext] beforeRender error:', { error });
    }
  }


  if (config.props?.columns) {
    console.log(`[${componentId}] Columns AFTER handlers:`, config.props.columns);
  }

  // Process events with proper data passing
  const newProcessedEvents: Record<string, Function> = {};
  if (props.config.events) {
    for (const [eventName, propsOriginalHandler] of Object.entries(props.config.events)) {
      if (typeof propsOriginalHandler === 'function') {
        if (['create', 'update', 'delete', 'row-click'].includes(eventName)) {
          newProcessedEvents[eventName] = ((...args: any[]) => {
            const componentMethodContext = {
              componentId,
              refreshDataSource: async () => {
                logger.debug(`[dsxComponentRendererContext][${componentId}] refreshDataSource called via event handler context`);
                await loadData();
              },
            };
            return propsOriginalHandler(componentMethodContext, ...args);
          });
        } else if (eventName === 'update:modelValue' && propsOriginalHandler === boundUpdateModelValueHandler) {
          newProcessedEvents[eventName] = propsOriginalHandler;
        } else {
          newProcessedEvents[eventName] = ((...args: any[]) => {
            const ctx = {
              blockId: injectedBlockId,
              componentId,
              model: injectedModel,
              blockContext,
              pageContext,
              save: () => blockContext?.methods?.saveData(),
              reload: () => blockContext?.methods?.loadData(blockContext.state.data.original?.id),
              validate: () => blockContext?.methods?.validateData()
            };
            return propsOriginalHandler(ctx, ...args);
          });
        }
      } else {
        newProcessedEvents[eventName] = propsOriginalHandler;
      }
    }
  }
  config.events = newProcessedEvents;

  // Theme enhancement
  config = enhanceConfigWithTheme(config);

  // Process all props (resolve functions and unwrap refs)
  const processedProps: Record<string, any> = {};
  if (config.props) {
    for (const [name, value] of Object.entries(config.props)) {
      if (typeof value === 'function') {
        const ctx = {
          blockId,
          componentId,
          model,
          blockContext,
          pageContext,
          state: blockContext?.state
        };
        const result = value(ctx);
        logger.debug('[dsxComponentRendererWithContext] Function prop executed', { name, result });
        processedProps[name] = result;
      } else if (isRef(value)) {
        processedProps[name] = value.value;
      } else {
        processedProps[name] = value;
      }
    }
  }

  if (processedProps.columns && Array.isArray(processedProps.columns)) {
    console.log(`[${componentId}] Columns BEFORE validation:`, processedProps.columns);
    
    const validColumns = processedProps.columns.filter((col, index) => {
      const isValid = col && typeof col === 'object' && col.key && typeof col.key === 'string';
      if (!isValid) {
        console.warn(`[${componentId}] Invalid column at index ${index}:`, col);
      }
      return isValid;
    });
    
    if (validColumns.length !== processedProps.columns.length) {
      console.warn(`[${componentId}] Filtered out ${processedProps.columns.length - validColumns.length} invalid columns`);
    }
    
    if (validColumns.length === 0) {
      console.error(`[${componentId}] All columns were invalid! Original:`, processedProps.columns);
    }
    
    processedProps.columns = validColumns;
    console.log(`[${componentId}] Columns AFTER validation:`, processedProps.columns);
  }

  logger.debug('[dsxComponentRendererWithContext] Processed props', { componentId, processedProps });

  //TODO rewrite with event bus
  if (currentConfig.value.type === dxButton && processedProps.isSubmitButton) {
    window.addEventListener('pageContextChanged', (event) => {
      renderKey.value++;
      processBeforeRender();
    });
  }

  // Handle dxButton with processed props
  if (config.type === dxButton && blockContext) {
    logger.debug('[dsxComponentRendererWithContext] Processing dxButton props', { processedProps });
    logger.debug('[dsxComponentRendererWithContext] BlockContext state', { isChanged: blockContext.state.data.isChanged });
    processedProps.loading = blockContext.state.ui.isActionLoading;
    
    if (processedProps.isSubmitButton) {
      //TODO commented becuase of wrond behavior during form creation
      //processedProps.disabled = !blockContext.state.data.isChanged || blockContext.state.ui.isActionLoading;
    } else {
      //TODO commented because of wrong behavior during form creation
      //  processedProps.disabled = blockContext.state.ui.isActionLoading;
    }
  }

  // Replace config.props with processed props
  config.props = processedProps;

  // Preserve data binding
  if (props.config.dataValue && blockContext) {
    if (boundModelValue) {
      config.props.modelValue = boundModelValue;
    }
    if (boundUpdateModelValueHandler) {
      config.events['update:modelValue'] = boundUpdateModelValueHandler;
    }
  }

  logger.debug('[dsxComponentRendererWithContext] Final processed config', { 
    componentId,
    propsTypes: Object.entries(config.props || {}).map(([k,v]) => ({ [k]: typeof v }))
  });
  processedConfig.value = config;
};

// Computed property for processed component props - handles reactive updates
const processedProps = computed(() => {
  // Only process props for dxButton with blockContext
  if (currentConfig.value.type === dxButton && blockContext && processedConfig.value.props) {
    const props: Record<string, any> = { ...processedConfig.value.props }; // Explicitly type props
    
    // Always bind loading state
    props.loading = blockContext.state.ui.isActionLoading;
    
    // Evaluate disabled if it's a function
    if (typeof props.disabled === 'function') {
      const ctx = {
        blockId: injectedBlockId,
        componentId,
        model: injectedModel,
        blockContext,
        pageContext,
        state: blockContext?.state
      };
      //TODO commented because of wrong behavior during form creation
      //props.disabled = props.disabled(ctx);
    } else if (props.disabled === undefined) {
      // Default disabled state if not provided
      //TODO commented because of wrong behavior during form creation
      //props.disabled = !blockContext.state.data.isChanged || blockContext.state.ui.isActionLoading;
    }
    
    return props;
  }
  
  // Return original props for non-button components
  return processedConfig.value.props;
});

// Watch data changes
watch(componentData, async () => {
  logger.debug('[dsxComponentRendererWithContext] componentData changed, triggering processBeforeRender')
  await processBeforeRender()
}, { immediate: false })

// Watch for blockContext changes and reprocess if component uses dxButton
watch(
  //() => blockContext?.state?.data?.isChanged,
  () => blockContext,
  () => {

    logger.debug('[dsxComponentRendererWithContext] BlockContext data changed, reprocessing componentId:', { componentId });
    logger.debug('[dsxComponentRendererWithContext] BlockContext data changed, reprocessing currentConfig_value_type:', { currentConfig_value_type: currentConfig.value.type });
    if (currentConfig.value.type === dxButton) {
      logger.debug('[dsxComponentRendererWithContext] BlockContext isChanged state changed, reprocessing', { componentId });
      processBeforeRender();
    }
  },
  {deep: true} // Deep watch for object changes
);

watch(
  () => blockContext?.state?.ui?.isActionLoading,
  () => {
    if (currentConfig.value.type === dxButton) {
      logger.debug('[dsxComponentRendererWithContext] BlockContext isActionLoading state changed, reprocessing', { componentId });
      processBeforeRender();
    }
  }
);

// Generate slots
const slots = computed(() => {
  logger.debug('[dsxComponentRendererWithContext] Generating slots')
  // @ts-ignore
  const rawSlots = processedConfig.value.slots || {}
  const result: Record<string, () => any> = {}
  const data = componentData.value

  for (const [name, content] of Object.entries(rawSlots)) {
    result[name] = () => {
      if (typeof content === 'function') {
        const slotContent = content(data)
        logger.debug('[dsxComponentRendererWithContext] Generated dynamic slot content', {
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
    logger.debug('[dsxComponentRendererWithContext] Creating default slot with component data')
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
<!--   :key="`${componentId}-${renderKey}-${JSON.stringify(processedConfig.props?.modelValue)}`" -->
<template>
  <div :class="wrapperClass" :data-theme="activeTheme || undefined">
    <component v-if="componentData !== undefined || !props.config.dataSource" 
      :key="`${componentId}-${renderKey}`"
      ref="componentRef" 
      :is="componentTag" 
      v-bind="processedProps" 
      v-on="processedConfig.events || {}">
      <template v-for="(renderFn, name) in slots" :key="name" #[name]>
        <component :is="renderFn" />
      </template>
    </component>
    <div v-else>
      <!-- Loading placeholder -->
    </div>
   <div v-if="debug && props.config.dataValue" 
       class="debug-overlay" 
       style="display:none; position:absolute; background:rgba(0,0,0,0.8); color:white; padding:5px; z-index:1000; border-radius:4px; font-size:10px; max-width:300px;">
    <strong>Component Debug Info</strong><br>
    field: {{ props.config.dataValue }}<br>
    value: {{ processedConfig.props?.modelValue ? String(processedConfig.props?.modelValue).slice(0, 100) : '' }}<br>
    context type: {{ blockContext?.state._contextInstanceId?.includes('shared') ? 'shared' : 'isolated' }}<br>
    context id: {{ blockContext?.state._contextInstanceId || 'unknown' }}<br>
    original: {{ blockContext?.state?.data?.original?.[props.config.dataValue] ? String(blockContext?.state?.data?.original?.[props.config.dataValue]).slice(0, 100) : '' }}<br>
    current: {{ blockContext?.state?.data?.block?.[props.config.dataValue] ? String(blockContext?.state?.data?.block?.[props.config.dataValue]).slice(0, 100) : '' }}<br>
    changed: {{ blockContext?.state?.data?.isChanged }}
  </div>
  </div>
</template>

<style scoped>
.dsx-component-wrapper:hover .debug-overlay {
  display: block !important;
}

.debug-overlay {
 display: none;
 background-color: rgba(8, 84, 5, 0.8);
 font-size: 10px;
 padding: 4px;
 color: rgb(246, 244, 244);
 position: absolute;
 top: 0;
 right: 0;
 z-index: 999;
 max-width: 300px;
 overflow: hidden;
 word-break: break-all;
 border: 1px solid #fcc;
}

.dsx-component-wrapper:hover .debug-overlay {
 display: block !important;
}
</style>
