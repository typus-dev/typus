// Use module augmentation to make types globally available

declare module '@root-shared/dsl/auto-interfaces' {
  global {
    //export type IBlogPost = import('@root-shared/dsl/auto-interfaces').IBlogPost;
    //export type ICategory = import('@root-shared/dsl/auto-interfaces').ICategory;
    // Add other types from this module here if needed globally
  }
}

declare module 'dsx/types' {
  global {
    export type dsxPageConfig = import('dsx/types').dsxPageConfig;
    export type dsxComponentConfig = import('dsx/types').dsxComponentConfig;
    export type dsxBlockConfig = import('dsx/types').dsxBlockConfig;
    export type dsxLifecycleHooks = import('dsx/types').dsxLifecycleHooks;
    export type ComponentSetup = import('dsx/types').ComponentSetup;
    export type ComponentSetupFunction = import('dsx/types').ComponentSetupFunction;
    export type ComponentSetupClass = import('dsx/types').ComponentSetupClass;
    export type BeforeRenderResult = import('dsx/types').BeforeRenderResult;
    
    // Add other types from this module here if needed globally
  }
}

// Cached Route Types for HTML Cache Generator
interface CachedRoute {
  path: string;
  name: string;
  component: string;
  contentHtml?: string;
  meta: {
    cached: boolean;
    cachedAt: string;
    generatedMs?: number;
    configPublic?: {
      site?: {
        name?: string;
        tagline?: string;
      };
      ui?: {
        theme?: string;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
}

declare global {
  interface Window {
    __CACHED_ROUTE__?: CachedRoute;
    __IS_CACHED_PAGE__?: boolean;
    __ORIGINAL_MAIN_CONTENT__?: string;
    logger?: import('@/core/logging/types').Logger;
  }
}

export {};
