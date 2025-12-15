# SQLite Compatibility Notes

## UUID Generation

**Current State (MySQL):**
- Schema uses `@default(dbgenerated("(uuid())"))` for UUID fields
- Baseline migration contains `DEFAULT (uuid())` - MySQL-specific syntax
- Works perfectly for MySQL development and production

**SQLite Limitation:**
- SQLite does NOT support `uuid()` function
- Migrations with `DEFAULT (uuid())` will FAIL on SQLite

## Solution for SQLite

When generating projects for SQLite (in CLI Phase 3), use:

### 1. Client-Side UUID Generation

**schema.prisma for SQLite:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model AuthEmailVerification {
  id String @id @default(uuid()) @db.VarChar(36)  // ✅ Client-side UUID
  // ...
}
```

### 2. Migration Strategy

For SQLite installations, migrations should NOT include `DEFAULT (uuid())`:

**SQLite Migration:**
```sql
CREATE TABLE `auth.email_verifications` (
    `id` VARCHAR(36) NOT NULL,  -- ❌ No DEFAULT clause
    `token` VARCHAR(191) NOT NULL,
    -- ...
    PRIMARY KEY (`id`)
);
```

Prisma Client will generate UUIDs on the application side before insert.

## Tables Affected (5)

1. `auth.email_verifications`
2. `auth.password_resets`
3. `auth.refresh_tokens`
4. `auth.verification_codes`
5. `system.dynamic_routes`

## Implementation Plan (Phase 3)

When CLI generates project for different databases:

### MySQL/PostgreSQL:
- Use `@default(dbgenerated("(uuid())"))` in schema
- Database generates UUIDs

### SQLite:
- Use `@default(uuid())` in schema
- Prisma Client generates UUIDs

### Code Generation Logic:
```typescript
const uuidDefault = dbProvider === 'sqlite'
  ? '@default(uuid())'
  : '@default(dbgenerated("(uuid())"))';
```

## Current Development Environment

**Provider:** MySQL
**UUID Strategy:** Database-generated (`DEFAULT (uuid())`)
**Baseline Migration:** MySQL-optimized
**Status:** ✅ Working correctly

## Testing Required

Before Phase 3 deployment, test:
- [ ] SQLite installation with client-side UUID generation
- [ ] MySQL installation with database-side UUID generation
- [ ] PostgreSQL installation (supports both strategies)
- [ ] Migration rollback scenarios
- [ ] UUID uniqueness across strategies

---

**Created:** 2025-10-05
**Related:** Phase 2.6 - Database Initialization with Prisma Migrations
**Next Review:** Phase 3 - CLI with Profiles
