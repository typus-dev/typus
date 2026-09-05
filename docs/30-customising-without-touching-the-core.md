# 30. Customising without touching the core

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `custom/`,
`custom/frontend_example/` and the Vite configuration.**

Every installation eventually needs something the engine does not do: its own header, its own
landing page, its own palette. The `custom/` layer exists so that those changes survive an
engine update.

## The layer

```
custom/
├── frontend/
│   ├── pages/        instance pages, routed like any other page
│   ├── layouts/      frames and, more often, partials
│   └── themes/       the instance's own theme
├── backend/          instance-side code
└── frontend_example/ a complete worked example, kept in the repository
```

Vite watches `custom/frontend/**`, so pages, layouts and themes there hot reload like the rest
of the frontend.

## What belongs here

| Need | Where |
|---|---|
| a marketing page for this deployment | `custom/frontend/pages/` |
| a different header or footer | a partial under `custom/frontend/layouts/` |
| the brand's colours and type | a theme under `custom/frontend/themes/` |
| a small endpoint that only this deployment needs | `custom/backend/` |
| a feature other deployments would want | a plugin instead (chapter 4) |

The distinction is not size, it is reuse. Anything a second installation would want is a plugin.
`custom/` is for the things that are true of exactly one deployment.

## Overriding a frame rather than replacing it

The shipped layouts keep their shared fragments in a partials directory. Replacing a partial is
almost always better than copying a whole layout: you inherit later improvements to the frame
and you own only the part you actually changed.

## Themes

A custom theme is a directory that satisfies the same contract as the shipped ones, described in
`public/styles/_template/README.md`: the numbered CSS files, the same token names, the same class
families. Satisfy the contract and every screen picks it up, because components refer to tokens
rather than to colours (chapter 22).

## What this layer does not solve

`custom/` cannot change behaviour that lives inside the engine. If the fix belongs in
`@typus-core`, patching it locally means the next update overwrites it, and the deployment
silently regresses. Two honest options: make the change in the engine and release it (chapter
33), or wrap the behaviour in a plugin that loads last and overrides it.

There is a real example of the cost of getting this wrong. Several security corrections were made
inside a product's own copy of the engine and never returned upstream; the engine, and therefore
every other installation and the public release, still carries the original behaviour. A fix that
lives only in a fork protects exactly one deployment.

## Common mistakes

- **Editing `@typus-core` for one deployment.** The next update takes it away.
- **Copying a whole layout to change a header.** Override the partial.
- **Putting a reusable feature in `custom/`.** It becomes unshippable.
- **A theme that only defines the colours it happens to use.** Satisfy the whole contract, or
  screens you have not looked at will break.

## Where to look

- `custom/frontend_example/README.md` — a complete worked example.
- `public/styles/_template/` — the theme contract.
- `@typus-core/frontend/vite.config.js` — how custom pages and layouts join the build.
