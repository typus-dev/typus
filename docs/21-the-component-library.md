# 21. The component library

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by listing
`frontend/src/components/`, reading `vite.config.js`, `shared/utils/themeClass.ts`,
`shared/dxce/`, and the `demo-ui` plugin.**

The engine ships a UI kit whose components are registered globally by the build. You use them by
writing the tag. You do not import them, and importing them breaks the page.

## Learn it by opening it

The fastest route is not this chapter. The **`demo-ui` plugin is a live gallery** of the kit,
mounted in the signed-in application under **UI Library**:

| Section | Pages |
|---|---|
| Components | buttons, inputs, selects, cards, tables, modals, form, icons, fonts, events, spinner |
| Layouts | flex, grid, stack |
| Content | a rendered blog post |
| Templates | login, register, forgot password, set password, verify email, setup 2FA, 404, access denied, error |

Each page shows the variants side by side with the markup that produced them. The Templates
section is worth knowing separately: those are complete auth and error screens you can start
from rather than rebuild.

If the section is missing in your installation, the plugin is disabled; see chapter 4.

## What exists

| Folder | Components |
|---|---|
| `components/ui` | `dxButton`, `dxInput`, `dxTextArea`, `dxSelect`, `dxCheckbox`, `dxSwitch`, `dxRadioGroup`, `dxSearch`, `dxSlugInput`, `dxDateTime`, `dxForm`, `dxFormJSON`, `dxFormWrapper`, `dxCard`, `dxCardWrapper`, `dxBadge`, `dxText`, `dxLine`, `dxList`, `dxTabs`, `dxTooltip`, `dxIcon`, `dxImage`, `dxSecureAsset`, `dxLoader`, `dxSpinner`, `dxLoadingIcon`, `dxProgressBar`, `dxCountdownTimer`, `dxQRCode`, `dxKebabMenu`, `dxPinButton`, `dxChat`, `dxRawHtml`, `dxHtmlPreview`, `dxMermaidBlock`, `dxContentEditor`, `dxContentRendererCanvas`, `ImageUploader` |
| `components/layout` | `dxGrid`, `dxRow`, `dxCol`, `dxFlex`, `dxFlexCol`, `dxStack`, `dxContainer`, `PageHeader` |
| `components/tables` | `dxTable`, `dxTableJSON` |
| `components/charts` | `dxChart` |
| `components/navigation` | horizontal and vertical navigation, recent pages, menu filtering |
| `components/base` | modal and toast containers, error boundary and error modal, theme switcher, notifications dropdown, logo and brand header |
| `components/system` | `Error404`, `ErrorSystem`, `AccessDenied`, `SystemPage`, `DynamicRouteHandler` |
| `components/dsx` | `DynamicFields`, the bridge from a model to a set of inputs (chapter 27) |

Module and plugin components register on the same terms, from `src/modules/**/components` and
`plugins/<name>/frontend/components`.

## How to read a component's API

There is no per-component documentation file. The contract is the typed `Props` interface at the
top of the file, and it is precise. `dxButton`, for instance:

```ts
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'warning' | 'ghost' | 'link' | 'info'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
type ButtonShape   = 'default' | 'square' | 'circle'

interface Props {
  variant?: ButtonVariant; size?: ButtonSize; shape?: ButtonShape
  iconOnly?: boolean; disabled?: boolean; loading?: boolean; fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  label?: string; customClass?: string; isSubmitButton?: boolean; autoIconColor?: boolean
}
```

Open the file, read `Props`, and you have the whole surface. The demo page then shows what each
variant looks like.

## How registration works

`unplugin-vue-components` scans the directories above and writes `components.d.ts`. Two resolvers
are in play: the directory scan, which registers by file name, and an icon resolver, so
`<dxIcon name="ri:file-list-line" />` works with no icon import.

`components.d.ts` is the authoritative list for your build, including module and plugin
components. Grep it before concluding something does not exist.

## The rule, and why it matters

> Use the lowercase tag. Do not import the component.

```vue
<!-- correct -->
<dxButton label="Save" />

<!-- wrong: registers the component twice -->
<script setup>import DxButton from '@/components/ui/dxButton.vue'</script>
<template><DxButton label="Save" /></template>
```

An import plus a PascalCase tag makes the auto-importer register that tag as well, and the double
registration makes the render of the whole page throw. Vue keeps the last good DOM, so what you
see is a parent stuck on its loading state while every API call behind it succeeds. It reads
like a data problem and is not one. Bisect with `v-if="false"` until the page appears.

## Composite components

Three are subsystems rather than single files, and are worth knowing before you build your own:

- **`dxTable`** ships desktop and mobile views, a header, pagination, search, typed column
  definitions and the `useTableColumns` and `useTableData` composables. It is responsive by
  construction; do not wrap it in your own breakpoint logic.
- **`dxContentEditor`** is a block editor with its own components, composables, types and import
  pipeline.
- **`dxce`**, in `@typus-core/shared`, is the renderer for what that editor produces: block
  types (text, heading, image, text and image, list, table, quote, code) with widths and
  alignment. It is shared on purpose. The frontend renders blocks through it, and the backend
  renders the same blocks for cached and server-generated HTML. Content authored once therefore
  looks the same in the application and on a public page.

## Styling a component of your own

Compose theme class names rather than raw utilities (chapter 22). The helper the kit uses:

```ts
import { themeClass } from '@/shared/utils/themeClass'
themeClass('components', 'button', 'base')   // 'theme-components-button-base'
```

## Three sharp edges

**`dxSecureAsset`.** Files served by the engine require the authorization header, and a browser
does not attach it to an `<img src>`. A raw image tag pointing at a protected file renders blank.
Pass the file id, and pass a `mimeType` or a filename with an extension, or the component shows a
download box instead of the image. Its `width` and `height` props are Tailwind classes, not
pixel values.

**`dxTextArea`.** It sets an inline height, so the `rows` attribute has no effect. Force a
minimum from the parent page: `:deep(textarea) { min-height: 10rem; }`.

**`dxButton`.** No `icon` prop. Pass an icon through the `#prefix` slot.

## Common mistakes

- **Importing an auto-registered component.** The symptom is a stuck page, not an error.
- **A raw `<img>` on a storage URL.** Blank.
- **Trusting `rows` on `dxTextArea`.**
- **Rebuilding an auth screen.** The Templates section of the gallery already has it.
- **Guessing props.** Read the `Props` interface; it is exhaustive.

## Where to look

- `plugins/demo-ui/frontend/pages/` — the gallery, and the source of every example in it.
- `frontend/components.d.ts` — what is registered in this build.
- `frontend/src/components/` — the components themselves; the `Props` interface is the contract.
- `@typus-core/shared/dxce/render.ts` — the shared block renderer.
