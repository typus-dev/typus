# 12. Request and response

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`core/routing/RouterHelper.ts`, `core/base/BaseController.ts`, `core/base/BaseService.ts` and
the middleware.**

Every endpoint answers in the same shape, and you get that for free by returning a value from a
controller method.

## The shape

```json
{ "status": 200, "data": { }, "error": null }
```

```json
{ "status": 404, "data": null, "error": { "message": "Invoice not found", "code": "NOT_FOUND" } }
```

`RouterHelper` wraps every handler. If the handler returns a plain value, it is wrapped with
status 200. If it returns an object that already has `status`, `data` and `error`, that object
is sent as is. If it throws, the error is formatted into the same shape with the status its
class carries.

The wrapper also warns in the log when it finds `data.data`, which is what a controller that
built the envelope itself and then returned it looks like. Return the payload, not the envelope.

## Validation

```ts
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js';

this.router.post('/', [this.auth(), ValidationMiddleware.validate(createInvoiceSchema, 'body')],
  this.controller.create.bind(this.controller));
```

Schemas are Zod, and `validate(schema, source)` takes `body`, `query` or `params`.

Call `ValidationMiddleware.validate(...)` from the module. `BaseController` has a `validate`
helper too, but it is **protected**: usable from inside the controller, not reachable as
`this.controller.validate(...)` while you are declaring routes. Every shipped module uses the
middleware directly.

Inside the handler, `this.getValidatedData(req)` returns the validated object, falling back to
the raw body when no schema ran. A validation failure answers 400 with the field errors
attached.

## Errors

| Class | Status | Code |
|---|---|---|
| `BadRequestError` | 400 | `BAD_REQUEST` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `BaseError` | 500 | `INTERNAL_ERROR` |

Throw them from services; do not return error objects:

```ts
throw new NotFoundError(`Invoice ${id} not found`, { invoiceId: id });
```

`BaseController` also offers `success`, `error`, `notFound`, `badRequest`, `unauthorized` and
`forbidden` for the cases where you want to answer explicitly.

## The two proxies, and the protocol between them

The response shape is not produced by the router alone. Controllers and services are both wrapped
in a `Proxy`, and together they form a small protocol worth knowing in full, because it explains
several behaviours that look arbitrary from outside.

**The controller proxy** wraps every method except the response helpers themselves
(`validate`, `getValidatedData`, `success`, `error`, `notFound`, `badRequest`, `unauthorized`,
`forbidden`, and the error handler). For each call it:

1. reads the handler's arity and calls it with `(req, res)` or `(req, res, next)` accordingly,
   so both signatures are legal;
2. returns immediately if the handler already sent the response;
3. if the result has a `data` property, sends `success(res, result.data)`;
4. if the result is a plain object with neither `data` nor `error`, sends it as the payload;
5. if the result has an `error` property, turns it into an error response;
6. catches a throw and turns that into an error response.

**The service proxy** wraps every service method: a `BaseError` is re-thrown, anything else is
caught and **returned** as `{ error: BaseError }`.

Put together, `{ data }` and `{ error }` are the internal protocol between a service and a
controller. A service that returns `{ error }` produces a correct error response without anyone
writing one, which is the design, not an accident.

## The trap: a service cannot refuse through the proxy

`BaseService`'s constructor returns a `Proxy`. Its get trap wraps every method in try/catch, and
the catch does two different things:

- a `BaseError` is **re-thrown**, and behaves as you expect;
- **any other error is caught and returned** as `{ error: new BaseError(...) }`.

So a helper on a service that throws a custom error class of its own does not refuse. The caller
receives a value, and a check like `typeof result === 'string'` quietly fails somewhere
downstream. This has cost real money once: a method that was supposed to reject an unknown style
returned an object instead of throwing, the rejection never happened, and the work continued with
the wrong input. Nothing appeared in any log as an error.

Two ways out, both fine:

- make the error extend `BaseError`, so the proxy re-throws it;
- put the helper at file level, outside the class, where the proxy never sees it.

The same trap has a sibling: a **synchronous** helper reached through the proxy comes back as a
Promise, because the wrapper is async.

## The error family

`BaseError` carries `message`, `code`, `status` and a free-form `context`, captures a stack
trace, and serialises itself with `toJSON`. The subclasses fix the code and the status:
`NotFoundError` (404), `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError`
(403), and `ValidationError`, which additionally carries an `errors` array and includes it in
its JSON.

The `context` argument is the cheapest observability in the engine: it travels into the response
and into the log, so `throw new NotFoundError('Invoice not found', { invoiceId: id })` costs
nothing and answers the next question for you.

## Middleware order

Application level, in order: request id, request logger, the middleware configurator (security
headers, CORS, body parsing), then rate limiting. Route level: whatever array you pass, in the
order you pass it, then the handler. The error handler is last.

## Common mistakes

- **Building the envelope in the controller.** Return the payload.
- **Returning `{ error }` from a service instead of throwing.**
- **A custom error class that does not extend `BaseError`.** It will not refuse.
- **Expecting a sync helper on a service to stay sync.**
- **Reading `req.body` when a schema ran.** Use `getValidatedData`.

## Where to look

- `core/routing/RouterHelper.ts` — the wrapper and the nested-data warning.
- `core/base/BaseController.ts` — validation and the response helpers.
- `core/base/BaseService.ts` — the proxy, lines 35 to 90.
- `core/middleware/` — the pipeline and the error handler.
