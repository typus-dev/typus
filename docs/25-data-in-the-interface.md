# 25. Data in the interface

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`frontend/src/shared/composables/`, `core/store/` and `vite.config.js`.**

Chapter 8 covered reading and writing model data. This chapter is about everything around it in
the browser: how a request gets its credentials, which composables exist without importing them,
and where state lives.

## Calling the API

```ts
const { data } = await useApi('/dsl').post({ model: 'AuthUser', operation: 'read' })
const health  = await useApi('/health').get()
```

`useApi` prefixes the configured API base, attaches the access token, and is auto-imported, so
it needs no import statement. Two rules follow:

- Write `useApi('/dsl')`, not `useApi('/api/dsl')`. The prefix is added for you, and doubling it
  produces a 404 that looks like a routing bug.
- Do not use `$fetch` or bare `fetch` for engine endpoints. They do not attach the token, so
  everything answers 401. The same is true of an `<img>` tag pointing at a protected file, which
  is why `dxSecureAsset` exists (chapter 21).

## The composables you already have

Everything under `src/shared/composables`, `src/core/composables`, `src/core/theme/composables`,
`src/core/logging`, module composables and plugin composables is auto-imported. The shared set
today:

`useApi`, `useAsync`, `useLoading`, `useStore`, `useModals`, `useToasts`, `useMessages`,
`useNotification`, `useFormHelpers`, `useImageUpload`, `useBreakpoint`, `useAppConfig`,
`useDynamicConfig`, `useActiveTheme`, `useThemeEffects`, `useFaviconManager`, `useTokenRefresh`.

Before writing a helper, check `src/auto-imports.d.ts`: it is the generated list of every symbol
available with no import, and it includes your own composables as soon as they are in the right
folder.

Two names collide across plugins occasionally; the build reports it plainly
(`Duplicated imports "formatDuration" ... has been ignored`). Read those warnings, because the
one that wins is not necessarily the one you meant.

## State

| Store | Holds |
|---|---|
| `appStore` | application-wide state: version, loading flags, remembered credentials |
| `authStore` | session, tokens, the current user |
| `abilityStore` | the CASL rules for the signed-in user, persisted |
| `loggingStore` | client logging configuration |
| `persistStore` | the generic persistence layer under the others |

`useStore()` is the simple front door for values that should survive a reload:

```ts
const store = useStore()
store.set('user.preferences.theme', 'dark')
const theme = store.get('user.preferences.theme', 'light')
store.remove('user.preferences.theme')
```

Dot notation addresses nested values.

**One consequence worth knowing:** `abilityStore` persists permissions to browser storage and
replays them at boot. If a user's permissions are corrected on the server, a page refresh keeps
using the stale set. Signing out and in again is what actually reloads them.

## Common mistakes

- **`useApi('/api/...')`.** Doubled prefix.
- **`$fetch` for an engine endpoint.** No credentials.
- **Importing an auto-imported composable.** Redundant, and a duplicate import can shadow the
  injected one.
- **Storing sensitive data through `useStore`.** It lands in browser storage.
- **Expecting a refresh to pick up new permissions.** See above.

## Where to look

- `@typus-core/frontend/src/shared/composables/useApi.ts` — the client itself.
- `@typus-core/frontend/src/auto-imports.d.ts` — everything available without an import.
- `@typus-core/frontend/src/core/store/` — the five stores.
