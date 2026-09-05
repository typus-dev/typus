# 33. Releasing

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading `release-system/`,
`release.sh`, `build-lite-snapshot-v2.ts`, `release-gate.sh` and `sync-to-github.sh`.**

A release turns the working tree into a clean snapshot, checks it, and pushes it to the public
mirror. Everything is driven from `release-system/`, and nothing is published by hand.

## The pipeline

```
dev.typus.dev  ->  dist/lite-snapshot  ->  gate  ->  typus-github  ->  GitHub
                                                          |
                                                   demo / production
```

## The commands

```bash
cd release-system
./release.sh                 # interactive
./release.sh --patch         # 1.1.121 -> 1.1.122
./release.sh --minor         # 1.1.121 -> 1.2.0
./release.sh --major
./release.sh --docker-build
./release.sh --deploy demo   # or prod
./release.sh --rollback prod 1.1.120
./release.sh --publish-github
```

The version lives in `dev.typus.dev/typus-manifest.json` and nowhere else. A bump rewrites it,
increments the build number, and tags.

## What the snapshot builder does

More than copying, and knowing this explains several details of the shipped product:

1. **Generates first.** It runs the whole DSL chain in the source tree before copying, so the
   snapshot contains generated interfaces. If generation fails, the build stops.
2. **Copies by whitelist.** Core files and directories are listed explicitly; `src` is copied
   without `modules`, and the modules are then added from a hand-maintained list.
3. **Rewrites for the public shape.** Package scripts are switched from pnpm to npm, and two
   npm-based Dockerfiles are written from templates inside the builder.
4. **Cleans runtime state.** Storage subdirectories are recreated empty, generated Prisma output
   is removed, migration bookkeeping is stripped from the manifest so the snapshot installs as a
   fresh system.
5. **Sanitises baseline data.** Dump directives are stripped and an idempotent delete is inserted
   (chapter 10).
6. **Ships an empty `plugins/`.** The public release is the core (chapter 4).
7. **Packs.** A tarball, a checksum, and a `latest` copy.

## The gate

`scripts/release-gate.sh` runs five checks before anything is published:

| Check | Fails the build when |
|---|---|
| dependency audit | a high or critical vulnerability is present |
| secret scan | a token, key or private key pattern appears outside examples and documentation |
| forbidden files | an `.env`, a dump, a source map, `work-log/`, videos or a token file reached the snapshot |
| required files | a compose file, the env example, a Dockerfile or the manifest is missing |
| smoke, optional | `--smoke` starts the snapshot with Docker on free ports and waits for the health endpoint |

Run it with `--smoke` before a real release. It is the only check that proves the snapshot boots
on a clean machine.

## Publishing

`sync-to-github.sh` mirrors the staging directory into `typus-github` with rsync and `--delete`,
commits, and creates an annotated tag. The push is deliberately manual. `publish-github.sh` can
push over HTTPS with a token file when that is what you want.

Never edit `typus-github/` directly: the next sync deletes anything that is not in the snapshot.

## Two things to fix before the next release

Both were found by reading the scripts, and both would bite immediately.

- **The helper scripts carry absolute paths from the old server.** `release-gate.sh`,
  `sync-to-github.sh`, `publish-github.sh` and the sanity test hardcode a directory that no
  longer exists, so they fail at once on the current machine. `release.sh` itself resolves paths
  relative to its own location and survives, but its deployment targets are hardcoded too.
- **The module lists in the builder have drifted.** Several names no longer exist in the core,
  and the builder silently skips what it cannot find, so the generated README overstates what
  ships (chapter 4).

## Common mistakes

- **Editing the public mirror.** Generated output.
- **Publishing without the smoke check.**
- **Bumping the version by hand.** The manifest is rewritten by the script.
- **Assuming the tarball and the mirror can differ.** They are built from the same staging
  directory on purpose.

## Where to look

- `release-system/RELEASE-PROCESS.md` — the original process document.
- `release-system/release.sh` — the driver.
- `release-system/src/cli/build-lite-snapshot-v2.ts` — everything in the list above.
- `release-system/scripts/` — the gate, the sync and the publish helpers.
