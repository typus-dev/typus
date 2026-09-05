# 27. Interfaces from the model

**Verified against engine 1.1.121 (build 2078) on 2026-09-05, by reading
`components/dsx/DynamicFields.vue`, `dsx/components/dsxBlockRendererWithContext.vue` and
`dsl/client/TypedDslModelClient.ts`.**

This is the payoff of the whole data chain. A model already knows the name, type, validation and
intended presentation of every field. The client can ask it. So a list, a form and a detail view
can be produced from the model rather than written by hand.

## Status: powerful, and thinner than it looks

Declaring the interface on the model is the most elegant idea in the engine, and it is also the
part that has proved most fragile in practice. It does what this chapter describes; what it does
not do is survive every screen you will want to build.

Treat it as a fast path for genuine CRUD, not as the default way to build interfaces. When a
screen starts needing exceptions, stop configuring and write it (chapter 26 says the same thing
from the other side).

## The mechanism

The typed client exposes three metadata calls (chapter 8):

```ts
await DSL.Invoice.getMetadata()                       // the whole model
await DSL.Invoice.getFields(['form'])                 // fields visible in a form
await DSL.Invoice.getField('status')                  // one field
```

`getFields` filters on the `ui.visibility` array you declared on each field:

```ts
{
  name: 'status',
  type: 'string',
  ui: {
    label: 'Status',
    component: 'dxSelect',
    visibility: ['table', 'form', 'detail']
  }
}
```

Three audiences, three screens: `table` for lists, `form` for create and edit, `detail` for a
read-only view. A field with no `visibility` array appears in none of them, and the renderer
logs that it skipped it.

## Rendering a set of fields

`DynamicFields` is the smallest complete example in the codebase. Give it a model and a
visibility, and it fetches the field definitions and renders the component each field asked for:

```vue
<DynamicFields model="Invoice" :visibility="['form']" />
<DynamicFields model="Invoice" :fieldNames="['number', 'amount']" />
```

It also picks up transformers from the surrounding block or page context, so a field can be
displayed differently in one place without changing the model.

## Inside a DSX block

The block renderer does the same thing at page scale. For a form block bound to a model it walks
the model's fields and, for each one:

1. skips the field unless `ui.visibility` includes `form`;
2. skips it if the block's `fieldFilter` list excludes it;
3. if the block declares a `fieldOverride` for it, uses that component, props, data source and
   `afterDataFetch`;
4. otherwise generates a component from `ui.component`, bound to the field by name.

Which gives the working rules for controlling a generated screen, in order of preference:

| You want | You change |
|---|---|
| a field to appear or disappear | `ui.visibility` on the model |
| a different input for a field | `ui.component` on the model |
| a different label | `ui.label` on the model |
| a subset of fields on one screen | `fieldFilter` on the block |
| one field rendered differently on one screen | `fieldOverrides` on the block |
| a value displayed differently | a transformer in the block or page context |

Reach for the model first: a change there fixes every screen at once. Reach for the block only
when the difference genuinely belongs to that screen.

## What is not generated

A field whose `ui.component` is missing produces a warning and no input. The generator does not
guess a component from the type, so a model intended to drive screens must carry `ui` on the
fields that matter.

Layout beyond the field list is yours: which blocks exist, how wide they are, what surrounds
them. The generation covers the repetitive middle, not the whole page.

## Common mistakes

- **Fields with no `ui.visibility`.** They silently do not appear anywhere.
- **Fields with no `ui.component`.** Warning, no input rendered.
- **Overriding on the block what should be fixed on the model.** The next screen has the same
  problem again.
- **Expecting the type alone to pick a component.** It does not.
- **Hand-writing a form that the model could have produced.** That is the velocity the engine
  was built for; a hand-written form also drifts from the model the first time a field changes.

## Where to look

- `@typus-core/frontend/src/components/dsx/DynamicFields.vue` — the mechanism in one small file.
- `@typus-core/frontend/src/dsx/components/dsxBlockRendererWithContext.vue` — the visibility,
  `fieldFilter` and `fieldOverrides` logic.
- `@typus-core/frontend/src/dsl/client/TypedDslModelClient.ts` — `getMetadata`, `getFields`,
  `getField`.
- Chapter 5 for `ui` on a field, chapter 26 for the block configuration around it.
