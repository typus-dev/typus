# Baseline Data

This directory contains baseline/default data that is applied during initial installation.

## Purpose

The baseline data is **always applied** during installation, regardless of updates.
Unlike migrations which are applied sequentially, baseline data is meant for:
- Essential system configuration
- Default pages and routes
- Default users and roles
- Initial feature toggles

## Structure

```
baseline/
├── README.md           # This file
└── defaults/           # Default data SQL files
    ├── 001_system_config.sql      # System configuration defaults
    ├── 002_default_admin_user.sql # Default admin user (admin@typus / admin)
    ├── 003_default_routes.sql     # Default routes (planned)
    └── 004_default_pages.sql      # Default pages (planned)
```

## Usage

### During Installation

All SQL files in `defaults/` are applied in alphabetical order after migrations:

```bash
# 1. Apply migrations (schema changes)
for migration in data/prisma/schemas/migrations/*/migration.sql; do
  mysql < $migration
done

# 2. Apply baseline defaults (initial data)
for default in data/baseline/defaults/*.sql; do
  mysql < $default
done
```

### File Naming Convention

- Use numeric prefix: `001_`, `002_`, `003_`, etc.
- Use descriptive names: `system_config`, `default_routes`, etc.
- Files are applied in alphabetical order

## Key Differences

| Aspect | Migrations | Baseline Defaults |
|--------|-----------|-------------------|
| Purpose | Schema changes | Initial data |
| When applied | Sequentially, once | Always on install |
| Updates | New migrations added | Can be updated in-place |
| Idempotency | Not required | Should be idempotent |

## Idempotency

All baseline SQL files should be idempotent (safe to run multiple times).

Use:
- `INSERT IGNORE INTO` - Skip if exists
- `ON DUPLICATE KEY UPDATE` - Update if exists
- Check for existence before INSERT

Example:
```sql
-- Safe to run multiple times
INSERT IGNORE INTO `system.config` (`key`, `value`, `category`) VALUES
('site.name', 'Typus LITE', 'site');
```

## Notes

- Baseline data should work with the **latest migration schema**
- If migrations change table structure, update baseline data accordingly
- Keep baseline data minimal - only essential defaults
- For user-specific or environment-specific data, use separate seed files
