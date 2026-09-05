# 24. Menus

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`frontend/scripts/generate-auto-menus.ts` and the generated menu files, and by reading a live
startup log.**

Navigation is generated at frontend startup from `*.menu.ts` files scattered across modules and
plugins. There is no central menu file to edit.

## Declaring an entry

```ts
// plugins/my-plugin/frontend/my-plugin.menu.ts
import type { MenuItem } from '@/shared/types/menu'

export const myPluginMenu: MenuItem = {
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ri:file-list-line',
  path: '/my-plugin',
  layout: 'private',        // which menu this entry belongs to
  injectAfter: 'Settings'   // optional placement
}
```

`layout` is required. An entry without it is skipped, with a warning in the generation log. It
names the menu the item joins, and the generator writes one file per layout it finds:
`src/auto-menu.private.ts`, `auto-menu.public-docs.ts`, `auto-menu.docs-default.ts` and so on.
So "the menu" is really several menus, one per area of the product.

## Where entries are collected from

- `src/modules/**/*.menu.ts`
- `plugins/*/frontend/*.menu.ts`

A module or plugin directory containing a `.disable` file is skipped, and the generator says so
by name. That is the supported way to hide a whole feature's navigation.

## Ordering

`injectAfter` names another entry, by `id` or by `title`, and asks to be placed after it. The
generator makes two passes: first everything without `injectAfter`, then the deferred items.
Anything it still cannot resolve is placed at the end, and it tells you:

```
Could not resolve injectAfter for 7 items. Placing at end.
- System (injectAfter: "Role Management")
- Dispatcher (injectAfter: "Tasks")
```

Those warnings are worth reading. An unresolved `injectAfter` is not an error, so a menu whose
order looks arbitrary usually has a list like this behind it, naming entries that no longer
exist or that belong to a different layout.

## The trap: menus are startup-time

`generate:menus` runs when the frontend process starts, before Vite. Hot reload does not rerun
it. A new or edited `*.menu.ts` therefore needs a **frontend restart**, not a page refresh.

In a container the simplest reliable way is to restart the container; the supervisor socket is
not always where `supervisorctl` expects it.

## Common mistakes

- **Omitting `layout`.** The entry is silently skipped.
- **Expecting a new entry after a page reload.** Restart the frontend.
- **`injectAfter` pointing at an entry in another layout.** It cannot resolve, and the item goes
  to the end.
- **Editing `src/auto-menu.*.ts`.** Generated; overwritten on the next start.
- **Assuming one global menu.** There is one per layout.

## Where to look

- `@typus-core/frontend/scripts/generate-auto-menus.ts` — collection, `.disable`, `injectAfter`.
- `@typus-core/frontend/src/auto-menu.private.ts` — what was actually generated.
- The startup log — the count of menu files found, the ones skipped, and every unresolved
  `injectAfter`.
