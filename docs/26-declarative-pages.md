# 26. Declarative pages

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `frontend/src/dsx/`,
its type definitions and the shipped configurations.**

DSX renders a page from a configuration object instead of markup. You describe blocks and
components; the renderers instantiate them, load their data and wire their events. It is the
fastest way to build the screens that are mostly tables, forms and cards, and it is what makes
model-driven screens possible (chapter 27).

## Status: use it deliberately

**This mechanism works in places and is brittle in others.** The idea is right and the machinery
is real, but the failures land in the renderer rather than in your own code, which is the
expensive kind of debugging.

The rule that came out of building on it: **if the screen is not plainly a list or a form over a
model, write the page.** A Vue page with `dx*` components and the typed client (chapters 21 and
8) is boring, obvious and cheap to fix. Use configuration where the screen really is a table of
a model, and stop the moment you find yourself debugging the renderer instead of the feature.

The rest of this chapter is here so that when you meet an existing DSX page you can read it.

## The three renderers, and three generations of them

The pipeline is a page renderer, a block renderer and a component renderer. Each exists in three
variants that live side by side in `src/dsx/components/`:

| Variant | Files | Use |
|---|---|---|
| plain | `dsxPageRenderer.vue` and friends | configuration only, no shared context |
| with context | `dsxPageRendererWithContext.vue` and friends | a page context and per-block contexts, model binding |
| unified | `dsxPageRendererWithContextUnified.vue` and friends | the newer context model, with the unified hooks |

Pick one generation per page and stay in it. The engine's own pages use the context variants;
new work should follow whichever variant the page you are copying from uses, and should not mix
hooks from two generations in one configuration.

## The shape of a page

```ts
const pageConfig: dsxPageConfig = {
  title: 'Invoices',
  layout: 'private',
  type: 'grid',          // grid, row or stack
  columns: 12,
  gap: 16,

  blocks: [
    {
      id: 'list',
      colSpan: 12,
      components: [
        {
          type: dxTable,
          props: { columns: ['number', 'amount', 'status'] },
          dataSource: () => DSL.Invoice.findMany()
        }
      ]
    }
  ]
}
```

A block carries layout (`colSpan`, `rowSpan`, `align`, `justify`, `class`), its components, and
optionally its own `dataSource`. A component carries its type, props, a data source, slots and
events.

## Lifecycle hooks

Hooks exist at all three levels, and knowing which level owns yours saves an afternoon:

| Level | Hooks |
|---|---|
| page | `beforeLoad`, `onLoad`, `afterLoad`, plus `afterDataFetch` and `beforeDataSave` |
| block | `beforeDataLoad`, `afterDataLoad`, `beforeDataUpdate`, `afterDataUpdate`, `onDataError` |
| component | `beforeDataFetch`, `afterDataFetch`, `beforeRender`, and `setup` |

`beforeDataFetch` can rewrite the component's configuration before its data is requested;
`afterDataFetch` can transform the data; `beforeRender` can change both. A component can also
take a `setup` object or class, which packages that logic for reuse across pages.

The unified variants add `beforeDataFetchUnified` and `afterDataFetchUnified` at page level,
which receive one context object instead of loose arguments.

## Context

`contextConfig` binds a page or a block to a model and a mode, and the renderers then handle
loading an existing record, holding the edited values and saving them back. A block can share
the page context or declare its own isolated one, which is how a side panel edits something
unrelated to the main record.

## When to use it, and when not

DSX pays off on CRUD-shaped screens: lists, forms, detail views, dashboards assembled from
cards. It pays off less on a screen with unusual interaction, where a plain Vue page with the
`dx*` components is simpler to read and to debug. Both approaches are first-class and coexist;
a configuration is not more "correct" than a component.

## Common mistakes

- **Mixing generations.** A hook from the unified variant in a with-context page does nothing,
  quietly.
- **Putting data loading at the wrong level.** A component `dataSource` reloads with the
  component; a block `dataSource` serves everything in the block.
- **Expecting the configuration to be reactive.** It is read when the renderer mounts; change
  data, not the config object.
- **Fighting the renderer for a one-off screen.** Write the page.

## Where to look

- `@typus-core/frontend/src/dsx/README.md` — the original design notes, including diagrams.
- `@typus-core/frontend/src/dsx/types/index.ts` — the exact `dsxPageConfig`, `dsxBlockConfig`
  and `dsxComponentConfig`.
- `@typus-core/frontend/src/modules/dispatcher/configs/` — a real configuration that ships.
