# 18. Observability

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `core/logger/`,
`frontend/src/core/logging/`, `core/store/loggingStore.ts`, `modules/log/` and the baseline
configuration, and by reading a live startup log.**

There are **two** logging systems, and they are separate all the way down: one on the server and
one in the browser. They share a destination table and nothing else. Confusing them wastes a
lot of time, because one of them currently does not write and the other one does.

## Configuration lives in the database

Both sides are configured from `system.config`, not from environment variables. The environment
only provides a fallback used before the database is reachable.

**Server side:**

| Key | Default in the shipped baseline |
|---|---|
| `logging.level` | `error` |
| `logging.mode` | `none` — a comma-separated list of `console`, `file`, `database` |
| `logging.prisma_queries` | `false` |
| `logging.max_records` | `10000` |
| `logging.cleanup_interval` | `60` minutes |
| `logging.cleanup_on_start` | `false` |
| `logging.preset` | `off` — a shortcut: off, error, info, debug |

**Browser side**, seeded into the public configuration because the browser has to read it:

| Key | Default |
|---|---|
| `logging.frontend.level` | `error` |
| `logging.frontend.mode` | `none` — one of `console`, `api`, `both`, `none` |
| `logging.api_logging_enabled` | `false` |
| `logging.frontend.batch_size` | `50` |
| `logging.frontend.flush_interval` | `5000` ms |

So **logging is off by default on both sides**. That is a deliberate shipping default, not a
malfunction, and it is the first thing to check when a fresh installation appears to log nothing.
Both sets are editable from the system settings page.

## Client-side logging, and how a browser error reaches the database

This is the part worth knowing about, because it is the answer to "how do I see what broke on
the client".

The frontend logger is auto-imported, so `logger.info(...)`, `logger.warn(...)` and
`logger.error(...)` are available in any component with no import. It supports context and
metadata, handles circular references, and is wired into the frontend error handling.

Its `mode` decides where lines go:

| Mode | Effect |
|---|---|
| `none` | nothing |
| `console` | browser console only |
| `api` | batched to the backend only |
| `both` | console and backend |

In `api` or `both` mode, entries are **batched** and posted to `/api/logs`: at most 50 per
request by default, flushed at least every 5 seconds, with a size ceiling. The backend log module
receives the batch, enriches each entry with `source: 'frontend'`, the client IP, the user id,
and the request path and method, and writes them to `system.logs` through Prisma.

The result is a real client-error monitor with no external service: turn on
`logging.frontend.mode = api` (or `both`) and `logging.api_logging_enabled = true`, and browser
errors land in the same table the admin log view reads, attributed to a user and an IP.

Two things to weigh before turning it on in production: the volume, which the batch size and the
retention settings exist to bound, and the content, since metadata is written verbatim and a log
line is a fine way to leak something into the database.

## Server-side logging

Lines are structured: level, message, the calling class and method, file and line, a request id
where one exists, and free-form metadata. Two conventional tags, `source` and `what`, group lines
into families such as `QUEUE:status` or `WS:broadcast`, which makes grepping a boot log
practical. Transports are console, file and database.

The startup statistics table at the end of boot is the fastest health check the engine offers:
startup time, modules loaded, operation and event counts, warnings, errors, memory.

## Reading logs through the API

The log module is not only a writer. It also serves what has been collected, which is how the
admin log screens work and how you can look at a running system without a shell:

| Endpoint | Returns |
|---|---|
| `GET /api/logs` | rows from `system.logs`, filterable |
| `GET /api/logs/containers` | the container logs available |
| `GET /api/logs/containers/:containerName` | one container's output |
| `GET /api/logs/search` | a search across container logs |
| `POST /api/logs` | the batch endpoint the browser writes to |

The container endpoints matter more than they look: while the server's database transport is
broken (below), the container output is the only complete record, and these endpoints reach it
without an ssh session. When you are chasing a startup failure or a missing module, search the
container log rather than the table.

## Two server-side mechanisms that do not work today

**The server's database transport writes nothing.** With `logging.mode` including `database` and
the level at info, a restart plus real traffic produced console output and **zero** rows, with no
error and no fallback message. An earlier note in the repository blames a race in the Prisma
transport, but that explanation does not survive a code read; the cause is unconfirmed.

Note carefully what this does and does not mean. The **server's** transport is broken. The
**browser's** path to the same table is a completely different route: an HTTP request into the
log module and an ordinary Prisma write. An empty log view therefore does not tell you which of
the two is at fault, and the `source` column is what separates them.

**A plugin service's own logger reaches no transport.** At the same settings,
`this.logger.info(...)` inside a plugin service produced nothing in the container output, while
core and middleware lines on the same process appeared normally.

Both were established on this version by direct observation.

## What to do instead, on the server

- Read the container output. It is the transport you can trust right now.
- If a fact matters, **persist it on the domain row**, not through the logger. A job that must be
  able to explain itself later should write its plan, its measurements and its outcome onto its
  own record.
- In a plugin service that must be observable while you develop, write to standard output
  directly.

## Retention

The database log is bounded by `logging.max_records` and cleaned on an interval, optionally also
at startup. Turning on client logging without checking those numbers is how a log table becomes
the largest thing in the database.

## Common mistakes

- **Concluding the engine logs nothing.** Both sides ship switched off.
- **Reading an empty log view as one failure.** Two independent writers, one table; check
  `source`.
- **Relying on `this.logger` inside a plugin service.** Nothing arrives.
- **Setting the level in `.env`.** The database wins.
- **Turning on client logging without retention limits.**
- **Logging a secret.** Metadata is written verbatim, and client logs carry the user and the IP.

## Where to look

- `frontend/src/core/logging/` — the client logger, its config and its modes, with a README.
- `frontend/src/core/store/loggingStore.ts` — how the browser reads its settings from the
  database.
- `backend/src/modules/log/` — the endpoint, the service that enriches a batch, the repository
  that writes it.
- `core/logger/LoggerConfig.ts` and `transports/PrismaTransport.ts` — the server side.
