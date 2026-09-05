# 6. Relations

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`@typus-core/shared/dsl/types.ts`, `prisma-generator/RelationGenerator.ts` and
`validator/DslValidator.ts`.**

Relations are declared on the model, in a `relations` array, and the generator turns them into
Prisma relations and foreign keys. The generator is deliberately strict: it refuses to guess.
A malformed relation throws during generation, which happens **before the server starts**, so
the container stops with a message naming the model and the relation. That is the good case.

## The four kinds

| `type` | Meaning | Requires |
|---|---|---|
| `belongsTo` | this row points at one row of the target | `foreignKey`, and the field must also be declared in `fields` |
| `hasMany` | the target rows point back at this one | `inverseSide` |
| `hasOne` | as `hasMany`, but a single row | `inverseSide` |
| `manyToMany` | a junction table between the two | `inverseSide`, optionally `through` |

`one` and `many` are accepted as legacy aliases of `hasOne` and `hasMany`. Do not use them in
new models.

## belongsTo

```ts
fields: [
  { name: 'id',     type: 'Int', primaryKey: true, autoIncrement: true },
  { name: 'userId', type: 'Int', required: true },   // the foreign key, declared explicitly
  { name: 'createdAt', type: 'datetime' },
  { name: 'updatedAt', type: 'datetime' }
],

relations: [
  {
    name: 'user',
    type: 'belongsTo',
    target: 'AuthUser',
    foreignKey: 'userId',       // required, the generator will not invent it
    inverseSide: 'invoices'     // the name of the other side
  }
]
```

Two rules, both enforced with a thrown error rather than a warning:

1. `foreignKey` must be given. The message reads: *MUST specify foreignKey. Add
   `foreignKey: "fieldName"` to the relation definition.*
2. The field named by `foreignKey` must exist in `fields`. Declaring the relation without
   declaring the column is the most common failure.

## hasMany and hasOne

The other side of the pair. It carries no foreign key of its own; the key lives on the model
that belongs to it.

```ts
relations: [
  { name: 'invoices', type: 'hasMany', target: 'Invoice', inverseSide: 'user' }
]
```

`inverseSide` is what names the relation on both ends. Give it on both sides and give it the
matching names, or Prisma will see two unrelated relations between the same pair of models.

## manyToMany

Either let the generator create the junction model for you, or declare it:

```ts
relations: [
  {
    name: 'tags',
    type: 'manyToMany',
    target: 'CmsTag',
    inverseSide: 'items',
    through: {
      model: 'CmsItemTag',   // the junction model
      sourceKey: 'itemId',
      targetKey: 'tagId'
    }
  }
]
```

A junction model is an ordinary model with a composite primary key. Because of that it is
excused from having an `id` field, but it still needs `createdAt` and `updatedAt`.

## Loading related rows

Nothing is loaded unless you ask. The `include` argument carries relation names:

```ts
const user = await DSL.AuthUser.findById(1, ['roles'])
const list = await DSL.Invoice.findMany({ status: 'open' }, ['user'])
```

Over HTTP the same thing is `"include": ["user"]`. See chapter 8.

## Checking your work

- `pnpm db:validate-all` in `@typus-core/shared` validates every registered model, including the
  relation rules above.
- The generator also detects cyclic dependencies between models and reports the cycle.
- After a change, read the generated Prisma schema. A relation that generated cleanly is visible
  there as an `@relation` attribute with the fields and references you expect.

## Common mistakes

- **Omitting `foreignKey` on `belongsTo`.** Hard error at generation time.
- **Naming a `foreignKey` that is not in `fields`.** Hard error, and the message says which
  field is missing.
- **Giving `inverseSide` on one end only.** The relation generates, but the two ends are not
  paired, and Prisma treats them as separate relations.
- **Expecting the generator to add the column for you.** It never adds a field you did not
  declare.
- **Copying a relation between models without renaming `inverseSide`.** Two relations claiming
  the same name on the target is a confusing failure.

## Where to look

- `@typus-core/shared/dsl/types.ts` — `DslRelation`, including `through`.
- `@typus-core/shared/dsl/prisma-generator/RelationGenerator.ts` — the rules and the exact error
  messages.
- `@typus-core/shared/dsl/models/auth/` — real paired relations between users and roles.
