import { readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registry } from './registry/index.js';

/**
 * Automatically scan and register all models from models directory
 */
export async function registerAllModels(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const modelsDir = join(__dirname, 'models');

  console.log('[registerAllModels] Scanning core models directory:', modelsDir);

  try {
    // Scan core models
    await scanAndRegisterModels(modelsDir);

    // Scan plugin models
    const pluginsDir = join(__dirname, '..', '..', '..', 'plugins');
    console.log('[registerAllModels] Scanning plugins directory:', pluginsDir);
    await scanPluginModels(pluginsDir);

    // Check for cyclic dependencies
    const { hasCycles, cycles } = registry.checkForCyclicDependencies();
    if (hasCycles) {
      console.warn('Cyclic dependencies detected between models:');
      cycles.forEach((cycle: string[]) => {
        console.warn(`  ${cycle.join(' -> ')}`);
      });
    }

    console.log(`✅ Registered ${registry.getModelNames().length} models total`);
    console.log(registry.getModelNames().join(', '));
  } catch (error) {
    console.error('[registerAllModels] Error scanning models:', error);
  }
}

/**
 * Recursively scan directory for model files and register them
 */
async function scanAndRegisterModels(dir: string): Promise<void> {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      await scanAndRegisterModels(fullPath);
    } else if (item.endsWith('.model.ts') || item.endsWith('.model.js')) {
      // Import and register model file
      try {
        console.log(`[registerAllModels] Loading model file: ${fullPath}`);

        // Convert absolute path to relative import path
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const relativePath = fullPath.replace(__dirname, '.').replace(/\\/g, '/');
        const importPath = relativePath.replace('.ts', '.js'); // Use .js for ES modules

        const modelModule = await import(importPath);

        // Look for exported models (convention: ends with 'Model')
        for (const [exportName, exportValue] of Object.entries(modelModule)) {
          if (exportName.endsWith('Model') && exportValue && typeof exportValue === 'object') {
            console.log(`[registerAllModels] Found model: ${exportName}`);
            // Register the model with the registry (skip if already registered from self-registration)
            registry.registerModel(exportValue as any, true);
          }
        }
      } catch (error) {
        console.error(`[registerAllModels] Error loading model ${fullPath}:`, error);
      }
    }
  }
}

/**
 * Scan plugin directories for DSL models
 */
async function scanPluginModels(pluginsDir: string): Promise<void> {
  // Check if plugins directory exists
  if (!existsSync(pluginsDir)) {
    console.log('[scanPluginModels] Plugins directory not found:', pluginsDir);
    return;
  }

  const plugins = readdirSync(pluginsDir);
  console.log(`[scanPluginModels] Found ${plugins.length} plugin(s)`);

  for (const pluginName of plugins) {
    const pluginPath = join(pluginsDir, pluginName);
    const stat = statSync(pluginPath);

    if (!stat.isDirectory()) {
      continue;
    }

    // Check for shared/dsl directory in plugin
    const pluginModelsDir = join(pluginPath, 'shared', 'dsl');

    if (!existsSync(pluginModelsDir)) {
      console.log(`[scanPluginModels] No models in plugin: ${pluginName}`);
      continue;
    }

    console.log(`[scanPluginModels] Scanning plugin: ${pluginName}`);
    console.log(`[scanPluginModels] Models directory: ${pluginModelsDir}`);

    // Scan models in this plugin
    const modelFiles = readdirSync(pluginModelsDir);

    for (const modelFile of modelFiles) {
      if (!modelFile.endsWith('.model.ts') && !modelFile.endsWith('.model.js')) {
        continue;
      }

      const modelFilePath = join(pluginModelsDir, modelFile);

      try {
        console.log(`[scanPluginModels] Loading plugin model: ${pluginName}/${modelFile}`);

        // Import using file:// URL for absolute path
        const fileUrl = `file://${modelFilePath.replace('.ts', '.js')}`;
        const modelModule = await import(fileUrl);

        // Look for exported models (convention: ends with 'Model')
        for (const [exportName, exportValue] of Object.entries(modelModule)) {
          if (exportName.endsWith('Model') && exportValue && typeof exportValue === 'object') {
            console.log(`[scanPluginModels] ✅ Found plugin model: ${pluginName}/${exportName}`);
            // Register the model with the registry (skip if already registered from self-registration)
            registry.registerModel(exportValue as any, true);
          }
        }
      } catch (error) {
        console.error(`[scanPluginModels] ❌ Error loading plugin model ${pluginName}/${modelFile}:`, error);
      }
    }
  }
}

// Auto-register models when this file is imported, but expose a Promise
// so scripts can deterministically wait for scanning to complete.
export const modelsReady = registerAllModels();

// Optional global hook for non-module consumers/debugging
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__TYPUS_DSL_MODELS_READY__ = modelsReady;
} catch {
  // no-op
}
