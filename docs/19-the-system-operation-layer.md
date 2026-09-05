# 19. The system operation layer

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `shared/sml/SML.ts`,
`backend/src/sml/` and a live startup log.**

The system operation layer, SML, is a single registry of named operations that the whole system
can call: an AI agent, a workflow block, an HTTP client. Instead of every consumer learning
every module's API, each capability registers itself under a path and describes its own schema.

## Why it exists

Every subsystem already has an API. The problem SML solves is that a **non-human caller** should
not have to learn fifteen of them. An agent, a workflow block or an integration needs one place
to ask three questions: what can this system do, what does that operation expect, and run it.

So each capability registers itself under a dotted path with a schema, and the registry answers
those three questions for everything at once. The payoff is compounding: declare a model
(chapter 5) and it becomes callable by an agent with no integration work, because the data
adapter registers its operations for you. On a live instance that is 312 operations across 52
models, without anyone writing an integration.

The division of labour is stated in the plugins that use it: **SML is the catalogue, the owning
subsystem is the execution.** An operation entry describes a capability and points at whoever
performs it, rather than reimplementing it. That is why the registry can be complete without
being a bottleneck.

## In current terms: this is a tool registry

If you have built anything with a language model recently, the shape is familiar. An SML
operation is a **tool**:

| SML | The usual name for it |
|---|---|
| `SML.register(path, { handler, schema })` | a tool definition: a name, a callable, a schema |
| `OperationSchema` with `description`, typed `params`, `returns` | the tool's JSON schema, including which parameters are required and their enums |
| `GET /api/sml/list` and `/describe` | tool discovery, and fetching one tool's signature |
| `POST /api/sml/execute` | a tool call |
| `visibility`: public, internal, admin, hidden | which caller is allowed to see and use which tool |
| the registry is locked after boot | the tool set is fixed at runtime, not mutable per request |

`execute` does what a tool runner does: it looks the operation up, checks visibility, validates
the parameters against the schema, creates a trace id if the caller did not supply one, and
calls the handler. A failure is wrapped with the operation path, so the caller learns which tool
failed and why.

**One clarification, because the name invites it.** This is not a browser-side mechanism. It is
the server's tool surface, and most of it has nothing to do with the interface: data operations,
authentication, configuration, events, flows, notifications, analytics, feeds. Exactly one
adapter is about the browser, the UI actions registered by the AI agent plugin, and even those
are catalogue entries only: the registry advertises that navigation or a theme switch is
possible, while the actual instruction reaches the browser through the executor and the
WebSocket (chapter 17).

So: a tool registry for the whole system, of which "things the agent can do on screen" is one
small drawer.

## The shape of the registry

```ts
SML.register('actions.crm.contact.create', { handler, schema }, { owner: 'plugin:crm' });
```

A path is dotted and namespaced by domain. The registry is built during boot, **after** all
modules and plugins are loaded, and then **locked**: a `register` call after the lock throws
*Registry is locked*. That is why a module cannot register operations in its own initialiser
(chapter 3), and why a plugin registers through the boot hook rather than at import time.

## What is in it

Adapters register the core surface at boot. From a live instance with five plugins:

| Adapter | Operations |
|---|---|
| Dsl | 312, covering 52 models |
| Actions | 20 |
| Flow | 9 |
| Config | 8 |
| Ui | 6 |
| Auth | 5 |
| Events | 4, plus 4 event types |
| Analytics | 4 |
| Feed | 4 |
| Notify | 3 |

375 operations in total. The number is printed at every boot, so it is a cheap way to notice
that something failed to register.

The Dsl adapter is the reason the registry is worth having: every model you declare (chapter 5)
becomes a set of callable operations automatically, with a schema, without anyone writing an
integration.

## Visibility

Each operation carries one of four visibilities, checked on every call:

| Visibility | Who may call it |
|---|---|
| `public` | anyone |
| `internal` | a request with a user, or a workflow |
| `admin` | a caller whose `roles` array contains `admin` |
| `hidden` | nobody through the normal path |

The admin check here is written correctly against the array, unlike the ownership check in
chapter 9. Worth noting because it means the two layers can disagree about whether the same
caller is an admin.

## The HTTP surface

```
GET  /api/sml/meta        what this registry is
GET  /api/sml/list        the operation tree
GET  /api/sml/describe    the schema of one operation
GET  /api/sml/resolve     resolve a path
POST /api/sml/execute     run one
```

The four discovery endpoints are open by design: an agent must be able to find out what it can
do before it authenticates. Execution is gated by the operation's visibility.

## Adding your own

A plugin registers its operations through the boot hook (`registerPluginAdapter`), which runs
while the registry is still open. Give each operation a schema: the schema is what makes the
operation usable by something that has never seen your code, which is the whole point.

## Common mistakes

- **Registering after boot.** The registry is locked and throws.
- **Registering in a module initialiser.** Same problem, earlier.
- **Shipping an operation with no schema.** It becomes uncallable by anything automated.
- **Assuming `admin` visibility and model access agree.** They are separate checks with separate
  code.
- **Confusing the SML vocabulary with the HTTP data API.** They differ; chapter 8 has the table.

## Where to look

- `@typus-core/shared/sml/SML.ts` — register, lock, visibility, execution.
- `backend/src/sml/adapters/` — the ten adapters listed above.
- `backend/src/sml/routes/sml.routes.ts` — the five endpoints.
