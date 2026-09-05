# Typus Engine Documentation

**Tracks engine version:** 1.1.121 (build 2078)
**Status:** complete. All 34 chapters exist. Every entry below links to a file; a chapter that is
not written carries no link, so the table of contents never promises text that does not exist.

## How to read this

Start with chapter 2. Almost everything in Typus is generated from convention, and most wasted
effort comes from hand-wiring what the build already wires up. Once you understand the codegen
layer, half the questions about "why isn't my thing registered" answer themselves.

Then read the chapter for the layer you are about to touch. If you are about to build on
something, check the appendix first: the tree contains more than one attempt at several
problems, and it does not tell you which one won. Each chapter states a contract and
gives an example you can run, carries the engine version it was verified against, and ends with
a "Common mistakes" section covering the traps that actually cost people time.

## What this is not

`work-log/` and `plugins/*/worklog/` are history: plans, investigations, decisions as they were
made. They are not a contract and must never be cited as "how it works". When a worklog and a
chapter disagree, the chapter wins; when a chapter and the code disagree, the code wins and the
chapter is wrong and must be fixed.

## File convention

One file per chapter, named `NN-slug.md`, numbered as below. A chapter that is not written has
no file.

---

## Part I. Anatomy

1. **[What Typus is](01-what-typus-is.md)** — the tree, core versus plugins, what ships publicly
   and what does not.
2. **[Generation](02-generation.md)** — what is generated, from what, when, and what you must
   never write by hand. The most important chapter in the book.
3. **[Application lifecycle](03-application-lifecycle.md)** — boot order and what is available at
   each step.
4. **[Modules, plugins and the edge of the core](04-modules-plugins-and-the-edge-of-the-core.md)**
   — who loads last and why that matters.

## Part II. Data

5. **[The data model](05-the-data-model.md)** — fields, types, access, ownership, events.
6. **[Relations](06-relations.md)** — how models point at each other and what the generator
   needs to know.
7. **[Schema and database](07-schema-and-database.md)** — from model to Prisma to a live table,
   and what happens on boot.
8. **[The data client](08-the-data-client.md)** — reading and writing from the frontend, from a
   service, and from a workflow block. Three vocabularies, one engine.
9. **[Access and ownership](09-access-and-ownership.md)** — who may read which rows, and how
   that is enforced.
10. **[Seed data](10-seed-data.md)** — baseline, defaults, and what a fresh install starts with.

## Part III. The application layer

11. **[Anatomy of a module](11-anatomy-of-a-module.md)** — module, controller, service,
    repository, and the container.
12. **[Request and response](12-request-and-response.md)** — the single response shape, error
    handling, validation.
13. **[Identity and access](13-identity-and-access.md)** — tokens, the shape of the current user,
    abilities.
14. **[Files and media](14-files-and-media.md)** — upload, storage, serving, and permissions.
15. **[Configuration and secrets](15-configuration-and-secrets.md)** — env versus database
    config, and where a key belongs.
16. **[Background work](16-background-work.md)** — the queue, the scheduler, task handlers.
17. **[Events and realtime](17-events-and-realtime.md)** — the event bus and WebSocket.
18. **[Observability](18-observability.md)** — what is logged, where it lands, and what you
    cannot rely on today.
19. **[The system operation layer](19-the-system-operation-layer.md)** — the operation registry
    an agent can call.

## Part IV. The interface

20. **[Pages and navigation](20-pages-and-navigation.md)** — file-based routing, route metadata,
    guards.
21. **[The component library](21-the-component-library.md)** — what exists, how it registers
    itself, how to use it.
22. **[Visual language and themes](22-visual-language-and-themes.md)** — tokens, generated
    classes, type scale and rhythm.
23. **[Page frames](23-page-frames.md)** — layouts, where they come from, how a module adds its
    own.
24. **[Menus](24-menus.md)** — how navigation is generated and why a restart is sometimes
    needed.
25. **[Data in the interface](25-data-in-the-interface.md)** — the API client, composables,
    stores.
26. **[Declarative pages](26-declarative-pages.md)** — building a page from configuration instead
    of markup.
27. **[Interfaces from the model](27-interfaces-from-the-model.md)** — list, form and detail
    screens generated from a model.

## Part V. Extending

28. **[Your first plugin](28-your-first-plugin.md)** — from empty folder to a working screen.
29. **[Automations and blocks](29-automations-and-blocks.md)** — workflows, where block code
    lives, what a block can reach.
30. **[Customising without touching the core](30-customising-without-touching-the-core.md)** —
    the `custom/` layer.

## Part VI. Running it

31. **[Profiles and environments](31-profiles-and-environments.md)** — local, dev, prod, lite.
32. **[Install and update](32-install-and-update.md)** — first boot, upgrades, migrations.
33. **[Releasing](33-releasing.md)** — snapshot, gate, publish.
34. **[Diagnosing](34-diagnosing.md)** — a symptom index: what you see, what causes it, one
    command to confirm.

## Appendix

**[What is load-bearing, what is fragile, what is dead](appendix-status-and-vestigial.md)** —
which mechanism won where the tree contains more than one attempt, which parts are known broken,
and what not to build on. Read it before extending anything that looks unused.

---

## Contributing to this book

- Verify against the source before you write. When a fact comes from a running system, take it
  from the startup log rather than from memory.
- State the engine version you verified against at the top of the chapter.
- Traps belong inside the relevant chapter under "Common mistakes", not in a separate list of
  gotchas and not in this table of contents.
- Do not add a chapter entry here until the file exists.
