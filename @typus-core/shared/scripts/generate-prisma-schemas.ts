import 'reflect-metadata';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { registry } from '../dsl/registry.js';
import { PrismaSchemaGenerator } from '../dsl/prisma-generator/index.js';

// Load models using register-models mechanism (and await deterministically)
import { modelsReady } from '../dsl/register-models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', '..', '..', 'data', 'prisma', 'schemas');
const outputFile = 'schema.prisma';

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(): Promise<void> {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Output directory ready: ${outputDir}`);
  } catch (error) {
    console.error('❌ Error creating output directory:', error);
    throw error;
  }
}

/**
 * Generate datasource block based on DB_PROVIDER environment variable
 */
function generateDatasource(): string {
  const provider = process.env.DB_PROVIDER || 'mysql';

  return `datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}`;
}

/**
 * Generate generator block
 */
function generateGenerator(): string {
  return `generator client {
  provider      = "prisma-client-js"
  output        = "../generated/client"
  binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x"]
}`;
}

/**
 * Write complete schema file to disk
 */
async function writeSingleSchemaFile(content: string, totalModels: number): Promise<void> {
  const outputPath = path.join(outputDir, outputFile);

  try {
    await fs.writeFile(outputPath, content, 'utf-8');
    const lines = content.split('\n').length;
    console.log(`✅ Generated ${outputFile}: ${lines} lines, ${totalModels} models`);
  } catch (error) {
    console.error(`❌ Failed to write ${outputFile}:`, error);
    throw error;
  }
}

/**
 * Main generation function
 */
async function generatePrismaSchemas(): Promise<void> {
  console.log('🚀 Starting Prisma schema generation from DSL models...');
  console.log(`📊 DB_PROVIDER: ${process.env.DB_PROVIDER || 'mysql (default)'}`);

  await ensureOutputDirectory();

  // Wait for DslModule to complete plugin loading (deterministic wait)
  try {
    // Check if we're running in backend context (DslModule available)
    const backendPath = path.join(__dirname, '../../backend/src/dsl/DslModule.js');

    // Check if file exists
    try {
      await fs.access(backendPath);
      console.log('⏳ Waiting for DslModule to complete plugin loading...');
      const { DslModule } = await import(backendPath);
      await DslModule.waitForPluginsReady();
      console.log('✅ DslModule confirmed all plugins loaded');
    } catch (accessError) {
      // Fallback for standalone execution (no backend running)
      console.log('ℹ️  Running standalone, waiting 5 seconds for models...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    // Fallback if DslModule not available
    console.warn('⚠️  Could not load DslModule, using fallback timeout (5s)');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Ensure register-models scan has fully completed (avoids nondeterministic missing targets)
  try {
    await modelsReady;
  } catch (error: any) {
    console.warn('⚠️  modelsReady rejected, continuing with current registry state:', error?.message || error);
  }

  // Get only models with generatePrisma: true
  const allModels = registry.getAllModels().filter(model => model.generatePrisma === true);
  console.log(`📊 Found ${allModels.length} DSL models with generatePrisma: true`);

  if (allModels.length === 0) {
    console.log('ℹ️  No DSL models marked for Prisma generation found.');
    console.log('💡 Add generatePrisma: true to your DSL models to enable schema generation.');
    return;
  }

  // Also get manual models from schema.base.prisma (for now)
  console.log('📋 Including manual models from schema.base.prisma (will be migrated to DSL)');

  // Validate DSL models FIRST (before Prisma generation)
  try {
    console.log('🔍 Validating DSL models...');
    // Dynamic import to handle missing file gracefully
    const { DslValidator } = await import('../dsl/validator/DslValidator.js');
    const validator = new DslValidator();
    const validationErrors = validator.validateModels(allModels);

    if (validationErrors.length > 0) {
      const errorOutput = DslValidator.formatErrors(validationErrors);
      console.error(errorOutput);

      // Count critical errors
      const criticalErrors = validationErrors.filter(e => e.severity === 'error');
      if (criticalErrors.length > 0) {
        console.error(`\n❌ Found ${criticalErrors.length} critical error(s). Fix these before generating schemas.`);
        throw new Error('DSL validation failed');
      }
    } else {
      console.log('✅ DSL validation passed!');
    }
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn('⚠️  DslValidator not found, skipping validation');
    } else if (error.message === 'DSL validation failed') {
      throw error;
    } else {
      console.warn('⚠️  Validation error:', error.message);
    }
  }

  // Get DB provider from environment (defaults to mysql for backward compatibility)
  const dbProvider = process.env.DB_PROVIDER || 'mysql';
  console.log(`📊 Generating schemas for database provider: ${dbProvider}`);

  // Initialize the generator
  const generator = new PrismaSchemaGenerator(dbProvider);

  // Validate Prisma schema structure
  const validation = generator.validateModels(allModels);
  if (!validation.isValid) {
    console.error('❌ Prisma schema validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    throw new Error('Prisma schema validation failed');
  }

  // Generate schemas
  try {
    const moduleSchemas = generator.generateSchemas(allModels, {
      includeAuditFields: true,
      includeIndexes: true,
      outputFormat: 'pretty',
      formatOptions: {
        addComments: true,
        addMetadata: true,
        validateSchema: true
      }
    });

    // Build complete schema file
    const parts: string[] = [];

    // 1. Header
    parts.push(`// =============================================================================`);
    parts.push(`// PRISMA SCHEMA - AUTO-GENERATED FROM DSL MODELS`);
    parts.push(`// =============================================================================`);
    parts.push(`// Generated: ${new Date().toISOString()}`);
    parts.push(`// Provider: ${process.env.DB_PROVIDER || 'mysql'}`);
    parts.push(`// ⚠️  DO NOT EDIT THIS FILE MANUALLY!`);
    parts.push(`// ⚠️  Models are generated from @typus-core/shared/dsl/models/`);
    parts.push(`// =============================================================================`);
    parts.push('');

    // 2. Datasource
    parts.push(generateDatasource());
    parts.push('');

    // 3. Generator
    parts.push(generateGenerator());
    parts.push('');
    parts.push('');

    // 4. Manual models from schema.base.prisma (temporary)
    const baseSchemaPath = path.join(outputDir, 'schema.base.prisma');
    try {
      const baseContent = await fs.readFile(baseSchemaPath, 'utf-8');
      const dslModelNames = allModels.map(m => m.name);
      const manualModels = extractManualModels(baseContent, dslModelNames);
      if (manualModels) {
        parts.push(`// =============================================================================`);
        parts.push(`// MANUAL MODELS (TO BE MIGRATED TO DSL)`);
        parts.push(`// =============================================================================`);
        parts.push('');
        parts.push(manualModels);
        parts.push('');
      }
    } catch (error) {
      console.log('ℹ️  No schema.base.prisma found (will use only DSL models)');
    }

    // 5. DSL-generated models
    parts.push(`// =============================================================================`);
    parts.push(`// DSL-GENERATED MODELS`);
    parts.push(`// =============================================================================`);
    parts.push('');

    for (const schema of moduleSchemas) {
      parts.push(`// Module: ${schema.moduleName}`);
      parts.push(schema.content);
      parts.push('');
    }

    const completeSchema = parts.join('\n');

    // Write single schema file
    await writeSingleSchemaFile(completeSchema, allModels.length);

    // Display generation statistics
    const stats = generator.getGenerationStats(moduleSchemas);
    console.log('\n📈 Generation Summary:');
    console.log(`   Total models: ${stats.totalModels}`);
    console.log(`   Modules: ${stats.modules.join(', ')}`);
    console.log(`   Output: ${outputFile}`);

    if (stats.totalWarnings > 0) {
      console.log(`   Warnings: ${stats.totalWarnings}`);
    }

    console.log(`\n🎯 Successfully generated ${outputFile}!`);

  } catch (error) {
    console.error('❌ Schema generation failed:', error);
    throw error;
  }
}

/**
 * Extract manual models from schema.base.prisma (everything except datasource/generator)
 * Filters out models that are already in DSL
 */
function extractManualModels(content: string, dslModelNames: string[]): string | null {
  const lines = content.split('\n');
  const modelBlocks: string[] = [];
  let currentBlock: string[] = [];
  let inBlock = false;
  let blockType = '';
  let braceCount = 0;
  let currentModelName = '';

  for (const line of lines) {
    // Skip datasource and generator blocks
    if (line.match(/^\s*(datasource|generator)\s/)) {
      inBlock = true;
      blockType = line.match(/^\s*(datasource|generator)\s/)![1];
      continue;
    }

    if (inBlock) {
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      if (braceCount === 0) inBlock = false;
      continue;
    }

    // Detect model start
    const modelMatch = line.match(/^\s*model\s+(\w+)\s*{/);
    if (modelMatch) {
      currentModelName = modelMatch[1];
      currentBlock = [line];
      inBlock = true;
      braceCount = 1;
      continue;
    }

    // Continue collecting model lines
    if (inBlock) {
      currentBlock.push(line);
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;

      if (braceCount === 0) {
        // Model block complete - check if it's NOT in DSL
        if (!dslModelNames.includes(currentModelName)) {
          modelBlocks.push(currentBlock.join('\n'));
        }
        inBlock = false;
        currentBlock = [];
        currentModelName = '';
      }
    }
  }

  return modelBlocks.length > 0 ? modelBlocks.join('\n\n') : null;
}

// --- Main execution ---
generatePrismaSchemas().catch((error: any) => {
  console.error('❌ Prisma schema generation failed:', error);
  process.exit(1);
});
