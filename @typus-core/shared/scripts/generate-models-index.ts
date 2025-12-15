import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..'); // shared directory
const modelsDir = path.join(projectRoot, 'dsl', 'models');
const outputFile = path.join(modelsDir, 'index.ts');

// --- Helper Functions ---
async function findModelDirectories() {
  console.log(`Searching for model directories in: ${modelsDir}`);
  
  try {
    const directories = await glob(`${modelsDir}/*`, { absolute: true });
    
    console.log(`Glob found ${directories.length} items:`);
    directories.forEach((dir: string) => console.log(`  - ${dir}`));
    
    // Filter directories and exclude files
    const modelDirs: string[] = [];
    for (const dir of directories) {
      const stat = await fs.stat(dir);
      const basename = path.basename(dir);
      
      // Skip index.ts and other files
      if (stat.isDirectory() && basename !== 'node_modules') {
        console.log(`✓ Directory: ${basename} (${dir})`);
        modelDirs.push(dir);
      } else {
        console.log(`✗ Skipping: ${basename} (${dir})`);
      }
    }
    
    console.log(`Found ${modelDirs.length} model directories.`);
    return modelDirs;
  } catch (error) {
    console.error(`Error scanning model directories:`, error);
    return [];
  }
}

async function generateModuleIndex(modulePath: string): Promise<boolean> {
  try {
    const moduleName = path.basename(modulePath);
    console.log(`  Scanning for model files in: ${moduleName}`);
    
    // Find all .model.ts files in the directory
    const modelFiles = await glob(`${modulePath}/*.model.ts`);
    
    if (modelFiles.length === 0) {
      console.log(`  ✗ No model files found in: ${moduleName}`);
      return false;
    }
    
    console.log(`  Found ${modelFiles.length} model files:`);
    modelFiles.forEach(file => console.log(`    - ${path.basename(file)}`));
    
    // Generate exports for each model file
    const exports = modelFiles
      .map(file => path.basename(file, '.ts'))
      .sort()
      .map(fileName => `export * from './${fileName}.js';`)
      .join('\n');
    
    const content = `/**
 * ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} models export
 */
${exports}
`;
    
    const indexPath = path.join(modulePath, 'index.ts');
    await fs.writeFile(indexPath, content, 'utf-8');
    
    console.log(`  ✓ Generated index.ts for: ${moduleName}`);
    return true;
  } catch (error) {
    console.error(`Error generating module index for ${modulePath}:`, error);
    return false;
  }
}

function generateIndexContent(modelDirs: string[]): string {
  const exports = modelDirs
    .map(dir => path.basename(dir))
    .sort()
    .map(moduleName => `export * from './${moduleName}/index.js';`)
    .join('\n');

  return `/**
 * Export all model definitions
 */
${exports}
`;
}

async function writeIndexFile(content: string) {
  try {
    await fs.writeFile(outputFile, content, 'utf-8');
    console.log(`Successfully generated models index file: ${outputFile}`);
  } catch (error) {
    console.error(`Error writing models index file:`, error);
    throw error;
  }
}

// --- Main Logic ---
async function generateModelsIndex() {
  console.log('Starting models index generation...');
  
  const modelDirs = await findModelDirectories();
  
  if (modelDirs.length === 0) {
    console.log('No model directories found.');
    return;
  }

  console.log('\nGenerating module index files:');
  const validDirs: string[] = [];
  
  for (const dir of modelDirs) {
    const moduleName = path.basename(dir);
    console.log(`\nProcessing: ${moduleName}`);
    
    const isValid = await generateModuleIndex(dir);
    if (isValid) {
      validDirs.push(dir);
      console.log(`  ✓ Added to exports: ${moduleName}`);
    } else {
      console.log(`  ✗ Skipped (no model files): ${moduleName}`);
    }
  }

  if (validDirs.length === 0) {
    console.log('\nNo valid model directories found with index.ts files.');
    return;
  }

  console.log(`\nGenerating index.ts with ${validDirs.length} module exports...`);
  
  const content = generateIndexContent(validDirs);
  console.log('\nGenerated content:');
  console.log(content);
  
  await writeIndexFile(content);
  console.log('Models index generation finished.');
}

generateModelsIndex().catch(error => {
  console.error('Models index generation failed:', error);
  process.exit(1);
});
