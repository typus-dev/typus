# 13. Identity and access

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`core/security/middlewares/AuthMiddleware.ts`, `core/security/abilities/AbilityFactory.ts` and
the auth module.**

This chapter is about who the caller is. Which rows they may touch is chapter 9.

## Signing in

`POST /api/auth/login` answers in one of three ways:

```json
{ "user": { }, "abilityRules": [ ], "accessToken": "...", "refreshToken": "...",
  "requiresTwoFactor": false }
```

```json
{ "requiresTwoFactor": true, "tempToken": "...", "method": "APP" }
```

```json
{ "requiresEmailVerification": true, "email": "u***r@example.com" }
```

The token field is **`accessToken`**, not `token`. Two-factor verification exchanges the
`tempToken` plus a code at `POST /api/auth/2fa/verify` for the real pair. Refresh tokens are
single use: `POST /api/auth/refresh-token` invalidates the old one and issues a new pair.

## How a request is authenticated

`Authorization: Bearer <accessToken>`. The middleware then does something that surprises people
writing scripts:

1. If the token equals `INTERNAL_API_TOKEN`, the caller becomes a synthetic user
   `{ id: 0, email: 'task_worker@system', roles: ['task_worker'] }` with `manage all` abilities.
   Useful for internal calls, useless for anything that checks ownership, because id 0 owns
   nothing.
2. Otherwise the JWT signature is verified, **and** its `jti` must exist in
   `auth.refresh_tokens.access_token_jti` with a future expiry. A token you signed yourself with
   the correct secret still fails with *Invalid or expired token*: the signature alone is not
   enough, the session must exist in the database.
3. The user row is read for `id`, `email` and `role`, and the role's ability rules are loaded.

## The shape of `req.user`

```ts
{
  id, email,
  ...jwtPayload,
  roles: [ '<the single role from the users table>' ],   // always an array
  abilityRules: [ ... ]
}
```

**There is no singular `role` key.** Every role check must be written against the array:

```ts
const isAdmin = Array.isArray(user?.roles) && user.roles.includes('admin');
```

This is not a style preference. Two shipped checks test `user.role`, which is always undefined,
and both fail open or closed in ways that look like unrelated bugs; see chapter 9.

`this.roles(['admin'])` on a route does the array check for you, case-insensitively.

## Abilities

Route-level permission in the interface is CASL. The rules are not in code: they are stored per
role in `auth.roles.ability_rules` and loaded on every authenticated request. The frontend guard
then asks `can('manage', subject)` for the route's `meta.subject` (chapter 20).

`AbilityFactory` builds abilities for a user with the actions `manage`, `create`, `read`,
`update`, `delete`. An admin gets `manage all`. An unauthenticated visitor gets read on the
public content subjects.

### The trap: a stringified rule set

The middleware loads the rules with

```ts
abilityRules = Array.isArray(roleData?.abilityRules) ? roleData.abilityRules : []
```

If that column holds a JSON **string** rather than a JSON **array**, the check is false and the
role ends up with **zero** abilities. There is no error and no log line: the admin simply gets
404 on every admin page while the ordinary application works perfectly, because the other roles
were seeded correctly.

Diagnose it with one query, and ignore `users.role`, `is_admin` and `auth.user_roles`, none of
which the guard reads:

```sql
select id, name, json_type(ability_rules) as stored_as from `auth.roles`;
-- admin MUST be ARRAY. STRING means broken.
```

Repair in place:

```sql
update `auth.roles` set ability_rules = cast(ability_rules->>"$" as json)
 where json_type(ability_rules) = "STRING";
```

Then **sign out and in again**. The rules are persisted in browser storage and replayed on boot,
so a refresh re-applies the stale empty set (chapter 25).

## Calling the API from a script

For a quick authenticated call, `scripts/typus-api.sh` handles the token exchange. If you need a
token for a specific user, remember rule 2 above: the `jti` must exist in
`auth.refresh_tokens`. A self-signed token without a matching row will not work no matter how
correct the signature is.

## Common mistakes

- **Testing `user.role`.** It does not exist.
- **Self-signing a token and expecting it to pass.** The session row is checked.
- **Using `INTERNAL_API_TOKEN` for user-scoped work.** It resolves to id 0.
- **Debugging an admin 404 by looking at `users.role`.** Look at `ability_rules`.
- **Refreshing the page after fixing permissions.** Sign out and in.

## Where to look

- `core/security/middlewares/AuthMiddleware.ts` — everything above, in one file.
- `core/security/abilities/AbilityFactory.ts` — actions and subjects.
- `modules/auth/services/` — login, tokens, two-factor, OAuth, sessions.
