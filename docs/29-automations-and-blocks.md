# 29. Automations and blocks

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`plugins/workflow/backend/services/CodeExecutor.ts` and `WorkflowExecutionEngine.ts`.**

A workflow is a graph of blocks; a block is a piece of JavaScript run by the engine in a
sandbox. It is how a sequence of steps becomes something you can rearrange without a deploy.

## Where a block's code actually lives

**On disk, not in the database.**

```
storage/workflows/<workflowId>/<blockId>.js
```

The definition row in the database holds only block metadata: id, name, type, position. The
executable body is a file, loaded per execution. Editing that file **is** editing live
behaviour: no rebuild, no database write.

This matters for a search that otherwise wastes an afternoon: grepping a database dump for a
prompt or a piece of logic finds hits, but they are runtime snapshots inside the execution log,
not the source. To find the real code, map the workflow name to its id in the definitions table,
then open the file.

Because the disk and the row are separate, they can drift. The engine reads wiring from the row
and code from the file; keep both under version control.

## Connections

The execution engine reads `source` and `target` on each connection. Some older seed data uses
`from` and `to`, and those chains silently pass no data. When you create a workflow through the
API, write:

```json
"connections": [{ "id": "c1", "source": "a", "target": "b", "type": "default" }]
```

## What a block can reach

The sandbox provides, among others:

| Name | Use |
|---|---|
| `input`, `context` | what the workflow passed in |
| `prisma` | the database client, directly |
| `callSml` | the data operations, with the block vocabulary of chapter 8 |
| `callClaude` | a language model, with the key read from configuration |
| `httpRequest`, `axios` | outbound HTTP |
| `saveToStorage`, `writeFile`, `readFile` | files |
| `sendEmail` | mail |
| `generateEmbedding`, `cosineSimilarity` | vectors |
| `dslRegistry` | the model definitions |

Execution is bounded by a timeout.

## Three limits to design around

**`httpRequest` has no `responseType`.** It builds its request without one, so a binary body
comes back mangled. A block therefore cannot fetch an image from storage. There is no
`readFromStorage` in the sandbox either, only `saveToStorage`. If a block needs existing bytes,
the caller must pass them in, base64 encoded, through the workflow input.

That has a sharp edge: because the caller is the only source of those bytes, a failed fetch on
the caller's side ships an empty value and the block runs anyway with nothing. Make the caller
fail loudly rather than defaulting to an empty string.

**A relative `/api/` URL points at the wrong host.** `httpRequest` prefixes relative API paths
with a configured backend URL that is the host-side port, unreachable from inside the container.
Use the internal address explicitly. `httpRequest` also does not attach authentication; for
engine data, prefer `callSml`, which goes through Prisma.

**A value passed into a block is written back onto the row.** If you pass a field in, pass the
real one. Passing an empty placeholder overwrites the stored value with the placeholder.

## The engine already records executions

Every run writes a row to the executions table and one row per block with its input, output,
status, error, timestamps and duration. Before building a custom trace for a feature, look at
what is already recorded: a homegrown per-job trace was built once and rolled back because half
of it duplicated these tables.

Know their limits too: rows are not indexed by your domain id, one row covers a whole block run
rather than each item inside it, there are no cost fields, and anything that happens outside the
workflow engine is not recorded at all.

## Common mistakes

- **Looking for block code in the database.** It is on disk.
- **`from` and `to` instead of `source` and `target`.**
- **Expecting a block to load a stored file.** Pass the bytes in.
- **A relative `/api/` URL inside a block.**
- **Passing an empty string for a field you did not mean to change.**
- **Building your own execution log before reading the engine's.**

## Where to look

- `plugins/workflow/backend/services/CodeExecutor.ts` — the sandbox, exactly as listed above.
- `plugins/workflow/backend/services/WorkflowExecutionEngine.ts` — how a block's file is found
  and run.
- `plugins/workflow/worklog/` — the design history, as history, not as contract.
