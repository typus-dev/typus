/**
 * Module configuration
 * This file contains settings for module loading
 */

export interface ModulesConfig {
  /**
   * List of module names that should be disabled
   * These modules will not be loaded by the ModuleLoader
   */
  disabledModules: string[];

  /**
   * If true, module loading errors will not crash the application
   * Default: true
   */
  ignoreLoadErrors: boolean;
}

/**
 * Module configuration
 */
export const modulesConfig: ModulesConfig = {
  // List of modules to disable (folder names in src/modules directory)
  disabledModules: [
    // 'auth',   // Re-enabled for lite
    'shop',
    'server',
    'subscription'
    // Make sure 'log' is not in this list
  ],
  
  // Ignore module loading errors to prevent them from affecting the application
  // Set to true to allow backend to start even if some modules fail (e.g., missing API keys)
  ignoreLoadErrors: true
};

export default modulesConfig;
