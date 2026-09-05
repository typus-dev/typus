# 2. Generation

**Verified against engine 1.1.121 (build 2078) on 2026-09-05.**

Read this chapter first. Most of Typus is generated from convention, and the single largest
source of wasted effort is hand-wiring something the build already wired up. Routes, component
registration, common imports, menus, database tables, TypeScript types and the Prisma schema are
all produced from two inputs: **where a file sits** and **what a model declares**.

## The rule

> Put the file in the right folder. Then open the generated artifact and confirm it appeared.

If something is not wired up, the fix is almost always to move the file, not to add a
registration. If you find yourself writing a route table, an import plus a component
registration, or a hand-rolled CRUD endpoint, stop: the generator has already done it, and your
copy will fight it.

Generated artifacts are checked into the repository so you can read them. **Read them, never
edit them.** They are overwritten on the next build or the next container start.

## What is generated

### Frontend

| Artifact | Produced by | Input | When |
|---|---|---|---|
| `src/typed-router.d.ts` | `unplugin-vue-router` | every `.vue` under `src/pages`, a published module's `pages/`, `plugins/<name>/frontend/pages`, and the custom pages folder | dev server start, and on file changes |
| `src/auto-imports.d.ts` | `unplugin-auto-import` | `vue`, `vue-router`, `pinia` APIs, plus every composable under `src/core/composables`, `src/core/theme/composables`, `src/core/logging`, `src/shared/composables`, `src/modules/**/composables`, and plugin composables | same |
| `components.d.ts` | `unplugin-vue-components` | `src/components/**`, `src/core/layouts`, `src/layouts/**`, `src/dsx/components`, module components, plugin components, plus the icon resolver | same |
| `src/auto-menu.<layout>.ts` | `pnpm generate:menus` | every `*.menu.ts` in modules and plugins | **frontend process start only** |
| `src/auto-modules.ts` | `pnpm generate:modules` | the module directories that exist | frontend process start |
| `src/auto-themes.json` and `index.html` | `pnpm generate:themes` | the themes under `public/styles/themes/` | frontend process start |
| `public/routes.json` | `pnpm generate:routes` | the generated router types | frontend process start, and after `vite build` |
| `theme-classes.css` and the per-theme CSS | `pnpm build:themes` | the theme token map | when themes change |

`pnpm dev` runs them in a fixed order before Vite ever starts:

```
generate:menus  ->  generate:modules  ->  generate:themes  ->  generate:routes  ->  vite
```

### Backend and shared

| Artifact | Produced by | Input |
|---|---|---|
| `shared/dsl/models/<module>/index.ts` and `models/index.ts` | `dsl:generate-models-index` | the `*.model.ts` files found under `shared/dsl/models/` |
| `shared/dsl/auto-interfaces.ts` | `dsl:generate-interfaces` | the registered models |
| `data/prisma/schemas/schema.prisma` | `dsl:generate-prisma-schemas` | the registered models |
| `data/prisma/generated/client` | `prisma generate` | the generated schema |
| the tables themselves | `prisma db push` | the generated schema |

All five run **on every backend container start**, in that order, before the server listens. The
database schema is therefore not stored anywhere as a source of truth: it is derived from the
models each time. This is why `git clone` plus `docker compose up` produces a working
application with no migration step.

## What this means in practice

| You want | You do | Then confirm in |
|---|---|---|
| a new page | drop a `.vue` into a `pages/` folder | `src/typed-router.d.ts` |
| page metadata, layout, auth | a `<route lang="json">` block in that file | `src/typed-router.d.ts` |
| a new component | drop it into a components folder | `components.d.ts` |
| a new composable | drop it into a composables folder | `src/auto-imports.d.ts` |
| a new menu entry | a `*.menu.ts` file, then **restart the frontend** | `src/auto-menu.<layout>.ts` |
| a new entity, table and CRUD API | one `*.model.ts` file | the generated Prisma schema |
| one more field on an entity | one line in the model | the generated Prisma schema |

## What is not hot

Vite reloads component code as you edit it. Two things are decided once, at process start, and
do not reach a running dev server through HMR:

- **Menus.** `generate:menus` runs at frontend startup. A new or changed `*.menu.ts` needs a
  frontend restart.
- **The `<route>` block.** Its `meta` is read when the router file is generated. Changing
  `requiresAuth`, `path` or `name` and reloading the page leaves the old route in force, and the
  guard keeps using the old metadata while the file on disk says something else. Restart.

Both look like bugs in your own code and cost hours if you do not know them.

## Common mistakes

- **Hand-adding a route.** There is no route table to edit. The file location is the route.
- **Importing a component that is already auto-registered.** If you write
  `import DxFoo from '...'` and use `<DxFoo>`, the auto-importer also registers the PascalCase
  tag, and the double registration makes the whole page render throw. The symptom is a parent
  stuck on "Loading" with healthy API calls behind it. Use the lowercase tag with no import.
- **Re-importing an auto-imported symbol.** `import { ref } from 'vue'` is redundant and can
  clash with the injected import.
- **Editing a generated file.** It will be overwritten, and the change will look like it
  silently reverted itself.
- **Expecting a new menu item or a changed `<route>` block after HMR.** Restart the frontend.
- **Writing a migration by hand.** Add the field to the model; the schema and the table follow.

## Where to look

- `@typus-core/frontend/vite.config.js` for the frontend plugin configuration.
- `@typus-core/frontend/scripts/` for the generators that run before Vite.
- `@typus-core/shared/package.json` for the DSL generation scripts.
- `@typus-core/backend/backend-startup-dev.sh` and `backend-startup-prod.sh` for the boot-time
  chain.
