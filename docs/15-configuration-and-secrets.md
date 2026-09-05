# 15. Configuration and secrets

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`modules/system/services/ConfigService.ts`, `config/runtime.config.ts` and the boot sequence.**

Configuration lives in three places, and knowing which one owns a value saves you from editing
an env file that nothing reads.

| Layer | Holds | Read when |
|---|---|---|
| `.env` | what is needed to boot: database credentials, `JWT_SECRET`, `APP_SECRET`, ports, `INTERNAL_API_TOKEN` | process start |
| `system.config` | runtime settings and secrets, editable without a redeploy | at boot and on demand |
| `system.config_public` | the subset the browser may see | at boot, exposed to the frontend |

The rule of thumb: `.env` is bootstrap and defaults, the database is the live setting. During
boot the application loads the runtime configuration from the database and reconfigures the
logger from it (chapter 3), so a logging level in the env file loses to the one in the database.

## Reading

```ts
const value = await configService.get('ai.provider.api_key');
const group = await configService.getByCategory('site');
const publics = await configService.getPublicConfigs();
```

`get` falls back to a default you pass. `getFromDb` reads the row directly and decrypts it when
the row is marked encrypted. Public configuration is served to the browser; everything else stays
server side.

## Writing, and encryption

```ts
await configService.set('ai.provider.api_key', key, { isEncrypted: true });
```

`set` decides on its own whether a value should be encrypted, based on the key, unless you say
explicitly. Encryption uses `APP_SECRET`; without it, decryption throws rather than returning a
wrong value. The row carries an `is_encrypted` flag, and reads honour it, so a value stored in
plain text with the flag off comes back as it is.

That last detail is worth remembering when a value has to be readable from a place that cannot
decrypt, for example when debugging: a plain row with the flag off works, and it is also exactly
how a secret accidentally ends up in the clear. Decide deliberately.

## Where a key belongs

An API key for a third-party service belongs in `system.config`, read server side at the moment
of the call. It does not belong in `.env` on a machine that many people can read, it does not
belong in the frontend bundle, and it never belongs in `system.config_public`.

## Known rough edge

Setting configuration through the system operation layer (`system.config.set`) has been reported
to answer *permission denied* even for an administrator on this version. That report predates
this chapter and was not re-verified here; if you hit it, the practical route is the service or a
direct row write, and it is worth confirming before building a workflow around it.

## Common mistakes

- **Editing `.env` for a setting the database owns.** Nothing changes and it looks like a cache.
- **Assuming a value is encrypted because it looks sensitive.** Check the flag.
- **Putting a secret in public configuration.** It reaches the browser.
- **Depending on `APP_SECRET` being present in every environment.** Without it, encrypted values
  cannot be read at all.

## Where to look

- `modules/system/services/ConfigService.ts` — get, set, categories, encryption.
- `config/runtime.config.ts` — what the boot sequence pulls from the database.
- `.env.example` — the bootstrap set, with comments.
