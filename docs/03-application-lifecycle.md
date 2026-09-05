# 3. Application lifecycle

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`core/application/Application.ts` and `module-loader.ts` and by reading a live boot log of a
running instance.**

Knowing the boot order tells you what exists when your code runs, why plugins can override the
core, and why a plugin worker may use the database while a module initialiser may not use the
system operation layer. The startup log is the most accurate map of this chapter: it prints the
real order and the real counts every time the container starts.

## The processes

In the single-container profile, `supervisord` starts three processes: **nginx**, **backend**,
**frontend**. They start in parallel, so the frontend's generation chain and the backend's boot
interleave in the log. Nginx is in front; a request that arrives before the backend is listening
returns a gateway error rather than a Typus error.

## Backend boot, in order

### Before Node starts

`backend-startup-dev.sh` (or `-prod.sh`) runs first:

1. Builds `DATABASE_URL` out of `DB_PROVIDER` plus the individual credentials. `mysql`,
   `postgresql` and `sqlite` are all handled.
2. Generates the models index.
3. Generates the DSL interfaces.
4. Generates the Prisma schema from the models.
5. Generates the Prisma client.
6. Applies the schema to the database with `prisma db push` (idempotent).
7. Starts the server.

If any generation step fails, the container stops here. See chapter 2.

### The Application constructor

- `global.prisma` is set to the shared client.
- `PrismaClient` is registered as a container token as well, for plugins that still inject it
  that way. The preferred path is `BaseService` and `global.prisma`.
- Singletons are registered: `DslService`, `DynamicRouterService`, `WebSocketService`, and
  either `RedisService` or `RedisServiceStub`. The stub is used unless `REDIS_ENABLED=true`;
  WebSocket works either way, only cross-process pub/sub is lost.

### `initialize()`

| Step | What happens | What it means for you |
|---|---|---|
| 1 | Connect to the database, up to 10 attempts, 2 seconds apart, then list the tables | a slow database delays boot rather than failing it |
| 2 | Reconfigure the logger from the database | logging level and mode are **database** settings, not env settings |
| 3 | Load runtime configuration from the database | `.env` provides defaults; the database wins |
| 4 | Configure middleware: request id, request logger, the middleware configurator, rate limiting | |
| 5 | Load core modules: `dsl`, then `dynamic-router` | the data API exists before anything else |
| 6 | Load regular modules from `@typus-core/backend/src/modules` | a directory with a `.disable` file is skipped, and the log names the skipped ones |
| 7 | Load plugin modules from `plugins/` | **plugins load last, so a plugin can override anything** |
| 8 | Boot the system operation layer and lock its registry | it is **not** available during steps 5 to 7 |
| 9 | Configure routes, then the error handler | |
| 10 | Start the HTTP server and attach WebSocket | |
| 11 | Load plugin worker handlers | this runs **after** the server is listening, so a worker may use the database and the container |
| 12 | Start background workers if the queue driver is `database` | in that profile the scheduler and the worker run inside the backend process; otherwise a separate dispatcher container owns them |
| 13 | Print startup statistics | |

A failure in step 8 or step 11 is logged and the application continues. A failure earlier exits
the process.

## Reading the startup log

The final table is the fastest health check the engine offers. A real one from a running
instance with five plugins:

```
Startup Time     3456ms
Modules Loaded   22
SML Operations   375
SML Events       4
Warnings         0
Errors           0
```

Other lines worth knowing:

- `Registered routes for <Module> at /api/<path>` — one per module. If a route 404s, look for
  this line before you look at the route itself.
- `Disabled modules: ...` — the `.disable` mechanism, see below.
- `Registered model: X (export: X)` — each model as the DSL registry accepts it.
- `Registered 312 operations for 52 models` — the data API surface, computed from the models.
- `Registered Redis stub` versus `Registered Redis service` — which profile you are in.

## Turning a module off

A module directory containing a `.disable` file is skipped by the loader. The log says so
explicitly, both for backend modules and for frontend modules. This is the supported way to
switch a module off for one installation; do not delete the directory.

## Common mistakes

- **Using the system operation layer during module initialisation.** Its registry is booted
  after all modules are loaded and then locked. Do your work in a request or in a worker.
- **Assuming `.env` is authoritative.** The logger and the runtime configuration are re-read
  from the database after the connection is up. If a setting will not change, check the database
  before you edit the env file.
- **Blaming routing when a whole module 404s.** A module whose file fails to import is never
  registered, and the application stays healthy: `/api/health` answers, other modules answer,
  and only that module's routes are missing. The real message was printed once, at startup. Grep
  the boot log for a failed import before you debug the route.
- **Expecting a plugin to be overridden by the core.** It is the other way around. Plugins load
  last and win.

## Where to look

- `@typus-core/backend/src/core/application/Application.ts` — the sequence above.
- `@typus-core/backend/src/module-loader.ts` — discovery, `.disable`, plugin workers.
- `@typus-core/backend/backend-startup-dev.sh` — everything that happens before Node.
