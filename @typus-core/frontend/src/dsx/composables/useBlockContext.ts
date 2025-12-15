/**
 * @Tags context, dsx, block
 * Block Context composable
 * Provides a context for managing block state and data
 */
import { ref, reactive, provide, inject, computed, watch } from 'vue'; // Added watch
import { DSL } from '@/dsl/client';
import { logger } from '@/core/logging/logger';
import { FormMode } from '@dsl-shared/constants';
import { generateUUID } from '@/dsx/utils/uuid'; // Import generateUUID
import { useMessages } from '@/shared/composables/useMessages';
import { ContextScope, type BlockContext as GlobalBlockContext } from '../types'; // Import ContextScope and BlockContext using relative path
import { getSharedContext, setSharedContext } from './contextManager'; // Import context manager functions
import { createDefaultObjectFromModel } from '../utils/model-utils'; // Import utility function

// : Simple deep comparison
function isDeepEqual(obj1: any, obj2: any): boolean {

  logger.debug(`[isDeepEqual] Comparing objects`, { obj1, obj2 });
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

// : Interface for block state
interface BlockState {
  _contextInstanceId: string;
  modelObject?: Record<string, any>;
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
  mode: string; // Should be FormMode type
}

// Use the global BlockContext type
export type BlockContext = GlobalBlockContext;

export const BlockContextSymbol = Symbol('BlockContext');

/**
 * Creates a block context for managing state and data
 */
export function useBlockContext(modelName: string, options: {
  mode?: FormMode,
  recordId?: string | number,
  modelObject?: Record<string, any>,
  initialData?: Record<string, any>,
  contextScope?: ContextScope,
  contextKey?: string
} = {}) {
  // Determine final context scope (default to SHARED)
  const finalContextScope = options.contextScope === undefined ? ContextScope.SHARED : options.contextScope;
  
  // Determine final context key (generate if SHARED and no key provided)
  let finalContextKey = options.contextKey;
  if (finalContextScope === ContextScope.SHARED && !finalContextKey) {
    if (options.mode === FormMode.CREATE) {
      const uniqueId = generateUUID();
      finalContextKey = `dsx-shared-${modelName}-create-${uniqueId}`;
      logger.debug(`[useBlockContext] CREATE mode with SHARED scope: Generated unique key: ${finalContextKey}`);
    } else {
      const keyRecordIdPart = options.recordId ? String(options.recordId) : 'singleton';
      finalContextKey = `dsx-shared-${modelName}-${keyRecordIdPart}`;
      logger.debug(`[useBlockContext] No contextKey provided for SHARED scope. Generated default key: ${finalContextKey}`);
    }
  }

  // If shared scope and key are provided, try to find an existing context
  if (finalContextScope === ContextScope.SHARED && finalContextKey) {
    const existingContext = getSharedContext(finalContextKey) as BlockContext | undefined;
    if (existingContext) {
      logger.debug(`[useBlockContext] Found existing shared context for key: ${finalContextKey}. Checking for initialData updates.`);
      
      // Check if new initialData is provided and is different from the context's original data
      if (options.initialData && Object.keys(options.initialData).length > 0) {
        if (!isDeepEqual(existingContext.state.data.original, options.initialData)) {
          logger.info(`[useBlockContext][${existingContext.state._contextInstanceId}] Updating existing shared context with new initialData for key: ${finalContextKey}.`);
          existingContext.state.data.original = { ...options.initialData };
          existingContext.state.data.block = { ...options.initialData };
        } else {
          logger.debug(`[useBlockContext][${existingContext.state._contextInstanceId}] New initialData for shared context key ${finalContextKey} is same as existing. No update needed.`);
        }
      }
      
      return existingContext;
    }
  }

  const contextInstanceId = `Block-${modelName}-${options.recordId || 'new'}-${finalContextKey || generateUUID()}`;
  logger.info(`ℹ️ [useBlockContext][${contextInstanceId}] BlockContext CREATED/RECALLED.`);

  // Block state with proper typing and nested structure
  const state: BlockState = reactive({
    _contextInstanceId: contextInstanceId,
    modelObject: options.modelObject,
    data: {
      original: {} as Record<string, any>,
      block: {} as Record<string, any>,
      isChanged: computed(() => !isDeepEqual(state.data.original, state.data.block))
    },
    ui: {
      isLoading: false,
      isActionLoading: false,
      isAnyLoading: computed(() => state.ui.isLoading || state.ui.isActionLoading)
    },
    errors: {} as Record<string, any>,
    mode: options.mode || FormMode.VIEW
  });

  // Watch for changes to block data
  watch(
    () => state.data.block,
    () => {
      logger.debug(`[useBlockContext][${contextInstanceId}] WATCH isDeepEqual result: ${isDeepEqual(state.data.original, state.data.block)}, state.data.isChanged: ${state.data.isChanged}`);
    },
    { deep: true }
  );

  // Initialize with provided data or create default data based on model
  if (options.initialData) {
    logger.debug(`[useBlockContext][${contextInstanceId}] Initial data provided for ${modelName}`, { initialData: options.initialData });
    state.data.original = { ...options.initialData };
    state.data.block = { ...options.initialData };
  } else if (state.mode === FormMode.CREATE) {
    // For CREATE mode, generate default data from model fields if available
    const defaultData = createDefaultObjectFromModel(options.modelObject);
    
    logger.debug(`[useBlockContext][${contextInstanceId}] Created default data for CREATE mode based on model definition`, { defaultData });
    state.data.original = { ...defaultData };
    state.data.block = { ...defaultData };
  }

  // Block methods
  const methods = {
    async loadData(id: string | number) {
      logger.debug(`[useBlockContext][${contextInstanceId}] loadData START for model: ${modelName}`, { id, currentBlockDataKeys: Object.keys(state.data.block || {}).join(', ') });
      state.ui.isLoading = true;
      try {
        logger.debug(`[useBlockContext][${contextInstanceId}] Loading data using DSL[${modelName}]`, { id });
        const data = await DSL[modelName].findById(Number(id));
        logger.debug(`[useBlockContext][${contextInstanceId}] Data loaded for ${modelName}`, { id });
        state.data.original = { ...data };
        state.data.block = { ...data };
        return data;
      } catch (error) {
        logger.error(`[useBlockContext][${contextInstanceId}] Error loading ${modelName}`, { id, error });
        throw error;
      } finally {
        state.ui.isLoading = false;
      }
    },
    
    async saveData() {
      logger.debug(`[useBlockContext][${contextInstanceId}] Saving data for model: ${modelName}`, { mode: state.mode });
      state.ui.isActionLoading = true;
      try {
        logger.debug(`[useBlockContext][${contextInstanceId}] Preparing data to save for ${modelName} state.data.original:`, { data: state.data.original });
        logger.debug(`[useBlockContext][${contextInstanceId}] Preparing data to save for ${modelName} state.data.block:`, { data: state.data.block });
        const dataToSave = { ...state.data.original, ...state.data.block };
        let result;
        
        if (state.mode === FormMode.CREATE && finalContextScope === ContextScope.SHARED) {
          logger.debug(`[useBlockContext][${contextInstanceId}] Creating new ${modelName} in shared context`, { data: dataToSave });
          result = await DSL[modelName].create(dataToSave);
          logger.debug(`[useBlockContext][${contextInstanceId}] ${modelName} created successfully`, { id: result?.id });
          
          // Update with the result from server
          state.data.original = { ...result };
          state.data.block = { ...result };
          
          // If in CREATE mode and we need to reset after save, we would do it here
          // For now, we're keeping the created object data
        } else if (state.data.original?.id !== undefined) {
          logger.debug(`[useBlockContext][${contextInstanceId}] Updating ${modelName}`, { id: state.data.original.id });
          result = await DSL[modelName].update(state.data.original.id, dataToSave);
        } else {
          logger.error(`[useBlockContext][${contextInstanceId}] Cannot update ${modelName} without id`);
          throw new Error('Cannot update record without id');
        }
        
        logger.debug(`[useBlockContext][${contextInstanceId}] ${modelName} saved successfully`, { id: result?.id });
        //useMessages().successMessage('Successfully saved!');
        
        // Update original data to match current state
        state.data.original = { ...result };
        state.data.block = { ...result };
        
        return result;
      } catch (error) {
        logger.error(`[useBlockContext][${contextInstanceId}] Error saving ${modelName}`, { error });
        throw error;
      } finally {
        state.ui.isActionLoading = false;
      }
    },
    
    clearChanges() {
      logger.debug(`[useBlockContext][${contextInstanceId}] clearChanges START for ${modelName}. Current blockData keys: ${Object.keys(state.data.block || {}).join(', ')}`);
      state.data.block = {};
      logger.debug(`[useBlockContext][${contextInstanceId}] clearChanges END for ${modelName}. blockData is now empty.`);
    },
    
    resetToOriginal() {
      logger.debug(`[useBlockContext][${contextInstanceId}] resetToOriginal START for ${modelName}. Current blockData keys: ${Object.keys(state.data.block || {}).join(', ')}`);
      state.data.block = { ...state.data.original };
      logger.debug(`[useBlockContext][${contextInstanceId}] resetToOriginal END for ${modelName}. blockData reset to original.`);
    },
    
    validateData() {
      logger.debug(`[useBlockContext][${contextInstanceId}] Validating ${modelName} data`);
      return true;
    }
  };

  // Create record with typesafe access to fields
  const record = new Proxy({} as Record<string, any>, {
    get(target, prop) {
      logger.debug(`[useBlockContext][${contextInstanceId}] Accessing ${modelName} property`, { prop });
      if (typeof prop === 'string') {
        // Methods
        if (prop === 'save') return () => methods.saveData();
        if (prop === 'clear') return () => methods.clearChanges();
        if (prop === 'reset') return () => methods.resetToOriginal();
        if (prop === 'validate') return () => methods.validateData();
        
        // States
        if (prop === 'isChanged') return state.data.isChanged;
        if (prop === 'isLoading') return state.ui.isLoading;
        if (prop === 'isActionLoading') return state.ui.isActionLoading;
        if (prop === 'isAnyLoading') return state.ui.isAnyLoading;
        
        // Instance ID
        if (prop === '_contextInstanceId') return state._contextInstanceId;
        
        // Data fields - prefer block (modified) data, fall back to original
        return state.data.block[prop] !== undefined
          ? state.data.block[prop]
          : state.data.original[prop];
      }
      return undefined;
    },
    
    set(target, prop, value) {
      logger.debug(`[useBlockContext][${contextInstanceId}] Setting ${modelName} property`, { prop, value, mode: state.mode });
      if (typeof prop === 'string') {
        if (prop === '_contextInstanceId') {
          logger.warn(`[useBlockContext][${contextInstanceId}] Attempted to set _contextInstanceId. This is not allowed.`);
          return false;
        }
        
        // Set value in block data (modified data)
        state.data.block[prop] = value;
        
        logger.debug(`[useBlockContext][${contextInstanceId}] set: state.data.block after update for prop '${String(prop)}'. Keys: ${Object.keys(state.data.block || {}).join(', ')}.`);
        return true;
      }
      return false;
    }
  });

  // Provide context through provide/inject
  provide(BlockContextSymbol, {
    state,
    methods,
    record
  });

  // Load data if recordId is provided and no initial data
  if (options.recordId && !options.initialData) {
    logger.debug(`[useBlockContext][${contextInstanceId}] Auto-loading data for ${modelName}`, { recordId: options.recordId });
    methods.loadData(options.recordId);
  }

  const context: BlockContext = {
    state,
    methods,
    record
  };

  // Store in shared storage if needed
  if (finalContextScope === ContextScope.SHARED && finalContextKey) {
    setSharedContext(finalContextKey, context);
    logger.debug(`[useBlockContext] Shared context stored for key: ${finalContextKey}`);
  }

  return context;
}



/**
 * Hook for consuming block context in components
 */
export function useBlockContextConsumer() {
  logger.debug('[useBlockContextConsumer] Consuming block context'); // Log entry
  const context = inject(BlockContextSymbol);
  if (!context) {
    throw new Error('useBlockContextConsumer must be used within a block with BlockContext');
  }
  return context;
}
