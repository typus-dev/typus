# 9. Access and ownership

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`backend/src/dsl/services/DslService.ts`, `core/security/middlewares/AuthMiddleware.ts` and
`@typus-core/shared/dsl/types.ts`.**

Two independent mechanisms decide who may touch a row, and both are declared on the model rather
than written into services.

- **`access`** answers *may this role perform this operation at all*.
- **`ownership`** answers *which rows may this user see*.

Both are enforced by the data layer. Raw Prisma bypasses both, by design.

## `access`: the role gate

```ts
access: {
  create: ['user', 'admin'],
  read:   ['user', 'admin', 'anonymous'],
  update: ['user', 'admin'],
  delete: ['admin'],
  count:  ['admin']
}
```

Each operation lists the roles allowed to perform it. The check compares against the caller's
roles, which are always an **array** on `req.user`. `anonymous` covers unauthenticated callers.

A model with no `access` object at all is a validation error, not a default-open model.

## `ownership`: the row filter

```ts
ownership: {
  field: 'userId',                          // the column that identifies the owner
  autoFilter: true,                         // inject filter[field] = user.id automatically
  operations: ['read', 'update', 'delete'], // where the filter applies
  adminBypass: true                         // admins are supposed to see everything
}
```

With `autoFilter: true`, the data layer merges `{ [field]: user.id }` into the filter of every
listed operation. A caller with no user is refused with *Authentication required for
ownership-filtered models*.

The default `operations` list is `['read', 'update', 'delete']`, and the default for
`adminBypass` is on.

## Current defect: `adminBypass` never fires

**This is live in 1.1.121 and worth knowing before you rely on the flag.**

`DslService.applyOwnershipFilter` decides an admin bypass with:

```ts
if (ownership.adminBypass !== false && user?.role === 'admin') { ... }
```

But `AuthMiddleware` builds the request user with `roles: [ ... ]` and never sets a singular
`role` key. `user.role` is therefore always `undefined`, the branch never runs, and **an admin
sees only their own rows** through any model with `autoFilter: true`.

The correct shape of the check, and the one to use anywhere you test for a role:

```ts
const isAdmin = Array.isArray(user?.roles) && user.roles.includes('admin');
```

Until this is fixed upstream, do not conclude from `adminBypass: true` that administrators can
see everything. Verify with a real admin request.

The same singular-versus-array confusion has bitten file serving as well, where an admin got 403
on another user's file. Whenever you write a role check, check the array.

## Where enforcement happens, and where it does not

| Call site | `access` | `ownership` |
|---|---|---|
| `DSL.<Model>.*` from the frontend | yes | yes |
| `POST /api/dsl` | yes | yes |
| `DslService.executeOperation(..., user)` | yes, **if you pass the user** | yes, same condition |
| `global.prisma.*` in a service | no | no |
| `callSml` in a workflow block | no, it goes through Prisma | no |

Two consequences worth stating plainly. First, if you call `executeOperation` without a user,
nothing is enforced, so pass `req.user` deliberately rather than by accident. Second, a workflow
block is trusted code: it reaches the database directly, so a rule you rely on for safety must
not live only in the model if blocks touch that data.

## The other half of authorisation

`access` and `ownership` govern data. What a person may *open* in the interface is governed by
CASL ability rules stored per role in the database, and that is chapter 13. One trap belongs
here because it looks like a data-permission problem: if a role's ability rules are stored as a
JSON string instead of a JSON array, the middleware silently produces an empty rule set, and the
admin gets 404 on every admin page while the ordinary application works fine.

## Common mistakes

- **Trusting `adminBypass` today.** See above.
- **Testing `user.role`.** There is no such key. Test the `roles` array.
- **Hand-rolling the same check in a service.** Declare it on the model; a per-service copy
  drifts and is the reason the defect above survived.
- **Calling `executeOperation` without the user.** Silent unrestricted access.
- **Assuming a workflow block is subject to model permissions.** It is not.

## Where to look

- `@typus-core/shared/dsl/types.ts` — `DslAccessControl` and `DslOwnership`.
- `backend/src/dsl/services/DslService.ts` — the role check and `applyOwnershipFilter`.
- `core/security/middlewares/AuthMiddleware.ts` — how `req.user` is actually built.
