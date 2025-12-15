# DB:Instant - Instant Database Workflow

**One command to set up your DSL model completely.**

## 🎯 Problem

Creating a new database model traditionally takes **30+ minutes** and involves **11+ common errors**:

1. ❌ Forgot `registry.registerModel()`
2. ❌ Missing `generatePrisma: true` flag
3. ❌ Wrong module name (`ai-agent` vs `ai_agent`)
4. ❌ Missing required fields (id, createdAt, updatedAt)
5. ❌ ESM import errors
6. ❌ Wrong table name in seed.sql
7. ❌ camelCase vs snake_case confusion
8. ❌ Undefined context.logger
9. ❌ Wrong Prisma model name
10. ❌ Database-specific incompatibilities
11. ❌ Manual seed.sql creation errors

## ✨ Solution

```bash
pnpm --filter @typus-core/shared run db:instant <plugin> <ModelName>
```

**Time: ~20 seconds** | **Errors: 0** | **Steps: Automated**

## 📋 What It Does

1. ✅ **Validates** DSL model structure
2. ✅ **Generates** Prisma schema
3. ✅ **Creates** database table
4. ✅ **Generates** Prisma Client
5. ✅ **Creates** seed template (if needed)
6. ✅ **Restarts** server
7. ✅ **Tests** model

## 🚀 Quick Start

### 1. Create Your DSL Model

```typescript
// plugins/my-plugin/shared/dsl/my-model.model.ts
import { DslModel } from '../../../../../@typus-core/shared/dsl/types.js';
import { registry } from '../../../../../@typus-core/shared/dsl/registry.js';

export const MyModel: DslModel = {
  name: 'MyModel',
  module: 'my_plugin',  // ⚠️ Use underscores, not dashes!
  tableName: 'my_items',
  generatePrisma: true, // ⚠️ Required!

  access: {
    create: ['admin'],
    read: ['admin', 'user'],
    update: ['admin'],
    delete: ['admin'],
    count: ['admin']
  },

  fields: [
    {
      name: 'id',
      type: 'Int',
      required: true,
      unique: true,
      primaryKey: true,
      autoIncrement: true
    },
    {
      name: 'title',
      type: 'string',
      required: true
    },
    {
      name: 'createdAt',  // ⚠️ Required!
      type: 'datetime'
    },
    {
      name: 'updatedAt',  // ⚠️ Required!
      type: 'datetime'
    }
  ],

  config: {
    timestamps: true  // ⚠️ Recommended!
  }
};

registry.registerModel(MyModel); // ⚠️ Don't forget this!

export { MyModel };
```

### 2. Run db:instant

```bash
pnpm --filter @typus-core/shared run db:instant my-plugin MyModel
```

### 3. Done!

```
🚀 Instant Database Setup: my-plugin/MyModel

✓ Found model: plugins/my-plugin/shared/dsl/my-model.model.ts
✓ Model structure valid
✓ Prisma schema generated
✓ Database table created
✓ Prisma Client generated
✓ Seed template created: plugins/my-plugin/setup/seed.sql
✓ Server restarted
✓ Model tested successfully

✅ Done! Model ready to use:
  const data = await prisma.myModel.findMany();
```

## 📝 Validation Checks

The command validates your model **before** generation:

### Critical Errors (Block Execution)

- ❌ Model not registered in registry
- ❌ Missing `generatePrisma: true`
- ❌ Missing required fields (id, createdAt, updatedAt)
- ❌ Module name uses dashes (should be underscores)

### Warnings (Allow Execution)

- ⚠️ Missing `config.timestamps: true`
- ⚠️ Incomplete access permissions
- ⚠️ Table name not lowercase

## 🔧 Features

### Automatic Seed Generation

The command creates a seed template in `plugins/<plugin>/setup/seed.sql`:

```sql
-- =============================================================================
-- Seed data for MyModel
-- =============================================================================
-- Table: my_plugin.my_items
-- Generated: 2025-11-10T10:00:00.000Z
-- ⚠️  This is a template. Customize the values before using.
-- =============================================================================

INSERT INTO `my_plugin.my_items`
  (
    `title`,
    `description`
  )
VALUES
  (
    'example-title-1',
    'Example description content 1'
  ),
  (
    'example-title-2',
    'Example description content 2'
  );
```

**Features:**
- ✅ Correct table names (module.table_name)
- ✅ snake_case column names
- ✅ Example values by field type
- ✅ Skips auto-generated fields (id, createdAt, updatedAt)
- ✅ Handles NULL for optional fields
- ✅ Smart foreign key detection

### Model Testing

After setup, the command tests your model:

```javascript
// Executes inside Docker container
const { PrismaClient } = require('/app/data/prisma/generated/client');
const prisma = new PrismaClient();
await prisma.myModel.findMany(); // If this works, ✅ Success!
```

## 📊 Comparison

### ❌ Before (Manual Process)

```bash
# 1. Write model
vim plugins/my-plugin/shared/dsl/my-model.model.ts
# Oops, forgot registry.registerModel() → ERROR 1

# 2. Generate Prisma
pnpm run dsl:generate-prisma-schemas
# Missing generatePrisma: true → ERROR 2

# 3. Fix and regenerate...
# Wrong module name → ERROR 3

# 4. Push to database
docker exec ... npx prisma db push
# Success!

# 5. Generate client
docker exec ... npx prisma generate
# Success!

# 6. Write seed.sql manually
vim plugins/my-plugin/setup/seed.sql
# Wrong table name → ERROR 7
# camelCase columns → ERROR 8

# 7. Restart server
docker restart ...

# 8. Test
# Wrong model name → ERROR 10

# Total: 30+ minutes, 11 errors 😤
```

### ✅ After (Instant Workflow)

```bash
pnpm --filter @typus-core/shared run db:instant my-plugin MyModel

# Total: 20 seconds, 0 errors 😊
```

## 🐛 Troubleshooting

### Model not found in registry

```
❌ Model MyModel not found in registry
```

**Solution:** Add `registry.registerModel(MyModel)` at the end of your model file.

### Validation failed

```
❌ Errors:
  - Model MyModel missing generatePrisma: true
  - Model MyModel missing required fields: id, createdAt, updatedAt
```

**Solution:** Fix the errors listed in the output.

### Module name uses dash

```
❌ Model MyModel module uses dash. Change 'my-plugin' to 'my_plugin'
```

**Solution:** Use underscores in module names, not dashes.

### Database connection failed

Make sure your Docker container is running:

```bash
docker ps | grep lite_typus_dev_lite
```

## 🎓 Best Practices

### ✅ Do

- Use `module: 'my_plugin'` (underscores)
- Always add `generatePrisma: true`
- Include required fields: `id`, `createdAt`, `updatedAt`
- Set `config.timestamps: true`
- Call `registry.registerModel()` at the end
- Use lowercase for `tableName`

### ❌ Don't

- Don't use `module: 'my-plugin'` (dashes)
- Don't forget `generatePrisma: true`
- Don't skip required fields
- Don't forget to register the model
- Don't manually write seed.sql (let it generate)

## 🔗 Related Files

- **Validator:** `@typus-core/shared/dsl/validator/DslValidator.ts`
- **Seed Generator:** `@typus-core/shared/dsl/generators/SeedGenerator.ts`
- **Script:** `@typus-core/shared/scripts/db-instant.ts`
- **Registry:** `@typus-core/shared/dsl/registry.ts`

## 📚 See Also

- [DSL Model Checklist](../../../plugins/example/DSL_MODEL_CHECKLIST.md)
- [DSL Model Antipatterns](../../../plugins/antipattern/DSL_MODEL_ANTIPATTERNS.md)
- [DSL Validator README](./validator/README.md)
- [TODO: Instant Database Workflow](./TODO-instant-database-workflow.md)

---

**🎉 Enjoy instant database setup!**

*No more 30-minute debugging sessions. No more 11 common errors. Just code and ship.*
