# 1. What Typus is

**Verified against engine 1.1.121 (build 2078) on 2026-09-05.**

Typus is a foundation for web applications: authentication, an admin surface, files,
configuration, a queue, a content system and a plugin architecture, with a data layer that
generates its own database schema, API and screens. You add the business logic; the rest is
already there.

## The stack

Express and TypeScript on the backend, with tsyringe for dependency injection and Prisma over
MySQL, PostgreSQL or SQLite. Vue 3 and Vite on the frontend. Everything runs in Docker, and in
the default profile it is a single container running nginx, the backend and the frontend under
supervisord.

## The idea

Most of a typical application is repetition: a table, a form, a list, an endpoint, a permission
check, a type definition, all describing the same entity five times. Typus describes it **once**,
as a model, and generates the rest (chapters 2 and 5). What is left for you to write is the part
that is actually specific to your product.

## The shape of the workspace

```
typus/
├── dev.typus.dev/     the engine, the source of truth, where all development happens
├── typus-github/      the public mirror, generated, never edited by hand
├── release-system/    snapshot, gate, sync, publish
├── typus-cli/         the npm installer
├── demo.typus.dev/    deployment tree
├── typus.dev/         deployment tree
├── test-installations/  clean installs used to verify a release
└── work-log/          internal history, never published
```

Inside the engine:

```
dev.typus.dev/
├── @typus-core/
│   ├── backend/       Express application, core modules, the data layer
│   ├── frontend/      Vue application, components, themes, DSX
│   └── shared/        the model DSL, generators, the operation registry
├── plugins/           features, loaded last, able to override the core
├── custom/            per-instance overrides that survive an engine update
├── data/              baseline data, Prisma schema and migrations
├── docker/            images, nginx, compose profiles
├── setup/             install, update, quick start
├── public/            static assets and themes
└── docs/              this book
```

## Core and plugins

The core is what every installation has: authentication, users and roles, the content system,
storage, email, notifications, the dispatcher, logging, the sitemap, the system module. Plugins
are features: payments, workflows, an AI agent, CRM, newsletters, analytics, project management
and so on.

The public release ships **the core only**: 13 backend modules and 7 frontend modules, with an
empty `plugins/` directory. That is deliberate, and chapter 4 draws the line precisely.

## What you actually do with it

| You want | You write | You get |
|---|---|---|
| a new entity | one model file | a table, a CRUD API, types, permissions |
| a screen for it | a page file, or nothing at all | a route, and optionally a generated interface |
| a feature | a plugin folder | routes, pages, menu entries, background workers |
| a change for one customer | files under `custom/` | overrides that survive an update |

## Where to go next

- Chapter 2 if you are about to write code. It is the one chapter that changes how you work.
- Chapter 3 to understand what exists when your code runs.
- Chapter 5 to add an entity, chapter 8 to read and write it.
- Chapter 28 to build a feature as a plugin.
- Chapter 34 when something behaves strangely.
