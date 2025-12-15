import { BaseModule } from '../core/base/BaseModule.js';
import { DslController } from './controllers/DslController.js';
import { DslService } from './services/DslService.js';
import { container } from 'tsyringe'; // Keep container for other resolves
import { Module } from '../core/decorators/component.js';
import { dslOperationSchema } from './validation/dslSchemas.js';
import { registry as registryAdapter } from './registry-adapter.js';
import { registry as sharedRegistryInstance } from '@typus-core/shared/dsl/registry'; // Import from registry.ts
import { DynamicRouterService } from '../dynamic-router/services/DynamicRouterService.js';
import { ValidationMiddleware } from '../core/middleware/ValidationMiddleware.js'; // Import ValidationMiddleware
import { DslPreAuthMiddleware } from './middlewares/DslPreAuthMiddleware.js';
import { QueueService } from '../core/queue/QueueService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define a generic HookServices interface
interface HookServices {
    dynamicRouterService: DynamicRouterService;
    prisma: any;
    logger: any;
    [key: string]: any;
}

/**
 * DSL module for handling model operations
 */
export class DslModule extends BaseModule<DslController, DslService> { // Add generic types
    private static instance: DslModule;
    private static modelsRegistered: boolean = false;

    // Promise for plugin loading completion
    private static pluginsLoadedPromise: Promise<void> | null = null;
    private static pluginsLoadedResolver: (() => void) | null = null;

    constructor() {
        const basePath = 'dsl';

        // Initialize completion promise
        if (!DslModule.pluginsLoadedPromise) {
            DslModule.pluginsLoadedPromise = new Promise<void>((resolve) => {
                DslModule.pluginsLoadedResolver = resolve;
            });
        }

        // Pass classes directly to super
        super(basePath, DslController, DslService);

        this.initializeAsync();

        this.logger.info(`[${this.moduleName}] module initialized successfully`);
    }

    /**
     * Get DslPreAuthMiddleware instance using lazy loading pattern
     * Following the same approach as BaseModule.getAuthMiddleware()
     */
    private getDslPreAuthMiddleware(): DslPreAuthMiddleware {
        try {
            return new DslPreAuthMiddleware();
        } catch (error) {
            this.logger.error(`[${this.moduleName}] Failed to create DslPreAuthMiddleware`, error);
            throw new Error('DslPreAuthMiddleware is not available');
        }
    }

    private async initializeAsync() {
        if (!DslModule.modelsRegistered) {
            await this.registerModels();
        }
        await this.registerCustomHooks();
    }
    /**
     * Register DSL models automatically
     * Scans model directories and registers all models
     */
    private async registerModels(): Promise<void> {
        try {
            // Get path to shared models directory
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const modelsDir = path.resolve(__dirname, '../../../shared/dsl/models');

            this.logger.info(`[${this.moduleName}] Scanning for models in: ${modelsDir}`);

            // Check if directory exists
            if (!fs.existsSync(modelsDir)) {
                this.logger.error(`[${this.moduleName}] Models directory does not exist: ${modelsDir}`);
                return;
            }

            // Find all model files recursively
            const modelFiles = await this.findModelFiles(modelsDir);
            this.logger.info(`[${this.moduleName}] Found ${modelFiles.length} model files: ${modelFiles.join(', ')}`);

            let registeredCount = 0;

            for (const filePath of modelFiles) {
                this.logger.info(`[${this.moduleName}] Loading models from ${filePath}...`);

                try {
                    // Convert file path to URL format for import()
                    const fileUrl = `file://${filePath}`;
                    const module = await import(fileUrl);

                    this.logger.debug(`[${this.moduleName}] Module exports: ${Object.keys(module).join(', ')}`);

                    // Register all exported models
                    for (const [exportName, exportedValue] of Object.entries(module)) {
                        this.logger.debug(`[${this.moduleName}] Checking export: ${exportName}`);

                        // Check if the exported value is a DslModel
                        if (exportedValue &&
                            typeof exportedValue === 'object' &&
                            'name' in exportedValue &&
                            'fields' in exportedValue) {

                            // Type assertion to DslModel
                            const model = exportedValue as import('@typus-core/shared/dsl/types').DslModel;
                            // Use skipIfExists=true at runtime since models self-register on import
                            sharedRegistryInstance.registerModel(model, true);
                            this.logger.info(`[${this.moduleName}] ✅ Registered model: ${model.name} (export: ${exportName})`);
                            registeredCount++;
                        } else {
                            this.logger.debug(`[${this.moduleName}] ❌ Export ${exportName} is not a valid DslModel`);
                        }
                    }
                } catch (fileError) {
                    this.logger.error(`[${this.moduleName}] Error loading file ${filePath}:`, fileError);
                }
            }

            // Log final registry state
            const registeredModels = sharedRegistryInstance.getModelNames();
            this.logger.info(`[${this.moduleName}] 📊 Registration Summary:`);
            this.logger.info(`[${this.moduleName}]   - Files processed: ${modelFiles.length}`);
            this.logger.info(`[${this.moduleName}]   - Models registered: ${registeredCount}`);
            this.logger.info(`[${this.moduleName}]   - Registry contains: ${registeredModels.join(', ')}`);

            // Display registered models table
            if (registeredModels.length > 0) {
                const modelsTable = registeredModels.map((name, index) => ({
                    '#': index + 1,
                    'Model Name': name,
                    'Status': '✅ Registered'
                }));
                console.table(modelsTable);

                // Generate TypeScript interfaces after successful registration
                try {
                    this.logger.info(`[${this.moduleName}] Generating TypeScript interfaces...`);
                    const { interfaceGenerator } = await import('@typus-core/shared/dsl/generators/index.js');
                    interfaceGenerator.generate();
                    this.logger.info(`[${this.moduleName}] ✅ TypeScript interfaces generated successfully`);
                } catch (genError) {
                    this.logger.error(`[${this.moduleName}] Failed to generate TypeScript interfaces:`, genError);
                }
            }

            // Scan and register plugin models
            const pluginsDir = path.resolve(__dirname, '../../../../plugins');
            if (fs.existsSync(pluginsDir)) {
                this.logger.info(`[${this.moduleName}] Scanning plugins in: ${pluginsDir}`);

                const plugins = fs.readdirSync(pluginsDir).filter(p => {
                    const stat = fs.statSync(path.join(pluginsDir, p));
                    return stat.isDirectory();
                });

                this.logger.info(`[${this.moduleName}] Found ${plugins.length} plugin(s): ${plugins.join(', ')}`);

                let pluginModelsLoaded = 0;
                for (const pluginName of plugins) {
                    const pluginPath = path.join(pluginsDir, pluginName);
                    const pluginModelsDir = path.join(pluginPath, 'shared', 'dsl');

                    if (!fs.existsSync(pluginModelsDir)) {
                        this.logger.debug(`[${this.moduleName}] No DSL models in plugin: ${pluginName}`);
                        continue;
                    }

                    this.logger.info(`[${this.moduleName}] Loading plugin DSL models: ${pluginName}`);
                    const pluginModelFiles = fs.readdirSync(pluginModelsDir)
                        .filter(f => f.endsWith('.model.ts') || f.endsWith('.model.js'));

                    for (const modelFile of pluginModelFiles) {
                        const modelPath = path.join(pluginModelsDir, modelFile);
                        try {
                            // Import using file:// URL, replacing .ts with .js for runtime
                            const fileUrl = `file://${modelPath.replace('.ts', '.js')}`;
                            await import(fileUrl);
                            pluginModelsLoaded++;
                            this.logger.info(`[${this.moduleName}] ✅ Loaded plugin model: ${pluginName}/${modelFile}`);
                        } catch (error) {
                            this.logger.error(`[${this.moduleName}] Failed to load ${pluginName}/${modelFile}:`, error);
                        }
                    }
                }

                // Log updated registry after plugin loading
                const allModels = sharedRegistryInstance.getModelNames();
                this.logger.info(`[${this.moduleName}] 🎉 Final registry: ${allModels.length} models (${registeredModels.length} core + ${pluginModelsLoaded} plugin)`);
                this.logger.info(`[${this.moduleName}] All models: ${allModels.join(', ')}`);
            } else {
                this.logger.warn(`[${this.moduleName}] Plugins directory not found: ${pluginsDir}`);
            }

            DslModule.modelsRegistered = true;

            // Resolve the plugins loaded promise
            if (DslModule.pluginsLoadedResolver) {
                DslModule.pluginsLoadedResolver();
                this.logger.info(`[${this.moduleName}] ✅ All plugins loaded signal sent`);
            }
        } catch (error) {
            this.logger.error(`[${this.moduleName}] Failed to register models:`, error);

            // Resolve even on error (don't block startup)
            if (DslModule.pluginsLoadedResolver) {
                DslModule.pluginsLoadedResolver();
                this.logger.warn(`[${this.moduleName}] ⚠️ Plugins loaded signal sent (with errors)`);
            }
        }
    }

    /**
     * Helper method to find model files recursively
     * Searches for files ending with .model.ts
     */
    private async findModelFiles(dir: string): Promise<string[]> {
        let results: string[] = [];

        try {
            const files = await fs.promises.readdir(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.promises.stat(filePath);

                if (stat.isDirectory()) {
                    // Recursively search subdirectories
                    const subResults = await this.findModelFiles(filePath);
                    results = results.concat(subResults);
                } else if (file.endsWith('.model.ts') || file.endsWith('.model.js')) {
                    // Found a model file
                    results.push(filePath);
                }
            }
        } catch (error) {
            this.logger.error(`[${this.moduleName}] Error finding model files:`, error);
        }

        return results;
    }

    /**
     * Registers custom DSL hooks.
     */
    private async registerCustomHooks(): Promise<void> {
        const dynamicRouterService = container.resolve(DynamicRouterService);
        const queueService = container.resolve(QueueService);
        const prisma = global.prisma;

        // Optional services - will be undefined if modules not loaded
        let notificationsService, emailService, templateService;

        this.logger.info(`[${this.moduleName}] Optional services will be resolved dynamically by hooks if needed`);

        try {
            // Base services for hooks
            const hookServices: HookServices = {
                dslService: this.service,
                dynamicRouterService,
                notificationsService,
                emailService,
                templateService,
                queueService,
                prisma,
                logger: this.logger
            };

            // Get current module directory
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            // Find all hook files in modules directory
            const modulesDir = path.resolve(__dirname, '../modules');
            this.logger.info(`[${this.moduleName}] Searching for hooks in: ${modulesDir}`);

            const hookFiles = await this.findHookFiles(modulesDir);
            this.logger.info(`[${this.moduleName}] Found ${hookFiles.length} hook files:`, hookFiles);

            const registrationStats = {
                totalHandlers: 0,
                registeredHooks: 0,
                skippedHandlers: [] as string[],
                invalidModels: [] as string[]
            };

            for (const filePath of hookFiles) {
                this.logger.info(`[${this.moduleName}] Loading hooks from ${filePath}...`);

                try {
                    const fileUrl = `file://${filePath}`;
                    const moduleExports = await import(fileUrl);

                    this.logger.debug(`[${this.moduleName}] Module exports:`, Object.keys(moduleExports));

                    // Get all exported hook handler functions
                    const hookHandlers = Object.entries(moduleExports)
                        .filter(([key, value]) => key.includes('Handler') && typeof value === 'function');

                    registrationStats.totalHandlers += hookHandlers.length;
                    this.logger.debug(`[${this.moduleName}] Found handlers:`, hookHandlers.map(([key]) => key));

                    // Register each hook
                    for (const [handlerName, handler] of hookHandlers) {
                        // Match pattern: beforeCreateContactHandler, afterUpdateUserHandler, afterReadConfigHandler, etc.
                        const match = handlerName.match(/^(before|after)(Create|Update|Delete|Read)(.+)Handler$/);

                        if (match) {
                            const [_, timing, operation, modelName] = match;

                            // Check if model exists in registry
                            if (!registryAdapter.hasModel(modelName)) {
                                const availableModels = registryAdapter.getModelNames();
                                const similarModels = this.findSimilarModels(modelName, availableModels);

                                this.logger.warn(`[${this.moduleName}] ⚠️ Handler '${handlerName}' references unknown model '${modelName}'`);
                                if (similarModels.length > 0) {
                                    this.logger.warn(`[${this.moduleName}] Did you mean: ${similarModels.join(', ')}?`);
                                }

                                registrationStats.invalidModels.push(`${handlerName} → ${modelName}`);
                                continue;
                            }

                            const hookType = `${timing}${operation}`;

                            this.logger.info(`[${this.moduleName}] Registering ${hookType} hook for ${modelName}`);

                            // Wrapper function that merges hookServices with metadata
                            this.service.registerHook(modelName, hookType,
                                (data: any, metadata?: any) => {
                                    // Merge hookServices with metadata into context
                                    const context = {
                                        ...hookServices,
                                        metadata  // filter, operation, user
                                    };
                                    return (handler as Function)(data, context);
                                }
                            );

                            registrationStats.registeredHooks++;
                            this.logger.debug(`[${this.moduleName}] ✅ Registered ${hookType} hook for ${modelName}`);
                        } else {
                            this.logger.debug(`[${this.moduleName}] ❌ Handler ${handlerName} doesn't match pattern`);
                            registrationStats.skippedHandlers.push(handlerName);
                        }
                    }
                } catch (error) {
                    this.logger.error(`[${this.moduleName}] Error loading ${filePath}:`, error);
                    continue;
                }
            }

            // Scan and register plugin hooks
            const pluginsDir = path.resolve(__dirname, '../../../../plugins');
            if (fs.existsSync(pluginsDir)) {
                this.logger.info(`[${this.moduleName}] Scanning for plugin hooks in: ${pluginsDir}`);

                const plugins = fs.readdirSync(pluginsDir).filter(p => {
                    const stat = fs.statSync(path.join(pluginsDir, p));
                    return stat.isDirectory();
                });

                this.logger.info(`[${this.moduleName}] Found ${plugins.length} plugin(s): ${plugins.join(', ')}`);

                for (const pluginName of plugins) {
                    const pluginPath = path.join(pluginsDir, pluginName);
                    const pluginHooksDir = path.join(pluginPath, 'backend', 'dsl');

                    if (!fs.existsSync(pluginHooksDir)) {
                        this.logger.debug(`[${this.moduleName}] No DSL hooks in plugin: ${pluginName}`);
                        continue;
                    }

                    this.logger.info(`[${this.moduleName}] Loading plugin DSL hooks: ${pluginName}`);

                    const pluginHookFiles = await this.findHookFiles(pluginHooksDir);

                    for (const filePath of pluginHookFiles) {
                        this.logger.info(`[${this.moduleName}] Loading plugin hooks from ${filePath}...`);

                        try {
                            const fileUrl = `file://${filePath}`;
                            const moduleExports = await import(fileUrl);

                            this.logger.debug(`[${this.moduleName}] Plugin module exports:`, Object.keys(moduleExports));

                            // Get all exported hook handler functions
                            const hookHandlers = Object.entries(moduleExports)
                                .filter(([key, value]) => key.includes('Handler') && typeof value === 'function');

                            registrationStats.totalHandlers += hookHandlers.length;
                            this.logger.debug(`[${this.moduleName}] Found plugin handlers:`, hookHandlers.map(([key]) => key));

                            // Register each hook
                            for (const [handlerName, handler] of hookHandlers) {
                                const match = handlerName.match(/^(before|after)(Create|Update|Delete|Read)(.+)Handler$/);

                                if (match) {
                                    const [_, timing, operation, modelName] = match;

                                    // Check if model exists in registry
                                    if (!registryAdapter.hasModel(modelName)) {
                                        const availableModels = registryAdapter.getModelNames();
                                        const similarModels = this.findSimilarModels(modelName, availableModels);

                                        this.logger.warn(`[${this.moduleName}] ⚠️ Plugin handler '${handlerName}' references unknown model '${modelName}'`);
                                        if (similarModels.length > 0) {
                                            this.logger.warn(`[${this.moduleName}] Did you mean: ${similarModels.join(', ')}?`);
                                        }

                                        registrationStats.invalidModels.push(`${handlerName} → ${modelName} (plugin: ${pluginName})`);
                                        continue;
                                    }

                                    const hookType = `${timing}${operation}`;

                                    this.logger.info(`[${this.moduleName}] Registering plugin ${hookType} hook for ${modelName} (${pluginName})`);

                                    // Wrapper function that merges hookServices with metadata
                                    this.service.registerHook(modelName, hookType,
                                        (data: any, metadata?: any) => {
                                            // Merge hookServices with metadata into context
                                            const context = {
                                                ...hookServices,
                                                metadata  // filter, operation, user
                                            };
                                            return (handler as Function)(data, context);
                                        }
                                    );

                                    registrationStats.registeredHooks++;
                                    this.logger.debug(`[${this.moduleName}] ✅ Registered plugin ${hookType} hook for ${modelName}`);
                                } else {
                                    this.logger.debug(`[${this.moduleName}] ❌ Plugin handler ${handlerName} doesn't match pattern`);
                                    registrationStats.skippedHandlers.push(`${handlerName} (plugin: ${pluginName})`);
                                }
                            }
                        } catch (error) {
                            this.logger.error(`[${this.moduleName}] Error loading plugin hook ${filePath}:`, error);
                            continue;
                        }
                    }
                }
            } else {
                this.logger.warn(`[${this.moduleName}] Plugins directory not found: ${pluginsDir}`);
            }

            // Log comprehensive statistics
            this.logHookRegistrationStats(registrationStats);

            this.logger.info(`[${this.moduleName}] DSL hooks auto-registration completed successfully`);
        } catch (error) {
            this.logger.error(`[${this.moduleName}] Error registering hooks:`, error);
        }
    }

    /**
     * Log detailed hook registration statistics
     */
    private logHookRegistrationStats(stats: any): void {
        this.logger.info(`[${this.moduleName}] 🎯 Hook Registration Summary:`);
        this.logger.info(`[${this.moduleName}]   - Total handlers found: ${stats.totalHandlers}`);
        this.logger.info(`[${this.moduleName}]   - Successfully registered: ${stats.registeredHooks}`);
        this.logger.info(`[${this.moduleName}]   - Skipped (invalid pattern): ${stats.skippedHandlers.length}`);
        this.logger.info(`[${this.moduleName}]   - Invalid models: ${stats.invalidModels.length}`);

        if (stats.skippedHandlers.length > 0) {
            this.logger.warn(`[${this.moduleName}] ⚠️ Skipped handlers:`, stats.skippedHandlers);
        }

        if (stats.invalidModels.length > 0) {
            this.logger.warn(`[${this.moduleName}] ❌ Invalid model references:`, stats.invalidModels);
        }

        if (stats.registeredHooks > 0) {
            this.logger.info(`[${this.moduleName}] ✅ Hook registration completed successfully`);
        }
    }

    /**
     * Find similar model names for suggestions
     */
    private findSimilarModels(target: string, availableModels: string[]): string[] {
        return availableModels
            .filter(model => {
                const modelWithoutPrefix = model.replace(/^[A-Z][a-z]+/, ''); // Remove module prefix
                return modelWithoutPrefix.toLowerCase().includes(target.toLowerCase()) ||
                    target.toLowerCase().includes(modelWithoutPrefix.toLowerCase());
            })
            .slice(0, 3); // Limit suggestions
    }
    // Helper method to find hook files recursively
    private async findHookFiles(dir: string): Promise<string[]> {
        let results: string[] = [];

        try {
            const files = await fs.promises.readdir(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.promises.stat(filePath);

                if (stat.isDirectory()) {
                    // Recursively search subdirectories
                    const subResults = await this.findHookFiles(filePath);
                    results = results.concat(subResults);
                } else if (file.endsWith('hooks.dsl.ts') || file.endsWith('hooks.dsl.js')) {
                    // Found a hook file
                    results.push(filePath);
                }
            }
        } catch (error) {
            this.logger.error(`[${this.moduleName}] Error finding hook files:`, error);
        }

        return results;
    }

    /**
     * Get singleton instance
     */
    static getInstance(): DslModule {
        return !DslModule.instance ? DslModule.instance = new DslModule() : DslModule.instance;
    }

    /**
     * Initialize module
     */
    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] module initialized`);
    }

    /**
     * Initialize module routes
     */
    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);

        // Main endpoint for all DSL operations (smart authentication based on model access control)
        this.router.post('/', [
            this.getDslPreAuthMiddleware().middleware(),
            ValidationMiddleware.validate(dslOperationSchema, 'body') // Use ValidationMiddleware directly
        ], this.controller.handleOperation.bind(this.controller));

        // Endpoint for getting model metadata
        this.router.get('/metadata/:modelName', [this.auth()], this.controller.getModelMetadata.bind(this.controller));

        // Endpoint for getting registry
        this.router.get('/registry', [this.auth()], this.controller.getRegistry.bind(this.controller));

        // Module-specific endpoints
        this.setupModuleRoutes();

        // Relationship endpoints
        this.setupRelationshipRoutes();

        this.logger.info(`[${this.moduleName}] routes initialized`);
    }

    /**
     * Setup module-specific routes
     */
    private setupModuleRoutes(): void {
        this.logger.debug(`[${this.moduleName}] Setting up module routes...`);
        // Get all models from registry adapter
        const models = registryAdapter.getAllModels();

        this.logger.debug(`[${this.moduleName}] Found models:`, models);

        // Group models by module
        const moduleModels: Record<string, any[]> = {};

        for (const model of models) {
            const module = model.module || 'default';

            if (!moduleModels[module]) {
                moduleModels[module] = [];
            }

            moduleModels[module].push(model);
        }

        // Create routes for each module
        for (const [module, moduleModelList] of Object.entries(moduleModels)) {
            // Skip default module (handled by main endpoint)
            if (module === 'default') continue;

            this.logger.info(`[${this.moduleName}] Setting up routes for module: ${module}`);

            // Create module endpoint
            this.router.post(`/${module}`, [
                this.auth(),
                ValidationMiddleware.validate(dslOperationSchema) // Use ValidationMiddleware directly
            ], this.controller.handleOperation.bind(this.controller));

            // Create model-specific endpoints
            for (const model of moduleModelList) {
                const modelName = model.name.toLowerCase();

                this.router.post(`/${module}/${modelName}`, [
                    this.auth(),
                    ValidationMiddleware.validate(dslOperationSchema) // Use ValidationMiddleware directly
                ], this.controller.handleOperation.bind(this.controller));
            }
        }
    }

    /**
     * Setup relationship routes
     */
    private setupRelationshipRoutes(): void {
        this.logger.debug(`[${this.moduleName}] Setting up relationship routes...`);
        // Get all models from registry adapter
        const models = registryAdapter.getAllModels();

        this.logger.debug(`[${this.moduleName}] Found models:`, models);

        for (const model of models) {
            const modelName = model.name.toLowerCase();
            const module = model.module || '';
            const basePath = module ? `/${module}/${modelName}` : `/${modelName}`;

            // Skip models without relations
            if (!model.relations || model.relations.length === 0) continue;

            this.logger.info(`[${this.moduleName}] Setting up relationship routes for model: ${model.name}`);

            // Create relationship endpoints
            for (const relation of model.relations) {
                const relationName = relation.name.toLowerCase();

                // GET /:id/:relation - Get related entities
                this.router.post(`${basePath}/:id/${relationName}`, [
                    this.auth(),
                    ValidationMiddleware.validate(dslOperationSchema) // Use ValidationMiddleware directly
                ], this.controller.handleOperation.bind(this.controller));
            }
        }
    }

    /**
     * Static method for external scripts to wait for all plugins to be loaded
     * Used by schema generation script to ensure all models are registered
     *
     * @returns Promise that resolves when all plugins are loaded
     */
    static async waitForPluginsReady(): Promise<void> {
        if (DslModule.pluginsLoadedPromise) {
            console.log('[DslModule] ⏳ Waiting for plugins to load...');
            await DslModule.pluginsLoadedPromise;
            console.log('[DslModule] ✅ All plugins loaded and ready');
        } else {
            console.log('[DslModule] ℹ️ No plugins loading promise found (already loaded or not initialized)');
        }
    }
}
