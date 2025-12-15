# TODO: Instant Database Workflow

**Priority**: High
**Goal**: JSON model -> instant database access in seconds
**Current Issue**: Table creation takes 30+ minutes, 11 errors

---

## 🎯 Vision

```typescript
// 1. Write model
export const MyModel: DslModel = {
  name: 'MyModel',
  module: 'my_plugin',
  // ... fields
};

// 2. Run command
// $ pnpm run db:instant my_plugin MyModel

// 3. Done! (20 seconds)
// ✅ Model validated
// ✅ Prisma schema generated
// ✅ Database table created
// ✅ Seed template created
// ✅ Ready to use: prisma.myModel.findMany()
```

**No errors. No debugging. Just works.**

---

## 📋 Current Problems

### Today's Experience (AI Agent - KnowledgeDocument)

**11 errors encountered:**
1. ❌ Model not registering → forgot `registry.registerModel()`
2. ❌ Missing `generatePrisma: true` flag
3. ❌ Wrong module name `ai-agent` vs `ai_agent`
4. ❌ Missing required fields (id, createdAt, updatedAt)
5. ❌ ESM require() error with legacy JS
6. ❌ Missing cheerio dependency
7. ❌ Wrong table name in seed.sql
8. ❌ camelCase vs snake_case in SQL
9. ❌ context.logger undefined in operations
10. ❌ Wrong Prisma model name (PascalCase vs camelCase)
11. ❌ `mode: 'insensitive'` not supported in MySQL

**Time spent**: 30+ minutes
**Developer frustration**: High

### Root Causes

1. **No validation before generation** → errors discovered at runtime
2. **Manual seed.sql creation** → easy to make naming mistakes
3. **No single command** → need to run 6+ commands manually
4. **No automatic testing** → can't verify model works immediately
5. **Confusing Prisma naming** → KnowledgeDocument vs knowledgeDocument
6. **Database differences** → MySQL vs PostgreSQL surprises

---

## ✅ Existing Infrastructure

Already have:
- ✅ `DslValidator` - validates relations (foreign keys)
- ✅ `registry.ts` - model registration
- ✅ `generate-prisma-schemas.ts` - Prisma generation
- ✅ `prisma-generator/` - schema generators

Need to enhance:
- ⏳ Validator - add model structure checks
- ⏳ Automation - single command workflow
- ⏳ Templates - auto-generate seed.sql
- ⏳ Testing - verify model works

---

## 🚀 Solution: Instant Database Workflow

### 1. Enhanced DSL Validator

**File**: `@typus-core/shared/dsl/validator/DslValidator.ts`

**Add checks for:**

```typescript
class DslValidator {
  // Existing: relation validation ✅

  // NEW: Model structure validation
  validateModelStructure(model: DslModel): ValidationResult {
    const errors = [];
    const warnings = [];

    // Check 1: registry.registerModel() called?
    if (!registry.hasModel(model.name)) {
      errors.push(`Model ${model.name} not registered. Add: registry.registerModel(${model.name}Model)`);
    }

    // Check 2: generatePrisma flag?
    if (model.generatePrisma !== true) {
      errors.push(`Model ${model.name} missing generatePrisma: true`);
    }

    // Check 3: Required fields present?
    const requiredFields = ['id', 'createdAt', 'updatedAt'];
    const fieldNames = model.fields.map(f => f.name);
    const missing = requiredFields.filter(f => !fieldNames.includes(f));
    if (missing.length > 0) {
      errors.push(`Model ${model.name} missing required fields: ${missing.join(', ')}`);
    }

    // Check 4: Timestamps config?
    if (!model.config?.timestamps) {
      warnings.push(`Model ${model.name} should have config.timestamps: true`);
    }

    // Check 5: Access permissions complete?
    const requiredAccess = ['create', 'read', 'update', 'delete', 'count'];
    const missingAccess = requiredAccess.filter(a => !model.access?.[a]);
    if (missingAccess.length > 0) {
      warnings.push(`Model ${model.name} missing access permissions: ${missingAccess.join(', ')}`);
    }

    // Check 6: Module naming (underscore not dash)?
    if (model.module?.includes('-')) {
      errors.push(`Model ${model.name} module uses dash. Change '${model.module}' to '${model.module.replace(/-/g, '_')}'`);
    }

    return { errors, warnings };
  }
}
```

### 2. Seed Generator

**File**: `@typus-core/shared/dsl/generators/SeedGenerator.ts`

```typescript
class SeedGenerator {
  /**
   * Generate seed.sql from DSL model
   */
  generateSeed(model: DslModel): string {
    const tableName = `${model.module}.${model.tableName}`;
    const fields = this.getInsertableFields(model);

    const sql = `
-- Generated seed for ${model.name}
-- Table: ${tableName}
-- Generated: ${new Date().toISOString()}

INSERT INTO \`${tableName}\`
  (
    ${fields.map(f => this.toSnakeCase(f.name)).join(',\n    ')}
  )
VALUES
  (
    ${fields.map(f => this.getExampleValue(f)).join(',\n    ')}
  );

-- Add more rows as needed
`;

    return sql;
  }

  getInsertableFields(model: DslModel): DslField[] {
    return model.fields.filter(f =>
      !f.autoIncrement && // Skip auto-increment (id)
      f.name !== 'createdAt' && // Handled by NOW()
      f.name !== 'updatedAt'    // Handled by NOW()
    );
  }

  toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  getExampleValue(field: DslField): string {
    if (!field.required) return 'NULL';

    switch (field.type) {
      case 'Int': return '1';
      case 'string': return `'example-${this.toSnakeCase(field.name)}'`;
      case 'text': return `'Example content for ${field.name}'`;
      case 'datetime': return 'NOW()';
      case 'boolean': return 'TRUE';
      case 'json': return "'{}'";
      default: return 'NULL';
    }
  }
}
```

### 3. CLI Command: db:instant

**File**: `scripts/db-instant.ts`

```typescript
#!/usr/bin/env node

/**
 * Instant Database Setup
 *
 * Usage:
 *   pnpm run db:instant <plugin> <ModelName>
 *   pnpm run db:instant ai-agent KnowledgeDocument
 *
 * What it does:
 *   1. Validates DSL model (structure + relations)
 *   2. Generates Prisma schema
 *   3. Pushes to database (creates table)
 *   4. Generates Prisma Client
 *   5. Creates seed template (if doesn't exist)
 *   6. Loads seed data (if exists)
 *   7. Restarts server
 *   8. Tests model (basic CRUD)
 *
 * Time: ~20 seconds
 */

async function instantSetup(plugin: string, modelName: string) {
  console.log(`🚀 Instant Database Setup: ${plugin}/${modelName}\n`);

  const spinner = ora();

  try {
    // Step 1: Find and load model
    spinner.start('Loading model...');
    const modelPath = `plugins/${plugin}/shared/dsl/${kebabCase(modelName)}.model.ts`;
    const model = await loadModel(modelPath);
    spinner.succeed(`Loaded ${model.name}`);

    // Step 2: Validate model
    spinner.start('Validating model structure...');
    const validator = new DslValidator(registry);
    const validation = validator.validateModelStructure(model);

    if (validation.errors.length > 0) {
      spinner.fail('Validation failed');
      console.error('\n❌ Errors:\n');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      spinner.warn('Validation warnings');
      console.warn('\n⚠️  Warnings:\n');
      validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
    } else {
      spinner.succeed('Model structure valid');
    }

    // Step 3: Generate Prisma schema
    spinner.start('Generating Prisma schema...');
    await execCommand('pnpm run dsl:generate-prisma-schemas');
    spinner.succeed('Prisma schema generated');

    // Step 4: Push to database
    spinner.start('Creating database table...');
    await execCommand('docker exec lite_typus_dev_lite npx prisma db push --schema=data/prisma/schemas/schema.prisma --accept-data-loss');
    spinner.succeed('Table created');

    // Step 5: Generate Prisma Client
    spinner.start('Generating Prisma Client...');
    await execCommand('docker exec lite_typus_dev_lite npx prisma generate --schema=data/prisma/schemas/schema.prisma');
    spinner.succeed('Prisma Client ready');

    // Step 6: Seed template
    const seedPath = `plugins/${plugin}/setup/seed.sql`;
    if (!fs.existsSync(seedPath)) {
      spinner.start('Creating seed template...');
      const seedGenerator = new SeedGenerator();
      const seedSql = seedGenerator.generateSeed(model);
      fs.writeFileSync(seedPath, seedSql);
      spinner.succeed(`Seed template: ${seedPath}`);
    } else {
      // Step 7: Load existing seed
      spinner.start('Loading seed data...');
      await execCommand(`bash plugins/install-plugin-db.sh ${plugin} --seed-only`);
      spinner.succeed('Seed data loaded');
    }

    // Step 8: Restart server
    spinner.start('Restarting server...');
    await execCommand('docker restart lite_typus_dev_lite');
    await sleep(12000);
    spinner.succeed('Server restarted');

    // Step 9: Test model
    spinner.start('Testing model...');
    const testResult = await testModel(model);
    if (testResult.success) {
      spinner.succeed('Model tested successfully');
    } else {
      spinner.fail(`Model test failed: ${testResult.error}`);
    }

    console.log('\n✅ Done! Model ready to use:\n');
    console.log(`  const data = await prisma.${camelCase(model.name)}.findMany();`);
    console.log('');

  } catch (error) {
    spinner.fail(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function testModel(model: DslModel) {
  try {
    // Basic test: can we query the table?
    const testScript = `
      const {PrismaClient} = require('/app/data/prisma/generated/client');
      const prisma = new PrismaClient();
      prisma.${camelCase(model.name)}.findMany().then(() => {
        console.log('TEST_SUCCESS');
        process.exit(0);
      }).catch(err => {
        console.error('TEST_FAILED:', err.message);
        process.exit(1);
      });
    `;

    const result = await execCommand(`docker exec lite_typus_dev_lite node -e "${testScript}"`);
    return { success: result.includes('TEST_SUCCESS') };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Package.json script:**
```json
{
  "scripts": {
    "db:instant": "ts-node scripts/db-instant.ts"
  }
}
```

### 4. Pre-commit Hook

**File**: `.husky/pre-commit`

```bash
#!/bin/bash

# Validate DSL models on commit
if git diff --cached --name-only | grep -q "\.model\.ts$"; then
  echo "🔍 Validating DSL models..."

  for file in $(git diff --cached --name-only | grep "\.model\.ts$"); do
    echo "  Checking: $file"
    # Run validator (to be implemented)
  done
fi
```

### 5. Interactive Wizard (Optional)

**File**: `scripts/db-wizard.ts`

```typescript
import inquirer from 'inquirer';

async function wizard() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'plugin',
      message: 'Plugin name:',
      default: 'ai-agent'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model name (PascalCase):',
      validate: (input) => /^[A-Z][a-zA-Z]+$/.test(input) || 'Must be PascalCase'
    },
    {
      type: 'confirm',
      name: 'validate',
      message: 'Validate model structure?',
      default: true
    },
    {
      type: 'confirm',
      name: 'generateSeed',
      message: 'Generate seed template?',
      default: true
    },
    {
      type: 'confirm',
      name: 'loadSeed',
      message: 'Load seed data (if exists)?',
      default: false
    }
  ]);

  // Run instant setup with options
  await instantSetup(answers.plugin, answers.model, answers);
}
```

---

## 📊 Comparison: Before vs After

### ❌ Before (Manual Process)

```bash
# 1. Write model
vim plugins/ai-agent/shared/dsl/knowledge-document.model.ts
# Forget registry.registerModel() → ERROR 1

# 2. Generate Prisma
pnpm run dsl:generate-prisma-schemas
# Missing generatePrisma: true → ERROR 2

# 3. Fix and regenerate
# Wrong module name → ERROR 3
pnpm run dsl:generate-prisma-schemas

# 4. Fix and regenerate again
# Missing required fields → ERROR 4
pnpm run dsl:generate-prisma-schemas

# 5. Push to database
docker exec lite_typus_dev_lite npx prisma db push --schema=...
# Success!

# 6. Generate client
docker exec lite_typus_dev_lite npx prisma generate --schema=...
# Success!

# 7. Write seed.sql manually
vim plugins/ai-agent/setup/seed.sql
# Wrong table name → ERROR 7
# camelCase columns → ERROR 8

# 8. Load seed
bash plugins/install-plugin-db.sh ai-agent
# Seed errors...

# 9. Restart
docker restart lite_typus_dev_lite

# 10. Test
# Wrong model name → ERROR 10
# MySQL incompatibility → ERROR 11

Total: 30+ minutes, 11 errors, high frustration
```

### ✅ After (Instant Workflow)

```bash
pnpm run db:instant ai-agent KnowledgeDocument

# Output:
# 🚀 Instant Database Setup: ai-agent/KnowledgeDocument
#
# ✓ Loaded KnowledgeDocument
# ✓ Model structure valid
# ✓ Prisma schema generated
# ✓ Table created
# ✓ Prisma Client ready
# ✓ Seed template: plugins/ai-agent/setup/seed.sql
# ✓ Server restarted
# ✓ Model tested successfully
#
# ✅ Done! Model ready to use:
#   const data = await prisma.knowledgeDocument.findMany();

Total: 20 seconds, 0 errors, zero frustration
```

---

## 🎯 Implementation Plan

### Phase 1: Core Automation (Priority: High)
- [ ] Enhance `DslValidator` with model structure checks
- [ ] Create `SeedGenerator` class
- [ ] Create `db:instant` CLI command
- [ ] Add model testing function
- [ ] Documentation

**Time estimate**: 3-4 hours
**Impact**: Eliminates 90% of setup pain

### Phase 2: Developer Experience (Priority: Medium)
- [ ] Interactive wizard (`db:wizard`)
- [ ] Pre-commit validation hook
- [ ] Better error messages
- [ ] Progress indicators (ora/spinner)

**Time estimate**: 2-3 hours
**Impact**: Makes workflow delightful

### Phase 3: Advanced Features (Priority: Low)
- [ ] Hot reload for DSL changes
- [ ] Migration generator (not just push)
- [ ] Multi-database support checks
- [ ] Visual DSL builder (web UI)

**Time estimate**: 8+ hours
**Impact**: Future-proofing

---

## 🔗 Related Files

**Existing:**
- `@typus-core/shared/dsl/validator/DslValidator.ts` - relation validator
- `@typus-core/shared/dsl/registry.ts` - model registry
- `scripts/generate-prisma-schemas.ts` - Prisma generator
- `plugins/install-plugin-db.sh` - plugin DB installer

**To Create:**
- `@typus-core/shared/dsl/generators/SeedGenerator.ts`
- `@typus-core/shared/dsl/validator/ModelValidator.ts`
- `scripts/db-instant.ts`
- `scripts/db-wizard.ts`

**Documentation:**
- `plugins/example/DSL_MODEL_CHECKLIST.md` - created ✅
- `plugins/antipattern/DSL_MODEL_ANTIPATTERNS.md` - created ✅
- `@typus-core/shared/dsl/validator/README.md` - exists ✅
- `plugins/TODO-seed-generator.md` - created ✅

---

## 💡 Key Principles

1. **Validation First** - Catch errors before generation
2. **Single Command** - One command does everything
3. **Clear Feedback** - Show progress and errors clearly
4. **Safe Defaults** - Sensible defaults for everything
5. **Testing Built-in** - Verify model works immediately
6. **Database Agnostic** - Handle MySQL/PostgreSQL differences
7. **Zero Configuration** - Just works out of the box

---

## 🚀 Success Metrics

**Current state:**
- ⏱️ 30+ minutes to set up a model
- 🐛 11 errors on average
- 😤 High developer frustration
- 📚 Need to check 3+ documentation files

**Target state:**
- ⚡ 20 seconds to set up a model
- ✅ 0 errors (caught by validator)
- 😊 Developer happiness
- 🎯 Single command, no docs needed

---

## 📝 Notes

This plan consolidates insights from:
- `/plugins/ai-agent/worklog/step-021-semantic-site-learning.md` - 11 errors documented
- `/plugins/example/DSL_MODEL_CHECKLIST.md` - manual checklist
- `/plugins/antipattern/DSL_MODEL_ANTIPATTERNS.md` - what not to do
- `@typus-core/shared/dsl/validator/README.md` - existing validator

**Philosophy**: DSL should be magic, not torture. Write model -> done.
