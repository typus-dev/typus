# Typus — Release Checklist

This is a **short**, practical checklist for releasing Typus and rolling it out safely.

> Goal: build → gate → smoke → publish → canary → demo → prod

---

## 0) Decide the release

- Pick `X.Y.Z` (SemVer)
- Write release notes (what changed + breaking changes)
- Verify public metadata is correct (LICENSE, repo URLs, demo URLs)

---

## 1) Build (fresh)

- From a clean checkout, run the default install path:
  - `docker compose up -d --build`
- Confirm health:
  - `curl -fsS http://localhost:3000/health`
  - `curl -fsS http://localhost:3000/api/health`
- Basic UI sanity: open `/admin`, login, create one record, logout.

---

## 2) Gate (no secrets / no junk)

- Ensure no secrets or private directories are included:
  - no `.env`, no tokens, no internal `work-log/`
- Ensure generated files required for runtime are present (DSL + Prisma client).

If you use the server build pipeline, this corresponds to the “gate” step before syncing/publishing.

---

## 3) Smoke (installation from GitHub)

- On a clean machine (or disposable folder):
  - `git clone https://github.com/typus-dev/typus`
  - `docker compose up -d --build`
  - confirm `/api/health` is OK
- Confirm there are no “dirty” warnings in the console (compose noise, missing networks, etc.).

---

## 4) Publish (GitHub)

- Tag the version `vX.Y.Z`
- Push the tag
- Create GitHub Release with release notes (optional: attach release archive)

---

## 5) Canary → Demo → Prod

- Canary: deploy to an internal test environment first, monitor logs + errors.
- Demo: deploy to `demo.typus.dev`, run a short manual test pass.
- Prod: deploy to `typus.dev` only after demo looks clean.

Rollback plan (minimum):
- keep DB backups
- keep the previous working image/tag and/or site snapshot

