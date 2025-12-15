// src/dsx/types/index.ts
import type { VNode, Component } from 'vue';

// Unified Context interface for consistent data access
export interface UnifiedContext {
  page: {
    data: Record<string, any>;
    config: any;
    state: { isLoading: boolean; errors: any };
  };
  block: {
    data: Record<string, any>;
    config: any;
    state: { isChanged: boolean; mode: string };
    methods: { save: () => Promise<any>; validate: () => boolean, reload: () => Promise<any>; };
  };
  component: {
    data: any;
    config: any;
  };
}

// Forward declarations to avoid circular dependencies
export interface dsxComponentConfig {
  type: Component;
  id?: string;
  refKey?: string;
  props?: Record<string, any>;
  events?: Record<string, Function>;
  slots?: Record<string, SlotContentProvider>;
  dataSource?: (() => Promise<any>) | (() => any) | any;
  dataValue?: string;
  
  // Custom handlers (legacy)
  beforeDataFetch?: (config: dsxComponentConfig) => Promise<dsxComponentConfig> | dsxComponentConfig;
  afterDataFetch?: (data: any, config: dsxComponentConfig) => Promise<any> | any;
  beforeRender?: (data: any, config: dsxComponentConfig) => Promise<BeforeRenderResult> | BeforeRenderResult;
  
  // New unified handlers
  beforeDataFetchUnified?: (ctx: UnifiedContext) => Promise<void> | void;
  afterDataFetchUnified?: (ctx: UnifiedContext) => Promise<void> | void;
  beforeRenderUnified?: (ctx: UnifiedContext) => Promise<void> | void;
  
  // Setup property for external configuration
  setup?: ComponentSetupFunction | ComponentSetupClass;
}

// SlotContentProvider type for dynamic slot content
export type SlotContentProvider = string | VNode | VNode[] | ((data: any) => string | VNode | VNode[] | null);

// Context scope enum
export enum ContextScope {
  SHARED = 'shared', // Common context for related components
  ISOLATED = 'isolated' // Isolated context
}

// Represents the structure of a block's context
export interface BlockContext {
  state: Record<string, any>; // Reactive state of the context
  methods: Record<string, (...args: any[]) => any>; // Methods to interact with context
  record: Record<string, any> | null; // Current record data
  // TODO: Define more specific types for state, methods, and record based on useBlockContext implementation
}

// Component setup interfaces
export interface ComponentSetupFunction {
  (): Partial<dsxComponentConfig>;
}

export interface ComponentSetupClass {
  setup(): Partial<dsxComponentConfig>;
  beforeLoad?: (config: dsxComponentConfig) => Promise<void> | void;
  beforeUnload?: () => Promise<void> | void;
  onMounted?: () => Promise<void> | void;
  beforeDataFetch?: (config: dsxComponentConfig) => Promise<dsxComponentConfig> | dsxComponentConfig;
  afterDataFetch?: (data: any, config: dsxComponentConfig) => Promise<any> | any;
  beforeRender?: (data: any, config: dsxComponentConfig) => Promise<{data: any, config: dsxComponentConfig}> | {data: any, config: dsxComponentConfig};
  // New unified methods
  beforeDataFetchUnified?: (ctx: UnifiedContext) => Promise<void>;
  afterDataFetchUnified?: (ctx: UnifiedContext) => Promise<void>;
  beforeRenderUnified?: (ctx: UnifiedContext) => Promise<void>;
}

// Type for the result of beforeRender hook
export interface BeforeRenderResult {
  data?: any;
  config: dsxComponentConfig;
}

export interface dsxBlockConfig {
  id?: string; // Made id optional as it can be auto-generated
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  align?: 'left' | 'center' | 'right' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'stretch';
  style?: Record<string, any>;
  class?: string;
  components: dsxComponentConfig[];
  dataSource?: (() => Promise<any>) | (() => any) | any; // Added dataSource
  beforeDataUpdate?: (oldData: any, newData: any) => Promise<any | false> | any | false; // Added beforeDataUpdate
  afterDataUpdate?: (data: any) => Promise<void> | void; // Added afterDataUpdate
  beforeDataLoad?: () => Promise<void | false> | void | false; // Added beforeDataLoad
  afterDataLoad?: (data: any) => Promise<any> | any; // Added afterDataLoad
  onDataError?: (error: any) => Promise<void> | void; // Added onDataError
  exposeBlockMethods?: boolean; // Added exposeBlockMethods
}

export interface dsxLifecycleHooks {
  beforeLoad?: () => Promise<void> | void;
  onLoad?: (data: any) => Promise<void> | void;
  afterLoad?: (data: any) => Promise<void> | void;
}

export interface dsxPageConfig {
  title: string;
  layout: string;
  type?: 'grid' | 'row' | 'stack';
  columns?: number;
  gap?: number;
  blocks: dsxBlockConfig[];
  dataSource?: () => Promise<any>;
  hooks?: dsxLifecycleHooks;
  afterDataFetch?: (data: any) => any;
  beforeDataSave?: (data: any) => any;
  contextConfig?: any; // For compatibility with existing pages
  
  // New unified hooks for page level
  beforeDataFetchUnified?: (ctx: UnifiedContext) => Promise<void> | void;
  afterDataFetchUnified?: (ctx: UnifiedContext) => Promise<void> | void;
}
