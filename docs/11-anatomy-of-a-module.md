# 11. Anatomy of a module

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `core/base/`,
`core/decorators/component.ts`, `module-loader.ts` and the shipped modules.**

A module is a folder. The loader finds it, instantiates it and mounts its routes; you never
register it anywhere (chapter 3).

## The folder

```
modules/invoicing/            or  plugins/invoicing/backend/
├── InvoicingModule.ts        routes and wiring
├── controllers/
│   └── InvoicingController.ts
├── services/
│   └── InvoicingService.ts
├── repositories/             optional
├── validation/               optional, Zod schemas
└── index.ts                  optional
```

The loader looks for `*Module.ts`. Everything else is found through it or by the component
loader, which walks `services/`, `controllers/` and `repositories/`.

## The module class

```ts
export class InvoicingModule extends BaseModule<any, any> {
  private static instance: InvoicingModule;

  constructor() {
    super('invoicing', InvoicingController, InvoicingService);
  }

  static getInstance(): InvoicingModule {
    return InvoicingModule.instance ??= new InvoicingModule();
  }

  protected initialize(): void {
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    this.router.get('/', [this.auth()], this.controller.list.bind(this.controller));
    this.router.post('/', [this.auth(), this.roles(['admin'])],
      this.controller.create.bind(this.controller));
  }
}
```

`BaseModule` takes a base path, a controller class and a service class, resolves both from the
container, and creates the router. Routes land at `/api/<basePath>`; the startup log prints the
mount point for every module.

`initialize` and `initializeRoutes` are abstract: you must implement both. The loader prefers a
static `getInstance` when the class has one, which is how the shipped modules stay singletons.

Three middleware helpers come from the base class:

| Helper | Effect |
|---|---|
| `this.auth()` | a valid session is required |
| `this.authOptional()` | a session is attached if present, and not required |
| `this.roles(['admin'])` | the caller must hold one of these roles, matched case-insensitively |

Declare routes on **`this.router`**, not on `this.routes`. The base class assigns `this.routes`
from `RouterHelper.setupRoutes(this)` **after** `initializeRoutes()` has run, so inside your
method it is still undefined. Every shipped module uses `this.router`; none uses `this.routes`.

Always `.bind(this.controller)` when passing a handler; an unbound method loses `this`.

### What the base class does for you, in order

`BaseModule`'s constructor is the module contract, and its order matters:

1. resolves the controller and the service from the container;
2. creates the router and resolves the auth middleware;
3. calls **your `initializeRoutes()`**;
4. hands the module to `RouterHelper.setupRoutes(this)`, which wraps every handler;
5. calls **your `initialize()`**;
6. logs the module and its base path.

Note steps 3 and 5: **routes are declared before `initialize()` runs.** If your initialisation
prepares something a route needs at declaration time, it is not ready yet. Anything a request
needs should be resolved inside the handler, not captured while routes are being declared.

`CoreBase`, which every one of these extends, does two small things that explain the shape of the
startup log: it gives the object a logger and its own class name, and it logs one line when the
object is constructed. That is why the boot log reads as a list of components coming up.

## Services, controllers, repositories

```ts
@Service()
export class InvoicingService extends BaseService {
  async list() {
    return this.prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

@Controller()
export class InvoicingController extends BaseController {
  constructor(@inject(InvoicingService) private invoicing: InvoicingService) {
    super();
  }

  async list(req: Request, res: Response) {
    return this.invoicing.list();
  }
}
```

Dependency injection is tsyringe. The decorators `@Service()`, `@Controller()`, `@Repository()`
and `@Module()` register the class with the container; they accept options, and the engine's own
code uses them bare, letting the base path come from the `BaseModule` constructor. Follow that.

`BaseService` sets `this.prisma` to the same client as `global.prisma`, so either name reaches
the same instance inside a service that extends it. Outside such a class, use `global.prisma`.

Controllers return values; they do not build responses. Chapter 12 explains what happens to what
you return.

## The trap that costs a day

**Never put code between `@Service()` and the class it decorates.** esbuild rejects it with
*Decorators are not valid here*, the loader fails to import the module, and the module is never
registered.

What that looks like from outside is the reason this is written down: the application boots and
stays healthy. `/api/health` answers 200, every other module answers normally, and only this
module's routes return 404. The request log fills with route-not-found lines and says nothing
about a syntax error. The real message was printed once, in the startup log, long before the
requests arrived.

```
docker logs <container> | grep -iE "TransformError|Failed to import module"
```

Run that whenever routes go missing without an obvious cause. Put file-level helpers above the
decorator or below the class.

## Common mistakes

- Code between the decorator and the class. See above.
- Forgetting `.bind(this.controller)`.
- Building the response in the controller instead of returning a value.
- Expecting a module to be reachable before its import succeeds.
- Registering the module somewhere by hand. Nothing needs it.

## Where to look

- `core/base/BaseModule.ts` — the constructor and the middleware helpers.
- `core/decorators/component.ts` — the four decorators.
- `module-loader.ts` — discovery, instantiation, component loading.
- `modules/auth/` — the largest shipped example.
