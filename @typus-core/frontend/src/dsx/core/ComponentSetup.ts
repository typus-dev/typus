import type { dsxComponentConfig, ComponentSetupClass } from '../types'; // Use relative path
import { logger } from '@/core/logging/logger'; // Import logger

/**
 * Base class for component setup
 */
export class ComponentSetup implements ComponentSetupClass {
  /**
   * Constructor with optional base config
   */
  constructor(protected baseConfig: Partial<dsxComponentConfig> = {}) {}
  
  /**
   * Main setup method
   */
  setup(): Partial<dsxComponentConfig> {
    logger.debug('[ComponentSetup] setup'); // Log entry
    return this.baseConfig;
  }
  
  /**
   * Called before component loads
   */
  beforeLoad?(config: dsxComponentConfig): Promise<void> | void {
    logger.debug('[ComponentSetup] beforeLoad'); // Log entry
    // Default implementation does nothing
  }
  
  /**
   * Called before component unmounts
   */
  beforeUnload?(): Promise<void> | void {
    logger.debug('[ComponentSetup] beforeUnload'); // Log entry
    // Default implementation does nothing
  }
  
  /**
   * Called when component is mounted
   */
  onMounted?(): Promise<void> | void {
    logger.debug('[ComponentSetup] onMounted'); // Log entry
    // Default implementation does nothing
  }
  
  /**
   * Called before data fetch
   */
  beforeDataFetch?(config: dsxComponentConfig): Promise<dsxComponentConfig> | dsxComponentConfig {
    logger.debug('[ComponentSetup] beforeDataFetch'); // Log entry
    return config;
  }
  
  /**
   * Called after data fetch
   */
  afterDataFetch?(data: any, config: dsxComponentConfig): Promise<any> | any {
    logger.debug('[ComponentSetup] afterDataFetch'); // Log entry
    return data;
  }
  
  /**
   * Called before component render
   */
  beforeRender?(data: any, config: dsxComponentConfig): Promise<{data: any, config: dsxComponentConfig}> | {data: any, config: dsxComponentConfig} {
    logger.debug('[ComponentSetup] beforeRender'); // Log entry
    return { data, config };
  }
}
