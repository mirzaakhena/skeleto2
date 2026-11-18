# Technical practices

How to use Skeleto's mechanism well: the shape of a component, its names, its markers, its wrappers, transactions carried by the context, the container and the tests. These are rules for the applications you build, not rules of the framework; most of them Skeleto does not check.

The [README](README.md) is the reference for what Skeleto does. How to divide an application into entities, use cases and gateways is in [BEST_PRACTICES.md](BEST_PRACTICES.md). Every rule here has a number, `T1`, `T2`, ..., which is never reused, and a level:

- **Mandatory**: code that breaks it is wrong, and a review asks for it to be changed.
- **Optional**: a recommendation; code that departs from it gives its reason in a comment.

The code is taken from the example in the [README](README.md#example), where it runs. The two test files at the end are not in the README; they belong to the same example and run with it.

## Components

### T1. A component is a function that takes its dependencies and returns what it provides (Mandatory)

A marked function works in two steps. Skeleto calls it once at startup with its dependencies; what it returns is the component: the handler of an action, the wrapper function of a wrapper, the value of a config. The handler is called on every use, with the context and the input only.

```ts
// src/gateway/memory/warehouse.ts (excerpt)
export function implSaveWarehouses(database: Database): SaveWarehouses {
  return async (ctx, warehouses) => {
    const transaction = database(ctx);
    for (const warehouse of warehouses) transaction.write({ id: warehouse.id, units: warehouse.units });
  };
}
```

Why: Skeleto binds by calling the outer function with the components its parameter types name, and the closure keeps them. The handler's own signature then holds only what changes per call, so every caller calls it the same way, and a test calls the outer function with fakes of its choice (T18).

### T2. The outer step only keeps its dependencies; the work of a call happens in the handler (Mandatory)

The outer function of an action or a wrapper reads no store, sends nothing and starts nothing. It may prepare what never changes between calls, such as a constant or a compiled pattern. A config is the exception: building its value is its work.

Why: the outer step runs once, at startup, before any context exists. Work done there runs outside every transaction, cannot see the caller's context, and runs again on every retried start.

## Names

The rules below leave one choice only: the words of the business (the entity, the business area, the verb) and the name of the resource or the marker. Every other name follows from those.

### T3. Every component has a named type alias, and the alias is the component's name (Mandatory)

```ts
// src/wrappers.ts (excerpt)
export type AuditWrapper = WrapperHandler;
export type TransactionWrapper = WrapperHandler;
```

Why: the name of a component is the text of its return type. Two components of the same shape, such as two wrappers, would otherwise have the same name, which stops startup. The alias is also the contract that others depend on, kept apart from the function that fulfils it.

### T4. Every type used as a dependency is a named alias, never an inline or generic type (Mandatory)

A parameter is typed `Database`, never `(ctx: Context) => Transaction`, `Map<string, number>` or `winston.Logger`. Give such a type an alias and depend on the alias.

Why: Skeleto matches dependencies by their text exactly as written, so `Map<string,number>` and `Map<string, number>` are two names (see [the rules worth knowing](README.md#rules-worth-knowing)). An alias is spelt one way only, gives the rule of T6 a single word to turn into a parameter name, and names what the dependency means rather than what it looks like.

### T5. The function behind a component is named `impl` followed by the component's name (Mandatory)

`implStockTransfer` returns `StockTransfer`, `implAuditWrapper` returns `AuditWrapper`, and the asynchronous `implConnection` returns `Promise<Connection>`, whose component is `Connection`.

```ts
// src/config.ts (excerpt)
/** @Config */
export async function implConnection(): Promise<Connection> {
```

Why: the type is the contract and the function implements it. With the name fixed there is no verb to choose, and the function behind any component in an error message or in the container is found by its name alone.

### T6. A dependency parameter is named after its type, with the first letter in lower case (Mandatory)

`lockWarehouses: LockWarehouses`, `database: Database`, `connection: Connection`. The first parameter of a handler is the context, named `ctx`; a wrapper's function takes `(handler, metadata)`.

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
export function implStockTransfer(lockWarehouses: LockWarehouses, saveWarehouses: SaveWarehouses, notifyWarehouses: NotifyWarehouses): StockTransfer {
```

Why: the parameter's name then says nothing the type does not, so it is never chosen, never drifts from the type, and reads the same in every file.

### T7. A component's name is built from the words of the table below, and from nothing else (Mandatory)

| Component | Name | Example |
| --- | --- | --- |
| Use case | `<Area><Verb>`: the business area, then the operation | `StockTransfer` |
| Its input and output | `<UseCase>Request` and `<UseCase>Response` | `StockTransferRequest`, `StockTransferResponse` |
| Gateway | `<Verb><Entity>`, with the entity in the plural when it handles several | `LockWarehouses`, `SaveWarehouses` |
| Wrapper | `<Marker>Wrapper`, after the one additional marker it reads (T11) | `AuditWrapper`, `TransactionWrapper` |
| Config | the name of what it provides | `Connection`, `Database`, `Logger` |

A word is written with a capital first letter and joined to the next without a separator: `StockTransfer`, never `Stock_Transfer` or `stockTransfer`.

Why: two people naming the same operation arrive at the same name, so the name can be guessed from the operation, a duplicate shows up as two functions returning the same type, and the file of T8 follows from it.

### T8. A file's path follows from the name of what it holds (Mandatory)

`<snake>` is a name with its words in lower case, joined by `_`: `StockTransfer` becomes `stock_transfer`.

| What | Path | Example |
| --- | --- | --- |
| An entity | `src/entity/<entity snake>.ts` | `src/entity/warehouse.ts` |
| The business errors | `src/entity/error.ts` | |
| A use case, one per file | `src/usecase/<area>/<use case snake>.ts`, where `<area>` is the first word of its name | `src/usecase/stock/stock_transfer.ts` |
| The contracts of the gateways of one entity | `src/gateway/<entity snake>.ts` | `src/gateway/warehouse.ts` |
| Their implementations in one technology | `src/gateway/<technology>/<entity snake>.ts`, the technology's own name in `<snake>` form | `src/gateway/memory/warehouse.ts` |
| Every config | `src/config.ts` | |
| Every wrapper | `src/wrappers.ts` | |
| The allowed markers | `src/markers.ts` | |
| The start of the application | `main.ts` at the project root | |
| The test of a use case | next to it, as `<use case snake>.test.ts` | `src/usecase/stock/stock_transfer.test.ts` |
| The one integration test | `main.test.ts` at the project root | |

Why: Skeleto ignores paths, so nothing but this rule keeps them predictable. With it, the file of any component, and the test of any use case, is found from its name without searching.

## Markers

### T9. A JSDoc block holds the description first, then the markers, one per line, with nothing after a marker but its data (Mandatory)

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
/**
 * Moves units of stock from one warehouse to another.
 *
 * @Action
 * @UseCase
 * @Transaction
 * @Audit {"level": "info"}
 */
```

Why: a marker's data runs on to the next marker, so a sentence after a marker becomes its data: after `@Action` that stops startup, after an additional marker it changes what wrappers read without a word. [Where markers go](README.md#rules-worth-knowing) in the README gives the whole rule.

### T10. The allowed markers are kept in one exported constant, which is always passed to `Skeleto.start` (Mandatory)

The list holds at least `UseCase`, `Gateway` and `Transaction`, and every other marker the application reads.

```ts
// src/markers.ts (excerpt)
/** The additional markers this application allows. Startup refuses any other, so a misspelt marker cannot pass unnoticed. */
export const MARKERS = ["UseCase", "Gateway", "Transaction", "Audit"];
```

```ts
// main.ts (excerpt)
const skeleto = await Skeleto.start("src", { decorators: MARKERS });
```

Why: without `decorators`, a misspelt `@Transction` is accepted and the use case silently runs without a transaction, and a misspelt main marker silently drops a component. With the list, both stop startup. One constant means the start of the application, its tests and its wrappers all read the same list.

## Wrappers

### T11. One wrapper per marker, named after it, whose first step returns the handler unchanged when its marker is absent (Mandatory)

```ts
// src/wrappers.ts (excerpt)
/** @Wrapper {"ordinal": 10} */
export function implAuditWrapper(logger: Logger): AuditWrapper {
  return (handler, metadata) => {
    // Only what is marked @Audit: the gateways a use case calls are details of it.
    if (!marked(metadata, "Audit")) return handler;
```

A marker that only tells use cases from gateways, such as `@UseCase` and `@Gateway`, needs no wrapper.

Why: Skeleto offers every action to every wrapper. Returning the handler itself adds nothing to the actions the marker is not on, not even a function call. With one wrapper per marker, what a marker means is written in one place, and removing the marker from an action removes exactly that behaviour.

## Transactions

### T12. The transaction wrapper opens the transaction and keeps it in the context (Mandatory)

```ts
// src/wrappers.ts (excerpt)
      const transaction = connection.begin();
      const afterCommit: (() => void | Promise<void>)[] = [];
      ctx.data.transaction = transaction;
      ctx.data.afterCommit = afterCommit;
```

It commits when the handler returns, rolls back when it throws, and removes both keys from the context in either case.

Why: a transaction belongs to one call, and the context is the one thing that travels with a call through every action it reaches. A use case then says only `@Transaction`; it never begins, commits or passes a transaction itself.

### T13. Gateways reach their resource only through a function of the context (Mandatory)

A gateway does not depend on the connection. It depends on a config that, given the context, hands it the transaction the context carries, and that fails when there is none.

```ts
// src/config.ts (excerpt)
/** @Config */
export function implDatabase(): Database {
  return (ctx) => {
    if (!ctx.data.transaction) throw new Error("no transaction is open: the use case needs @Transaction");
    return ctx.data.transaction;
  };
}
```

```ts
// src/gateway/memory/warehouse.ts (excerpt)
    const transaction = database(ctx);
```

Why: a gateway that held the connection could read or write beside the transaction of its use case, and nothing would show it until two calls interfered. Through the context it cannot skip the transaction, and a use case that forgot `@Transaction` fails at its first gateway call instead of writing outside a transaction.

### T14. A transaction already in the context is joined, never doubled (Mandatory)

```ts
// src/wrappers.ts (excerpt)
      // Already inside a transaction: join it rather than open a second one.
      if (ctx.data.transaction) return handler(ctx, input);
```

Why: an action with `@Transaction` that is called by another one inside its transaction must take part in it. A second transaction would commit its half on its own, so a failure of the outer one would leave half a change stored; and it would wait on the locks the outer one holds.

### T15. An effect outside the transaction's store happens only after commit (Mandatory)

Sending a message or an email, calling a third party, writing to another store: none of these may happen while the transaction can still roll back. A gateway queues the effect in the context, and the transaction wrapper runs the queue after a successful commit:

```ts
// src/gateway/log/warehouse.ts (excerpt)
  return async (ctx, warehouses) => {
    const line = `stock changed: ${warehouses.map((warehouse) => `${warehouse.id} ${warehouse.units}`).join(", ")}`;
    // A change that may still be rolled back must not be announced: the line waits for the commit.
    ctx.data.afterCommit.push(() => logger(line));
  };
```

```ts
// src/wrappers.ts (excerpt)
      let result;
      try {
        result = await handler(ctx, input);
        transaction.commit();
        logger("commit");
      } catch (error) {
        transaction.rollback();
        logger("rollback");
        throw error;
      } finally {
        delete ctx.data.transaction;
        delete ctx.data.afterCommit;
      }
      // Effects run only once the change is stored; on a rollback they are dropped with the rest of the context.
      for (const effect of afterCommit) await effect();
      return result;
```

The README's output shows it: `stock changed: north 7, south 3` comes after `commit`, and the transfer that rolls back reports nothing.

**This form can lose the effect.** If the process stops after the commit and before the queue has run, or an effect fails, the change is stored and the effect never happens; nothing retries it. Use it only for an effect that may be lost now and then, such as a notification. For an effect that must not be lost, use the outbox described in [BEST_PRACTICES.md](BEST_PRACTICES.md).

Why: an effect sent before commit cannot be taken back when the transaction then rolls back: the receiver acts on a change that was never stored.

## Configs

### T16. An asynchronous config sets its own timeout (Mandatory)

Why: startup waits for an asynchronous config for as long as it takes and sets no time limit of its own, so a connection that never opens keeps `Skeleto.start` pending for ever. The config knows what a reasonable wait is, usually the connect timeout of the client it creates. See [Asynchronous configs](README.md#asynchronous-configs) in the README.

## The container

### T17. Instances are taken from the container once, at startup, by the start of the application only (Mandatory)

```ts
// main.ts (excerpt)
const stockTransfer: StockTransfer = container.get("StockTransfer")!.getInstance();
```

The start of the application takes each use case it needs once, under its type, and hands the typed functions to its callers. No component reads the container, and nothing reads it per call.

Why: the container is looked up by a string and returns an untyped instance. Doing it once, in one place, turns a wrong name into a failure at startup rather than on the first call that needs it, keeps the cast to one line per use case, and leaves every other piece of code with a typed function. Components get what they need as dependencies; a component that read the container would hide a dependency Skeleto cannot see or order.

## Tests

### T18. A use case is tested by calling its `impl` function with hand-written fakes typed by the gateway contracts, without starting Skeleto and without a mock library (Mandatory)

```ts
// src/usecase/stock/stock_transfer.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { newContext } from "skeleto";
import type { Warehouse } from "../../entity/warehouse.js";
import type { LockWarehouses, NotifyWarehouses, SaveWarehouses } from "../../gateway/warehouse.js";
import { implStockTransfer } from "./stock_transfer.js";

/** Fakes of the three gateways. What the store holds is fixed here, and what the use case saves and reports is recorded. */
function fakeGateways(stored: Warehouse[]) {
  const saved: Warehouse[][] = [];
  const notified: Warehouse[][] = [];
  const lockWarehouses: LockWarehouses = async (ctx, ids) => ids.map((id) => stored.find((warehouse) => warehouse.id === id)!);
  const saveWarehouses: SaveWarehouses = async (ctx, warehouses) => {
    saved.push(warehouses);
  };
  const notifyWarehouses: NotifyWarehouses = async (ctx, warehouses) => {
    notified.push(warehouses);
  };
  return { stockTransfer: implStockTransfer(lockWarehouses, saveWarehouses, notifyWarehouses), saved, notified };
}

test("a transfer saves and reports both warehouses, and answers with what they hold", async () => {
  const { stockTransfer, saved, notified } = fakeGateways([{ id: "north", units: 10 }, { id: "south", units: 0 }]);

  const response = await stockTransfer(newContext(), { from: "north", to: "south", units: 3 });

  assert.deepEqual(response, { fromUnits: 7, toUnits: 3 });
  const moved = [{ id: "north", units: 7 }, { id: "south", units: 3 }];
  assert.deepEqual(saved, [moved]);
  assert.deepEqual(notified, [moved]);
});

test("a transfer beyond the stock is a conflict, and saves and reports nothing", async () => {
  const { stockTransfer, saved, notified } = fakeGateways([{ id: "north", units: 10 }, { id: "south", units: 3 }]);

  await assert.rejects(stockTransfer(newContext(), { from: "south", to: "north", units: 50 }), { kind: "conflict", message: "warehouse south holds 3 units, not 50" });

  assert.deepEqual(saved, []);
  assert.deepEqual(notified, []);
});
```

Why: the two-step closure (T1) makes the use case a plain function of its gateways, so the test builds it directly; no container, no store, no wrapper. A fake typed by the contract is checked by the compiler: when the contract changes, the fake stops compiling instead of passing quietly, which a mock library cannot promise. Written by hand, it stays as readable as the use case.

### T19. The fakes fix every unpredictable value (Mandatory)

What the store holds, the current time, a generated id, a random token: the test decides each of them through the fake of its gateway, and never reads the clock or a random source itself.

Why: a test whose input changes from run to run cannot state its expected output exactly, and a test that cannot state it checks less than it seems to. With every such value fixed, the expected result is written out in full (T20).

### T20. A test compares whole objects, never picked fields (Mandatory)

Compare the whole response, and everything a fake recorded, with `assert.deepEqual`, as the test above does.

Why: a check of one field passes when another field is wrong or a field was added by mistake. A whole object states the whole result, and a change to it shows in the test's failure as a difference.

### T21. One integration test starts Skeleto, and proves that the application starts (Mandatory)

```ts
// main.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { Skeleto } from "skeleto";
import { MARKERS } from "./src/markers.js";

test("the application starts, and its use cases are in the container", async () => {
  const container = (await Skeleto.start("src", { decorators: MARKERS })).getContainer();
  assert.equal(typeof container.get("StockTransfer")?.getInstance(), "function");
});
```

Why: the tests of T18 never start Skeleto, so a missing dependency, a cycle, a misspelt marker or a type alias spelt two ways would only show when the application is deployed. Startup reports all such mistakes at once, so one test that starts it is enough; it passes the same `MARKERS` as the application (T10), so it checks the same rules.

### T22. Test files and generated files are left out of the scan (Mandatory)

Test files named `*.test.ts`, as T8 places them, are left out by `DEFAULT_EXCLUDE` without further word. A folder of generated code is added to the list, never put in its place: `Skeleto.start("src", { decorators: MARKERS, exclude: [...DEFAULT_EXCLUDE, "generated"] })`. See [Files the scan leaves out](README.md#files-the-scan-leaves-out) in the README.

Why: Skeleto imports every file it scans. A test file imported at startup would run its tests inside the application, and a marked function in a fake or in generated code would become a component, or clash with the real one by name.
