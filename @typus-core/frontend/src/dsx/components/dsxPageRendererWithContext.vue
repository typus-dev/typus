<script setup lang="ts">
import { provide, reactive, computed, onMounted, onUnmounted } from 'vue';
import { generateUUID } from '@/dsx/utils/uuid';
import { clearSharedContext } from '../composables/contextManager';
import dsxBlockRendererWithContext from './dsxBlockRendererWithContext.vue';
import dxGrid from '@/components/layout/dxGrid.vue';
import dxCol from '@/components/layout/dxCol.vue';
import { useRoute, useRouter } from 'vue-router';
import { logger } from '@/core/logging/logger';
import { DSL } from '@/dsl/client';
import { type dsxPageConfig, type dsxBlockConfig as BaseBlockConfig, ContextScope } from '../types';
import { FormMode } from '@dsl-shared/constants';
import { getSharedContext, setSharedContext } from '../composables/contextManager';
import { createDefaultObjectFromModel } from '../utils/model-utils';

interface ExtendedBlockConfig extends BaseBlockConfig {
 model?: string | Record<string, any>;
 mode?: FormMode;
 recordId?: string | number;
 initialData?: Record<string, any>;
 contextScope?: ContextScope;
 contextKey?: string;
 transformer?: Record<string, {
   afterLoad: (value: any) => any;
   beforeSave: (value: any) => any;
 }>;
}

interface PageContextConfig {
 model?: string | Record<string, any>;
 mode?: 'view' | 'edit' | 'create';
 recordId?: string | number;
 dataSource?: () => Promise<any>;
 beforeDataFetch?: () => Promise<void | false> | void | false;
 afterDataFetch?: (data: any) => Promise<any> | any;
 beforeDataSave?: (data: any) => Promise<any> | any;
 afterDataSave?: (data: any) => Promise<void> | void;
 onDataError?: (error: any) => Promise<void> | void;
 fieldTransforms?: Record<string, {
   afterLoad: (value: any) => any;
   beforeSave: (value: any) => any;
 }>;
 transformer?: Record<string, {
   afterLoad: (value: any) => any;
   beforeSave: (value: any) => any;
 }>;
}

interface PageConfig extends dsxPageConfig {
 id?: string;
 contextConfig?: PageContextConfig;
 contextScope?: ContextScope;
 contextKey?: string;
 blocks: ExtendedBlockConfig[];
}

const props = defineProps<{
 config: PageConfig;
 debug?: boolean;
}>();

const emit = defineEmits(['loaded', 'error', 'save-success', 'save-error']);

const route = useRoute();
const router = useRouter();

let routeNameStr = 'unknown';
if (route.name) {
 const name = route.name as string | symbol;
 routeNameStr = typeof name === 'symbol' ? name.toString() : String(name);
}

const pageContextInstanceId = `Page-${props.config.id || routeNameStr}-${generateUUID()}`;
logger.info(`ℹ️ [PageContext][${pageContextInstanceId}] PageContext CREATED.`);

const finalPageContextScope = computed(() => props.config.contextScope === undefined ? ContextScope.SHARED : props.config.contextScope);

const finalPageContextKey = computed(() => {
 if (finalPageContextScope.value === ContextScope.SHARED) {
   if (props.config.contextKey) {
     return props.config.contextKey;
   }
   
   if (props.config.contextConfig?.mode === FormMode.CREATE) {
     let modelName = 'UnknownModel';
     if (typeof props.config.contextConfig.model === 'string') {
       modelName = props.config.contextConfig.model;
     } else if (props.config.contextConfig.model && typeof props.config.contextConfig.model === 'object' && 'name' in props.config.contextConfig.model) {
       modelName = (props.config.contextConfig.model as { name: string }).name;
     }
       
     return `dsx-page-shared-${modelName}-create-page-${routeNameStr}`;
   }
   
   let extractedRouteParamId: string | undefined = undefined;
   const params = route.params as Record<string, string | string[]>;
   if (params && Object.prototype.hasOwnProperty.call(params, 'id')) {
     const idFromRoute = params.id;
     if (typeof idFromRoute === 'string') {
       extractedRouteParamId = idFromRoute;
     } else if (Array.isArray(idFromRoute) && idFromRoute.length > 0) {
       extractedRouteParamId = idFromRoute[0];
     }
   }
   const pageRecordId = props.config.contextConfig?.recordId || extractedRouteParamId;
   const keyRecordIdPart = pageRecordId ? String(pageRecordId) : 'global-page';
   
   let modelNamePart = 'UnknownModel';
   if (props.config.contextConfig?.model) {
     if (typeof props.config.contextConfig.model === 'string') {
       modelNamePart = props.config.contextConfig.model;
     } else if (typeof props.config.contextConfig.model === 'object' && 'name' in props.config.contextConfig.model) {
       modelNamePart = (props.config.contextConfig.model as { name: string }).name;
     }
   }

   const generatedKey = `dsx-page-shared-${modelNamePart}-${keyRecordIdPart}`;
   logger.debug(`[PageContext][${pageContextInstanceId}] Generated default key: ${generatedKey}`);
   return generatedKey;
 }
 return undefined;
});

interface IPageContext {
 _contextInstanceId: string;
 state: {
   title: string | undefined;
   layout: string | undefined;
   mode: 'view' | 'edit' | 'create';
   recordId: string | number | string[] | undefined;
   isLoading: boolean;
   error: Error | null;
   pageData: Record<string, any>;
   sharedData: Record<string, any>;
 };
 methods: {
   navigateTo: (path: string) => Promise<any>;
   goBack: () => void;
   goToHome: () => Promise<any>;
   reload: () => void;
   setSharedData: (key: string, value: any) => void;
   getSharedData: (key: string) => any;
   loadPageData: () => Promise<void>;
   loadRecord: (id?: string | number) => Promise<any | undefined>;
   saveRecord: (data: any) => Promise<any | undefined>;
 };
 computed: {
   isEditMode: boolean;
   isCreateMode: boolean;
   isViewMode: boolean;
   hasChanges: boolean;
   record: Record<string, any>;
 };
}

const pageContext: IPageContext = reactive({
 _contextInstanceId: pageContextInstanceId,
 state: {
   title: props.config.title,
   layout: props.config.layout,
   mode: props.config.contextConfig?.mode || 'view',
   recordId: props.config.contextConfig?.recordId || (() => {
     const params = route.params as { id?: string | string[] };
     return Array.isArray(params.id) ? params.id[0] : params.id;
   })(),
   isLoading: false,
   error: null as Error | null,
   pageData: {} as Record<string, any>,
   sharedData: {} as Record<string, any>
 },
 
 methods: {
   navigateTo: (path: string) => router.push(path),
   goBack: () => router.back(),
   goToHome: () => router.push('/'),
   reload: () => window.location.reload(),
   
   setSharedData: (key: string, value: any) => {
     pageContext.state.sharedData[key] = value;
   },
   getSharedData: (key: string) => pageContext.state.sharedData[key],
   
   loadPageData: async () => {
     logger.debug(`[PageContext][${pageContextInstanceId}] Loading page data`);
     if (!props.config.contextConfig?.dataSource) return;
     
     try {
       if (props.config.contextConfig?.beforeDataFetch) {
         const shouldContinue = await props.config.contextConfig.beforeDataFetch();
         if (shouldContinue === false) {
           logger.debug(`[PageContext][${pageContextInstanceId}] beforeDataFetch returned false, aborting`);
           return;
         }
       }

       pageContext.state.isLoading = true;
       pageContext.state.error = null;
       
       let data = await props.config.contextConfig.dataSource();
       
       if (props.config.contextConfig?.afterDataFetch) {
         const transformedData = await props.config.contextConfig.afterDataFetch(data);
         if (transformedData !== undefined) {
           data = transformedData;
         }
       }

       pageContext.state.pageData = data;
       emit('loaded', data);
       logger.debug(`[PageContext][${pageContextInstanceId}] Page data loaded`, { data });
     } catch (error) {
       pageContext.state.error = error as Error;
       logger.error(`[PageContext][${pageContextInstanceId}] Error loading page data`, { error });
       
       if (props.config.contextConfig?.onDataError) {
         await props.config.contextConfig.onDataError(error);
       }
       
       emit('error', error);
     } finally {
       pageContext.state.isLoading = false;
     }
   },
   
   loadRecord: async (id?: string | number) => {
     logger.debug(`[PageContext][${pageContextInstanceId}] Loading record`, { id });
     const modelConfig = props.config.contextConfig?.model;
     if (!modelConfig) return;
     
     const modelName = typeof modelConfig === 'string' ? modelConfig : (modelConfig as { name: string }).name;
     const recordId = id || pageContext.state.recordId;
     
     if (!recordId) {
       logger.error(`[PageContext][${pageContextInstanceId}] No recordId provided`);
       return;
     }
     
     try {
       if (props.config.contextConfig?.beforeDataFetch) {
         const shouldContinue = await props.config.contextConfig.beforeDataFetch();
         if (shouldContinue === false) {
           logger.debug(`[PageContext][${pageContextInstanceId}] beforeDataFetch returned false`);
           return;
         }
       }

       pageContext.state.isLoading = true;
       
       let data = await DSL[modelName].findById(recordId);
       
       if (props.config.contextConfig?.afterDataFetch) {
         const transformedData = await props.config.contextConfig.afterDataFetch(data);
         if (transformedData !== undefined) {
           data = transformedData;
         }
       }

       if (props.config.contextConfig?.fieldTransforms) {
         for (const [field, transform] of Object.entries(props.config.contextConfig.fieldTransforms)) {
           if (data[field] !== undefined) {
             data[field] = transform.afterLoad(data[field]);
           }
         }
       }

       pageContext.state.pageData = data;
       emit('loaded', data);
       logger.debug(`[PageContext][${pageContextInstanceId}] Record loaded`, { data });
       return data;
     } catch (error) {
       pageContext.state.error = error as Error;
       logger.error(`[PageContext][${pageContextInstanceId}] Error loading ${modelName}`, { id: recordId, error });
       
       if (props.config.contextConfig?.onDataError) {
         await props.config.contextConfig.onDataError(error);
       }
       
       emit('error', error);
       throw error;
     } finally {
       pageContext.state.isLoading = false;
     }
   },
   
   saveRecord: async (data: any) => {
     logger.debug(`[PageContext][${pageContextInstanceId}] Saving record`, { data });
     const modelConfig = props.config.contextConfig?.model;
     if (!modelConfig) return;
     
     const modelName = typeof modelConfig === 'string' ? modelConfig : (modelConfig as { name: string }).name;
     
     try {
       let processedData = { ...data };
       
       if (props.config.contextConfig?.beforeDataSave) {
         const transformedData = await props.config.contextConfig.beforeDataSave(processedData);
         if (transformedData !== undefined) {
           processedData = transformedData;
         }
       }

       if (props.config.contextConfig?.fieldTransforms) {
         for (const [field, transform] of Object.entries(props.config.contextConfig.fieldTransforms)) {
           if (processedData[field] !== undefined) {
             processedData[field] = transform.beforeSave(processedData[field]);
           }
         }
       }

       let result;
       if (pageContext.state.mode === 'create') {
         result = await DSL[modelName].create(processedData);
       } else if (pageContext.state.recordId) {
         result = await DSL[modelName].update(pageContext.state.recordId, processedData);
       }
       
       if (props.config.contextConfig?.afterDataSave) {
         await props.config.contextConfig.afterDataSave(result);
       }

       emit('save-success', result);
       logger.debug(`[PageContext][${pageContextInstanceId}] Record saved successfully`, { result });
       return result;
     } catch (error) {
       logger.error(`[PageContext][${pageContextInstanceId}] Error saving ${modelName}`, { error });
       
       if (props.config.contextConfig?.onDataError) {
         await props.config.contextConfig.onDataError(error);
       }
       
       emit('save-error', error);
       throw error;
     }
   }
 },
 
 computed: {
   isEditMode: computed(() => pageContext.state.mode === 'edit'),
   isCreateMode: computed(() => pageContext.state.mode === 'create'),
   isViewMode: computed(() => pageContext.state.mode === 'view'),
   hasChanges: computed(() => false),
   record: computed(() => pageContext.state.pageData)
 }
});

provide('pageContext', pageContext);

/**
 * Provides transformer configuration to child components
 */
const provideTransformer = () => {


  console.log('[dsxPageRendererWithContext].provideTransformer',props.config)
  
  const transformer = props.config.contextConfig?.transformer;
  if (transformer) {
    provide('transformer', transformer);
    logger.debug('[dsxPageRendererWithContext] Provided transformer to context', { 
      transformer: Object.keys(transformer) 
    });
  }
};

/**
 * Enhances blocks with transformer configuration
 */
const enhancedBlocks = computed(() => 
  props.config.blocks.map(block => {
    const baseRecordId = block.recordId || pageContext.state.recordId;
    const finalRecordId = Array.isArray(baseRecordId) ? baseRecordId[0] : baseRecordId;
    const blockId = block.id || `dsx-generated-block-${generateUUID()}`;

    return {
      ...block,
      id: blockId,
      model: block.model || props.config.contextConfig?.model,
      mode: block.mode || (pageContext.state.mode as FormMode),
      recordId: finalRecordId as string | number | undefined,
      initialData: pageContext.state.pageData,
      contextKey: block.contextKey || finalPageContextKey.value,
      contextScope: block.contextScope || finalPageContextScope.value,
      transformer: block.transformer || props.config.contextConfig?.transformer
    };
  })
);


onMounted(async () => {
  logger.debug(`[PageContext][${pageContextInstanceId}] Mounted`, {
    title: props.config.title,
    mode: pageContext.state.mode,
    recordId: pageContext.state.recordId,
    hasModel: !!props.config.contextConfig?.model,
    hasDataSource: !!props.config.contextConfig?.dataSource
  });
  
  // Provide transformer for child components
  provideTransformer();
  

  if (props.config.contextConfig?.dataSource) {
    await pageContext.methods.loadPageData();
  }

  if (props.config.contextConfig?.mode === FormMode.CREATE) {
    logger.debug(`[PageContext][${pageContextInstanceId}] CREATE mode detected`);  
    const modelConfig = props.config.contextConfig?.model;
    if (modelConfig) {
      const defaultData = createDefaultObjectFromModel(props.config.contextConfig?.model);
      
      if (typeof modelConfig === 'object' && modelConfig.defaults) {
        Object.assign(defaultData, modelConfig.defaults);
      }
      
      pageContext.state.pageData = defaultData;
      logger.debug(`[PageContext][${pageContextInstanceId}] Initialized CREATE mode data`, { defaultData });
    }
  }
  else if (props.config.contextConfig?.model && pageContext.state.recordId && pageContext.state.mode !== FormMode.CREATE) {
    await pageContext.methods.loadRecord();
    logger.debug(`[PageContext][${pageContextInstanceId}] Data loaded after mount:`, pageContext.state.pageData);
  }
});

onUnmounted(() => {
 if (finalPageContextScope.value === ContextScope.SHARED && finalPageContextKey.value) {
   logger.debug(`[PageContext][${pageContextInstanceId}] Clearing shared context: ${finalPageContextKey.value}`);
   clearSharedContext(finalPageContextKey.value);
 }
});

</script>

<template>
<div v-if="pageContext.state.isLoading" class="loading-overlay">
 <div class="loading-spinner"></div>
</div>
<template v-else>
 <div v-if="pageContext.state.error" class="error-message">
   {{ pageContext.state.error.message }}
 </div>
 <div :class="{'debug-block': debug || $route.query.debug === 'true'}" class="relative">
   <div v-if="debug || $route.query.debug === 'true'" class="debug-toggle">
     <span>Page Context</span>
   </div>
   
   <div v-if="debug || $route.query.debug === 'true'" class="debug-info">
     <b>PageID: {{ pageContext._contextInstanceId }}</b>
     <b>Shared Key: {{ finalPageContextKey }}</b>
     <b>Mode: {{ pageContext.state.mode }}</b>
     <b>RecordID: {{ pageContext.state.recordId }}</b>
     <span v-if="Object.keys(pageContext.state.pageData || {}).length > 0">
      <b> Page Data:</b> 
       <div v-for="(value, key) in pageContext.state.pageData" :key="key">
         {{ String(key).length > 15 ? String(key).substring(0, 15) + '...' : key }}: 
         {{ typeof value === 'object' ? '[Object]' : 
            String(value).length > 15 ? String(value).substring(0, 15) + '...' : value }}
       </div>
     </span>

     <div v-if="finalPageContextKey">
       <b>Block Data:</b>{
       <div v-if="getSharedContext(finalPageContextKey)?.state?.data?.block">
         <div v-for="(value, key) in getSharedContext(finalPageContextKey).state.data.block" :key="key">
           {{ String(key).length > 15 ? String(key).substring(0, 15) + '...' : key }}: 
           {{ typeof value === 'object' ? '[Object]' : 
              String(value).length > 15 ? String(value).substring(0, 15) + '...' : value }}
         </div>
       </div>}
     </div>
   </div>

   <div :class="'theme-layout-container-base'">
     <dxGrid 
       :cols="props.config.columns || 1"  
       sm="2" 
       md="4" 
       lg="6" 
       xl="12"  
       :gap="props.config.gap || 16" 
       auto-rows
     >
       <template v-for="block in enhancedBlocks" :key="block.id">
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
           <dsxBlockRendererWithContext :config="block" :debug="debug" />
         </dxCol>
       </template>
     </dxGrid>
   </div>
 </div>
</template>
</template>

<style>
.debug-block {
 border: 2px dashed rgb(20, 154, 8) !important;
 padding: 8px;
 margin: 4px;
 position: relative;
}

.debug-toggle {
 position: absolute;
 top: 0;
 right: 0;
 background-color: rgba(20, 154, 8);
 color: white;
 font-size: 10px;
 padding: 2px 5px;
 border-radius: 0 0 0 4px;
 cursor: pointer;
 z-index: 999;
}

.debug-info {
 display: none;
 background-color:rgba(20, 154, 8);
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
 border: 1px solid #ccf;
}

.debug-toggle:hover + .debug-info,
.debug-info:hover {
 display: flex;
}
</style>
