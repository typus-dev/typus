<div align="center">

# TYPUS

**TypeScript Framework for Rapid Application Development**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-green)](https://vuejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

[Demo](https://demo.typus.dev) • [Documentation](https://typus.dev/docs) • [YouTube](https://www.youtube.com/@typus_dev) • [GitHub](https://github.com/typus-dev/typus)

<br>

[![Watch Trailer](https://img.youtube.com/vi/7yy904m0LJA/maxresdefault.jpg)](https://www.youtube.com/watch?v=7yy904m0LJA)

*Click to watch trailer*

</div>

---

## What is Typus?

Typus is an **AI-ready SaaS foundation** that lets you focus on business logic while everything else is ready:

- **Authentication** — JWT, OAuth, 2FA
- **Admin Panel** — Vue 3 + TypeScript
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

**That's it.** No external database, no Traefik, no .env configuration required.

---

## Features

| Feature | Description |
|---------|-------------|
| **Single Container** | nginx + backend + frontend in one container |
| **3 Profiles** | local (laptop), dev (server), prod (production) |
| **DSL Models** | Define schema → get API, types, validation |
| **Plugin System** | Add features without touching core |
| **AI Operations** | 33 built-in AI operations |
| **Real-time** | WebSocket events, live updates |

---

## Deployment Profiles

```bash
./manage.sh switch local   # Laptop/desktop (embedded MySQL)
./manage.sh switch dev     # Development server (hot reload)
./manage.sh switch prod    # Production server (optimized)
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

- [Getting Started](https://typus.dev/docs/getting-started)
- [Architecture](https://typus.dev/docs/architecture)
- [Plugin Development](https://typus.dev/docs/plugins)
- [AI Operations](https://typus.dev/docs/ai-operations)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with TypeScript, Vue 3, and lots of coffee**

[typus.dev](https://typus.dev)

</div>
