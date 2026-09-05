# 7. Schema and database

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`backend-startup-dev.sh`, `backend-startup-prod.sh`, `@typus-core/shared/scripts/`, and
`data/prisma/`.**

The database schema is not a source of truth in Typus. It is derived from the models on every
container start. This chapter says where each artifact comes from, what happens to your data
when you change a model, and what to do when the database and the models disagree.

## The chain

```
shared/dsl/models/**/*.model.ts        you write this
        |  dsl:generate-models-index
        v
shared/dsl/models/index.ts             generated
        |  dsl:generate-interfaces
        v
shared/dsl/auto-interfaces.ts          generated TypeScript types
        |  dsl:generate-prisma-schemas
        v
data/prisma/schemas/schema.prisma      generated
        |  prisma generate
        v
data/prisma/generated/client           generated Prisma client
        |  prisma db push
        v
the tables in the database
```

Every step runs on every backend container start, in that order, before the server listens. That
is why a fresh clone plus `docker compose up` produces a working database with no migration
step, and why a failed generation stops the container rather than starting a half-wired app.

## Never edit the schema

`data/prisma/schemas/schema.prisma` is generated. Editing it works exactly until the next
container start, at which point your change disappears and the bug you thought you fixed comes
back. Change the model instead.

The only file next to it that is not generated is `schema.base.prisma`, which holds the
datasource and generator blocks the generated schema is built on top of.

## Adding or changing a field

1. Edit the model.
2. Restart the backend container.

That is the whole procedure in dev. The startup chain regenerates the schema and the client and
pushes the change into the database.

## `db push` versus migrations

The engine ships both paths and picks by profile:

- **Development** (`backend-startup-dev.sh`) always runs
  `prisma db push --accept-data-loss`. It is idempotent and makes the database match the schema.
- **Production** (`backend-startup-prod.sh`) can run `prisma migrate deploy` against the
  migrations in `data/prisma/schemas/migrations/`, falling back to `db push` where that is the
  configured behaviour.

`--accept-data-loss` is not decoration. `db push` reconciles by dropping what no longer matches:
renaming a field is seen as dropping one column and adding another, and the data in the old
column is gone. On anything with real data, add the new field, migrate the values, then remove
the old one in a later step.

## When the database and the models disagree

Three checks live in `@typus-core/shared`:

| Command | Answers |
|---|---|
| `pnpm db:validate-all` | are the models themselves valid |
| `pnpm schema:check` | does the generated schema match the models |
| `pnpm schema:check-db` | does the database match the generated schema |

`pnpm db:instant <plugin> <Model>` is the fast path while developing: it generates and pushes a
single model so you can start using the table immediately.

## Known defect: plugin tables on a first production boot

On a production image, the startup `db push` runs against `schema.prisma` before plugin models
have been merged into it, so plugin tables can be missing on the very first boot even though the
models are registered and visible in the log. The symptom is a DSL create failing with *the
table does not exist*.

Work around it by pushing the generated client schema, which does contain every model:

```
npx prisma db push --schema=generated/client/schema.prisma --accept-data-loss --skip-generate
```

In development the startup chain regenerates and pushes everything correctly, so a container
restart is enough there.

## Common mistakes

- **Editing `schema.prisma`.** It is overwritten on the next start.
- **Writing a migration by hand for a new field.** Add the field to the model.
- **Renaming a field on a database with data.** `db push` drops the column. Add, copy, remove.
- **Running Prisma commands from the wrong directory.** The schema path is relative; the scripts
  run from `data/prisma`.
- **Assuming the schema in git is what the database has.** The schema is a build artifact. Ask
  the database with `schema:check-db`.

## Where to look

- `@typus-core/backend/backend-startup-dev.sh` and `-prod.sh` — the boot chain, step by step.
- `@typus-core/shared/package.json` — every generation and check command.
- `data/prisma/schemas/` — the generated schema and the migrations directory.
