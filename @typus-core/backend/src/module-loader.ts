import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path'

import { container } from 'tsyringe';
import express, { Application as ExpressApp } from 'express';
import { loggers } from 'winston';
import 'reflect-metadata';
import { env } from '@/config/env.config.js';
import { modulesConfig } from '@/config/modules.config.js';

// Get current directory path for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ModuleLoader {

  // =================================================================
  // NOTE: tsx runtime approach
  // We always use 'src/' directory regardless of NODE_ENV.
  // This is because we use tsx (TypeScript runtime) instead of compilation.
  // See: work-log/investigations/2025-10-18_production-build-tsx-vs-compile.md
  // =================================================================
  /**
   * @private
   * Determines if the application is running in a production environment.
   * @returns {boolean} - True if in production, otherwise false.
   */
  private static isProductionEnvironment(): boolean {
    const nodeEnv = process.env.NODE_ENV;
    global.logger.debug('[ModuleLoader] NODE_ENV:', nodeEnv);

    if (nodeEnv === 'production') {
      global.logger.debug('[ModuleLoader] Environment: PRODUCTION (tsx runtime)');
      return true;
    }

    global.logger.debug('[ModuleLoader] Environment: DEVELOPMENT');
    return false;
  }

  /**
   * Recursively find all directories containing modules
   * @param baseDir Base directory to search from
   * @param maxDepth Maximum recursion depth (default: 3)
   * @returns Array of directories containing module files
   */
  private static findModuleDirectories(baseDir: string, maxDepth: number = 3): string[] {
    const moduleDirectories: string[] = [];

    const scanDirectory = (dir: string, currentDepth: number = 0) => {
      if (currentDepth > maxDepth || !fs.existsSync(dir)) {
        return;
      }

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        const hasModuleFile = entries.some(entry =>
          entry.isFile() && /.*Module\.(ts|js)$/.test(entry.name)
        );

        if (hasModuleFile) {
          moduleDirectories.push(dir);
        }

        entries.forEach(entry => {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            scanDirectory(path.join(dir, entry.name), currentDepth + 1);
          }
        });
      } catch (error) {
        global.logger.warn(`[ModuleLoader] Cannot read directory ${dir}: ${error.message}`);
      }
    };

    scanDirectory(baseDir);
    return moduleDirectories;
  }

  /**
   * Load core modules from specific directories
   * @param app Express application instance
   * @param stats Application startup statistics
   * @returns Array of loaded core module instances
   */
  static async loadCoreModules(app: ExpressApp, stats: { modulesLoaded: number; warnings: number; errors: number }) {


    // =================================================================
    // tsx runtime approach: always use 'src/' regardless of NODE_ENV
    // This allows production mode to work with tsx instead of compilation
    // =================================================================
    const isProduction = this.isProductionEnvironment();

    // Always use 'src/' for tsx runtime (no compilation)
    const basePath = path.join(process.cwd(), 'src');

    global.logger.info(`[ModuleLoader] Environment detected as: ${isProduction ? 'Production (tsx)' : 'Development'}`);
    global.logger.info(`[ModuleLoader] Using base path for core modules: ${basePath}`);

    const coreModuleDirs = [
      path.join(basePath, 'dsl'),
      path.join(basePath, 'dynamic-router'),
      // Add other core module directories here if needed
    ];
    // =================================================================
    // END OF MODIFIED SECTION
    // =================================================================

    global.logger.info(`[ModuleLoader] Loading core modules from directories: ${coreModuleDirs.join(', ')}`);
    const loadedModules = [];

    for (const coreDir of coreModuleDirs) {
      if (!fs.existsSync(coreDir)) {
        global.logger.warn(`[ModuleLoader] Core module directory ${coreDir} does not exist`);
        continue;
      }

      try {
        global.logger.info(`[ModuleLoader] Loading core module from directory: ${coreDir}`);
        const moduleInstance = await this.loadModuleFromDirectory(coreDir, stats);
        if (!moduleInstance) continue;

        if (moduleInstance.getRouter && moduleInstance.getBasePath) {
          const router = moduleInstance.getRouter();
          const basePath = `${env.API_PATH}/${moduleInstance.getBasePath()}`;

          app.use(basePath, router);

          global.logger.info(`[ModuleLoader] Registered routes for core module ${moduleInstance.constructor.name} at ${basePath}`);

          const routesTable = router.stack
            .filter(r => r.route)
            .map(r => {
              const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(', ');
              return {
                Method: methods,
                Path: `${basePath}${r.route.path}`
              };
            });

          global.logger.table(`[ModuleLoader] Routes for core module ${moduleInstance.constructor.name}:`, routesTable);
        }

        await this.loadModuleComponents(coreDir, stats);

        loadedModules.push(moduleInstance);
      } catch (error) {
        stats.errors++;
        global.logger.error(`[ModuleLoader] Failed to load core module in directory ${coreDir}:`, error);

        if (!modulesConfig.ignoreLoadErrors) {
          throw new Error(`Failed to load core module ${coreDir}: ${error.message}`);
        }
      }
    }

    return loadedModules;
  }

  /**
   * Load all modules from the modules directory and custom paths
   * @param app Express application instance
   * @param stats Application startup statistics
   * @returns Array of loaded module instances
   */
  static async loadModules(app: ExpressApp, stats: { modulesLoaded: number; warnings: number; errors: number }) {
    const moduleDirectoriesToLoad: string[] = [];

    // =================================================================
    // tsx runtime approach: always use 'src/' regardless of NODE_ENV
    // =================================================================
    const isProduction = this.isProductionEnvironment();

    // Always use 'src/' for tsx runtime (no compilation)
    const basePath = path.join(process.cwd(), 'src');

    const defaultModulesDir = path.join(basePath, 'modules');
    // =================================================================
    // END OF MODIFIED SECTION
    // =================================================================

    if (fs.existsSync(defaultModulesDir)) {
      const defaultModuleDirs = this.findModuleDirectories(defaultModulesDir);
      moduleDirectoriesToLoad.push(...defaultModuleDirs);
    }

    if (process.env.CUSTOM_MODULE_PATHS) {
      const customPaths = process.env.CUSTOM_MODULE_PATHS.split(',');
      for (const customPath of customPaths) {
        const trimmedPath = customPath.trim();
        if (trimmedPath) {
          if (fs.existsSync(trimmedPath)) {
            const customModuleDirs = this.findModuleDirectories(trimmedPath);
            moduleDirectoriesToLoad.push(...customModuleDirs);
            global.logger.info(`[ModuleLoader] Found ${customModuleDirs.length} module directories in custom path: ${trimmedPath}`);
          } else {
            global.logger.warn(`[ModuleLoader] Custom module path ${trimmedPath} does not exist. Skipping.`);
          }
        }
      }
    }

    global.logger.info(`[ModuleLoader] Found ${moduleDirectoriesToLoad.length} module directories to load`);

    const loadedModules = [];

    if (modulesConfig.disabledModules.length > 0) {
      global.logger.info(`[ModuleLoader] Disabled modules: ${modulesConfig.disabledModules.join(', ')}`);
    }

    for (const moduleDir of moduleDirectoriesToLoad) {
      const moduleName = path.basename(moduleDir);

      if (modulesConfig.disabledModules.includes(moduleName)) {
        global.logger.info(`[ModuleLoader] Skipping disabled module: ${moduleName}`);
        continue;
      }

      try {
        const moduleInstance = await this.loadModuleFromDirectory(moduleDir, stats);
        if (!moduleInstance) continue;

        if (moduleInstance.getRouter && moduleInstance.getBasePath) {
          const router = moduleInstance.getRouter();
          const basePath = `${env.API_PATH}/${moduleInstance.getBasePath()}`;

          app.use(basePath, router);

          global.logger.info(`[ModuleLoader] Registered routes for ${moduleInstance.constructor.name} at ${basePath}`);

          const routesTable = router.stack
            .filter(r => r.route)
            .map(r => {
              const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(', ');
              return {
                Method: methods,
                Path: `${basePath}${r.route.path}`
              };
            });

          global.logger.table(`[ModuleLoader] Routes for ${moduleInstance.constructor.name}:`, routesTable);
        }

        await this.loadModuleComponents(moduleDir, stats);

        loadedModules.push(moduleInstance);
      } catch (error) {
        stats.errors++;
        global.logger.error(`[ModuleLoader] Failed to load module in directory ${moduleDir}:`, error);

        if (!modulesConfig.ignoreLoadErrors) {
          throw new Error(`Failed to load module ${moduleName}: ${error.message}`);
        }
      }
    }

    return loadedModules;
  }

  /**
   * Load a module from a directory
   * @param moduleDir Directory containing the module
   * @param stats Application startup statistics
   * @returns Module instance or null if no valid module found
   */
  private static async loadModuleFromDirectory(moduleDir: string, stats: { modulesLoaded: number; warnings: number; errors: number }) {
    global.logger.info(`[ModuleLoader] Loading module from directory: ${moduleDir}`);
    const folder = path.basename(moduleDir);

    const moduleFiles = fs.readdirSync(moduleDir).filter(file =>
      /.*Module\.(ts|js)$/.test(file)
    );

    if (moduleFiles.length === 0) {
      stats.warnings++;
      global.logger.warn(`[ModuleLoader] No module file found in ${folder}`);
      return null;
    }

    const modulePath = path.join(moduleDir, moduleFiles[0]);
    const moduleRelativePath = `file://${path.resolve(modulePath)}`;

    global.logger.info(`[ModuleLoader] Loading module from ${moduleRelativePath}`);

    let module;
    try {
      global.logger.debug(`[ModuleLoader] Importing module from ${moduleRelativePath}`);

      const absoluteModulePath = path.resolve(modulePath);
      if (!fs.existsSync(absoluteModulePath)) {
        global.logger.error(`[ModuleLoader] File not found at expected path: ${absoluteModulePath}`);
        if (!modulesConfig.ignoreLoadErrors) {
          throw new Error(`Module file not found: ${absoluteModulePath}`);
        }
        return null;
      }

      global.logger.debug(`[ModuleLoader] Attempting dynamic import from: ${moduleRelativePath}`);
      module = await import(moduleRelativePath);
      global.logger.debug(`[ModuleLoader] Dynamic import result keys: ${Object.keys(module).join(', ')}`);
      global.logger.debug(`[ModuleLoader] Module imported successfully from ${moduleRelativePath}`);
    } catch (error) {
      global.logger.error(`[ModuleLoader] Failed to import module from ${moduleRelativePath}: ${error?.stack || error?.message || error}`);

      if (!modulesConfig.ignoreLoadErrors) {
        throw error;
      }
      return null;
    }

    const ModuleClass = Object.values(module).find(
      exp => typeof exp === 'function' && exp.name.endsWith('Module')
    );

    if (!ModuleClass || typeof ModuleClass !== 'function') {
      stats.warnings++;
      global.logger.warn(`[ModuleLoader] No valid module class found in ${folder}`);
      return null;
    }

    global.logger.info(`[ModuleLoader] Loading module ${ModuleClass.name}`);

    let moduleInstance;
    try {
      if ('getInstance' in ModuleClass) {
        global.logger.info(`[ModuleLoader] Using singleton instance for ${ModuleClass.name}`);
        if (typeof ModuleClass.getInstance === 'function') {
          global.logger.debug(`[ModuleLoader] Attempting to get instance of ${ModuleClass.name}`);
          moduleInstance = ModuleClass.getInstance();
        } else {
          throw new Error(`getInstance is not a function in ${ModuleClass.name}`);
        }
      } else {
        moduleInstance = new (ModuleClass as new () => any)();
      }
      stats.modulesLoaded++;
    } catch (error) {
      stats.errors++;
      global.logger.error(`[ModuleLoader] Failed to instantiate module ${ModuleClass?.name || folder}:`, error);
      if (!modulesConfig.ignoreLoadErrors) {
        throw error;
      }
      return null;
    }

    return moduleInstance;
  }

  /**
   * Load components (services, controllers, repositories) from a module directory
   * @param moduleDir Directory containing the module
   * @param stats Application startup statistics
   */
  private static async loadModuleComponents(moduleDir: string, stats: { modulesLoaded: number; warnings: number; errors: number }) {
    const folder = path.basename(moduleDir);

    global.logger.debug(`[ModuleLoader] Loading components from module directory: ${folder}`);

    const componentDirs = ['services', 'controllers', 'repositories'];

    for (const componentDir of componentDirs) {
      const fullComponentDir = path.join(moduleDir, componentDir);

      if (!fs.existsSync(fullComponentDir) || !fs.statSync(fullComponentDir).isDirectory()) {
        continue;
      }

      const componentFiles = fs.readdirSync(fullComponentDir)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of componentFiles) {
        try {
          const componentPath = path.join(fullComponentDir, file);
          const componentRelativePath = path.relative(path.resolve(__dirname), path.resolve(componentPath)).replace(/\\/g, '/');
          const componentFileUrl = `file://${path.resolve(componentPath)}`;

          global.logger.info(`[ModuleLoader] Loading component from ${componentRelativePath}`);

          await import(componentFileUrl);
        } catch (error) {
          stats.errors++;
          global.logger.error(`[ModuleLoader] Failed to load component ${file}:`, error);

          if (!modulesConfig.ignoreLoadErrors) {
            throw new Error(`Failed to load component ${file}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Load plugin modules from plugins directory
   * @param app Express application instance
   * @param stats Application startup statistics
   * @returns Array of loaded plugin module instances
   */
  static async loadPluginModules(app: ExpressApp, stats: { modulesLoaded: number; warnings: number; errors: number }) {
    // Plugins are at same level as src/ directory
    const pluginsBaseDir = path.join(__dirname, '..', '..', '..', 'plugins');

    if (!fs.existsSync(pluginsBaseDir)) {
      global.logger.info('[ModuleLoader] Plugins directory not found, skipping plugin modules');
      return [];
    }

    global.logger.info(`[ModuleLoader] Scanning plugins directory: ${pluginsBaseDir}`);

    const pluginDirs = fs.readdirSync(pluginsBaseDir)
      .map(name => path.join(pluginsBaseDir, name))
      .filter(dir => {
        try {
          return fs.statSync(dir).isDirectory();
        } catch {
          return false;
        }
      });

    global.logger.info(`[ModuleLoader] Found ${pluginDirs.length} plugin(s)`);

    const loadedModules = [];

    for (const pluginDir of pluginDirs) {
      const pluginName = path.basename(pluginDir);
      const backendDir = path.join(pluginDir, 'backend');

      if (!fs.existsSync(backendDir)) {
        global.logger.debug(`[ModuleLoader] Plugin ${pluginName} has no backend directory, skipping`);
        continue;
      }

      // Find module directories in plugin backend (max depth: 2)
      const moduleDirectories = this.findModuleDirectories(backendDir, 2);

      if (moduleDirectories.length === 0) {
        global.logger.warn(`[ModuleLoader] Plugin ${pluginName} has no module files in backend directory`);
        continue;
      }

      global.logger.info(`[ModuleLoader] Loading plugin: ${pluginName}`);

      for (const moduleDir of moduleDirectories) {
        try {
          const moduleInstance = await this.loadModuleFromDirectory(moduleDir, stats);
          if (!moduleInstance) continue;

          if (moduleInstance.getRouter && moduleInstance.getBasePath) {
            const router = moduleInstance.getRouter();
            const basePath = `${env.API_PATH}/${moduleInstance.getBasePath()}`;

            app.use(basePath, router);

            global.logger.info(`[ModuleLoader] ✅ Registered plugin module ${moduleInstance.constructor.name} at ${basePath}`);

            const routesTable = router.stack
              .filter(r => r.route)
              .map(r => {
                const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(', ');
                return {
                  Method: methods,
                  Path: `${basePath}${r.route.path}`
                };
              });

            global.logger.table(`[ModuleLoader] Plugin routes for ${moduleInstance.constructor.name}:`, routesTable);
          }

          await this.loadModuleComponents(moduleDir, stats);

          loadedModules.push(moduleInstance);
        } catch (error) {
          stats.errors++;
          global.logger.error(`[ModuleLoader] Failed to load plugin module ${pluginName}:`, error);

          if (!modulesConfig.ignoreLoadErrors) {
            throw new Error(`Failed to load plugin module ${pluginName}: ${error.message}`);
          }
        }
      }
    }

    global.logger.info(`[ModuleLoader] Loaded ${loadedModules.length} plugin module(s)`);
    return loadedModules;
  }

  /**
   * Load and register plugin worker handlers
   * Scans plugin worker handler directories for TaskHandler files
   * Registers handlers in TaskHandlerRegistry using DI container
   * @param stats Application startup statistics
   */
  static async loadPluginWorkers(stats: { modulesLoaded: number; warnings: number; errors: number }) {
    const pluginsBaseDir = path.join(__dirname, '..', '..', '..', 'plugins');

    if (!fs.existsSync(pluginsBaseDir)) {
      global.logger.info('[ModuleLoader] No plugins directory, skipping plugin workers');
      return;
    }

    global.logger.info(`[ModuleLoader] Scanning for plugin workers in: ${pluginsBaseDir}`);

    // Get all plugin directories
    const pluginDirs = fs.readdirSync(pluginsBaseDir)
      .map(name => path.join(pluginsBaseDir, name))
      .filter(dir => {
        try {
          return fs.statSync(dir).isDirectory();
        } catch {
          return false;
        }
      });

    global.logger.info(`[ModuleLoader] Found ${pluginDirs.length} plugin(s) to scan for workers`);

    // ✅ PARALLEL LOADING: Load all plugins concurrently
    const results = await Promise.allSettled(
      pluginDirs.map(pluginDir => this.loadPluginWorkersFromDir(pluginDir, stats))
    );

    // Analyze results
    let registeredCount = 0;
    const failedPlugins: string[] = [];

    results.forEach((result, idx) => {
      const pluginName = path.basename(pluginDirs[idx]);

      if (result.status === 'fulfilled') {
        registeredCount += result.value;
      } else {
        failedPlugins.push(pluginName);
        global.logger.error(`[ModuleLoader] Plugin ${pluginName} failed to load:`, result.reason);
        stats.errors++;
      }
    });

    global.logger.info(`[ModuleLoader] 📊 Plugin Workers Registration Summary:`);
    global.logger.info(`[ModuleLoader]   - Plugins scanned: ${pluginDirs.length}`);
    global.logger.info(`[ModuleLoader]   - Handlers registered: ${registeredCount}`);

    if (failedPlugins.length > 0) {
      global.logger.warn(`[ModuleLoader]   - Failed plugins: ${failedPlugins.join(', ')}`);
    }

    if (registeredCount > 0) {
      global.logger.info(`[ModuleLoader] ✅ Successfully registered ${registeredCount} plugin worker handler(s)`);
    }
  }

  /**
   * Load worker handlers from a single plugin directory
   * @returns Number of handlers registered from this plugin
   */
  private static async loadPluginWorkersFromDir(
    pluginDir: string,
    stats: { modulesLoaded: number; warnings: number; errors: number }
  ): Promise<number> {
    const pluginName = path.basename(pluginDir);
    const workersHandlersDir = path.join(pluginDir, 'workers', 'handlers');

    if (!fs.existsSync(workersHandlersDir)) {
      global.logger.debug(`[ModuleLoader] Plugin ${pluginName} has no workers/handlers directory, skipping`);
      return 0;
    }

    global.logger.info(`[ModuleLoader] Loading worker handlers from plugin: ${pluginName}`);

    // Find all TaskHandler files
    const handlerFiles = fs.readdirSync(workersHandlersDir)
      .filter(file => /.*TaskHandler\.(ts|js)$/.test(file))
      .map(file => path.join(workersHandlersDir, file));

    if (handlerFiles.length === 0) {
      global.logger.warn(`[ModuleLoader] Plugin ${pluginName} has no TaskHandler files in workers/handlers/`);
      return 0;
    }

    global.logger.info(`[ModuleLoader] Found ${handlerFiles.length} handler file(s) in ${pluginName}`);

    let registeredCount = 0;

    // Load each handler file
    for (const handlerPath of handlerFiles) {
      const handlerFileName = path.basename(handlerPath);

      try {
        global.logger.info(`[ModuleLoader] Loading handler from ${handlerFileName}...`);

        // Convert file path to URL format for dynamic import()
        const fileUrl = `file://${path.resolve(handlerPath)}`;
        const handlerModule = await import(fileUrl);

        global.logger.debug(`[ModuleLoader] Handler module exports: ${Object.keys(handlerModule).join(', ')}`);

        // Find and register all exported TaskHandler classes
        for (const [exportName, exportedValue] of Object.entries(handlerModule)) {
          global.logger.debug(`[ModuleLoader] Checking export: ${exportName}`);

          // Check if exported value is a TaskHandler class (ends with 'TaskHandler')
          if (typeof exportedValue === 'function' && exportName.endsWith('TaskHandler')) {
            try {
              // Resolve handler instance through DI container
              const handlerInstance = container.resolve(exportedValue as any);

              // Import TaskHandlerRegistry dynamically to avoid circular dependency
              const { TaskHandlerRegistry } = await import('@/core/queue/handlers/TaskHandlerRegistry.js');

              // Register handler in TaskHandlerRegistry
              TaskHandlerRegistry.register(handlerInstance);

              global.logger.info(`[ModuleLoader] ✅ Registered plugin handler: ${exportName} from ${pluginName}`);
              registeredCount++;
              stats.modulesLoaded++;
            } catch (error) {
              stats.errors++;
              global.logger.error(`[ModuleLoader] Failed to register handler ${exportName} from ${pluginName}:`, error);

              if (!modulesConfig.ignoreLoadErrors) {
                throw new Error(`Failed to register handler ${exportName} from ${pluginName}: ${error.message}`);
              }
            }
          } else {
            global.logger.debug(`[ModuleLoader] Export ${exportName} is not a TaskHandler class`);
          }
        }
      } catch (error) {
        stats.errors++;
        global.logger.error(`[ModuleLoader] Failed to load handler file ${handlerFileName} from ${pluginName}:`, error);

        if (!modulesConfig.ignoreLoadErrors) {
          throw new Error(`Failed to load handler file ${handlerFileName} from ${pluginName}: ${error.message}`);
        }
      }
    }

    return registeredCount;
  }
}
