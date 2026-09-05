# 32. Install and update

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `setup/`, the startup
scripts and the snapshot builder.**

## The quick start

```bash
git clone https://github.com/typus-dev/typus.git
cd typus
docker compose up -d --build
# http://localhost:3000
```

No external database, no proxy, no `.env` required. It works because the shipped
`docker-compose.yml` is the local profile and because everything the database needs is derived
at boot: the schema is generated from the models and pushed, then the baseline data is applied
(chapters 7 and 10).

To start over: `docker compose down -v` removes the volumes along with the containers.

## A real installation

`setup/` holds the entry points:

| Script | Does |
|---|---|
| `quickstart.sh` | the fastest path to a running instance |
| `install.sh` | a full installation: environment, database, first boot |
| `update.sh` | updating an existing installation |
| `manage-lite.sh` | operating the single-container shape |

For domains, TLS, an external database, backups and rollback, `PRODUCTION.md` in the repository
root is the guide, and `RELEASE_CHECKLIST.md` is the maintainer's counterpart.

## What happens on first boot

In order, and all of it automatic: the database URL is composed from the provider and
credentials, the model index, interfaces, Prisma schema and client are generated, the schema is
pushed, and the server starts. Chapter 3 has the full sequence, chapter 7 the schema details.

The practical consequence is that a first boot takes longer than a restart, and that a failure
during generation stops the container rather than leaving a half-configured application running.

## Updating

`setup/update.sh` fetches the new release and prepares the change, writing proposed
configuration as `.env.update` and `docker-compose.yml.update` rather than overwriting what you
have. Reviewing and merging those two files is a manual step by design: your environment
contains values the release cannot know.

The script self-updates the setup scripts from the release, so the next update runs the newer
version of the procedure.

Two habits that make updates boring, which is what you want:

- Keep local changes out of the engine. Anything under `custom/` or in a plugin survives an
  update untouched; a patch inside `@typus-core` does not (chapter 30).
- Back up the database before an update that changes the schema. Backups are a
  scheduled task, not a script: see chapter 16 for the row that configures them, where the files
  land, and the retention policy. The development boot path
  pushes the schema with data loss accepted (chapter 7).

## Verifying an installation

- `/api/health` answers 200 once the backend is listening.
- The startup statistics table shows modules loaded and zero errors (chapter 18).
- The login page loads, and the default administrator from the baseline data can sign in
  (chapter 10).

## Common mistakes

- **Merging `.env.update` blindly.** It is a proposal, not the new truth.
- **Updating with local edits inside the engine.** They are gone.
- **Assuming a failed boot left the database untouched.** The schema push runs before the server
  starts.
- **Skipping the backup.**

## Where to look

- `setup/` — the four scripts.
- `PRODUCTION.md` — domains, TLS, external database, backups, rollback.
- `README.localhost.md` — the laptop path in detail.
