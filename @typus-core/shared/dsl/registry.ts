/**
 * DSL Registry
 * 
 * Manages registration and retrieval of DSL models
 * 
 * @file registry.ts
 * @version 1.0.0
 * @created May 4, 2025
 * @modified May 4, 2025
 * @purpose Manage DSL model registration and retrieval
 * @lastChange Initial implementation
 * @author Dmytro Klymentiev
 */

import { DslModel } from './types.js'; // Added .js extension
// Cannot import backend logger into shared code
// import { Logger } from '@/core/logger/Logger'; 

// Create a logger instance specifically for the registry
// Note: This might cause issues if logger initialization depends on app context.
// A better approach might be to pass logger via DI if possible, or use console.debug.
// Using console.debug for safety.
// const logger = new Logger('DslRegistry'); 

/**
 * Registry for DSL models
 */
class DslRegistry {
  private models: Map<string, DslModel> = new Map();
  // Add a unique ID to track instances
  private readonly instanceId: string = Math.random().toString(36).substring(2, 15); 
  
  constructor() {
    console.debug(`[DslRegistry] Instance created with ID: ${this.instanceId}`);
  }

  /**
   * Register a model in the registry
   *
   * @param model - DSL model to register
   * @param skipIfExists - Set to true during DSL generation phase to allow
   *                       idempotent registration. Models self-register on import,
   *                       so scanning scripts should skip duplicates. At runtime,
   *                       duplicates indicate actual conflicts and throw errors.
   *
   * Design rationale:
   * - DSL generation (skipIfExists=true): Models are imported and self-register,
   *   then the scanner tries to register them again. This is expected behavior.
   * - Runtime (skipIfExists=false): Duplicate registration indicates a real
   *   conflict between core and plugins, or between two plugins.
   *
   * @throws Error if model with the same name already exists in registry (unless skipIfExists=true)
   */
  registerModel(model: DslModel, skipIfExists: boolean = false): void {
    const key = this.getModelKey(model);

    // ✅ Duplicate detection: Prevent model name collisions
    if (this.models.has(key)) {
      const existingModel = this.models.get(key)!;
      const existingSource = existingModel.module
        ? `plugin:${existingModel.module}`
        : 'core';
      const newSource = model.module
        ? `plugin:${model.module}`
        : 'core';

      // During DSL generation, models self-register when imported
      // If skipIfExists is true, just log and skip re-registration
      if (skipIfExists) {
        console.debug(
          `[DslRegistry Instance: ${this.instanceId}] Model "${model.name}" (key: "${key}") ` +
          `already registered by ${existingSource}, skipping duplicate registration`
        );
        return;
      }

      // At runtime, throw error to catch actual conflicts
      throw new Error(
        `[DslRegistry] Model name collision: "${model.name}" (key: "${key}") ` +
        `already registered by ${existingSource}, ` +
        `cannot register from ${newSource}`
      );
    }

    // Using console.debug as logger might not be initialized when this shared code runs
    console.debug(`[DslRegistry Instance: ${this.instanceId}] Registering model with key: "${key}"`);
    this.models.set(key, model);
  }
  
  /**
   * Get a model from the registry
   */
getModel(name: string, module?: string): DslModel | undefined {

  if (module) {
    const key = `${module}.${name}`;
    const model = this.models.get(key);
    if (model) return model;
  }

  for (const [key, model] of this.models.entries()) {
    if (model.name === name) {
      console.debug(`[DslRegistry Instance: ${this.instanceId}] Found model "${name}" by name, key: "${key}"`);
      return model;
    }
  }
  
  return undefined;
}
  
  /**
   * Get all models from the registry
   */
  getAllModels(): DslModel[] {
    return Array.from(this.models.values());
  }
  
  /**
   * Get models by module
   */
  getModelsByModule(module: string): DslModel[] {
    return this.getAllModels().filter(model => model.module === module);
  }
  
  /**
   * Check if a model exists
   */
  hasModel(name: string, module?: string): boolean {
    const key = this.getModelKey({ name, module } as DslModel);
    return this.models.has(key);
  }
  
  /**
   * Get model names (returns keys, e.g., "blog.BlogPost")
   */
  getModelNames(): string[] {
    // Using console.debug
    const keys = Array.from(this.models.keys());
    console.debug(`[DslRegistry] Getting model names (keys):`, keys);
    return keys;
  }
  
  /**
   * Generate a unique key for a model
   */
private getModelKey(model: DslModel | { name: string; module?: string }): string {
  if (!model.module) {
    for (const [key, registeredModel] of this.models.entries()) {
      if (registeredModel.name === model.name) {
        console.debug(`[DslRegistry Instance: ${this.instanceId}] Found model "${model.name}" with key "${key}"`);
        return key;
      }
    }
  }
  return model.module ? `${model.module}.${model.name}` : model.name;
}

  /**
   * Register multiple models in the registry
   *
   * @param models - Array of DSL models to register
   * @param skipIfExists - Set to true during DSL generation phase to allow
   *                       idempotent registration. See registerModel() for details.
   */
  registerMany(models: DslModel[], skipIfExists: boolean = false): void {
    if (typeof globalThis !== 'undefined' && typeof globalThis.console === 'object' && typeof globalThis.console.debug === 'function') {
      globalThis.console.debug(`[DslRegistry Instance: ${this.instanceId}] Registering multiple models: ${models.map(model => model.name).join(', ')}`);
    }
    models.forEach(model => this.registerModel(model, skipIfExists));
  }

  /**
   * Check for cyclic dependencies between models
   */
  checkForCyclicDependencies(): { hasCycles: boolean; cycles: string[][] } {
    const visited: Record<string, boolean> = {};
    const recStack: Record<string, boolean> = {};
    const cycles: string[][] = [];
    const modelKeys = Array.from(this.models.keys());

    const dfs = (modelKey: string, path: string[] = []): boolean => {
      // Mark current node as visited and add to recursion stack
      visited[modelKey] = true;
      recStack[modelKey] = true;
      const currentModel = this.models.get(modelKey);
      if (!currentModel) return false; // Should not happen if modelKey is from this.models.keys()
      
      path.push(currentModel.name); // Use model name for cycle path representation

      // Get the model and its relations
      if (currentModel.relations) {
        for (const relation of currentModel.relations) {
          // Find the key of the target model
          let targetModelKey: string | undefined = undefined;
          for (const [key, m] of this.models.entries()) {
            if (m.name === relation.target && m.module === currentModel.module) { // Prefer same module
                targetModelKey = key;
                break;
            }
            if (m.name === relation.target) { // Fallback to any module
                targetModelKey = key;
            }
          }
          if (!targetModelKey && this.models.has(relation.target)) { // If target is a key itself
            targetModelKey = relation.target;
          }


          if (targetModelKey && this.models.has(targetModelKey)) {
            // If not visited, then check that subtree
            if (!visited[targetModelKey]) {
              if (dfs(targetModelKey, [...path])) {
                return true;
              }
            } 
            // If already in recursion stack, we found a cycle
            else if (recStack[targetModelKey]) {
              const cycleStartModelName = this.models.get(targetModelKey)?.name;
              if (cycleStartModelName) {
                const cycleStartIndex = path.indexOf(cycleStartModelName);
                if (cycleStartIndex !== -1) {
                    cycles.push(path.slice(cycleStartIndex));
                    return true;
                }
              }
            }
          }
        }
      }

      // Remove from recursion stack
      recStack[modelKey] = false;
      return false;
    };

    // Check all models
    for (const modelKey of modelKeys) {
      if (!visited[modelKey]) {
        dfs(modelKey);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles
    };
  }
}

// Use global registry to ensure single instance across all imports
// This solves the multiple instances issue with ESM modules + symlinks
const GLOBAL_REGISTRY_KEY = Symbol.for('typus.dsl.registry');

function getGlobalRegistry(): DslRegistry {
  if (!(globalThis as any)[GLOBAL_REGISTRY_KEY]) {
    console.debug('[DslRegistry] Creating global singleton instance');
    (globalThis as any)[GLOBAL_REGISTRY_KEY] = new DslRegistry();
  } else {
    console.debug('[DslRegistry] Reusing existing global singleton instance');
  }
  return (globalThis as any)[GLOBAL_REGISTRY_KEY];
}

// Export singleton instance
export const registry = getGlobalRegistry();
