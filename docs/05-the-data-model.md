# 5. The data model

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`@typus-core/shared/dsl/types.ts`, `registry.ts`, `validator/DslValidator.ts`,
`prisma-generator/`, and the shipped models.**

A model is one TypeScript file. From it the engine produces a database table, a typed CRUD API,
TypeScript interfaces for both sides, validation, access rules and enough metadata to generate
screens. You never write a migration and you never touch the Prisma schema.

## Where a model lives

| Owner | Path |
|---|---|
| core module | `@typus-core/shared/dsl/models/<module>/<name>.model.ts` |
| plugin | `plugins/<plugin>/shared/dsl/<name>.model.ts` |

The file name is `kebab-case.model.ts`. It is found by scanning, so nothing needs to be added to
an index by hand.

## The shape

```ts
import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

export const InvoiceModel: DslModel = {
  name: 'Invoice',
  module: 'billing',        // underscores, never dashes
  tableName: 'invoices',    // lowercase
  generatePrisma: true,     // required, nothing is generated without it

  fields: [
    { name: 'id',        type: 'Int', primaryKey: true, autoIncrement: true },
    { name: 'number',    type: 'string', required: true, unique: true,
      validation: [{ type: 'required' }, { type: 'maxLength', value: 64 }],
      ui: { label: 'Invoice number', component: 'dxInput', visibility: ['table', 'form'] } },
    { name: 'amount',    type: 'decimal', required: true },
    { name: 'status',    type: 'string', required: true, default: 'draft' },
    { name: 'userId',    type: 'Int', required: true },
    { name: 'createdAt', type: 'datetime' },
    { name: 'updatedAt', type: 'datetime' }
  ],

  access: {
    create: ['admin'],
    read:   ['user', 'admin'],
    update: ['admin'],
    delete: ['admin'],
    count:  ['admin']
  },

  config: { timestamps: true }
};

registry.registerModel(InvoiceModel);
```

That file alone gives you the table `billing.invoices`, the API described in chapter 8, and the
generated interfaces.

## What is required

The validator (`pnpm db:validate-all`) treats these as errors:

- the model is registered with `registry.registerModel(...)`;
- `generatePrisma: true` is present;
- the fields `id`, `createdAt` and `updatedAt` exist (a junction model with a composite primary
  key is excused from `id`);
- an `access` object exists at all;
- `module` contains no dash.

These are warnings rather than errors, and worth fixing anyway: `config.timestamps: true`, a
complete set of five `access` operations, and a lowercase `tableName`.

## Field types

| Write this | You get |
|---|---|
| `string`, `text`, `email`, `url`, `uuid` | `String` |
| `int`, `Int` | `Int` |
| `float` | `Float` |
| `decimal` | `Decimal` |
| `boolean` | `Boolean` |
| `datetime`, `date` | `DateTime` |
| `json` | `Json` |

Anything the mapper does not recognise **silently becomes `String`**. A typo in a type does not
fail the build; it produces a column of the wrong type. Read the generated schema after adding a
field with an unusual type. The lookup is case sensitive, so `Int` and `int` both work while
`INT` does not, and there is no `enum` case at all: a field declared `type: 'enum'` becomes a
string column. Model an enumerated value as a `string` with a validation rule and enforce it in
the module's Zod schema.

The `validation` array on a field is **documentation, not enforcement**. Exactly one consumer
reads it, the Prisma field mapper, and only for `maxLength`, to size the column. Nothing applies
it on write. Validation that must actually hold belongs in the module's Zod schema
(chapter 12).

## The table name

The generator composes it as `<module>.<tableName>`, so `module: 'storage'` plus
`tableName: 'files'` becomes the table `storage.files`. Only the module named `core` is left
unprefixed. If `tableName` is omitted, the model name is snake-cased.

This is why raw SQL against Typus needs backticks around table names: the dot is part of the
name, not a schema separator.

## The optional blocks, and what they buy you

| Block | Effect | Chapter |
|---|---|---|
| `access` | who may perform each operation, by role name | 9 |
| `ownership` | automatic row filtering by an owner field | 9 |
| `events` | `afterCreate`, `afterUpdate`, `afterDelete` emit named events other code can subscribe to | 17 |
| `ui` on a field | label, component, and `visibility` among `table`, `form`, `detail` | 27 |
| `validation` on a field | **not enforced.** Only `maxLength` is read, to size the column. Real request validation is a Zod schema in the module | 12 |
| `config.timestamps` | `createdAt` and `updatedAt` maintained for you | |
| `relations` | see chapter 6 | 6 |

The `ui.visibility` array is not decoration: it is what lets a list, a form and a detail screen
be generated from the model without writing them.

## Registering, and the double-export idiom

The last line of the file must register the model. Many shipped models then re-export it under a
second name:

```ts
registry.registerModel(StorageFileModel);
export { StorageFileModel as StorageFile };
```

Both names are picked up, so the startup log shows the model registered twice, once per export.
It is harmless, but do not be surprised by it, and do not conclude that something is wrong.

## Common mistakes

- **A dash in `module`.** `my-plugin` must be `my_plugin`. The validator catches it; the API
  path and the table name both depend on it.
- **Forgetting `generatePrisma: true`.** No table is generated and the failure is quiet until
  the first query.
- **Forgetting `registry.registerModel(...)`.** The file is dead weight.
- **Missing `id`, `createdAt` or `updatedAt`.**
- **A misspelled field type.** It becomes `String` with no warning.
- **Editing the generated Prisma schema instead of the model.** See chapter 7.

## Where to look

- `@typus-core/shared/dsl/types.ts` — every option a model accepts.
- `@typus-core/shared/dsl/validator/DslValidator.ts` — the exact rules above.
- `@typus-core/shared/dsl/prisma-generator/FieldMapper.ts` — the type map.
- `@typus-core/shared/dsl/models/storage/storage-file.model.ts` — a complete real model.
