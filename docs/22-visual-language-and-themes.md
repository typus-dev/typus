# 22. Visual language and themes

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`modules/system/services/ThemeGeneratorService.ts`,
`modules/html-cache/services/ThemeResolverService.ts`,
`core/html-generator/ThemeGenerator.ts` and `ThemeLinksGenerator.ts`,
`public/styles/_template/`, the frontend theme scripts and Vite plugin,
`core/theme/composables/useTheme.ts`, the shipped `dx*` components, and the git history of the
theme directory.**

Typography, spacing, colour and component surfaces come from the theme. Reaching past it for a
raw utility class is the visual equivalent of hand-registering a route: it works on the screen
you are looking at and drifts everywhere else.

## What a theme is today

**Plain CSS, scoped by an attribute.** A theme is a directory of numbered files:

```
public/styles/themes/light-theme/
├── 00-tokens.css   01-base.css   02-typography.css   03-content.css   04-colors.css
├── 05-layout.css   06-components.css   07-mixins.css   07-effects.css   99-overrides.css
└── manifest.json
```

Every rule carries the theme in its selector:

```css
[data-theme="light-theme"] { --color-text-primary: #101218; }
[data-theme="light-theme"] .theme-components-button-base { ... }
```

`public/styles/_template/` is the reference theme: the same files, the full class set, every
rule written against `[data-theme="_template"]`, and a `manifest.json` stating the expected
total. It is the structural source of every theme.

## The generator: how a theme is made

You do not write ten CSS files. `ThemeGeneratorService`, in the backend system module, builds a
theme from a handful of colours:

```
required:  name, bgPrimary, textPrimary, accent
optional:  bgSecondary, bgTertiary, surface, textSecondary, textMuted,
           border, borderLight, accentSolid, accentLight, accentText, accentGlow,
           accentSecondary, success, warning, error, and the rest of the semantic set
```

What it does, in order:

1. validates the name (lowercase, digits and hyphens) and refuses to overwrite unless told to;
2. **derives the full token set** from the few colours you gave;
3. writes `00-tokens.css` from those tokens;
4. copies **every other CSS file from `_template`**, replacing `[data-theme="_template"]` with
   `[data-theme="<your-theme>"]`;
5. writes the theme's `manifest.json`.

So the structure and the class set come from the template, and your input is the palette. That
is why a theme is expected to define the same classes as the template, and why a theme that
predates the generator can be short of them.

The logic lives in the service, not in a script: the older `scripts/generate-theme-from-params.mjs`
and `generate-reference-theme-full.mjs` are the same idea from before it moved into the engine.

## How the theme reaches a browser

1. `pnpm generate:themes-manifest` scans `public/styles/themes/` and `custom/styles/themes/`,
   accepts a directory as a theme if it has `00-tokens.css`, reads its `manifest.json`, and
   writes `src/auto-themes.json`.
2. `pnpm generate:themes` regenerates `index.html` from that manifest, and the `inject-themes`
   Vite plugin does the same job during a build: the shared stylesheets, then every theme's
   files, each with a cache-busting query.
3. The browser holds all themes at once, and only the rules matching the current `data-theme`
   apply. Switching is an attribute change.

## How the theme reaches a crawler, and why that decided the architecture

A theme applied by JavaScript is not applied for anyone who does not run it. A crawler fetching
a dark site received the unthemed markup and indexed it as light: the page it saw was not the
page visitors see. Client-side theming cannot fix that, because by the time the script runs the
fetch is over.

The engine's answer is to decide the theme on the server and put it in the markup:

- **`ThemeResolverService`** picks the theme for a layout, in order:
  `custom/frontend/layouts/<layout>/theme.json` naming a theme, then a custom theme directory
  matching the layout name, then the manifest default.
- **`ThemeLinksGenerator`** reads `auto-themes.json` and emits the stylesheet links.
- **`ThemeGenerator`** in the HTML generator writes the attribute into the document itself:
  `<html lang="en" data-theme="ocean-theme">`.

So server-rendered and cached pages arrive already themed, with no script involved. This is the
practical reason the system is CSS-first, and it is worth stating in a book because it explains
why an apparently more elegant typed-object approach was left behind.

The same reasoning applies one level up, to the pages themselves: if a public site must be fast
and crawlable, generating it as static files beats caching a running application. The appendix
records how that was settled.

## Switching inside the application

`useTheme()` remains, and is for the signed-in application, where a person chooses a theme and it
persists:

```ts
const { currentTheme, setTheme, availableThemes, getThemeIcon, getThemeTitle } = useTheme()
setTheme('ocean-theme')
```

`setTheme` writes `localStorage` and sets `data-theme` on the root element. The initial theme
resolves from the attribute already in the document, then `localStorage`, then the manifest
default. Note the first step: whatever the server stamped wins until the visitor chooses
otherwise.

Do not use this mechanism to theme a public page. That is the server's job.

## The classes

Roughly 380 per theme, in families:

| Family | Examples | Use for |
|---|---|---|
| `theme-typography-size-*` | `xs` to `3xl` | font size |
| `theme-typography-weight-*`, `-fontFamily-*` | | weight, family |
| `theme-typography-content-*` | `h1` to `h6`, `p`, `ul`, `ol`, `li`, `a`, `code`, `pre`, `blockquote` | semantic text that carries its own rhythm |
| `theme-layout-section-*` | `sm`, `md`, `lg`, `hero` | section padding |
| `theme-layout-stack-vertical` | | a column that spaces its own children |
| `theme-layout-flex-*`, `-grid-*`, `-container-*` | | structure |
| `theme-colors-{text,background,border,ring}-*` | | colour |
| `theme-components-*` | button, input, card, table, modal, select, switch, tooltip | component surfaces |
| `theme-base-*` | radius, shadow, border, spacing, animation, z | primitives |

The shipped components are built from them. `dxButton`, for example, composes
`theme-mixins-interactive`, `theme-components-button-base`,
`theme-components-button-radius` and `theme-colors-text-contrast`. So the CSS themes style the
signed-in application as much as the public pages; the difference is only who decides which
theme is active.

## The rule for screens

> Do not hand-set size, weight or spacing with raw utilities on application screens.

Use the classes above. When you need a raw value, use the token: `var(--spacing-lg)`, not a
magic rem. If the scale lacks something, add the class to the template and to every theme rather
than opening a hole for one screen. The type scale tops out at `3xl`; a bigger hero number is a
new token, not a raw `text-5xl`.

## What is rudimentary, so you do not build on it

The tree still contains the earlier generation. Recognise it and leave it alone.

- **The typed theme object.** `src/core/theme/types.ts` defines a full `Theme` type, about
  thirty sub-types, with `components` typed down to the button and the scrollbar. A theme used to
  be one TypeScript file satisfying it, whose values were Tailwind class strings, and components
  read `theme.*`. Those files (`typus-light`, `typus-dark`, `typus-ocean` and several product
  themes) are in git history, not in the tree.
- **The migration that ended it.** `scripts/apply-theme-token-migration.ts` rewrote every
  `theme.*` access into a class name using a token map. `pnpm guard:theme` now fails the build if
  the string `theme.` appears in the source at all. The old way is closed by policy.
- **The dead scripts.** `generate-theme-classes.ts` needs
  `work-log/themes/theme-token-map.json`, which is not in the tree, and writes
  `src/styles/theme-classes.css`, which is not either. `compile-theme-css.ts` expects
  `variables`, `components`, `layouts` and `utilities` files that shipped themes do not have.
  Both throw or do nothing.

The type file is still worth reading as the clearest description of what a theme is supposed to
contain, even though nothing implements it any more.

## Checking a theme

Because the older themes predate the generator, they can be short of classes the template
defines, and a class a theme omits simply does nothing when that theme is active.

```bash
for t in public/styles/themes/*/; do
  printf '%-24s %s\n' "$t" "$(grep -ho '\.theme-[a-zA-Z0-9-]*' $t*.css | sort -u | wc -l)"
done
```

Today the template and four themes define 381 classes, while `dark-theme` and `ocean-theme`
define 373. Regenerating those two from the template through the generator is what closes that
gap.

## Common mistakes

- **Raw Tailwind for type and spacing on an application screen.**
- **Reading the theme object in a component.** The guard fails the build.
- **Theming a public page from JavaScript.** The crawler never sees it. Let the server stamp it.
- **Writing a theme's CSS by hand.** Give the generator a palette instead.
- **Adding a theme without regenerating the manifest and restarting.** Nothing links it.
- **Forgetting the `[data-theme="..."]` scope in hand-written CSS.** Unscoped rules apply under
  every theme.

## Where to look

- `modules/system/services/ThemeGeneratorService.ts` — the generator, parameters and output.
- `public/styles/_template/` — the structure every theme inherits.
- `modules/html-cache/services/ThemeResolverService.ts`, `core/html-generator/ThemeGenerator.ts`
  and `ThemeLinksGenerator.ts` — the server side.
- `frontend/scripts/generate-themes-manifest.ts`, `generate-index-html.ts`,
  `vite-plugins/inject-themes.js` — the browser side.
- `frontend/src/core/theme/types.ts` — the typed description of a theme, now historical.
