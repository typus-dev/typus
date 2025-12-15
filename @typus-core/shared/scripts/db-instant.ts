#!/usr/bin/env node

/**
 * Instant Database Setup
 *
 * One command to set up a DSL model completely:
 * - Validates model structure
 * - Generates Prisma schema
 * - Creates database table
 * - Generates Prisma Client
 * - Creates seed template
 * - Restarts server
 * - Tests model
 *
 * Usage:
 *   pnpm run db:instant <plugin> <ModelName>
 *   pnpm run db:instant ai-agent KnowledgeDocument
 *
 * @file db-instant.ts
 * @version 1.0.0
 * @created November 10, 2025
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..', '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Simple spinner for progress indication
 */
class Spinner {
  private message: string = '';
  private interval: NodeJS.Timeout | null = null;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;

  start(message: string) {
    this.message = message;
    this.frameIndex = 0;
    process.stdout.write('\n');
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${colors.cyan}${frame}${colors.reset} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  succeed(message?: string) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r${colors.green}✓${colors.reset} ${message || this.message}\n`);
  }

  fail(message?: string) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r${colors.red}✗${colors.reset} ${message || this.message}\n`);
  }

  warn(message?: string) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r${colors.yellow}⚠${colors.reset} ${message || this.message}\n`);
  }
}

/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert PascalCase to camelCase
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Execute command with output
 */
async function execCommand(command: string, cwd?: string): Promise<string> {
  const { stdout, stderr } = await execAsync(command, { cwd: cwd || projectRoot });
  return stdout + stderr;
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Find model file
 */
async function findModelFile(plugin: string, modelName: string): Promise<string | null> {
  const kebabName = toKebabCase(modelName);
  const possiblePaths = [
    path.join(projectRoot, 'plugins', plugin, 'shared', 'dsl', `${kebabName}.model.ts`),
    path.join(projectRoot, 'plugins', plugin, 'template', 'shared', 'dsl', `${kebabName}.model.ts`),
    path.join(projectRoot, 'plugins', plugin, 'shared', 'dsl', 'models', `${kebabName}.model.ts`),
    path.join(projectRoot, '@typus-core', 'shared', 'dsl', 'models', plugin, `${kebabName}.model.ts`),
  ];

  for (const filePath of possiblePaths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // File doesn't exist, try next
    }
  }

  return null;
}

/**
 * Load and validate model
 */
async function loadAndValidateModel(
  modelPath: string,
  modelName: string
): Promise<{ success: boolean; errors?: string[]; warnings?: string[] }> {
  try {
    // Import the registry and validator
    const { registry } = await import('../dsl/registry.js');
    const { DslValidator } = await import('../dsl/validator/DslValidator.js');

    // Import register-models to ensure all models are loaded
    await import('../dsl/register-models.js');

    // Wait for models to load
    await sleep(500);

    // Get the model from registry
    const model = registry.getModel(modelName);
    if (!model) {
      return {
        success: false,
        errors: [`Model ${modelName} not found in registry. Make sure registry.registerModel() is called.`],
      };
    }

    // Validate model structure
    const validator = new DslValidator();
    const validation = validator.validateModelStructure(model);

    if (validation.errors.length > 0) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    return {
      success: true,
      warnings: validation.warnings,
    };
  } catch (error: any) {
    return {
      success: false,
      errors: [`Failed to load model: ${error.message}`],
    };
  }
}

/**
 * Generate Prisma schema
 */
async function generatePrismaSchema(): Promise<void> {
  await execCommand('node @typus-core/shared/scripts/generate-prisma-schemas.js');
}

/**
 * Push to database
 */
async function pushToDatabase(): Promise<void> {
  await execCommand(
    'docker exec lite_typus_dev_lite npx prisma db push --schema=data/prisma/schemas/schema.prisma --accept-data-loss'
  );
}

/**
 * Generate Prisma Client
 */
async function generatePrismaClient(): Promise<void> {
  await execCommand(
    'docker exec lite_typus_dev_lite npx prisma generate --schema=data/prisma/schemas/schema.prisma'
  );
}

/**
 * Create seed template
 */
async function createSeedTemplate(plugin: string, modelName: string): Promise<string | null> {
  const seedPath = path.join(projectRoot, 'plugins', plugin, 'setup', 'seed.sql');

  // Check if seed already exists
  try {
    await fs.access(seedPath);
    return null; // Seed already exists
  } catch {
    // Seed doesn't exist, create it
  }

  try {
    // Import the model and generator
    const { registry } = await import('../dsl/registry.js');
    const { SeedGenerator } = await import('../dsl/generators/SeedGenerator.js');

    // Import register-models
    await import('../dsl/register-models.js');
    await sleep(500);

    const model = registry.getModel(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const generator = new SeedGenerator();
    const seedContent = generator.generateSeed(model, 3); // Generate 3 example rows

    // Ensure setup directory exists
    const setupDir = path.dirname(seedPath);
    await fs.mkdir(setupDir, { recursive: true });

    // Write seed file
    await fs.writeFile(seedPath, seedContent, 'utf-8');

    return seedPath;
  } catch (error: any) {
    throw new Error(`Failed to create seed template: ${error.message}`);
  }
}

/**
 * Load seed data
 */
async function loadSeedData(plugin: string): Promise<void> {
  await execCommand(`bash plugins/install-plugin-db.sh ${plugin} --seed-only`);
}

/**
 * Restart server
 */
async function restartServer(): Promise<void> {
  await execCommand('docker restart lite_typus_dev_lite');
  // Wait for server to start
  await sleep(12000);
}

/**
 * Test model
 */
async function testModel(modelName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const camelName = toCamelCase(modelName);
    const testScript = `
      const {PrismaClient} = require('/app/data/prisma/generated/client');
      const prisma = new PrismaClient();
      prisma.${camelName}.findMany().then(() => {
        console.log('TEST_SUCCESS');
        process.exit(0);
      }).catch(err => {
        console.error('TEST_FAILED:', err.message);
        process.exit(1);
      });
    `;

    const result = await execCommand(`docker exec lite_typus_dev_lite node -e "${testScript}"`);
    return { success: result.includes('TEST_SUCCESS') };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
${colors.bright}Instant Database Setup${colors.reset}

${colors.cyan}Usage:${colors.reset}
  pnpm run db:instant <plugin> <ModelName>

${colors.cyan}Example:${colors.reset}
  pnpm run db:instant ai-agent KnowledgeDocument

${colors.cyan}What it does:${colors.reset}
  1. Validates DSL model structure
  2. Generates Prisma schema
  3. Creates database table
  4. Generates Prisma Client
  5. Creates seed template (if doesn't exist)
  6. Restarts server
  7. Tests model

${colors.cyan}Time:${colors.reset} ~20 seconds
`);
    process.exit(1);
  }

  const [plugin, modelName] = args;

  console.log(`\n${colors.bright}${colors.blue}🚀 Instant Database Setup: ${plugin}/${modelName}${colors.reset}\n`);

  const spinner = new Spinner();

  try {
    // Step 1: Find model file
    spinner.start('Finding model file...');
    const modelPath = await findModelFile(plugin, modelName);
    if (!modelPath) {
      spinner.fail(`Model file not found for ${modelName}`);
      console.error(`${colors.red}Searched in:${colors.reset}`);
      console.error(`  - plugins/${plugin}/shared/dsl/${toKebabCase(modelName)}.model.ts`);
      console.error(`  - plugins/${plugin}/shared/dsl/models/${toKebabCase(modelName)}.model.ts`);
      console.error(`  - @typus-core/shared/dsl/models/${plugin}/${toKebabCase(modelName)}.model.ts`);
      process.exit(1);
    }
    spinner.succeed(`Found model: ${path.relative(projectRoot, modelPath)}`);

    // Step 2: Load and validate model
    spinner.start('Validating model structure...');
    const validation = await loadAndValidateModel(modelPath, modelName);

    if (!validation.success) {
      spinner.fail('Validation failed');
      console.error(`\n${colors.red}❌ Errors:${colors.reset}\n`);
      validation.errors?.forEach(err => console.error(`  ${colors.red}-${colors.reset} ${err}`));
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn(`\n${colors.yellow}⚠️  Warnings:${colors.reset}\n`);
        validation.warnings.forEach(warn => console.warn(`  ${colors.yellow}-${colors.reset} ${warn}`));
      }
      process.exit(1);
    }

    if (validation.warnings && validation.warnings.length > 0) {
      spinner.warn('Validation passed with warnings');
      console.warn(`\n${colors.yellow}⚠️  Warnings:${colors.reset}\n`);
      validation.warnings.forEach(warn => console.warn(`  ${colors.yellow}-${colors.reset} ${warn}`));
      console.log('');
    } else {
      spinner.succeed('Model structure valid');
    }

    // Step 3: Generate Prisma schema
    spinner.start('Generating Prisma schema...');
    await generatePrismaSchema();
    spinner.succeed('Prisma schema generated');

    // Step 4: Push to database
    spinner.start('Creating database table...');
    await pushToDatabase();
    spinner.succeed('Database table created');

    // Step 5: Generate Prisma Client
    spinner.start('Generating Prisma Client...');
    await generatePrismaClient();
    spinner.succeed('Prisma Client generated');

    // Step 6: Seed template
    spinner.start('Checking seed file...');
    const seedPath = await createSeedTemplate(plugin, modelName);
    if (seedPath) {
      spinner.succeed(`Seed template created: ${path.relative(projectRoot, seedPath)}`);
      console.log(`  ${colors.yellow}→${colors.reset} Edit this file with your data, then run:`);
      console.log(`    ${colors.cyan}bash plugins/install-plugin-db.sh ${plugin}${colors.reset}\n`);
    } else {
      spinner.succeed('Seed file already exists');

      // Load existing seed
      spinner.start('Loading seed data...');
      try {
        await loadSeedData(plugin);
        spinner.succeed('Seed data loaded');
      } catch (error: any) {
        spinner.warn(`Seed loading skipped (${error.message})`);
      }
    }

    // Step 7: Restart server
    spinner.start('Restarting server...');
    await restartServer();
    spinner.succeed('Server restarted');

    // Step 8: Test model
    spinner.start('Testing model...');
    const testResult = await testModel(modelName);
    if (testResult.success) {
      spinner.succeed('Model tested successfully');
    } else {
      spinner.fail(`Model test failed: ${testResult.error || 'Unknown error'}`);
    }

    // Success!
    console.log(`\n${colors.green}${colors.bright}✅ Done!${colors.reset} Model ready to use:\n`);
    console.log(`  ${colors.cyan}const data = await prisma.${toCamelCase(modelName)}.findMany();${colors.reset}`);
    console.log('');

  } catch (error: any) {
    spinner.fail(`Setup failed: ${error.message}`);
    console.error(`\n${colors.red}${error.stack}${colors.reset}`);
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
