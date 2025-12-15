#!/usr/bin/env node

/**
 * Validate All DSL Models
 *
 * Scans and validates all DSL models in the project
 * Reports errors and warnings for each model
 *
 * @file validate-all-models.ts
 * @version 1.0.0
 * @created November 10, 2025
 */

import { registry } from '../dsl/registry.js';
import { DslValidator } from '../dsl/validator/DslValidator.js';

// Load all models
import '../dsl/register-models.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateAllModels() {
  console.log(`\n${colors.bright}${colors.blue}🔍 Validating All DSL Models${colors.reset}\n`);

  // Wait for models to load
  console.log(`${colors.gray}Loading models...${colors.reset}`);
  await sleep(2000);

  const allModels = registry.getAllModels();
  console.log(`${colors.cyan}Found ${allModels.length} models total${colors.reset}\n`);

  const validator = new DslValidator();

  let totalErrors = 0;
  let totalWarnings = 0;
  let modelsWithErrors = 0;
  let modelsWithWarnings = 0;
  let perfectModels = 0;

  const results: Array<{
    model: string;
    module: string;
    errors: string[];
    warnings: string[];
  }> = [];

  // Validate each model
  for (const model of allModels) {
    const validation = validator.validateModelStructure(model);

    if (validation.errors.length > 0 || validation.warnings.length > 0) {
      results.push({
        model: model.name,
        module: model.module || 'core',
        errors: validation.errors,
        warnings: validation.warnings,
      });

      if (validation.errors.length > 0) {
        modelsWithErrors++;
        totalErrors += validation.errors.length;
      }
      if (validation.warnings.length > 0) {
        modelsWithWarnings++;
        totalWarnings += validation.warnings.length;
      }
    } else {
      perfectModels++;
    }
  }

  // Print results
  console.log(`${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  if (results.length === 0) {
    console.log(`${colors.green}${colors.bright}✅ All models are valid!${colors.reset}\n`);
  } else {
    // Group by module
    const byModule: Record<string, typeof results> = {};
    for (const result of results) {
      if (!byModule[result.module]) {
        byModule[result.module] = [];
      }
      byModule[result.module].push(result);
    }

    // Print by module
    for (const [moduleName, moduleResults] of Object.entries(byModule)) {
      console.log(`${colors.cyan}${colors.bright}Module: ${moduleName}${colors.reset}`);
      console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}\n`);

      for (const result of moduleResults) {
        const hasErrors = result.errors.length > 0;
        const hasWarnings = result.warnings.length > 0;

        const icon = hasErrors ? '❌' : '⚠️';
        const color = hasErrors ? colors.red : colors.yellow;

        console.log(`${color}${icon} ${result.model}${colors.reset}`);

        if (result.errors.length > 0) {
          console.log(`  ${colors.red}Errors (${result.errors.length}):${colors.reset}`);
          result.errors.forEach(err => {
            console.log(`    ${colors.red}•${colors.reset} ${err}`);
          });
        }

        if (result.warnings.length > 0) {
          console.log(`  ${colors.yellow}Warnings (${result.warnings.length}):${colors.reset}`);
          result.warnings.forEach(warn => {
            console.log(`    ${colors.yellow}•${colors.reset} ${warn}`);
          });
        }

        console.log('');
      }
    }
  }

  // Summary
  console.log(`${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.bright}Summary:${colors.reset}\n`);
  console.log(`  Total models: ${colors.cyan}${allModels.length}${colors.reset}`);
  console.log(`  ${colors.green}✓${colors.reset} Perfect models: ${colors.green}${perfectModels}${colors.reset}`);

  if (modelsWithErrors > 0) {
    console.log(`  ${colors.red}✗${colors.reset} Models with errors: ${colors.red}${modelsWithErrors}${colors.reset} (${totalErrors} total errors)`);
  }

  if (modelsWithWarnings > 0) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Models with warnings: ${colors.yellow}${modelsWithWarnings}${colors.reset} (${totalWarnings} total warnings)`);
  }

  console.log('');

  // Exit code
  if (modelsWithErrors > 0) {
    console.log(`${colors.red}${colors.bright}❌ Validation failed${colors.reset}\n`);
    process.exit(1);
  } else if (modelsWithWarnings > 0) {
    console.log(`${colors.yellow}${colors.bright}⚠️  Validation passed with warnings${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bright}✅ All models are valid!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run validation
validateAllModels().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
