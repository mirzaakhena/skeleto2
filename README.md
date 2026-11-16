# Skeleto

Skeleto wires up an application made of plain functions. You mark a function with `@Config`, `@Wrapper` or `@Action` in its JSDoc comment; Skeleto reads the TypeScript sources, works out which function needs which, calls each one once with its dependencies, puts every wrapper around every action, and hands you the results in a container.

## What it does, and what it leaves out

It does **binding only**:

- It scans every `.ts` file below one directory for marked, exported, top-level functions, except the files and folders on its [exclusion list](#files-the-scan-leaves-out).
- The **name** of a component is its return type, exactly as written (`StockTransfer`, `winston.Logger`); a config written `Promise<Database>` is [asynchronous](#asynchronous-configs) and is named `Database`. Its **dependencies** are the types of its parameters, in order. Nothing else is read: Skeleto never opens a type definition.
- Every mistake (a missing dependency, a cycle, a misspelled marker, two functions returning the same type, ...) is reported at startup, all in one error, before any of your files is imported.

It deliberately does **not** know about HTTP, routing, validation, OpenAPI, databases or logging. Anything of that sort belongs to your application, usually as a wrapper or as code that reads the container. Its only runtime dependency is `ts-morph`.

## The three kinds

| Marker | What the function returns | May depend on |
| --- | --- | --- |
| `@Config` | anything: settings, a client, a logger; or a promise of it, which startup waits for | `@Config` |
| `@Wrapper` | a function that takes an action and returns the action to use instead | `@Config` |
| `@Action` | an async function `(ctx, input) => result` | `@Config`, `@Action` |

Any other dependency, and any circular one, stops startup. Configs are created first, then wrappers, then actions.

## Example

The example moves stock from one warehouse to another. It follows the split recommended in [Entities hold the rules, use cases orchestrate](#entities-hold-the-rules-use-cases-orchestrate).

The entity. A plain type and pure functions, with no marker: Skeleto reads the file like any other, finds no marked function, and makes no component of it.

```ts
// src/entity/warehouse.ts
export type Warehouse = { readonly id: string; readonly units: number };

/** The only way to make a warehouse: it refuses values the business does not allow. */
export function create(id: string, units: number): Warehouse {
  if (id === "") throw new Error("a warehouse needs an id");
  if (!Number.isInteger(units) || units < 0) throw new Error(`warehouse ${id} cannot hold ${units} units`);
  return { id, units };
}

/** A rule over two entities. It returns new copies of both and leaves the warehouses it was given as they were. */
export function transfer(from: Warehouse, to: Warehouse, units: number): Warehouse[] {
  if (from.id === to.id) throw new Error(`warehouse ${from.id} cannot send stock to itself`);
  if (!Number.isInteger(units) || units <= 0) throw new Error(`cannot move ${units} units`);
  if (from.units < units) throw new Error(`warehouse ${from.id} holds ${from.units} units, not ${units}`);
  return [create(from.id, from.units - units), create(to.id, to.units + units)];
}
```

Configs. Each is called once, and its result is passed to whoever asks for its type. `connectDatabase` is asynchronous: it is declared `Promise<Database>`, so its component is `Database`, startup waits for it, and the gateways below receive the finished database, not a promise.

```ts
// src/config.ts
import * as Warehouse from "./entity/warehouse.js";

export type Database = Map<string, Warehouse.Warehouse>;
export type Logger = (line: string) => void;

/** @Config */
export async function connectDatabase(): Promise<Database> {
  // Stands in for something slow: a connection that has to be opened first.
  await new Promise((resolve) => setTimeout(resolve, 10));
  return new Map([
    ["north", Warehouse.create("north", 10)],
    ["south", Warehouse.create("south", 0)],
  ]);
}

/** @Config */
export function makeLogger(): Logger {
  return (line) => console.log(line);
}
```

Gateways. They are actions that reach the database, and the gateways of one technology may share a file.

```ts
// src/gateway/database.ts
import type { ActionHandler } from "skeleto";
import type { Database } from "../config.js";
import type { Warehouse } from "../entity/warehouse.js";

export type FindWarehouse = ActionHandler<string, Warehouse>;
export type SaveWarehouses = ActionHandler<Warehouse[], void>;

/** @Action */
export function makeFindWarehouse(database: Database): FindWarehouse {
  return async (ctx, id) => {
    const found = database.get(id);
    if (!found) throw new Error(`no warehouse ${id}`);
    return found;
  };
}

/** @Action */
export function makeSaveWarehouses(database: Database): SaveWarehouses {
  return async (ctx, warehouses) => {
    for (const warehouse of warehouses) database.set(warehouse.id, warehouse);
  };
}
```

The use case. It has its own file, in the folder of its business area (see [One use case per file](#one-use-case-per-file)), and asks for the gateways simply by naming their types. It fetches, calls the entity's rule and saves; the rule itself is not in it.

It also carries two **additional markers**, `@Transaction` and `@Audit`: Skeleto gives them no meaning, it only records them, with their data, for wrappers and for your own code to read.

```ts
// src/usecase/stock/stock_transfer.ts
import type { ActionHandler } from "skeleto";
import * as Warehouse from "../../entity/warehouse.js";
import type { FindWarehouse, SaveWarehouses } from "../../gateway/database.js";

export type StockTransfer = ActionHandler<{ from: string; to: string; units: number }, Warehouse.Warehouse[]>;

/**
 * Moves units of stock from one warehouse to another.
 *
 * @Action
 * @Transaction
 * @Audit {"level": "info"}
 */
export function makeStockTransfer(findWarehouse: FindWarehouse, saveWarehouses: SaveWarehouses): StockTransfer {
  return async (ctx, { from, to, units }) => {
    const source = await findWarehouse(ctx, from);
    const target = await findWarehouse(ctx, to);
    const moved = Warehouse.transfer(source, target, units);
    await saveWarehouses(ctx, moved);
    return moved;
  };
}
```

Wrappers. **Every** wrapper is offered **every** action, together with the action's metadata. A wrapper that returns the handler it was given leaves that action alone. The wrapper with the larger `ordinal` ends up further outside; without one the `ordinal` is `0`, and wrappers with equal ordinals are layered by name, the later name outside.

```ts
// src/wrappers.ts
import type { WrapperHandler } from "skeleto";
import type { Logger } from "./config.js";

export type LogWrapper = WrapperHandler;
export type TransactionWrapper = WrapperHandler;

/** @Wrapper {"ordinal": 10} */
export function makeLogWrapper(log: Logger): LogWrapper {
  return (handler, metadata) => async (ctx, input) => {
    log(`enter ${metadata.name}`);
    try {
      return await handler(ctx, input);
    } finally {
      log(`leave ${metadata.name}`);
    }
  };
}

/** @Wrapper */
export function makeTransactionWrapper(log: Logger): TransactionWrapper {
  return (handler, metadata) => {
    // Only actions marked @Transaction get this layer.
    if (!metadata.additionalDecorators.some((marker) => marker.name === "Transaction")) return handler;
    return async (ctx, input) => {
      log("begin");
      const result = await handler(ctx, input);
      log("commit");
      return result;
    };
  };
}
```

Starting it and reading the container. `decorators` lists the additional markers you allow, so that a typo such as `@Transction` stops startup instead of silently doing nothing; leave it out and every additional marker is accepted.

```ts
// main.ts
import { Skeleto, newContext } from "skeleto";
import type { StockTransfer } from "./src/usecase/stock/stock_transfer.js";

const skeleto = await Skeleto.start("src", { decorators: ["Transaction", "Audit"] });
const container = skeleto.getContainer();

const stockTransfer: StockTransfer = container.get("StockTransfer")!.getInstance();
console.log(await stockTransfer(newContext(), { from: "north", to: "south", units: 3 }));

for (const [name, component] of container) {
  const { mainDecorator, dependencies, additionalDecorators } = component.getMetadata();
  console.log(`${name}: @${mainDecorator.name}`, JSON.stringify({ dependencies, additionalDecorators }));
}
```

```sh
npx tsx main.ts
```

```text
enter StockTransfer
begin
enter FindWarehouse
leave FindWarehouse
enter FindWarehouse
leave FindWarehouse
enter SaveWarehouses
leave SaveWarehouses
commit
leave StockTransfer
[ { id: 'north', units: 7 }, { id: 'south', units: 3 } ]
Database: @Config {"dependencies":[],"additionalDecorators":[]}
Logger: @Config {"dependencies":[],"additionalDecorators":[]}
LogWrapper: @Wrapper {"dependencies":["Logger"],"additionalDecorators":[]}
TransactionWrapper: @Wrapper {"dependencies":["Logger"],"additionalDecorators":[]}
FindWarehouse: @Action {"dependencies":["Database"],"additionalDecorators":[]}
SaveWarehouses: @Action {"dependencies":["Database"],"additionalDecorators":[]}
StockTransfer: @Action {"dependencies":["FindWarehouse","SaveWarehouses"],"additionalDecorators":[{"name":"Transaction"},{"name":"Audit","data":{"level":"info"}}]}
```

The output shows the layering: `LogWrapper` (ordinal 10) is outside `TransactionWrapper` (ordinal 0), the gateways were left alone by the transaction wrapper, and the gateways that `StockTransfer` received are the wrapped ones. The entity's functions are not in the container.

## One use case per file

This is a recommendation for the applications you build. Skeleto does not check it.

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

This is a recommendation for the applications you build, as the previous one is. Skeleto does not check it.

An **entity** is a plain type plus pure functions, in a file of its own. The functions hold the rules of the business: which values are valid, which changes of state are allowed, and the rules that involve several entities, such as moving stock from one warehouse to another. A function that changes an entity returns a new copy and never changes the one it was given. An entity is made only through its creating function, which validates it. An entity file carries no markers, so it adds nothing to the container.

A **use case** only orchestrates: it fetches entities through gateways, calls entity functions, and saves the results through gateways. It holds no business rule of its own, and it does not call another use case. When two use cases share a step, the shared rule belongs in an entity function and the shared access in a gateway.

The example above is laid out this way. The rule over two warehouses is a pure function of the entity:

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

## Rules worth knowing

- A component must be an exported top-level `function` declaration with a return type annotation, and every parameter needs a type annotation. Arrow functions and methods are not picked up. A marked function that is a default export is a mistake, not something skipped: only a named `export` counts, and startup says so.
- One component per type name. To offer two things of the same shape, give each its own type alias, as `LogWrapper` and `TransactionWrapper` do above.
- A marker starts its line inside the JSDoc block. Text after it is its data: JSON when it starts with `{`, otherwise plain text. `@Config` and `@Action` take no data; `@Wrapper` takes none or `{"ordinal": <integer>}`. Any tag that starts with a lowercase letter (`@param`, `@returns`, `@example`, ...) is a standard JSDoc tag and is ignored.
- **Where markers go.** Write the description first, then the markers, one per line, with nothing after a marker but its data. Data runs on to the next marker, so a sentence written after a marker becomes that marker's data: after `@Action` that stops startup (it takes no data), and after an additional marker such as `@Audit` it silently becomes the data of that marker. For the same reason a line inside an `@example` body that starts with a main marker is read as a real marker and turns that function into a component; do not begin an example line with `@Config`, `@Wrapper` or `@Action`.
- Pass `decorators` to catch markers that are misspelt or misplaced. Without it, a function with no main marker is not looked at, so a wrapper marked `@Wraper` is skipped and every action runs without it. With it, these stop startup, each naming the function or constant, its file and the marker:
  - a top-level function whose JSDoc block has markers but no main marker (`@Wraper`, `@Actions`, or only `@Transaction`);
  - a lowercase tag on any top-level function that equals a main marker or one of your markers when letter case is ignored (`@transaction`, `@action`, `@wrapper`);
  - a main marker on an exported top-level constant or on a function inside a namespace: only top-level function declarations can be components.
- `Skeleto.start(directory)` defaults to `"src"` and gives one instance per directory: a second call for the same directory returns the first instance, and its options are ignored. A failed start is not remembered.
- **Retrying a failed start.** A failed start does not undo what it already did: configs created before the failure stay alive, and their connections stay open. The next `Skeleto.start` scans again and creates those configs again. A loop that retries `start` can therefore leak connections; give a config that opens something a way to be closed, or restart the process instead of retrying.
- **Type names are matched exactly as written.** `Map<string,number>` and `Map<string, number>` are two different names, so a dependency spelt one way does not find a component spelt the other way; it is reported as a missing dependency. Copy the spelling, or give the type an alias and use that.
- The container holds every component, configs and wrappers included, under its type name.

## Asynchronous configs

Some things are usable only after an asynchronous start: a database connection, a cache client, a secret kept elsewhere. Write such a config with the return type `Promise<X>`, as `connectDatabase` does above:

- Its component is `X`. Whoever needs it names the plain type `X` and receives the finished value; nobody gets a promise. The container lists it under `X` as well, with the finished value as its instance.
- Startup waits for it before it creates anything that depends on it. It is still called once only, however many components need it, and they all receive the same instance. Configs are waited for one after another, not side by side.
- A config that fails (its promise is rejected) stops startup, exactly as a config that throws does: the error names the component and its function and carries the original error as its `cause`. Nothing after it is created.
- **Startup sets no time limit.** It waits for as long as the config does, so a config that never finishes keeps `Skeleto.start` pending for ever. Give the config its own timeout, usually the connect timeout of the client it creates.
- Only a `@Config` may be asynchronous. A `@Wrapper` or an `@Action` whose return type is `Promise<...>` is a mistake, reported at startup with the others. (An action's *handler* is asynchronous as always; the function that creates it is not.)
- The rule goes by what is written, like every other: only a return type spelled `Promise<...>` counts. A config declared with an alias of a promise, or `PromiseLike<X>`, keeps that name and its result is stored as it is.
- `X` and `Promise<X>` are the same name, so two configs returning them are two functions returning the same type.

## Files the scan leaves out

Without further word, the scan skips what `DEFAULT_EXCLUDE` lists:

| Entry | What it leaves out |
| --- | --- |
| `node_modules` | every folder of that name, with all it holds |
| `*.d.ts` | declaration files, whose functions have no body to call |
| `*.test.ts` | test files |
| `*.spec.ts` | test files |

The `exclude` option **replaces** that list; it is not added to it. Import `DEFAULT_EXCLUDE` from `skeleto` to keep the defaults and add your own, as in `Skeleto.start("src", { exclude: [...DEFAULT_EXCLUDE, "generated"] })`. Pass `exclude: []` to scan everything.

An entry takes one of two forms:

- **A name**, such as `generated` or `legacy.ts`: a folder or a file of exactly that name, at any depth. An excluded folder is not entered at all.
- **`*` and an ending**, such as `*.gen.ts`: every file whose name ends that way. It never matches a folder.

Names are compared exactly, upper and lower case included, and only below the directory you start: that directory itself is always scanned, even when its own path contains an excluded name, as in `Skeleto.start("node_modules/some-package/src")`.

Anything else is a mistake that stops startup like the others, naming the entry: a path (`generated/models`), a `*` that is not the first character (`foo*`, `*.test.*`, `**/x`), a lone `*`, and an empty string. Full glob syntax is not supported.

A directory in which every `.ts` file is excluded is reported like a directory without `.ts` files.

## Runtime

Skeleto imports your `.ts` files as they are; it does not compile them. The application therefore has to run under something that can load TypeScript, such as [`tsx`](https://tsx.is), in development and in production alike. Pointing Skeleto at compiled `.js` output does not work: it looks for `.ts` files only.

Node keeps a module that failed to load for as long as the process lives, so after fixing a file that threw while being imported, restart the process instead of calling `start` again.
