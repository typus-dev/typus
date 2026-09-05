# 4. Modules, plugins and the edge of the core

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by comparing the engine tree with
the generated public mirror and by reading the snapshot builder.**

Three places can hold code, and choosing wrongly is expensive later: a feature in the wrong
place either cannot be released or cannot be updated.

## The three places

| | Core module | Plugin | Custom |
|---|---|---|---|
| Path | `@typus-core/{backend,frontend}/src/modules/<name>` | `plugins/<name>/` | `custom/` |
| Loaded | second | **last** | as overrides |
| Ships in the public release | yes | no | no |
| Survives an engine update | it is the engine | yes | yes |
| For | what every installation needs | a feature | one instance's specifics |

Because plugins load last, a plugin can override anything the core registered. That is the
extension mechanism, and it is also why a mysterious behaviour is worth grepping for in
`plugins/` before you suspect the core.

## What the core is

Backend, 13 modules: `ai-assistant`, `auth`, `cms`, `dispatcher`, `email`, `html-cache`, `log`,
`notification`, `role`, `sitemap`, `storage`, `system`, `user`.

Frontend, 7 modules: `auth`, `cms`, `dispatcher`, `file-manager`, `routes`, `system`,
`user-management`.

Plus two core modules that are loaded before everything else: the data layer and the dynamic
router.

## What the plugins are

Product features: `ai-agent`, `compass`, `crm`, `image-lab`, `newsletter`, `payments`,
`project-management`, `social-media`, `waitlist`, `web-analytics`, `workflow`.

Three more are not features but working documentation, and are worth keeping installed:
`demo-ui` is the live gallery of the UI kit (chapter 21), `example` holds the plugin template
and the coding guides (chapter 28), and `antipattern` collects what not to do in a model.
`photoshoot` and `test-instant` are genuinely experimental.

A plugin owns its own backend modules, frontend pages, components, composables, models, menu
entries and workers. It is a whole vertical slice, not a library.

## The edge, stated exactly

The release snapshot copies the core and creates an **empty** `plugins/` directory. So the
public engine is the core; every feature above is private product code.

Two consequences worth knowing:

- Anything you want in the open-source engine must be a core module, and that is a decision
  about the product, not about the code.
- The lists of modules the snapshot builder copies are maintained by hand, and they have drifted:
  several names in them no longer exist in the core because they became plugins, and the builder
  silently skips what it cannot find. The generated README therefore overstates what ships.
  Trust `typus-github/` over any list.

## Turning something off

A module or plugin directory containing a `.disable` file is skipped, on both the backend and
the frontend, and the startup log names what it skipped. Use that rather than deleting a
directory or commenting out code.

## Choosing where to put new work

Ask two questions in this order.

1. **Would every installation want it?** If yes, it is a core module, and it will ship publicly.
2. **Is it specific to one deployment?** If yes, it belongs in `custom/` (chapter 30), where an
   engine update will not overwrite it.

Everything else is a plugin. When in doubt, start as a plugin: promoting a plugin into the core
is a move, while pulling a feature out of the core is a surgery.

## Common mistakes

- **Editing the core to serve one customer.** The next update overwrites it. Use `custom/`.
- **Editing `typus-github/`.** It is generated output; the next sync overwrites it.
- **Assuming a feature ships publicly because it is in the workspace.** Plugins do not.
- **Deleting a directory to disable a feature.** Use `.disable`.

## Where to look

- `release-system/src/cli/build-lite-snapshot-v2.ts` — the module lists and the empty
  `plugins/`.
- `module-loader.ts` — the load order and `.disable`.
- Chapter 28 to build a plugin, chapter 30 for the custom layer.
