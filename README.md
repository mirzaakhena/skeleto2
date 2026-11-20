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

The example moves stock from one warehouse to another. How to lay out an application on Skeleto (one use case per file, business rules in entities, use cases that only orchestrate) is recommended in [BEST_PRACTICES.md](BEST_PRACTICES.md), how to use Skeleto's mechanism well (names, markers, wrappers, transactions, tests) in [TECHNICAL_PRACTICES.md](TECHNICAL_PRACTICES.md), and the example follows both. In which order a new application is built, Core first and after the business areas and their words are agreed with the owner, is in [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md). Every rule of the three, with its level and whether a machine, a reviewer or the owner (for the process) checks it, is listed in [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md), together with an architecture test and a gap test to copy. Every component function is named `impl` followed by its component's name: the type it returns is the contract, and the function implements it.

The entity. Plain types and pure functions, with no marker: Skeleto reads these files like any other, finds no marked function, and makes no component of them. Every failure the business knows of is a `BusinessError`, whose `kind` says why the business refused the operation.

```ts
// src/entity/error.ts
/** Why the business refused an operation: one of four kinds. The caller decides what each kind means to its own users. */
export type BusinessErrorKind = "validation" | "not_found" | "conflict" | "tech_debt";

/** The one error the business throws: entities, use cases and gateways name its kind and nothing about who called them. */
export class BusinessError extends Error {
  readonly kind: BusinessErrorKind;
  /** The id of the gap a `tech_debt` refusal reached, so that the debt can be counted at run time; used with that kind only. */
  readonly gap?: string;

  constructor(kind: BusinessErrorKind, message: string, gap?: string) {
    super(message);
    this.name = "BusinessError";
    this.kind = kind;
    if (gap !== undefined) this.gap = gap;
  }
}
```

A new warehouse comes into being only through `newWarehouse`. An existing one changes only through functions such as `transfer`, which check what the change must not break and return new copies.

```ts
// src/entity/warehouse.ts
import { BusinessError } from "./error.js";

export type Warehouse = { readonly id: string; readonly units: number };

/** The only way to bring a new warehouse into being: it needs an id, and it starts empty. */
export function newWarehouse(id: string): Warehouse {
  if (id === "") throw new BusinessError("validation", "a warehouse needs an id");
  return { id, units: 0 };
}

/** A rule over two warehouses. It checks what the move must not break and returns changed copies of both, leaving the ones it was given as they were. */
export function transfer(from: Warehouse, to: Warehouse, units: number): [Warehouse, Warehouse] {
  if (from.id === to.id) throw new BusinessError("validation", `warehouse ${from.id} cannot send stock to itself`);
  if (!Number.isInteger(units) || units <= 0) throw new BusinessError("validation", `cannot move ${units} units`);
  if (from.units < units) throw new BusinessError("conflict", `warehouse ${from.id} holds ${from.units} units, not ${units}`);
  return [{ ...from, units: from.units - units }, { ...to, units: to.units + units }];
}
```

Configs. Each is called once, and its result is passed to whoever asks for its type. `implConnection` is asynchronous: it is declared `Promise<Connection>`, so its component is `Connection`, startup waits for it, and whoever needs it receives the finished connection, not a promise. The store is kept in memory and its records are written as plain data, standing for what a real store already holds.

Gateways do not receive the connection. They receive `Database`, a function of the context that hands them the transaction the context carries, so that no gateway can read or write beside the transaction its use case runs in.

```ts
// src/config.ts
import type { Context } from "skeleto";

/** A warehouse as the store keeps it: plain data, valid when it was written. */
export type WarehouseRecord = { id: string; units: number };

/** One transaction on the store: it sees its own writes, and nobody else sees them before `commit`. */
export type Transaction = {
  lock(id: string): Promise<void>;
  read(id: string): WarehouseRecord | undefined;
  write(record: WarehouseRecord): void;
  commit(): void;
  rollback(): void;
};

/** The open connection to the store. Only the transaction wrapper begins transactions on it. */
export type Connection = { begin(): Transaction };

/** What gateways receive: the store as seen by the transaction in the context, so that no gateway can work beside it. */
export type Database = (ctx: Context) => Transaction;

export type Logger = (line: string) => void;

/** @Config */
export async function implConnection(): Promise<Connection> {
  // Stands in for something slow: a connection that has to be opened first.
  await new Promise((resolve) => setTimeout(resolve, 10));
  // What the store already holds, as plain records.
  const records = new Map<string, WarehouseRecord>([
    ["north", { id: "north", units: 10 }],
    ["south", { id: "south", units: 0 }],
  ]);
  // The last holder of each lock, as a promise that settles when its transaction ends.
  const locks = new Map<string, Promise<void>>();
  return {
    begin() {
      const writes = new Map<string, WarehouseRecord>();
      const releases: (() => void)[] = [];
      const end = () => releases.splice(0).forEach((release) => release());
      return {
        // Not re-entrant: a transaction that locks a warehouse it already holds waits for itself, and never ends.
        async lock(id) {
          const previous = locks.get(id) ?? Promise.resolve();
          let release = () => {};
          const mine = new Promise<void>((resolve) => (release = resolve));
          // The next transaction to lock this warehouse waits for this one to end.
          locks.set(id, previous.then(() => mine));
          releases.push(release);
          await previous;
        },
        read: (id) => writes.get(id) ?? records.get(id),
        write: (record) => writes.set(record.id, record),
        commit() {
          writes.forEach((record, id) => records.set(id, record));
          end();
        },
        rollback: end,
      };
    },
  };
}

/** @Config */
export function implDatabase(): Database {
  return (ctx) => {
    if (!ctx.data.transaction) throw new Error("no transaction is open: the use case needs @Transaction");
    return ctx.data.transaction;
  };
}

/** @Config */
export function implLogger(): Logger {
  return (line) => console.log(line);
}
```

The additional markers the application allows, kept in one place:

```ts
// src/markers.ts
/** The additional markers this application allows. Startup refuses any other, so a misspelt marker cannot pass unnoticed. */
export const MARKERS = ["UseCase", "Gateway", "Transaction", "Audit"];
```

Gateways. Their contracts are types of their own, apart from the code that fulfils them, so that a use case depends on what a gateway promises and not on the technology behind it.

```ts
// src/gateway/warehouse.ts
import type { ActionHandler } from "skeleto";
import type { Warehouse } from "../entity/warehouse.js";

/**
 * Fetches the warehouses with the given ids, in that order, and keeps every other transaction from changing them until this one commits or rolls back.
 * It takes the locks sorted by id, so that two transactions locking the same warehouses never wait on each other for ever.
 * An id the store does not hold is a `not_found` error.
 */
export type LockWarehouses = ActionHandler<string[], Warehouse[]>;

/**
 * Writes back, as part of the open transaction, warehouses that the store already holds.
 * It never creates one: a warehouse the store does not hold is a `not_found` error.
 */
export type SaveWarehouses = ActionHandler<Warehouse[], void>;

/** Tells whoever follows the stock that these warehouses changed, once the transaction has committed. */
export type NotifyWarehouses = ActionHandler<Warehouse[], void>;
```

The implementations, one file per technology. A gateway carries `@Action` and `@Gateway`. It maps stored data to the type and applies no business rule; in particular it never calls `newWarehouse`, since what it reads already exists.

`LockWarehouses` is what protects the transfer against a concurrent one: the second transfer of the same warehouses waits until the first has committed or rolled back, and then reads what the first left. In a real database it stands for reading the rows with a lock held until the end of the transaction (in SQL, `SELECT ... FOR UPDATE`), taken in the same order by every transaction.

```ts
// src/gateway/memory/warehouse.ts
import type { Database } from "../../config.js";
import { BusinessError } from "../../entity/error.js";
import type { LockWarehouses, SaveWarehouses } from "../warehouse.js";

/**
 * Locks and reads warehouses in the store.
 *
 * @Action
 * @Gateway
 */
export function implLockWarehouses(database: Database): LockWarehouses {
  return async (ctx, ids) => {
    const transaction = database(ctx);
    // Each warehouse once, and always in the same order.
    for (const id of [...new Set(ids)].sort()) await transaction.lock(id);
    return ids.map((id) => {
      const record = transaction.read(id);
      if (!record) throw new BusinessError("not_found", `no warehouse ${id}`);
      // Stored data is mapped to the type and nothing more: it was checked when it was written.
      return { id: record.id, units: record.units };
    });
  };
}

/**
 * Writes warehouses to the store.
 *
 * @Action
 * @Gateway
 */
export function implSaveWarehouses(database: Database): SaveWarehouses {
  return async (ctx, warehouses) => {
    const transaction = database(ctx);
    // Save writes back what the store holds and never creates: a new warehouse would go through an insert, which the store can refuse.
    const missing = warehouses.find((warehouse) => !transaction.read(warehouse.id));
    if (missing) throw new BusinessError("not_found", `no warehouse ${missing.id}`);
    for (const warehouse of warehouses) transaction.write({ id: warehouse.id, units: warehouse.units });
  };
}
```

```ts
// src/gateway/log/warehouse.ts
import type { Logger } from "../../config.js";
import type { NotifyWarehouses } from "../warehouse.js";

/**
 * Reports changed warehouses on the log.
 *
 * @Action
 * @Gateway
 */
export function implNotifyWarehouses(logger: Logger): NotifyWarehouses {
  return async (ctx, warehouses) => {
    const line = `stock changed: ${warehouses.map((warehouse) => `${warehouse.id} ${warehouse.units}`).join(", ")}`;
    // A change that may still be rolled back must not be announced: the line waits for the commit.
    ctx.data.afterCommit.push(() => logger(line));
  };
}
```

The use case. It has its own file, in the folder of its business area, its own input and output types, and asks for the gateways simply by naming their types. It locks both warehouses, calls the entity's rule, saves and reports what the rule returned, and answers with its own type rather than with the entities; the rule itself is not in it.

It carries `@Action` and three **additional markers**: `@UseCase`, `@Transaction` and `@Audit`. Skeleto gives them no meaning, it only records them, with their data, for wrappers and for your own code to read. `@UseCase` and `@Gateway` are how the application tells its use cases from its gateways; their names play no part.

```ts
// src/usecase/stock/stock_transfer.ts
import type { ActionHandler } from "skeleto";
import * as Warehouse from "../../entity/warehouse.js";
import type { LockWarehouses, NotifyWarehouses, SaveWarehouses } from "../../gateway/warehouse.js";

export type StockTransferRequest = { from: string; to: string; units: number };
export type StockTransferResponse = { fromUnits: number; toUnits: number };
export type StockTransfer = ActionHandler<StockTransferRequest, StockTransferResponse>;

/**
 * Moves units of stock from one warehouse to another.
 *
 * @Action
 * @UseCase
 * @Transaction
 * @Audit {"level": "info"}
 */
export function implStockTransfer(lockWarehouses: LockWarehouses, saveWarehouses: SaveWarehouses, notifyWarehouses: NotifyWarehouses): StockTransfer {
  return async (ctx, { from, to, units }) => {
    const [source, target] = await lockWarehouses(ctx, [from, to]);
    const moved = Warehouse.transfer(source, target, units);
    await saveWarehouses(ctx, moved);
    await notifyWarehouses(ctx, moved);
    return { fromUnits: moved[0].units, toUnits: moved[1].units };
  };
}
```

Wrappers. **Every** wrapper is offered **every** action, together with the action's metadata. A wrapper that returns the handler it was given leaves that action alone. The wrapper with the larger `ordinal` ends up further outside; without one the `ordinal` is `0`, and wrappers with equal ordinals are layered by name, the later name outside.

The gateway observer wrapper is **Optional**. When the context carries an observer at `ctx.data.gatewayObserver`, it hands each gateway call to it, with the gateway's name, its input and a way to call through; when there is none, it returns the handler's own result and changes nothing.

The transaction wrapper keeps the open transaction at `ctx.data.transaction`, and an action called inside it joins that transaction instead of opening a second one. Effects queued at `ctx.data.afterCommit` run only after a successful commit; when the transaction fails they are dropped.

```ts
// src/wrappers.ts
import type { FuncMetadata, WrapperHandler } from "skeleto";
import type { Connection, Logger } from "./config.js";

export type AuditWrapper = WrapperHandler;
export type TransactionWrapper = WrapperHandler;
export type GatewayWrapper = WrapperHandler;

/** What a tool outside the application puts at `ctx.data.gatewayObserver` to see each gateway call. It must call `proceed()` once and return its result. */
export type GatewayObserver = (call: { gateway: string; input: unknown; proceed: () => Promise<unknown> }) => Promise<unknown>;

function marked(metadata: FuncMetadata, marker: string): boolean {
  return metadata.additionalDecorators.some((decorator) => decorator.name === marker);
}

/** @Wrapper {"ordinal": 10} */
export function implAuditWrapper(logger: Logger): AuditWrapper {
  return (handler, metadata) => {
    // Only what is marked @Audit: the gateways a use case calls are details of it.
    if (!marked(metadata, "Audit")) return handler;
    return async (ctx, input) => {
      logger(`enter ${metadata.name}`);
      try {
        return await handler(ctx, input);
      } finally {
        logger(`leave ${metadata.name}`);
      }
    };
  };
}

/**
 * Optional: only an application that lets a tool outside it observe a run needs this wrapper.
 * It is the innermost wrapper, so what it reports is the gateway call itself, without the transaction or the audit around it.
 *
 * @Wrapper {"ordinal": -10}
 */
export function implGatewayWrapper(): GatewayWrapper {
  return (handler, metadata) => {
    if (!marked(metadata, "Gateway")) return handler;
    return (ctx, input) => {
      const observer: GatewayObserver | undefined = ctx.data.gatewayObserver;
      // Nobody observes: the call goes through untouched.
      if (!observer) return handler(ctx, input);
      return observer({ gateway: metadata.name, input, proceed: () => handler(ctx, input) }) as ReturnType<typeof handler>;
    };
  };
}

/** @Wrapper */
export function implTransactionWrapper(connection: Connection, logger: Logger): TransactionWrapper {
  return (handler, metadata) => {
    if (!marked(metadata, "Transaction")) return handler;
    return async (ctx, input) => {
      // Already inside a transaction: join it rather than open a second one.
      if (ctx.data.transaction) return handler(ctx, input);
      const transaction = connection.begin();
      const afterCommit: (() => void | Promise<void>)[] = [];
      ctx.data.transaction = transaction;
      ctx.data.afterCommit = afterCommit;
      logger("begin");
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
    };
  };
}
```

Starting it and reading the container. `decorators` lists the additional markers you allow, so that a typo such as `@Transction` stops startup instead of silently doing nothing; leave it out and every additional marker is accepted. The second transfer fails, and the caller translates the kind of its error into an answer of its own.

```ts
// main.ts
import { Skeleto, newContext } from "skeleto";
import { BusinessError, type BusinessErrorKind } from "./src/entity/error.js";
import { MARKERS } from "./src/markers.js";
import type { StockTransfer } from "./src/usecase/stock/stock_transfer.js";

const skeleto = await Skeleto.start("src", { decorators: MARKERS });
const container = skeleto.getContainer();

const stockTransfer: StockTransfer = container.get("StockTransfer")!.getInstance();
console.log(await stockTransfer(newContext(), { from: "north", to: "south", units: 3 }));

// The caller translates the kind of a business error into what its own users understand.
const answers = { validation: "rejected", not_found: "unknown", conflict: "refused", tech_debt: "not available yet" } satisfies Record<BusinessErrorKind, string>;
try {
  await stockTransfer(newContext(), { from: "south", to: "north", units: 50 });
} catch (error) {
  if (!(error instanceof BusinessError)) throw error;
  console.log(`${answers[error.kind]}: ${error.message}`);
}

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
commit
stock changed: north 7, south 3
leave StockTransfer
{ fromUnits: 7, toUnits: 3 }
enter StockTransfer
begin
rollback
leave StockTransfer
refused: warehouse south holds 3 units, not 50
Connection: @Config {"dependencies":[],"additionalDecorators":[]}
Database: @Config {"dependencies":[],"additionalDecorators":[]}
Logger: @Config {"dependencies":[],"additionalDecorators":[]}
AuditWrapper: @Wrapper {"dependencies":["Logger"],"additionalDecorators":[]}
GatewayWrapper: @Wrapper {"dependencies":[],"additionalDecorators":[]}
TransactionWrapper: @Wrapper {"dependencies":["Connection","Logger"],"additionalDecorators":[]}
NotifyWarehouses: @Action {"dependencies":["Logger"],"additionalDecorators":[{"name":"Gateway"}]}
LockWarehouses: @Action {"dependencies":["Database"],"additionalDecorators":[{"name":"Gateway"}]}
SaveWarehouses: @Action {"dependencies":["Database"],"additionalDecorators":[{"name":"Gateway"}]}
StockTransfer: @Action {"dependencies":["LockWarehouses","SaveWarehouses","NotifyWarehouses"],"additionalDecorators":[{"name":"UseCase"},{"name":"Transaction"},{"name":"Audit","data":{"level":"info"}}]}
```

The output shows the layering: `AuditWrapper` (ordinal 10) is outside `TransactionWrapper` (ordinal 0), and `GatewayWrapper` (ordinal -10) is inside both. `AuditWrapper` wraps only the use case marked `@Audit`, so the gateways do not appear in its log, and `GatewayWrapper` does nothing here because no observer is in the context. The report of the changed stock comes after the commit, and the failed transfer rolls back without one. The entity's functions are not in the container.

## Rules worth knowing

- A component must be an exported top-level `function` declaration with a return type annotation, and every parameter needs a type annotation. Arrow functions and methods are not picked up. A marked function that is a default export is a mistake, not something skipped: only a named `export` counts, and startup says so.
- One component per type name. To offer two things of the same shape, give each its own type alias, as `AuditWrapper` and `TransactionWrapper` do above.
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

Some things are usable only after an asynchronous start: a database connection, a cache client, a secret kept elsewhere. Write such a config with the return type `Promise<X>`, as `implConnection` does above:

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
