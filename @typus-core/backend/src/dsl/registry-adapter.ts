/**
 * Import the shared registry from shared/dsl
 */
import { registry as sharedRegistry } from '@typus-core/shared/dsl/registry';
import { Logger } from '../core/logger/Logger.js';

// Create a logger instance
const logger = new Logger();

/**
 * Adapter for the shared DSL registry
 * This provides a consistent interface for accessing the registry
 * and handles any differences between the shared registry and what the DSL router expects
 */
export class RegistryAdapter {
    /**
   * Get a model by name
   */
  // Add optional module parameter to match sharedRegistry.getModel signature
  static getModel(name: string, module?: string): any { 
    // Use the backend logger here as this file is part of the backend
    logger.debug(`[RegistryAdapter] Getting model: name="${name}", module="${module || 'undefined'}"`);
    // Pass both name and module to the actual registry
    const model = sharedRegistry.getModel(name, module); 
    logger.debug(`[RegistryAdapter] Result from sharedRegistry.getModel: ${model ? 'Found' : 'Not Found'}`);
    return model;
  }
  
  /**
     * Get all models
     */
    static getAllModels(): any[] {

        logger.debug(`[RegistryAdapter] Getting all models`);
        return sharedRegistry.getAllModels();
    }

    /**
     * Check if a model exists
     */
    static hasModel(name: string): boolean {

        logger.debug(`[RegistryAdapter] Checking if model exists: ${name}`);
        return sharedRegistry.hasModel(name);
    }
    
    /**
   * Get model names
   */
  static getModelNames(): string[] {
    logger.debug(`[RegistryAdapter] Getting model names (keys)`);
    const names = sharedRegistry.getModelNames();
    logger.debug(`[RegistryAdapter] Result from sharedRegistry.getModelNames:`, names);
    return names;
  }
}

// Export the registry adapter as a singleton
export const registry = RegistryAdapter;
