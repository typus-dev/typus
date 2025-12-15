/**
 * Component mapper utility
 * Maps component names to actual component imports
 * 
 * This simplified version leverages the unplugin-vue-components plugin
 * which automatically registers components from specified directories.
 * Instead of using import.meta.glob() which has limitations in Vite 5.4+,
 * this implementation uses Vue's resolveComponent API to access globally
 * registered components.
 */
;
import { resolveComponent, getCurrentInstance } from 'vue';

// Cache for resolved components
const componentCache: Record<string, any> = {};

/**
 * Initialize component map
 * This is a no-op function that exists for backward compatibility.
 * Components are automatically registered by unplugin-vue-components.
 */
export async function initComponentMap(): Promise<void> {
  logger.info('[ComponentMapper] Using auto-registered components from unplugin-vue-components');
  return Promise.resolve();
}

/**
 * Get component by name
 * Uses Vue's resolveComponent to access globally registered components
 * 
 * @param componentName Name of the component
 * @returns Component or null if not found
 */
export function getComponentByName(componentName: string | undefined): any {
  if (!componentName) {
    logger.warn('[ComponentMapper] Component name is undefined');
    return null;
  }
  
  // Check cache first
  if (componentCache[componentName]) {
    return componentCache[componentName];
  }
  
  try {
    // Get current instance to access the app context
    const instance = getCurrentInstance();
    
    if (!instance) {
      // If we're outside of a component context, we can't use resolveComponent
      // This might happen during SSR or in certain testing scenarios
      logger.warn('[ComponentMapper] No Vue instance context available');
      return null;
    }
    
    // Use Vue's resolveComponent to get the globally registered component
    const component = resolveComponent(componentName);
    
    if (component) {
      // Cache the result
      componentCache[componentName] = component;
      return component;
    }
    
    logger.warn(`[ComponentMapper] Component not found: ${componentName}`);
    return null;
  } catch (error) {
    logger.warn(`[ComponentMapper] Error resolving component: ${componentName}`, { error });
    return null;
  }
}

/**
 * Register additional components manually if needed
 * Note: For most cases, you should rely on the automatic registration
 * provided by unplugin-vue-components
 * 
 * @param name Component name
 * @param component Component
 */
export function registerComponent(name: string, component: any): void {
  componentCache[name] = component;
  logger.debug(`[ComponentMapper] Manually cached component: ${name}`);
}

/**
 * Get all registered components
 * This is a limited implementation that only returns manually registered components
 * 
 * @returns Record of component names to components
 */
export function getAllComponents(): Record<string, any> {
  return { ...componentCache };
}

export default {
  getComponentByName,
  registerComponent
};
