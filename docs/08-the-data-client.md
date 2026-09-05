# 8. The data client

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`frontend/src/dsl/client/`, `backend/src/dsl/`, and the workflow block sandbox.**

Every model you declare gets a data API for free (chapter 5). There are four places you can call
it from, and **three of them use a different vocabulary for the same operations**. That is the
single most expensive thing to not know about Typus, so this chapter states all of them side by
side.

## The four call sites

### 1. From a Vue page or composable: the typed client

This is the normal way, and the way the engine's own modules do it.

```ts
import { DSL } from '@/dsl/client'

const users   = await DSL.AuthUser.findMany()
const admins  = await DSL.AuthUser.findMany({ status: 'active' }, ['roles'], { page: 1, limit: 20 })
const one     = await DSL.AuthUser.findById(42)
const created = await DSL.AuthUser.create({ email: 'a@example.com' })
await DSL.AuthUser.update(42, { status: 'blocked' })
await DSL.AuthUser.delete(42)
const total   = await DSL.AuthUser.count({ status: 'active' })
```

`DSL` is a proxy: any model name works, no import and no registration per model. The full
surface of a model client:

| Method | Signature |
|---|---|
| `findById` | `(id, include?)` |
| `findMany` | `(filter?, include?, pagination?)` where pagination is `{ page, limit, orderBy }` |
| `create` | `(data, include?)` |
| `update` | `(id, data, include?)` |
| `delete` | `(id)` |
| `count` | `(filter?)` |
| `getMetadata` | `()` |
| `getFields` | `(visibility?)` with visibility among `table`, `form`, `detail` |
| `getField` | `(fieldName)` |

The last three are what makes generated interfaces possible: the client can ask the engine what
a model looks like. See chapter 27.

**Return shape.** A read may come back as a bare array or as `{ data, paginationMeta }`
depending on the call. The engine's own modules normalise defensively, and so should you:

```ts
const response = await DSL.AuthUser.findMany()
const users = Array.isArray(response) ? response : (response?.data || [])
```

`count` returns a number, not a list.

### 2. Over HTTP: one endpoint

The typed client is a thin wrapper over a single endpoint. Use this form from scripts, tests and
anything outside the frontend bundle.

```
POST /api/dsl
{
  "model": "AuthUser",
  "module": "auth",          // optional
  "operation": "read",       // create | read | update | delete | count
  "data":   { ... },         // for create and update
  "filter": { ... },         // the where clause, for read, update, delete, count
  "include": ["roles"],
  "pagination": { "page": 1, "limit": 20, "orderBy": { "id": "desc" } }
}
```

The operation is a strict enum: **`create`, `read`, `update`, `delete`, `count`**. There is no
`findMany` here, and there is no `where`: the where clause is always called `filter`, including
for `update` and `delete`.

```json
{ "model": "DispatcherTask", "operation": "update", "filter": { "id": 7 }, "data": { "isActive": false } }
```

There are also module-scoped and relation forms: `POST /api/dsl/{module}`,
`POST /api/dsl/{module}/{model}`, and `POST /api/dsl/{module}/{model}/{id}/{relation}`.

From the frontend, if you ever call it directly, use `useApi('/dsl')`, not `useApi('/api/dsl')`:
the prefix is added for you. `$fetch` does not attach authentication.

### 3. Inside a workflow block: `callSml`

Block code runs in a sandbox that reaches the database through Prisma directly, bypassing HTTP
authentication. Its vocabulary is a **third** one:

```js
const task  = await callSml({ model: 'DispatcherTask', operation: 'findOne',  id: taskId })
const tasks = await callSml({ model: 'DispatcherTask', operation: 'findMany', filter: { isActive: true } })
await callSml({ model: 'DispatcherTask', operation: 'update', id: taskId, data: { isActive: false } })
```

Operations here are **`create`, `findOne`, `findMany`, `update`, `delete`, `count`**, and update
takes `id`, not `filter`. Do not copy this shape into an HTTP call, or the HTTP shape into a
block.

### 4. Inside a backend service

Two options, and they are not equivalent:

```ts
// Raw: no access rules, no hooks. Use for engine internals and trusted work.
const rows = await global.prisma.authUser.findMany({ where: { status: 'active' } })

// Through the data layer: access rules, ownership filtering and hooks apply.
const rows = await this.dslService.executeOperation(
  'AuthUser', 'read', undefined, { status: 'active' }, ['roles'], { page: 1, limit: 20 }, req.user
)
```

`executeOperation` takes `(model, operation, data, filter, include, pagination, user,
relationParams, module, orderBy)` and uses the same enum as HTTP: `create`, `read`, `update`,
`delete`, `count`. Note `global.prisma`, never `this.prisma` on a service you wrote.

If you want the model's access rules to be enforced, you must pass the user. Raw Prisma sees
everything.

## Types on both sides, from the same model

The model does not only produce the API. It also produces the TypeScript your code is written
against, and the same generated file is used by the backend and the frontend:

```ts
export interface IStorageFile {
  id: string; originalName: string; mimeType: string; size: number;
  visibility: string; userId: number; createdAt?: Date; ...
}

export namespace StorageFileFields {
  export const id = 'id';
  export const originalName = 'originalName';
  export const mimeType = 'mimeType';
  ...
}
```

Two things come out of one model file, one per entity, in `@typus-core/shared/dsl/types/`:

- **`I<Model>`**, the entity's shape, with optionality following `required` on the field;
- **`<Model>Fields`**, a namespace of field-name constants, so a filter or a column list can be
  written as `StorageFileFields.userId` instead of the string `'userId'` and a rename is caught
  by the compiler on both sides.

The typed client is generic over those interfaces, so `DSL.StorageFile.findMany()` is typed as
`IStorageFile[]` in a Vue component without anyone writing a data-transfer type, and the same
interface types the service handling the request. That is what "described once" means in
practice: not only the table and the endpoint, but the type both ends agree on.

The three vocabularies below are the other half of the same idea. `findMany` in the browser,
`read` on the wire and in a service, `findMany` again inside a workflow block: the naming suits
each layer, while the operation, the model and the type stay one thing.

## The three vocabularies, side by side

| Meaning | Typed client | HTTP and `DslService` | Workflow block |
|---|---|---|---|
| list | `findMany(filter)` | `operation: "read"`, `filter` | `operation: 'findMany'`, `filter` |
| one by id | `findById(id)` | `operation: "read"`, `filter: {id}` | `operation: 'findOne'`, `id` |
| create | `create(data)` | `operation: "create"`, `data` | `operation: 'create'`, `data` |
| update | `update(id, data)` | `operation: "update"`, `filter`, `data` | `operation: 'update'`, `id`, `data` |
| delete | `delete(id)` | `operation: "delete"`, `filter` | `operation: 'delete'`, `id` |
| count | `count(filter)` | `operation: "count"`, `filter` | `operation: 'count'`, `filter` |

They are three faces of one engine. The typed client's `findMany` becomes `operation: "read"` on
the wire; nothing is lost and nothing is different.

## Common mistakes

- **Sending `operation: "findMany"` over HTTP.** The enum rejects it with a message naming the
  five legal values. `findMany` belongs to the typed client and to block code.
- **Sending `where` instead of `filter`.** An update with `where` or with a bare `id` fails
  inside Prisma with "where is missing", which reads like an engine bug and is not one.
- **Copying the block vocabulary into an HTTP call, or the reverse.** They differ on purpose:
  the block talks to Prisma, the endpoint talks to the validated API.
- **`useApi('/api/dsl')`.** The `/api` prefix is added for you.
- **`$fetch` instead of `useApi`.** No authentication header, so everything 401s.
- **Expecting `count` to return rows.** It returns a number.
- **Reaching for raw Prisma in application code.** You lose access rules, ownership filtering
  and hooks. Prefer the data layer and pass the user.

## Where to look

- `@typus-core/frontend/src/dsl/client/DSL.ts` and `TypedDslModelClient.ts` — the typed client.
- `@typus-core/backend/src/dsl/validation/dslSchemas.ts` — the wire contract, including the enum.
- `@typus-core/backend/src/dsl/services/DslService.ts` — what happens after the request lands.
- `plugins/workflow/backend/services/CodeExecutor.ts` — the block sandbox and `callSml`.
