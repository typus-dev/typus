import { interfaceGenerator } from './generators/index.js';
import { registerAllModels } from './register-models.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate TypeScript interfaces from DSL models
 */
export async function generateInterfaces(): Promise<void> {
  // Ensure models are registered
  await registerAllModels();

  // Generate interfaces
  interfaceGenerator.generate();

  console.log('Generated TypeScript interfaces');
}

// If this script is run directly, generate interfaces
//if (require.main === module) {
  await generateInterfaces();
//}
