# DSL Validator

**Version:** 1.0.0
**Created:** October 2, 2025

## Purpose

The DSL Validator ensures that DSL model definitions are correct **before** generating Prisma schemas. This catches common errors early and enforces best practices.

## What it validates

### Critical Errors (❌)

These will **stop schema generation**:

1. **Missing `foreignKey` in `belongsTo` relations**
   ```typescript
   // ❌ ERROR
   {
     name: 'user',
     type: 'belongsTo',
     target: 'AuthUser',
     // Missing foreignKey!
   }

   // ✅ CORRECT
   {
     name: 'user',
     type: 'belongsTo',
     target: 'AuthUser',
     foreignKey: 'userId',  // Explicit!
   }
   ```

2. **Foreign key field not defined in model**
   ```typescript
   // ❌ ERROR - userId field missing
   relations: [{
     name: 'user',
     type: 'belongsTo',
     target: 'AuthUser',
     foreignKey: 'userId'
   }]
   // No userId in fields array!

   // ✅ CORRECT
   fields: [
     { name: 'userId', type: 'Int', required: false }
   ],
   relations: [{
     name: 'user',
     type: 'belongsTo',
     target: 'AuthUser',
     foreignKey: 'userId'
   }]
   ```

3. **Target model not found**
   ```typescript
   // ❌ ERROR
   {
     name: 'post',
     type: 'belongsTo',
     target: 'BlogPost',  // Model doesn't exist!
     foreignKey: 'postId'
   }
   ```

4. **Duplicate field names**
   ```typescript
   // ❌ ERROR
   fields: [
     { name: 'title', type: 'string' },
     { name: 'title', type: 'string' }  // Duplicate!
   ]
   ```

### Warnings (⚠️)

These are **non-blocking** but should be addressed:

1. **Missing `inverseSide` in `hasMany`**
   ```typescript
   // ⚠️ WARNING
   {
     name: 'posts',
     type: 'hasMany',
     target: 'BlogPost'
     // Missing inverseSide for clarity
   }

   // ✅ BETTER
   {
     name: 'posts',
     type: 'hasMany',
     target: 'BlogPost',
     inverseSide: 'author'  // Clear bidirectional link
   }
   ```

2. **Missing inverse relation**
   ```typescript
   // ⚠️ WARNING - inverseSide 'posts' not found in User model
   {
     name: 'author',
     type: 'belongsTo',
     target: 'User',
     foreignKey: 'authorId',
     inverseSide: 'posts'  // User model doesn't have 'posts' relation!
   }
   ```

## Integration

The validator runs automatically during schema generation:

```bash
npm run dsl:generate-prisma-schemas
```

Output example:
```
🔍 Validating DSL models...

❌ DSL Validation found 2 error(s) and 1 warning(s):

❌ [AuthRefreshToken.user] belongsTo relation MUST specify foreignKey. Add 'foreignKey: "userId"' to relation definition.
❌ [CmsItem.ogImage] foreignKey 'ogImageId' not found in model fields. You must define this field explicitly.
⚠️ [AuthUser.refreshTokens] hasMany relation should specify inverseSide for clarity

❌ Found 2 critical error(s). Fix these before generating schemas.
```

## Architecture Principles

### Explicit over Implicit

**Old behavior (implicit):**
```typescript
// RelationGenerator auto-created foreign key field
{
  name: 'user',
  type: 'belongsTo',
  target: 'AuthUser'
  // foreignKey auto-generated as 'authUserId'
}
// Result: Field auto-created, didn't match DB (user_id)
```

**New behavior (explicit):**
```typescript
// You MUST define both field and foreignKey
fields: [
  { name: 'userId', type: 'Int', required: false }
],
relations: [{
  name: 'user',
  type: 'belongsTo',
  target: 'AuthUser',
  foreignKey: 'userId'  // Explicit mapping to existing field
}]
// Result: Full control, matches DB exactly
```

### Benefits

1. **No surprises** - You control exactly which fields exist
2. **Database alignment** - Easy to match existing DB schema
3. **Early error detection** - Catch mistakes before Prisma generation
4. **Self-documenting** - Clear relationship between fields and relations

## RelationGenerator Changes

The `RelationGenerator` has been updated to **require** explicit foreign keys:

### Before
```typescript
const foreignKey = relation.foreignKey || this.generateForeignKeyName(targetModel.name);
// Fallback to auto-generation
```

### After
```typescript
if (!relation.foreignKey) {
  throw new Error('belongsTo relation MUST specify foreignKey');
}
const foreignKey = relation.foreignKey;
// No auto-generation - explicit only
```

### getForeignKeyFields()

**Before:** Auto-generated missing foreign key fields
**After:** Returns empty array, validates fields exist

This means **all foreign key fields must be in `model.fields`**.

## Migration Guide

If you have existing models without explicit foreign keys:

1. **Identify the error:**
   ```
   ❌ [YourModel.relation] belongsTo relation MUST specify foreignKey
   ```

2. **Check what field name should be:**
   - Look at your database table
   - Find the foreign key column (e.g., `user_id`)
   - Convert to camelCase (e.g., `userId`)

3. **Add field to model:**
   ```typescript
   fields: [
     { name: 'userId', type: 'Int', required: false }
   ]
   ```

4. **Add foreignKey to relation:**
   ```typescript
   relations: [{
     name: 'user',
     type: 'belongsTo',
     target: 'AuthUser',
     foreignKey: 'userId',  // Add this!
     inverseSide: 'refreshTokens'
   }]
   ```

5. **Regenerate schemas:**
   ```bash
   npm run dsl:generate-prisma-schemas
   ```

## Files

- `DslValidator.ts` - Main validator class
- `README.md` - This file
- Integration: `scripts/generate-prisma-schemas.ts`
- RelationGenerator: `dsl/prisma-generator/RelationGenerator.ts`

## See Also

- `/work-log/roadmaps/2025-10-01_dsl-prisma-complete-migration.md`
- `/changelog/2025-10/2025-10-02_dsl-validator-explicit-foreign-keys.md` (to be created)
