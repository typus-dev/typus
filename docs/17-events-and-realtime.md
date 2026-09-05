# 17. Events and realtime

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `events/EventBus.ts`,
`dsl/services/DslService.ts` and `core/websocket/WebSocketService.ts`.**

Two separate mechanisms, often confused. The event bus moves facts between parts of the backend.
The WebSocket moves them to a browser.

## The event bus

`EventBus` is deliberately dumb: an emitter with names and payloads, with no knowledge of who
listens.

```ts
this.eventBus.emit('invoicing.invoice.paid', { record, userId });
```

The core stays agnostic; plugins subscribe to what they care about. That is how the workflow
plugin starts an automation without the emitting module knowing it exists.

## Events straight from a model

A model can emit without any code at all (chapter 5):

```ts
events: {
  afterCreate: 'waitlist.signup.created',
  afterUpdate: 'waitlist.signup.updated',
  afterDelete: 'waitlist.signup.deleted'
}
```

The data layer emits those after a successful operation, with a payload of

```ts
{ record, modelName, userId, timestamp }
```

This is the cheapest way to make a feature reactive: declare the event on the model, subscribe
elsewhere. Note that it fires for operations that go through the data layer. A raw Prisma write
in a service emits nothing, and neither does a workflow block writing through its own path.

## The WebSocket

The server listens at `ws://<host>/ws` and is attached when the HTTP server starts. It works
with or without Redis, and what changes between the two is not the connection but the reach:

- **Without Redis**, only the process holding the connection can push to it. A worker in another
  process has no route to the browser.
- **With Redis**, the service subscribes to `notification:*` and to a broadcast channel, so any
  process, including a dispatcher container, can publish and have it delivered.

That is the practical reason to turn Redis on: not speed, but letting background work reach the
screen.

## Reporting progress from a background task

The common shape is a long job that must tell a person how it is going. The path is:

```
task handler  ->  NotificationsService  ->  Redis channel  ->  WebSocketService  ->  browser
```

`NotificationsService` publishes to `notification:user:<id>` for one person, or to
`notification:broadcast` for everyone. `WebSocketService` subscribes to `notification:*` and to
the broadcast channel and pushes what arrives to the connected clients.

The Redis hop is the part that matters. A task running inside the backend process could reach
the socket directly, but a task running in a dispatcher container cannot, and neither can a
second backend replica. With Redis enabled, all of them can, and the same code works in both
profiles. Without it, progress from any other process is silently lost.

So: emit progress through the notification service, not through the socket, and keep Redis on in
any installation where work runs outside the web process.

## Choosing a mechanism

| You want | Use |
|---|---|
| another module to react to a change | a model event or an explicit `emit` |
| an automation to start | an event the workflow plugin subscribes to |
| the browser to update without polling | the WebSocket |
| work done later or retried | the queue, chapter 16 |

## Common mistakes

- **Expecting a model event from a raw Prisma write.** Only the data layer emits.
- **Expecting a worker to reach the browser without Redis.** It cannot.
- **Using events for work that must not be lost.** The bus is in-process and has no delivery
  guarantee; durable work belongs in the queue.
- **Naming events inconsistently.** The shipped convention is
  `<domain>.<entity>.<past-tense-verb>`, and automations match on the name.

## Where to look

- `events/EventBus.ts` — the whole mechanism, it is short.
- `dsl/services/DslService.ts` — where model events are emitted and what the payload contains.
- `core/websocket/WebSocketService.ts` — the server, and the Redis subscriptions.
