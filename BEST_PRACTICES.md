# Best practices

How to lay out an application built on Skeleto. The recommendations here are for the applications you build, not rules of the framework: Skeleto does not check them, and an application laid out differently starts just the same.

## Two levels

An application on Skeleto is described at two levels.

- **The technical level** is what Skeleto recognises and enforces: the markers `@Config`, `@Wrapper` and `@Action`, which kind may depend on which, the order in which components are created, and the wrapping of every action by every wrapper. A mistake at this level stops startup.
- **The architectural level** is what an application builds on top: entities, use cases, gateways. Skeleto does not know about any of them. A use case and a gateway are both `@Action` to it, and an entity is not a component at all.

It is a matter of mechanism versus policy: Skeleto provides the mechanism, and the policy, how the application divides its work, is yours. The rest of this file recommends one.

| Concept | Expressed as | What Skeleto checks |
| --- | --- | --- |
| Entity | a plain type and plain functions; no marker, not a component | nothing |
| Use case | `@Action` | the rules of an action; not that it is a use case |
| Gateway | `@Action` | the rules of an action; not that it is a gateway |
| Resource, such as a database or settings | `@Config` | the rules of a config |
| Cross-cutting concern, such as logging or transactions | `@Wrapper`, chosen per action by additional markers such as `@Transaction` | the rules of a wrapper, and the additional markers against `decorators` |

The code below is taken from the example in the [README](README.md#example), where it runs.

## One use case per file

A **use case** is an `@Action` that stands for one business operation of your application. Put each use case in its own file, named after it, and group the files of one entity or business area in a folder:

- `usecase/user/user_create.ts`
- `usecase/user/user_get.ts`
- `usecase/user/user_list.ts`
- `usecase/user/user_update.ts`
- `usecase/user/user_delete.ts`
- `usecase/user/user_reset_password.ts`

Do this for simple create, read, update and delete operations too. Nobody can say where "simple" ends and "complex" begins, so a rule with no exceptions is applied the same way by everyone, and a use case that grows never has to be moved to a file of its own.

Gateways (actions that reach a database or another service), wrappers and configs may be grouped: all the gateways of one technology can live in one file, for example.

The scan ignores file names and folders, so nothing breaks if you lay your files out differently. What the framework does enforce keeps use case names unique: two functions may not return the same type name.

## Entities hold the rules, use cases orchestrate

An **entity** is a plain type plus pure functions, in a file of its own. The functions hold the rules of the business: which values are valid, which changes of state are allowed, and the rules that involve several entities, such as moving stock from one warehouse to another. A function that changes an entity returns a new copy and never changes the one it was given. An entity is made only through its creating function, which validates it. An entity file carries no markers, so it adds nothing to the container.

A **use case** only orchestrates: it fetches entities through gateways, calls entity functions, and saves the results through gateways. It holds no business rule of its own, and it does not call another use case. When two use cases share a step, the shared rule belongs in an entity function and the shared access in a gateway.

The example in the [README](README.md#example) is laid out this way. The rule over two warehouses is a pure function of the entity:

```ts
// src/entity/warehouse.ts (excerpt)
export function transfer(from: Warehouse, to: Warehouse, units: number): Warehouse[] {
  if (from.id === to.id) throw new Error(`warehouse ${from.id} cannot send stock to itself`);
  if (!Number.isInteger(units) || units <= 0) throw new Error(`cannot move ${units} units`);
  if (from.units < units) throw new Error(`warehouse ${from.id} holds ${from.units} units, not ${units}`);
  return [create(from.id, from.units - units), create(to.id, to.units + units)];
}
```

and the use case fetches both warehouses, calls it, and saves what it returns:

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
  return async (ctx, { from, to, units }) => {
    const source = await findWarehouse(ctx, from);
    const target = await findWarehouse(ctx, to);
    const moved = Warehouse.transfer(source, target, units);
    await saveWarehouses(ctx, moved);
    return moved;
  };
```

Why plain types and pure functions rather than classes with methods:

- Data that comes from a database or over HTTP is already a plain object. A plain type takes it as it is; a class would need every gateway to turn it into an instance first.
- A change that returns a new copy leaves the old state intact. If saving fails and the transaction is rolled back, the entity you held before the change still matches what was stored.
- Pure functions are tested with inputs and outputs alone: no gateway, no container, no stand-in for either.
- Importing an entity's file as a namespace (`import * as Warehouse from "../../entity/warehouse.js"`, then `Warehouse.transfer(source, target, units)`) makes its functions as easy to find as methods: type `Warehouse.` and the editor lists them.

Skeleto still lets an action depend on another action, and this recommendation does not change that: gateways may use it, for instance a gateway built from other gateways. The recommendation only keeps use cases from depending on one another.
