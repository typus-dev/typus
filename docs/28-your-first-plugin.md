# 28. Your first plugin

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, against `plugins/example/` and the
shipped plugins.**

A plugin is a whole feature in one folder: data, API, screens, navigation, background work. This
chapter walks the shortest path from nothing to a working screen. Every piece of it is explained
in its own chapter; the point here is the sequence.

## The folder

```
plugins/invoicing/
├── backend/
│   ├── InvoicingModule.ts
│   ├── controllers/InvoicingController.ts
│   └── services/InvoicingService.ts
├── frontend/
│   ├── pages/index.vue
│   ├── components/            optional
│   ├── composables/           optional
│   └── invoicing.menu.ts
├── shared/
│   └── dsl/invoice.model.ts
└── workers/handlers/          optional
```

Nothing here is registered anywhere. Each path is discovered by convention (chapter 2).

Start by copying `plugins/example/template`, which is kept as a working skeleton, and rename the
classes. The same folder also holds the engine's own guides on backend and frontend conventions.

## The five steps

**1. Declare the data.** One model file (chapter 5). Remember `module: 'invoicing'` with
underscores if the name has more than one word, `generatePrisma: true`, the three required
fields, an `access` block, and `registry.registerModel(...)` at the end.

**2. Create the table.** In development, restart the backend container and the boot chain
generates and pushes everything (chapter 7). To move faster while iterating,
`pnpm db:instant invoicing Invoice` does it for one model.

At this point you already have a working API: `POST /api/dsl` with your model name, and
`DSL.Invoice.*` in the browser. Many plugins need nothing more on the backend.

**3. Add a backend module** only if you need endpoints beyond CRUD (chapter 11). Extend
`BaseModule`, resolve a controller and a service, declare routes in `initializeRoutes`, and
remember to bind handlers.

**4. Add a page.** A `.vue` file under `frontend/pages/` with a `<route>` block naming a layout
and, for a protected screen, `requiresAuth` and a `subject` (chapter 20). Use the `dx*`
components without importing them (chapter 21) and theme classes rather than raw utilities
(chapter 22).

For a straightforward list or form, consider generating the screen from the model instead
(chapter 27): declare `ui.visibility` and `ui.component` on the fields and let the renderer
build it.

**5. Add navigation.** A `*.menu.ts` file with `title`, `icon`, `path` and, importantly,
`layout`. Then **restart the frontend**: menus are generated at process start, not on hot
reload (chapter 24).

## Background work and automation

Long-running work goes into a task handler under `workers/handlers/`, decorated with
`@Service()` (chapter 16). Work that a non-programmer should be able to rearrange goes into a
workflow instead (chapter 29).

## Checking your work

| Question | Where to look |
|---|---|
| did my page become a route | `src/typed-router.d.ts` |
| did my component register | `components.d.ts` |
| did my menu entry appear | `src/auto-menu.<layout>.ts` |
| did my model register | the startup log, and the generated Prisma schema |
| did my module mount | the startup log line naming its base path |

If any of those is missing, the file is in the wrong place or the module failed to import. See
chapter 34.

## Common mistakes

- **A dash in the model's `module`.** Use underscores.
- **Expecting the menu after a page refresh.** Restart the frontend.
- **Writing CRUD endpoints by hand.** The model already gave you the API.
- **Editing the core to make the plugin work.** If the engine is missing something, that is a
  change to the engine, and it belongs in a separate discussion.
- **Skipping `access` on the model.** It is a validation error, not an open default.

## Where to look

- `plugins/example/` — the template plus `PLUGIN_CREATION_GUIDE`, `BACKEND_GUIDELINES`,
  `FRONTEND_GUIDLINES` and `DSL_MODEL_CHECKLIST`.
- `plugins/antipattern/DSL_MODEL_ANTIPATTERNS.md` — what not to do in a model.
- `plugins/waitlist/` — a small complete plugin to read end to end.
