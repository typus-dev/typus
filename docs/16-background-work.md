# 16. Background work

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `core/queue/`,
`core/queue/workers/` and `module-loader.ts`.**

Anything that must not block a request goes through the queue: sending mail, backups, cache
warming, image generation, whatever a plugin adds.

## Two profiles

| | Database queue | Redis queue |
|---|---|---|
| Selected by | `queueDriver = 'database'` in the runtime configuration | anything else, with `REDIS_ENABLED=true` |
| Who runs the workers | the backend process itself | a separate dispatcher container |
| Adapter | `DatabaseQueueAdapter` | `RedisQueueAdapter` |
| Good for | a single container, a small installation | several processes, higher volume |

The startup log says which one you are in, and chapter 3 shows where in the boot the workers
start. `QueueAdapterFactory` picks the adapter; nothing else in your code changes between the
two.

## The dispatcher

"The dispatcher" is a component, not a metaphor. It owns the schedule, the queue and the record
of what ran, and it has three faces.

**Three tables**, all under the `dispatcher` module (chapter 5 explains the naming):

| Table | Holds |
|---|---|
| `dispatcher.tasks` | the schedule: what should run, how it is configured, how often |
| `dispatcher.queue_tasks` | the queue: what is due, running or waiting to run |
| `dispatcher.task_history` | what ran, when, with which outcome |

**An API**, mounted by the dispatcher module. Beyond the usual CRUD on the schedule it exposes
the queue itself:

```
GET    /api/dispatcher/queues                    the queues and their state
GET    /api/dispatcher/queues/health             health across queues
GET    /api/dispatcher/queues/:queue/tasks       what is in one queue
GET    /api/dispatcher/queues/:queue/stats       counts and timings
POST   /api/dispatcher/queues/:queue/pause       stop consuming
POST   /api/dispatcher/queues/:queue/resume      start again
DELETE /api/dispatcher/queues/:queue/clear       drop what is queued
GET    /api/dispatcher/queues/task-history       what ran, with detail by id
GET    /api/dispatcher/queues/system-load        load across the system
DELETE /api/dispatcher/queues/tasks/batch        remove a set of tasks
POST   /api/dispatcher/queues/tasks/batch/retry  retry a set
POST   /api/dispatcher/execute/:id               run one scheduled task now
GET    /api/dispatcher/schemas                   what task types exist and what they accept
```

**A screen**, the frontend `dispatcher` module: a queue manager with a sidebar of queues, a grid
of tasks, a task creator, task history and per-task detail. Pausing a queue, retrying a failed
batch or running a job once is done there rather than in the database.

So when something scheduled did not happen, the order of inspection is: the row in
`dispatcher.tasks` (is it active, what is its period), the queue screen (is the queue paused, is
the task stuck), then the history (did it run and fail).

## The two loops, in the database profile

**`TaskScheduler`** wakes every 30 seconds, reads the schedule from `dispatcher.tasks` and
pushes what is due into `dispatcher.queue_tasks`.

**`TaskWorker`** wakes every 10 seconds, takes up to three tasks at a time from
`dispatcher.queue_tasks`, and runs the handler each one names.

So a scheduled job has up to 30 seconds of scheduling latency and up to 10 more before it runs.
That is fine for maintenance and mail, and it is not a real-time mechanism.

**A real limitation, stated plainly:** cron expression parsing is not implemented. A task whose
schedule the scheduler cannot interpret falls back to an hourly interval, and says so in the
log. If precise timing matters, do not assume a cron string is being honoured; check the log
line.

## A scheduled job is a row, not code

The schedule lives in the database, in `dispatcher.tasks`. Each row names a handler by `type`,
carries its configuration as JSON in `data`, and states how often to run in `period_sec`:

| Column | Meaning |
|---|---|
| `name` | what a human calls it |
| `type` | the handler that runs it |
| `data` | the handler's configuration, JSON |
| `period_sec` | interval in seconds |
| `is_active` | on or off, without deleting the row |

Adding a scheduled job to an installation therefore means inserting a row, not deploying code,
as long as a handler for that `type` exists. Turning one off means setting `is_active = 0`.

### Backing up the database

This is the shipped example, and the answer to "how do I take backups": the baseline seeds a
`database_backup` task that runs every 12 hours.

```sql
INSERT INTO `dispatcher.tasks` (name, type, data, period_sec, is_active) VALUES (
  'Database Backup', 'database_backup',
  JSON_OBJECT(
    'storage',   JSON_OBJECT('type', 'local'),
    'options',   JSON_OBJECT('compress', TRUE, 'includeData', TRUE,
                             'includeStructure', TRUE, 'singleTransaction', TRUE),
    'retention', JSON_OBJECT('days', 30, 'maxFiles', 50),
    'naming',    JSON_OBJECT('pattern', '{database}_{timestamp}.sql',
                             'timestampFormat', 'YYYY-MM-DD_HH-mm-ss')
  ),
  43200, 1
);
```

The handler (`DatabaseBackupHandler`) dumps with `mysqldump`, writes into `storage/backups`,
compresses, and applies the retention policy afterwards, keeping 30 days and at most 50 files by
default. Both the database and the path are auto-detected when omitted, which is why the seeded
row is portable across installations.

To change how often or how much you keep, edit the row. To take one now, run the task from the
dispatcher screen rather than writing a script.

Two things worth checking on a real deployment: that `storage/backups` is on a volume that
survives the container, and that the retention numbers match the disk you actually have.

## Handlers

A handler is a class registered in the `TaskHandlerRegistry`. The engine ships several, and they
double as the best examples: email, cache, database backup, system garbage collection, Telegram.

Every handler extends `BaseTaskHandler` and must implement two methods:

```ts
abstract getSchema(): TaskSchema;      // what this task type is called and what it accepts
abstract execute(data: any): Promise<any>;
```

The schema is not decoration. It names the type, lists the configuration fields, and can carry a
validator:

```ts
getSchema(): TaskSchema {
  return {
    type: 'database_backup',
    fields: ['databases', 'storage', 'options', 'retention', 'naming', 'notifications'],
    validate: (data) => { if (!data.storage?.type) throw new Error('storage.type required'); }
  };
}
```

`GET /api/dispatcher/schemas` serves those schemas, and the task creator in the interface builds
its form from them. So a handler that declares its schema properly becomes configurable by a
person through the screen, with no UI work at all: declare the fields, and the form appears.
That is the same idea as chapter 27, applied to jobs instead of records.

A plugin adds its own by putting `*TaskHandler.ts` under `plugins/<name>/workers/handlers/` and
decorating the class with `@Service()`. The loader scans for them **after** the HTTP server is
listening, which is deliberate: a handler may use the database and the container during its own
initialisation.

Without `@Service()` the class is never registered, and the failure is quiet: the task waits in
the queue for a handler that does not exist.

## Choosing where work belongs

- Inside the request: only what the caller must wait for.
- A queued task: anything slow, retryable, or scheduled.
- A workflow (chapter 29): anything a non-programmer should be able to rearrange.

## Common mistakes

- **Forgetting `@Service()` on a handler.** Silently never registered.
- **Expecting second-level timing.** Two loops, 30 and 10 seconds.
- **Assuming your cron string is parsed.** It probably is not.
- **Putting long work in a controller.** The request holds a connection for the duration.
- **Assuming the Redis profile is running.** Without `REDIS_ENABLED=true` the engine registers a
  stub, and cross-process delivery does not happen (chapter 17).

## Where to look

- `core/queue/workers/TaskScheduler.ts` and `TaskWorker.ts` — the intervals and batch size above.
- `core/queue/handlers/` — the shipped handlers and `BaseTaskHandler`.
- `core/queue/adapters/QueueAdapterFactory.ts` — how the profile is chosen.
- `module-loader.ts` — plugin worker discovery.
