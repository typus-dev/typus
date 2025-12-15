/**
 * Export all DSL modules
 * 
 * @file index.ts
 * @version 1.0.0
 * @created May 4, 2025
 * @modified May 5, 2025
 * @purpose TypeScript entry point for DSL modules
 * @lastChange Converted to TypeScript and added support for loading .ts models
 * @author Dmytro Klymentiev
 */

	export * from './types.js';
	export * from './models.js'; // Assuming models are structured for direct export
	
	import fs from 'fs';
	import path from 'path';
	import { execFileSync } from 'child_process';
	import { fileURLToPath, pathToFileURL } from 'url';
	import { DslModel, DslRegistry } from './types.js';

// Create registry
class Registry implements DslRegistry {
  private models: DslModel[] = [];

  registerModel(model: DslModel): void {
    // Check if model already exists
    const existingModel = this.models.find(m => m.name === model.name);
    if (existingModel) {
      console.log(`Model ${model.name} already registered, replacing...`);
      this.models = this.models.filter(m => m.name !== model.name);
    }
    this.models.push(model);
  }

  getAllModels(): DslModel[] {
    return this.models;
  }

  getModelByName(name: string): DslModel | undefined {
    return this.models.find(m => m.name === name);
  }
}

	// Create and export registry
	export const registry = new Registry();
	
	// Resolve DSL directory from this module location (portable across installs)
	const DSL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

// Load models from files
async function loadModels() {
  try {
    // Get all module directories
    const modelsDir = path.join(DSL_DIR, 'models');
    const modules = fs.readdirSync(modelsDir);
    
    for (const moduleName of modules) {
      const moduleDir = path.join(modelsDir, moduleName);
      
      // Skip if not a directory
      if (!fs.statSync(moduleDir).isDirectory()) continue;
      
      // Get all model files in the module directory
	      const modelFiles = fs.readdirSync(moduleDir).filter(file =>
	        file.endsWith('.model') ||
	        file.endsWith('.model.js') ||
	        file.endsWith('.model.ts')
	      );
      
      for (const modelFile of modelFiles) {
        const modelPath = path.join(moduleDir, modelFile);
        
        try {
          // Convert filename to model name (e.g., blog-post.model.ts -> BlogPostModel)
          const baseName = path.basename(modelFile, path.extname(modelFile))
            .replace(/\.model$/, '')
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('') + 'Model';
          
	          // Use tsx to execute the TypeScript file and get the model
	          const specifier = pathToFileURL(modelPath).href;
	          const code = `import { ${baseName} as model } from ${JSON.stringify(specifier)}; console.log(JSON.stringify(model))`;
	          const result = execFileSync('npx', ['tsx', '-e', code], { encoding: 'utf8' });
          
          // Parse the model from the output
          const model = JSON.parse(result);
          
          if (model && model.name) {
            console.log(`Registering ${model.name} model from ${modelFile}`);
            registry.registerModel(model);
          } else {
            console.error(`Invalid model in ${modelFile}: missing name property`);
          }
        } catch (error) {
          console.error(`Error loading model from ${modelFile}:`, error);
        }
      }
    }
    
    console.log('All models registered');
  } catch (error) {
    console.error('Error loading models:', error);
  }
}

// Load models
loadModels();
