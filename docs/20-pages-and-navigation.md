# 20. Pages and navigation

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`frontend/vite.config.js`, `core/middleware/auth.ts`, `core/middleware/ability.ts` and the
shipped pages.**

There is no route table. A page is a `.vue` file in a `pages/` directory, and the router is
generated from the file tree (chapter 2). What a page declares about itself lives in a `<route>`
block inside the file.

## Where pages are found

| Source | Path | URL prefix |
|---|---|---|
| the application | `src/pages/**` | `/` |
| a published module | `src/modules/<name>/pages/**` | the module's route path |
| a plugin | `plugins/<name>/frontend/pages/**` | `/` |
| the instance | the custom pages folder | as configured |

The route name is derived from the file path, PascalCase converted to kebab-case and
lowercased. Confirm what you got in `src/typed-router.d.ts`.

## The route block

```vue
<route lang="json">
{
  "name": "user-management-dashboard",
  "path": "/user-management/dashboard",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "user",
    "ability": { "action": "manage", "subject": "user" }
  }
}
</route>
```

| Key | Effect |
|---|---|
| `name`, `path` | override the derived values |
| `meta.layout` | which frame wraps the page, see chapter 23 |
| `meta.requiresAuth` | the auth guard enforces a valid session |
| `meta.subject` | the ability guard requires `manage` on this subject |

## The two guards

**The auth guard** runs first. It resolves the layout, then, only if `meta.requiresAuth` is
true, refreshes the token if needed. If the refresh fails it stores `auth_redirect` and
`auth_redirect_path` in local storage and redirects to the login route with a `redirect` query
parameter.

Two consequences worth knowing. A public route never refreshes the token at all, so an
application that boots on a public page starts with whatever token happens to be in storage.
And the engine writes down where the visitor was going but does not itself consume it after
sign-in, so a product that wants "return to the page I asked for" reads
`auth_redirect_path` itself.

**The ability guard** runs after. It skips verification pages, skips anything on the `public` or
`default` layout, skips routes with `requiresAuth: false`, and otherwise, if `meta.subject` is
set, requires `can('manage', subject)`. Those abilities come from the role's rules in the
database, not from code, which is chapter 13.

## Layout resolution

The auth guard fills in `meta.layout` when the page has not set one, falling back to `public`
(or a registered fallback layout). An authenticated area therefore needs `"layout": "private"`
stated explicitly on the page.

## The trap: the route block is not hot

The `<route>` block is read when the router file is generated, which happens at frontend process
start. Editing `requiresAuth`, `path` or `name` and reloading the page leaves the **old** route
in force: the guard keeps using the previous metadata while the file on disk says otherwise.

What that looks like from outside: a route you just protected still lets a signed-out visitor
in, and a signed-in one gets bounced to the door on an unresolved session. Nothing says "stale
route", and a cold load works perfectly, so it reads as a race in the guard.

Restart the frontend after touching a route block. Component code alone is fine on hot reload.

## Common mistakes

- **Adding a route by hand.** There is nowhere to add it.
- **Forgetting `layout`.** The page renders inside the public frame.
- **Setting `requiresAuth` without `subject`.** The session is checked, permissions are not.
- **Expecting the route block to hot reload.** It does not.
- **Assuming the engine returns the user to the page they wanted after login.** It records the
  path; consuming it is the product's job.

## Where to look

- `@typus-core/frontend/vite.config.js` — the `routesFolder` list above.
- `@typus-core/frontend/src/core/middleware/auth.ts` and `ability.ts` — the two guards.
- `@typus-core/frontend/src/typed-router.d.ts` — what the generator actually produced.
