# 31. Profiles and environments

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `manage.sh`, the
compose files and the Dockerfiles.**

The same code runs in several shapes. A profile decides which compose file is active, which
image is built, and where the database comes from.

## The profiles

| Profile | Compose file | Database | Reverse proxy | For |
|---|---|---|---|---|
| `local` | `docker-compose.local.yml` | a MySQL container alongside | none, direct port | a laptop |
| `dev` | `docker-compose.dev.yml` | external | Traefik | a development server, hot reload |
| `prod` | `docker-compose.prod.yml` | external | Traefik | production, code baked into the image |
| lite | `docker/docker-compose.lite.yml` | either | either | the single-container open-source shape |

`docker-compose.yml` is the active file. `manage.sh` writes it.

## Switching

```bash
./manage.sh switch local     # or dev, or prod
./manage.sh status
./manage.sh                  # interactive menu
```

Switching backs up the current `.env` and `docker-compose.yml`, copies the profile's files into
place, and expects you to restart:

```bash
docker compose down && docker compose up -d
```

## What differs, in practice

**Local** is the zero-configuration shape: no external database, no proxy, no `.env` needed to
start, the application on a local port. It is what the public quick start uses.

**Dev** mounts the source into the container, so both Vite and the backend reload on change. It
expects an external database and a proxy network to exist already; a laptop usually wants
`local` instead, or a local variant of the dev compose file.

**Prod** builds the code into the image. Nothing is mounted, so a change means a new image and a
redeploy, which is the point.

In every profile the container itself is the same idea: nginx in front, the backend and the
frontend under supervisord, one process tree.

## Things that bite

- The repository ships `docker/configs/nginx-dev.conf.example` but not `nginx-dev.conf`, while
  the development Dockerfile copies the latter. Create it from the example before the first dev
  build.
- Menus and route metadata are decided when the frontend process starts (chapters 24 and 20), so
  in any profile a change to either needs a restart, not a reload.
- The queue profile is separate from the deployment profile: whether workers run inside the
  backend or in their own container is decided by the queue driver in configuration (chapter
  16).

## Common mistakes

- **Running the server's dev compose on a laptop.** It expects an external database and a proxy
  network.
- **Editing `docker-compose.yml` directly.** `manage.sh switch` overwrites it. Edit the profile
  file.
- **Switching a profile without restarting.** Nothing changes.
- **Expecting hot reload in `prod`.** The code is inside the image.

## Where to look

- `manage.sh` — switching, status, the interactive menu.
- `docker-compose.local.yml`, `.dev.yml`, `.prod.yml` — the three shapes.
- `docker/USAGE.md` and `docker/LITE-USAGE.md` — the container details.
