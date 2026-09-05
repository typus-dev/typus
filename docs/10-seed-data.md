# 10. Seed data

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `data/baseline/`,
`data/prisma/schemas/migrations/`, and the snapshot builder.**

A fresh installation is not an empty database. Three different mechanisms put rows into it, they
run at different moments, and confusing them is how environment-specific junk ends up in a
public release.

## The three mechanisms

| | Baseline defaults | Baseline seed | Plugin install data |
|---|---|---|---|
| Form | `.sql` files | TypeScript files | `.sql` shipped with a plugin |
| Location | `data/baseline/defaults/` | `data/baseline/seed/` | `plugins/<name>/setup/` |
| When | on install, after the schema is in place | on install, driven by `apply-baseline.ts` | when the plugin's database is installed |
| Applied more than once? | yes, must be idempotent | yes, must be idempotent | depends on the plugin |
| Purpose | essential system rows | the same, expressed in code, plus demo content | tables and rows a plugin needs |

Migrations are a fourth thing and are not seed data: they change structure, they run in order,
and each runs once. Baseline data changes content, runs every time, and must survive being run
again.

## What ships today

`data/baseline/defaults/` currently holds, applied in alphabetical order:

```
001_system_config.sql            system configuration
002_config_public.sql            the public half of the configuration
003_default_dispatcher_tasks.sql scheduled tasks
004_default_cms_pages.sql        default pages
005_default_cms_routes.sql       the routes those pages sit on
```

`data/baseline/seed/` holds the same ground in TypeScript, plus a demo set:
`001-system-config`, `002-admin-user`, `003-demo-data`, `004-config-public`,
`005-dispatcher-tasks`, `006-cms-pages`, `007-cms-routes`, and a `demo/` directory.

## Idempotency is a requirement, not a style

Every baseline file is applied on every install, including a reinstall over an existing
database. Write them so a second run changes nothing:

```sql
INSERT IGNORE INTO `system.config` (`key`, `value`, `category`) VALUES
  ('site.name', 'Typus', 'site');
```

`INSERT IGNORE`, `ON DUPLICATE KEY UPDATE`, or an existence check. A plain `INSERT` that works on
a clean database and fails on the second run is the standard way this breaks.

Note the backticks: table names carry the module prefix as part of the name (chapter 5), so
`system.config` is one identifier, not a schema and a table.

## What happens to seed data in a release

The snapshot builder does three things to this directory on the way to the public mirror, and
they are worth knowing because they change what a user installs:

1. It strips `mysqldump` directives from the baseline SQL, so the files are portable rather than
   a dump of somebody's database.
2. It inserts an idempotent `DELETE` into `002_config_public.sql` so the public configuration
   starts from a known state.
3. It removes the migration bookkeeping keys from `typus-manifest.json`, so the snapshot
   installs as a fresh system rather than as a continuation of ours.

**A trap in that second step:** the builder finds the place to insert by matching a comment
string inside `002_config_public.sql`. Rename or reword that comment and the insertion silently
stops happening, with no error and no failed build. If you edit that file, check the built
snapshot.

## Rules of thumb

- Keep baseline minimal: configuration, default routes and pages, the roles the system needs to
  boot. Anything a particular deployment wants is not baseline.
- Never put credentials, real users, or environment URLs in baseline. It ships publicly.
- Demo content belongs in the demo set, not in the defaults.
- Baseline must work against the **latest** schema. It is not versioned alongside migrations, so
  a structural change means updating the baseline in the same commit.

## Common mistakes

- **A non-idempotent baseline file.** Works once, breaks the second install.
- **Environment-specific data in baseline.** It reaches every installation, including public
  ones.
- **Expecting baseline to run on update.** It runs on install. An update path that needs new
  rows needs its own step.
- **Forgetting the backticks** around a table name that contains a dot.

## Where to look

- `data/baseline/README.md` — the original contract for this directory.
- `data/baseline/apply-baseline.ts` — what actually applies it.
- `release-system/src/cli/build-lite-snapshot-v2.ts`, function `sanitizeBaselineDefaults` — the
  three transformations above.
