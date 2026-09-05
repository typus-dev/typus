# Appendix. What is load-bearing, what is fragile, what is dead

**Written 2026-09-05 against engine 1.1.121 (build 2078), from the code and from what actually
happened in production.**

A codebase this old contains more than one attempt at the same problem. This appendix says which
attempt won, so that nobody spends a week building on a dead end that still compiles. It is
deliberately blunt: a chapter describes how something works, this page says whether to use it.

## Load-bearing

Build on these without hesitation. They carry the system.

| | Chapter |
|---|---|
| The model as the single description: table, API, types, permissions, events | 5, 7, 8, 9 |
| Generated types on both sides, `I<Model>` and `<Model>Fields` | 8 |
| Discovery by convention: modules, plugins, pages, components, composables, menus, themes | 2, 3, 4 |
| The module and its base classes: `BaseModule`, `BaseController`, `BaseService`, `BaseError` | 11, 12 |
| Identity, roles, abilities | 13 |
| Storage | 14 |
| Configuration in the database, secrets encrypted at rest | 15 |
| The dispatcher: schedule, queue, history, handler schemas | 16 |
| Events and the WebSocket | 17 |
| Client-side logging into the database | 18 |
| The operation catalogue, SML | 19 |
| Pages, layouts, menus, the component library | 20, 21, 23, 24 |
| CSS themes, generated from a palette, stamped server side | 22 |
| Plugins as whole features, `custom/` for one deployment | 28, 30 |
| Workflows and blocks | 29 |

## Fragile: works, but weigh it first

**Screens generated from the model, and DSX** (chapters 26 and 27). The idea is sound and the
mechanism is real: declare `ui.component` and `ui.visibility` on a field and get a list, a form
and a detail view. In practice it works in places and is brittle in others, and the cost lands
where you least want it, in debugging a renderer rather than your own screen.

The working rule from experience: **for anything but a plain CRUD screen, write the page.** A
Vue page with `dx*` components and the typed data client is boring, obvious, and cheap to fix.
Reach for generation when the screen really is a table of a model, and stop reaching the moment
you find yourself debugging the renderer.

**HTML caching** (`modules/html-cache`). Two generations live in the module. The first renders
the running application in a headless browser and saves the result. The second, visible in
`TemplateGeneratorService`, drops the browser entirely and assembles HTML from TypeScript
templates plus the shared content renderer. Nginx then serves static files, then the cache, then
the application.

The verdict from running it: the cache was fragile and the structure it produced was convoluted.
Even when it worked, it was one change away from serving something stale or subtly wrong, and
nothing about it was easy to reason about.

**What was done instead, and works:** a public site is generated as plain static HTML by a
separate tool and served as files, while the application stays on Typus. `explain.ink` runs
exactly that way, the application on the engine and the landing generated statically. If your
public pages must be fast and crawlable, take that route before you take the cache.

## Dead: present in the tree, do not build on it

**The typed theme object.** `core/theme/types.ts` still defines the full `Theme` type, and the
`.theme.ts` files that implemented it are gone. Components no longer read the theme object, and
`pnpm guard:theme` fails the build if they try. Read the type for understanding; do not revive
the pattern. Chapter 22.

**The theme token map and its scripts.** `generate-theme-classes.ts` and
`apply-theme-token-migration.ts` both need `work-log/themes/theme-token-map.json`, which is not
in the tree, and throw immediately. `compile-theme-css.ts` expects a per-theme file layout that
shipped themes do not use. Chapter 22.

**The workspace-root `docs/`.** Forty-two files, deleted in October 2025. They predate the
current architecture, and several of them teach things that are now wrong, including a
data-access page that documents an operation vocabulary the API rejects. The recovered copy is
kept under `work-log/` as raw material, not as documentation.

**The module lists inside the release builder.** They name modules that became plugins, and the
builder silently skips what it cannot find, so the generated README overstates what ships.
Chapters 4 and 33.

## Broken today: known, unfixed, documented

| | Chapter |
|---|---|
| The server's database log transport writes nothing; the System Logs page is empty for that reason | 18 |
| A plugin service's own logger reaches no transport | 18 |
| `ownership.adminBypass` never fires: the check reads `user.role`, which does not exist | 9 |
| The ownership filter is applied to reads only, so a model that guards writes guards nothing | 9 |
| Cron expressions are not parsed; an unparsed schedule falls back to an hourly interval | 16 |
| `dark-theme` and `ocean-theme` are eight classes short of the template | 22 |
| The release gate, sync and publish scripts carry absolute paths from a machine that no longer exists | 33 |

Each of these is written up where it belongs, with the symptom first, and repeated in the symptom
index in chapter 34.

## How to read this page in a year

The point of the appendix is not the list, it is the habit: when two mechanisms exist for the
same job, the tree will not tell you which one won, and the newer file is not always the live
one. Ask the running system, read the startup log, and check whether the thing you are about to
extend is referenced by anything that ships.
