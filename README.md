<div align="center">

# TYPUS

**TypeScript full-stack app starter for building SaaS fast**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-green)](https://vuejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

[Demo](https://demo.typus.dev) • [Website](https://typus.dev) • [YouTube](https://www.youtube.com/@typus_dev) • [GitHub](https://github.com/typus-dev/typus)

<br>

[![Watch Trailer](https://img.youtube.com/vi/7yy904m0LJA/maxresdefault.jpg)](https://www.youtube.com/watch?v=7yy904m0LJA)

*Click to watch trailer*

</div>

---

## What is Typus?

Typus is a **production-ready SaaS foundation** that lets you focus on business logic while core infrastructure is already in place:

- **Authentication** — JWT, OAuth, 2FA (TOTP)
- **Admin Panel** — Vue 3 + TypeScript
- **Permissions** — CASL roles/abilities
- **Plugin Architecture** — Extend without touching core
- **Auto-generated CRUD APIs** — Define model, get API
- **Database DSL** — Schema-as-code

**Your job:** Add business logic. Everything else is ready.

---

## Quick Start

```bash
# Clone
git clone https://github.com/typus-dev/typus.git
cd typus

# Start (zero-config localhost)
docker compose up -d --build

# Open
# http://localhost:3000
# admin@localhost / admin12345
```

**That's it.** No external database required outside Docker.

---

## How it runs locally

By default it runs **2 containers**:

- `typus_lite` — nginx + backend + frontend (single app container)
- `mysql` — MySQL 8.0 database (separate container)

---

## Features

| Feature | Description |
|---------|-------------|
| **2 Containers (default)** | app + mysql (no external DB required outside Docker) |
| **3 Profiles** | local (laptop), dev (server), prod (production) |
| **DSL Models** | Define schema → get API, types, validation |
| **Plugin System** | Add features without touching core |
| **Real-time** | WebSocket events (Redis optional) |
| **Queue System** | Background jobs (email/telegram handlers, etc.) |

---

## Deployment Profiles

```bash
# Local works out of the box:
./manage.sh switch local

# Dev/Prod require profile env files (they are gitignored by design):
cp .env.example .env.dev
cp .env.example .env.prod

./manage.sh switch dev
./manage.sh switch prod
```

---

## Tech Stack

- **Backend:** Node.js, Express, Prisma, TypeScript
- **Frontend:** Vue 3, Vite, TypeScript
- **Database:** MySQL 8.0 (or embedded)
- **Container:** Docker, supervisord

---

## Requirements

- Docker & Docker Compose
- 512MB+ RAM
- ~500MB disk space

---

## Documentation

Coming soon at [typus.dev/docs](https://typus.dev/docs)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with TypeScript, Vue 3, and lots of coffee**

[typus.dev](https://typus.dev)

</div>
