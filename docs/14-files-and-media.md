# 14. Files and media

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`modules/storage/services/StorageService.ts` and
`shared/dsl/models/storage/storage-file.model.ts`.**

Files are rows plus bytes. The row lives in `storage.files` as an ordinary model, so everything
in chapters 5, 8 and 9 applies to it; the bytes live with a storage provider, currently local
disk.

## The model

`StorageFile` carries `originalName`, `fileName`, `mimeType`, `size`, `storageProvider`
(default `LOCAL`), `storagePath`, `publicUrl`, `visibility` (default `PRIVATE`), `userId`,
`moduleContext`, `contextId`, `tags`, `description`, `status`, `expiresAt` and the timestamps,
with soft delete enabled. The id is a string, not an integer.

Its declared rules:

```ts
access:    { create: ['user','admin'], read: ['user','admin','anonymous'],
             update: ['user','admin'], delete: ['user','admin'], count: ['admin'] }
ownership: { field: 'userId', autoFilter: true, operations: ['update','delete'],
             adminBypass: true }
```

`moduleContext` and `contextId` are how a feature tags its own files: set them on upload and you
can list exactly the files belonging to one record later.

## The service

| Method | Does |
|---|---|
| `saveFileWithMetadata` | writes the bytes and creates the row |
| `getUserFiles` | lists a user's files |
| `getFileById` | returns `{ buffer, mimeType }` for serving |
| `updateFileMetadata` | renames, retags, changes visibility |
| `deleteFileById` | soft deletes |
| `generatePublicUrl` | a URL for a file marked public |
| `saveFaviconWithVariants` | the favicon special case |

`getFileById` is the one to reach for from a service that needs the bytes, for example to hand
an image to a model. It works from ordinary backend code; it is **not** available inside a
workflow block, which is a real constraint on automations (chapter 29).

## Uploading and serving

Upload is multipart. The response is shaped `{ success, file: { id } }`, so build the URL from
`file.id`.

```ts
const { data } = await useApi('/storage/upload')
  .post(formData, { headers: { 'Content-Type': 'multipart/form-data' } })
```

Serving is `GET /api/storage/:fileId` and it requires the authorization header. A browser does
not attach that header to an `<img src>`, so a raw image tag pointing at a protected file renders
blank. Use `dxSecureAsset` (chapter 21).

## Permissions, and the trap

Access to a file is decided as *the caller may read it* or *the caller owns it* or *it is
public*. The first branch relies on the caller's abilities being resolved on the request-context
user, which does not happen reliably in this path, so an administrator asking for another user's
file can fall through to 403.

On the interface that looks like a broken image rather than a permission problem, because
`dxSecureAsset` renders its error state where the picture should be. When an admin sees a red
placeholder and the file exists, suspect this rather than the file.

The fix is the same array-aware role check as everywhere else (chapter 13), and it is still
outstanding in the engine.

## Common mistakes

- **A raw `<img>` on `/api/storage/<id>`.** Blank.
- **Assuming an admin can read every file.** See above.
- **Expecting a workflow block to load a stored file.** It cannot; pass the bytes in.
- **Ignoring `moduleContext` and `contextId` on upload.** Later you will want them and they will
  be empty.
- **Treating the file id as a number.** It is a string.

## Where to look

- `modules/storage/services/StorageService.ts` — every method above.
- `shared/dsl/models/storage/storage-file.model.ts` — the model and its rules.
- Chapter 21 for `dxSecureAsset`, chapter 9 for ownership.
