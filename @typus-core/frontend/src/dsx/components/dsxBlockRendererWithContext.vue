<script setup lang="ts">
/**
 * @Tags component, dsx, block, renderer
 * Block renderer with context support
 * Extends dsxBlockRenderer with automatic data binding via blockContext
 */
import { computed, onMounted, ref, provide, watch } from 'vue';
import { useBlockContext } from '../composables/useBlockContext';
import { logger } from '@/core/logging/logger';
import type { Component } from 'vue';
import { FormMode } from '@dsl-shared/constants';
import { ContextScope } from '../types';

// @ts-ignore
import dsxComponentRendererWithContext from './dsxComponentRendererWithContext.vue';
import dxInput from '@/components/ui/dxInput.vue';
import dxDateTime from '@/components/ui/dxDateTime.vue';
import dxSelect from '@/components/ui/dxSelect';
import dxTextArea from '@/components/ui/dxTextArea.vue';
import dxButton from '@/components/ui/dxButton.vue';
import dxSwitch from '@/components/ui/dxSwitch.vue';
import dxChart from '@/components/charts/dxChart.vue';
import dxTable from '@/components/tables/dxTable/dxTable.vue';
import dxText from '@/components/ui/dxText.vue';
import dxRawHtml from '@/components/ui/dxRawHtml.vue';
import dxFormJSON from '@/components/ui/dxFormJSON.vue';


const components = {
  dxInput,
  dxSelect,
  dxTextArea,
  dxText,
  dxButton,
  dxSwitch,
  dxChart, 
  dxTable,
  dxRawHtml,
  dxFormJSON
};

// Define component config type
interface dsxComponentConfig {
  type: Component;
  id?: string;
  refKey?: string;
  props?: Record<string, any>;
  events?: Record<string, Function>;
  slots?: Record<string, any>;
  dataSource?: (() => Promise<any>) | (() => any) | any;
  dataValue?: string;
  _hasDataBinding?: boolean;
  beforeDataFetch?: (config: dsxComponentConfig) => Promise<dsxComponentConfig> | dsxComponentConfig;
  afterDataFetch?: (data: any, config: dsxComponentConfig) => Promise<any> | any;
  beforeRender?: (data: any, config: dsxComponentConfig) => Promise<any> | any;
  setup?: any;
  transformer?: Record<string, {
    afterLoad: (value: any) => any;
    beforeSave: (value: any) => any;
  }>;
}

// Define block config type
interface dsxBlockConfig {
  id: string;
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  align?: 'left' | 'center' | 'right' | 'stretch'; 
  justify?: 'start' | 'center' | 'end' | 'stretch'; 
  style?: Record<string, any>;
  class?: string;
  components: dsxComponentConfig[];
  dataSource?: (() => Promise<any>) | (() => any) | any;
}

// Extended block config type
interface ExtendedBlockConfig extends dsxBlockConfig {
  model?: string | Record<string, any>;
  mode?: FormMode;
  recordId?: string | number;
  fieldOverrides?: Record<string, {
    component: Component;
    props?: Record<string, any>;
    dataSource?: (() => Promise<any>) | (() => any) | any;
    afterDataFetch?: (data: any, config: dsxComponentConfig) => Promise<any> | any;
  }>;
  initialData?: Record<string, any>;
  contextScope?: ContextScope;
  contextKey?: string;
  // Block hooks
  beforeDataFetch?: () => Promise<void | false> | void | false;
  afterDataFetch?: (data: any) => Promise<any> | any;
  beforeDataUpdate?: (oldData: any, newData: any) => Promise<any | false> | any | false;
  afterDataUpdate?: (data: any) => Promise<void> | void;
  onDataError?: (error: any) => Promise<void> | void;
  fieldTransforms?: Record<string, (data: any) => any>;
  transformer?: Record<string, {
    afterLoad: (value: any) => any;
    beforeSave: (value: any) => any;
  }>;
}

const props = defineProps<{
  config: ExtendedBlockConfig,
  debug?: boolean
}>();

const isLoading = ref(true);

// Create block context if model is provided
const blockContext = props.config.model
  ? useBlockContext(
      typeof props.config.model === 'string'
        ? props.config.model
        : props.config.model.name,
      {
        mode: props.config.mode,
        recordId: props.config.recordId,
        modelObject: typeof props.config.model === 'object' ? props.config.model : undefined,
        initialData: props.config.initialData,
        contextScope: props.config.contextScope,
        contextKey: props.config.contextKey
      }
    )
  : null;

provide('blockId', props.config.id);
provide('model', props.config.model);

// Provide block context to child components
if (blockContext) {
  provide('blockContext', blockContext);
}


const processAllFields = () => {
 logger.debug('[dsxBlockRendererWithContext] processAllFields START', { blockId: props.config.id });
 const fields: dsxComponentConfig[] = [];

 // Get model object
 let modelObject = null;
 if (props.config.model && typeof props.config.model === 'object') {
   modelObject = props.config.model;
 } else if (blockContext && blockContext.state.modelObject) {
   modelObject = blockContext.state.modelObject;
 }

 if (!modelObject || !modelObject.fields) {
   logger.warn('[DSX] No model or fields found', { blockId: props.config.id });
   return fields;
 }

 for (const field of modelObject.fields) {
   // Check visibility
   if (!field.ui?.visibility || !Array.isArray(field.ui.visibility)) {
     logger.debug(`[DSX] Field "${field.name}" has no visibility config`);
     continue;
   }
   
   if (!field.ui.visibility.includes('form')) {
     logger.debug(`[DSX] Field "${field.name}" not visible in form context`);
     continue;
   }

   // Apply fieldFilter if specified
   if (props.config.fieldFilter && props.config.fieldFilter.length > 0) {
     if (!props.config.fieldFilter.includes(field.name)) {
       logger.debug(`[DSX] Field "${field.name}" filtered out by fieldFilter`);
       continue;
     }
   }

   const fieldName = field.name;
   const override = props.config.fieldOverrides?.[fieldName];

   if (override) {
     logger.debug(`[DSX] Using override for field "${fieldName}"`);
     const component: dsxComponentConfig = {
       type: override.component,
       id: `field-${fieldName}`,
       dataValue: fieldName,
       props: override.props || {},
       afterDataFetch: override.afterDataFetch,
       _hasDataBinding: true
     };

     if (override.dataSource) {
       component.dataSource = override.dataSource;
     }

     if (props.config.transformer) {
       (component as any).transformer = props.config.transformer;
     }

     fields.push(component);
   } else {
     // Auto-generate component
     if (!field.ui.component) {
       logger.warn(`[DSX] Field "${field.name}" has no component specified`);
       continue;
     }

     // Check if component is registered
     const componentType = components[field.ui.component as keyof typeof components];
     if (!componentType) {
       console.error(`[DSX] Component "${field.ui.component}" not registered for field "${field.name}". Available components:`, Object.keys(components));
       continue;
     }

     logger.debug(`[DSX] Auto-generating component for field "${fieldName}" with type "${field.ui.component}"`);

     const component: dsxComponentConfig = {
       type: componentType,
       id: `field-${fieldName}`,
       dataValue: fieldName,
       props: {
         label: field.ui.label,
         required: field.required,
         placeholder: field.ui.placeholder,
         ...(field.ui.props || {})
       },
       _hasDataBinding: true
     };

     // Handle dxSelect options
     if (field.ui.component === 'dxSelect') {
       component.props.options = field.ui.options || [];
       
       if (fieldName === 'parentId') {
         component.dataSource = async () => {
           try {
             const tasks = await DSL.DispatcherTask.findAll();
             return tasks.map(task => ({
               value: task.id,
               label: task.name
             }));
           } catch (error) {
             logger.error('Failed to load parent tasks', error);
             return [];
           }
         };
         
         component.afterDataFetch = (data, config) => {
           if (data && Array.isArray(data)) {
             config.props = config.props || {};
             config.props.options = data;
           }
           return data;
         };
       }
     }

     // Add transformer
     if (props.config.transformer) {
       (component as any).transformer = props.config.transformer;
     }

     fields.push(component);
   }
 }

 logger.debug(`[DSX] Generated ${fields.length} fields`, { 
   blockId: props.config.id,
   fieldNames: fields.map(f => f.dataValue)
 });

 return fields;
};
// Enhanced data passing to components
const componentsWithData = computed(() => {
  logger.debug('[dsxBlockRendererWithContext] Computing componentsWithData', { blockId: props.config.id });
  let components = [...(props.config.components || [])];


  if (!props.config.id) {
    logger.error('[dsxBlockRendererWithContext] Block missing required ID', { 
      config: props.config,
      hasComponents: components.length > 0 
    });
    console.error('[DSX] Block configuration error: missing required "id" field', props.config);
  }


  components.forEach((component, index) => {
    if (!component.type) {
      logger.error('[dsxBlockRendererWithContext] Component missing type', { 
        blockId: props.config.id, 
        componentIndex: index,
        component 
      });
      console.error(`[DSX] Component at index ${index} missing required "type" field in block "${props.config.id}"`, component);
    }
  });

  if (props.config.fieldFilter || props.config.fieldOverrides) {
    components = components.concat(processAllFields());
  }

  if (components.length === 0) {
    logger.warn('[dsxBlockRendererWithContext] No components to render', { blockId: props.config.id });
    return [];
  }

  return components.map((component: dsxComponentConfig, index) => {
    const enhancedComponent = { ...component };

    if (blockContext && component.dataValue) {
      enhancedComponent._hasDataBinding = true;
      
      if (props.config.fieldTransforms?.[component.dataValue]) {
        enhancedComponent.afterDataFetch = props.config.fieldTransforms[component.dataValue];
      }
    }

    if (props.config.transformer && !(enhancedComponent as any).transformer) {
      (enhancedComponent as any).transformer = props.config.transformer;
    }

    return enhancedComponent;
  });
});

// Enhanced loadData with hooks
const loadData = async () => {
  logger.debug('[dsxBlockRendererWithContext] loadData START', { blockId: props.config.id });
  
  try {
    // Call beforeDataFetch hook
    if (props.config.beforeDataFetch) {
      const shouldContinue = await props.config.beforeDataFetch();
      if (shouldContinue === false) {
        logger.debug('[dsxBlockRendererWithContext] beforeDataFetch returned false, aborting fetch');
        isLoading.value = false;
        return;
      }
    }

    let data = null;
    
    if (!blockContext && props.config.dataSource) {
      if (typeof props.config.dataSource === 'function') {
        data = await props.config.dataSource();
      } else {
        data = props.config.dataSource;
      }
    }

    // Call afterDataFetch hook
    if (data !== null && props.config.afterDataFetch) {
      const transformedData = await props.config.afterDataFetch(data);
      if (transformedData !== undefined) {
        data = transformedData;
      }
    }

    logger.debug('[dsxBlockRendererWithContext] Data fetched successfully', { 
      blockId: props.config.id, 
      hasData: data !== null 
    });

  } catch (error) {
    logger.error('[dsxBlockRendererWithContext] Error fetching data:', {
      blockId: props.config.id,
      error
    });
    
    // Call onDataError hook
    if (props.config.onDataError) {
      await props.config.onDataError(error);
    }
  } finally {
    isLoading.value = false;
    logger.debug('[dsxBlockRendererWithContext] loadData END', { blockId: props.config.id });
  }
};

// Add data update handling
const handleDataUpdate = async (oldData: any, newData: any) => {
  try {
    // Call beforeDataUpdate hook
    if (props.config.beforeDataUpdate) {
      const result = await props.config.beforeDataUpdate(oldData, newData);
      if (result === false) {
        logger.debug('[dsxBlockRendererWithContext] beforeDataUpdate returned false, aborting update');
        return false;
      }
      if (result !== undefined) {
        newData = result;
      }
    }

    // Perform the actual update (this would depend on your data update logic)
    // ...

    // Call afterDataUpdate hook
    if (props.config.afterDataUpdate) {
      await props.config.afterDataUpdate(newData);
    }

    return newData;
  } catch (error) {
    logger.error('[dsxBlockRendererWithContext] Error updating data:', {
      blockId: props.config.id,
      error
    });
    
    if (props.config.onDataError) {
      await props.config.onDataError(error);
    }
    
    throw error;
  }
};

// Define emits
const emit = defineEmits(['save-success', 'save-error', 'preview']);

onMounted(async () => {
  await loadData();
});

// Watch for dataSource changes
watch(() => props.config.dataSource, async () => {
  await loadData();
});

// Determine whether to wrap components
const shouldWrapComponents = computed(() => {
  logger.debug('[dsxBlockRendererWithContext] Computing shouldWrapComponents', { blockId: props.config.id });
  return props.config.components && props.config.components.length > 1;
});

const contextScopeType = computed(() => {
 if (!blockContext) return 'No Context';
 return blockContext.state._contextInstanceId.includes('shared') ? 'SHARED' : 'ISOLATED';
});

// Format value for display
function formatValue(value: any): string {
  const stringValue = String(value || '');
  return stringValue.length > 15 ? stringValue.substring(0, 15) + '...' : stringValue;
}

</script>

<template>
 <div v-if="isLoading" class="flex justify-center items-center h-32">
   <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
 </div>

 <template v-else>
   <div 
     :class="{'debug-block': debug || $route.query.debug === 'true'}" 
     class="relative w-full"
   >
     <!-- Debug toggle visible on hover -->
     <div v-if="debug || $route.query.debug === 'true'" class="debug-toggle">
       <span>Debug</span>
     </div>
     
     <!-- Debug info panel (shown on hover) -->
<div v-if="debug || $route.query.debug === 'true'" class="debug-info">
  <b>BlockID: {{ props.config.id }}</b>
  <span v-if="blockContext">ContextID: {{ blockContext.state._contextInstanceId }}</span>
  <span v-if="blockContext">Context Type: {{ contextScopeType }}</span>
  <span v-if="blockContext">Mode: {{ blockContext.state.mode }}</span>
  <span v-if="blockContext">Changed: {{ blockContext.state.data.isChanged }}</span>
  <span v-if="blockContext && Object.keys(blockContext.state.data.block || {}).length > 0">
    <b>Block Data:</b> {<div v-for="(value, key) in blockContext.state.data.block" :key="key">
      {{ String(key).length > 15 ? String(key).substring(0, 15) + '...' : key }}: 
      {{ typeof value === 'object' ? '[Object]' : formatValue(value) }}
    </div>}
  </span>
</div>

     <!-- Original block content -->
     <div v-if="shouldWrapComponents" class="flex flex-col h-full w-full">
       <dsxComponentRendererWithContext
         v-for="(component, index) in componentsWithData"
         :key="index"
         :config="{
           ...component,
           transformer: component.transformer || props.config.transformer,
           props: {
             ...(component.props || {}),
             style: props.config.style,
             class: props.config.class
           }
         }"
         :debug="debug"
       />
     </div>
     <template v-else>
       <dsxComponentRendererWithContext
         v-for="(component, index) in componentsWithData"
         :key="index"
         :config="{
           ...component,
           transformer: component.transformer || props.config.transformer,
           props: {
             ...(component.props || {}),
             style: props.config.style,
             class: props.config.class
           }
         }"
         :debug="debug"
       />
     </template>
   </div>
 </template>
</template>

<style>
.debug-block {
 border: 2px dashed red !important;
 padding: 8px;
 margin: 4px;
 position: relative;
}

.debug-toggle {
 position: absolute;
 top: 0;
 right: 0;
 background-color: rgba(255, 0, 0, 0.6);
 color: white;
 font-size: 10px;
 padding: 2px 5px;
 border-radius: 0 0 0 4px;
 cursor: pointer;
 z-index: 999;
}

.debug-info {
 display: none;
background-color: rgba(8, 84, 5, 0.8); 
 font-size: 10px;
 padding: 4px;
 color: rgb(246, 244, 244);
 flex-direction: column;
 position: absolute;
 top: 20px;
 right: 0;
 z-index: 999;
 max-width: 300px;
 overflow: hidden;
 word-break: break-all;
 border: 1px solid #fcc;
}

.debug-toggle:hover + .debug-info,
.debug-info:hover {
 display: flex;
}
</style>
