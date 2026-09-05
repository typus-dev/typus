# 34. Diagnosing

**Verified against engine 1.1.121 (build 2078) on 2026-09-05. Every entry below is either read
from the code or observed on a running instance.**

A symptom index. Find what you are seeing, not what you think is broken. Most entries here cost
somebody hours before they were written down, and almost none of them look like their cause.

## Routing and pages

**One module's routes all return 404, and the application is healthy.**
Its file failed to import, so the module was never registered. `/api/health` answers, other
modules answer, and the only evidence was printed once at startup. A common cause is code placed
between `@Service()` and the class it decorates.
Confirm: `docker logs <container> | grep -iE "TransformError|Failed to import module"`.
Chapter 11.

**A page is stuck on its loading state while every API call succeeds.**
A child render threw, and Vue kept the last good DOM. The usual cause is a component that was
imported and also used as a PascalCase tag, so it registered twice.
Confirm: bisect with `v-if="false"` until the page appears; look for an import of a `dx`
component. Chapter 21.

**A new menu entry does not appear.**
Menus are generated when the frontend process starts. Restart the frontend, not the page.
Chapter 24.

**The menu order looks arbitrary.**
Unresolved `injectAfter` targets are placed at the end, and the generator lists them at startup.
Confirm: read the generation log. Chapter 24.

**A change to a page's `<route>` block has no effect.**
Route metadata is read when the router is generated, at process start. The guard keeps using the
old metadata. Restart the frontend. Chapter 20.

**A protected page lets anyone in.**
The ability guard skips its check entirely for the `public` and `default` layouts. Chapter 23.

## Permissions

**An administrator gets 404 on every admin page while the normal application works.**
The role's ability rules are stored as a JSON string instead of an array, so the rule set is
silently empty.
Confirm: ``select id, name, json_type(ability_rules) from `auth.roles`;`` — admin must be
`ARRAY`. Fix, then **sign out and in**; a refresh replays the cached rules. Chapter 13.

**An administrator sees only their own rows.**
`adminBypass` is checked against `user.role`, which does not exist; only `user.roles` does. Known
defect. Chapter 9.

**An administrator gets 403 on another user's file, and the interface shows a broken image.**
The same singular-versus-array problem in the storage path. Chapter 14.

**Everything answers 401.**
Either `$fetch` was used instead of `useApi`, so no token was attached, or a self-signed token
was used: the `jti` must exist in `auth.refresh_tokens`. Chapters 25 and 13.

**A service refuses and the caller carries on anyway.**
`BaseService` returns a proxy that converts a thrown non-`BaseError` into a returned `{ error }`.
Chapter 12.

## Data

**`Invalid enum value ... expected create|read|update|delete|count`.**
`findMany` was sent over HTTP. That vocabulary belongs to the typed client and to block code.
Chapter 8.

**`where is missing` on an update or delete.**
The where clause is called `filter` on the wire, always. Chapter 8.

**A plugin's table does not exist on a first production boot, although the model is registered.**
The schema push runs before plugin models are merged.
Fix: push the generated client schema. Chapter 7.

**A column has the wrong type and nothing warned.**
An unrecognised field type silently becomes `String`. Chapter 5.

**Generation fails at boot with a message about a relation.**
`belongsTo` needs an explicit `foreignKey`, and that field must also be declared. Chapter 6.

**Data disappeared after renaming a field.**
The development boot pushes the schema with data loss accepted; a rename is a drop plus an add.
Chapter 7.

**A model appears twice in the startup log.**
The file exports it under two names. Harmless. Chapter 5.

## Background work, events, logs

**A scheduled task runs hourly instead of on its schedule.**
Cron parsing is not implemented; unparsed schedules fall back to an hourly interval, and the log
says so. Chapter 16.

**A queued task never runs.**
Its handler is not registered, usually a missing `@Service()`. Chapter 16.

**Background work cannot update the browser.**
Without Redis, only the process holding the WebSocket connection can push. Chapter 17.

**A model event never fires.**
Only writes through the data layer emit. A raw Prisma call and a workflow block do not.
Chapter 17.

**The System Logs page is empty.**
Three different causes, in the order worth checking. Logging ships **switched off**:
`logging.mode` and `logging.frontend.mode` both default to `none`. The server's database
transport writes nothing on this version even when enabled. And client logging is a separate
path that has to be turned on by itself.
Confirm: check the two mode settings first, then the `source` column of `system.logs` to see
which writer is missing. Chapter 18.

**Client-side errors are invisible.**
The browser logger exists and can batch errors into the database, but it is off by default. Set
`logging.frontend.mode` to `api` or `both` and enable `logging.api_logging_enabled`. Chapter 18.

**A plugin service logs nothing.**
Its component logger reaches no transport on this version. Write to the domain row or to
standard output. Chapter 18.

## Automations

**A workflow chain passes no data.**
Connections must use `source` and `target`; some older seeds use `from` and `to`. Chapter 29.

**A block cannot read an image from storage.**
`httpRequest` has no response type and there is no read helper in the sandbox. Pass the bytes in.
Chapter 29.

**A block's call to its own API reaches the wrong host.**
Relative `/api/` paths are prefixed with the host-side URL. Use the internal address.
Chapter 29.

**A field was cleared during a workflow run.**
A value passed into a block is written back to the row. Chapter 29.

**Editing block code in the database changes nothing.**
Block code is a file on disk. Chapter 29.

## Configuration and build

**A change in `.env` has no effect.**
The logger and the runtime configuration are re-read from the database at boot. Chapters 15 and
18.

**A change to a generated file reverts itself.**
It is regenerated on the next build or container start. Chapter 2.

**The release scripts fail immediately with a missing directory.**
The gate, sync and publish helpers carry absolute paths from a machine that no longer exists.
Chapter 33.

## Two commands worth knowing

```bash
# Why is a module missing?
docker logs <container> | grep -iE "TransformError|Failed to import module|Registered routes"

# What did the engine actually load?
docker logs <container> | grep -E "Modules Loaded|SML Operations|Disabled modules|Registered model"
```

The startup log is the single most reliable diagnostic in the system. When something is missing,
read it before reading code.
