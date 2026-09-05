# 23. Page frames

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`frontend/src/layouts/`, `core/layouts/` and `core/middleware/auth.ts`.**

A layout is the frame a page renders inside: shell, navigation, header, footer. Pages do not
import layouts; they name one in their route metadata, and a registry resolves the name.

## What ships

```
src/layouts/
├── default/     the neutral frame
├── public/      unauthenticated pages
├── private/     the signed-in application shell
├── system/      error and system pages
└── _partials/   fragments the frames share
```

The partials directory is what a product overrides most often: a header or footer fragment can
be replaced per instance without touching the frame itself.

## Choosing a layout

```json
{ "meta": { "layout": "private" } }
```

If a page names no layout, the auth guard fills one in: a registered fallback if there is one,
otherwise `public`. Do not rely on that; state the layout on any page that belongs to the
signed-in area.

The name also affects permissions. The ability guard skips its check entirely for the `public`
and `default` layouts, so putting an admin page on the public layout silently disables the
permission check on it.

## The registry

`core/layouts/` holds a singleton registry, a `LayoutWrapper` component that renders the layout
named by the current route, and a `useLayout` composable:

```ts
import { useLayout } from '@/core/layouts'
const { currentLayout, hasLayout, getLayout } = useLayout()
```

A route naming a layout that does not exist falls back to `default` and logs a warning, rather
than failing loudly. If a page renders in the wrong frame, check the name against the registry
first.

## A layout from a module

Modules and plugins can ship their own frames. Put the components in a `layouts/` directory
inside the module and register them from `layouts/index.ts`:

```ts
import { registerModuleLayout } from '@/core/layouts/module-layouts-loader'
import MyModuleLayout from './MyModuleLayout.vue'

export function registerLayouts(): void {
  registerModuleLayout('my-module', 'default', MyModuleLayout, {
    description: 'Default frame for My Module'
  })
}
```

The registered name is `<module>-<layout>`, so the example above is used as
`"layout": "my-module-default"`. The loader discovers `layouts/index.ts` in every module at
startup and calls `registerLayouts`.

## Common mistakes

- **Importing a layout into a page.** Name it in the route metadata instead.
- **Leaving `layout` unset on a signed-in page.** It renders inside the public frame.
- **Putting a protected page on the `public` or `default` layout.** The ability guard skips
  those layouts, so the permission check silently does not run.
- **A typo in the layout name.** You get `default` and a warning in the console, not an error.
- **Editing a shared frame for one product's needs.** Override the partial instead.

## Where to look

- `@typus-core/frontend/src/core/layouts/README.md` — the registry, the wrapper and the
  composable.
- `@typus-core/frontend/src/layouts/` — the frames that ship.
- `@typus-core/frontend/src/core/middleware/auth.ts` — where an unset layout is filled in.
