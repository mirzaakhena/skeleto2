# Best practices

How to divide an application built on Skeleto: what an entity, a use case and a gateway are, what each may know of the others, and how they stay correct when two requests arrive at once. The recommendations here are for the applications you build, not rules of the framework: Skeleto does not check them, and an application laid out differently starts just the same.

This file is the conceptual half of the practices. The technical half, how to use Skeleto's own mechanism (markers, naming of component functions, wrappers, the transaction wrapper, the list of allowed markers, effects queued after commit), is in [TECHNICAL_PRACTICES.md](TECHNICAL_PRACTICES.md), and is not repeated here. In which order a new application is built (the Core first, after its business areas and their words are agreed) is the subject of [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md).

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

## How to read the rules

Every rule has a number (`B1`, `B2`, ...), a level and a reason. A rule added later takes the next free number and sits under its topic, so numbers do not always rise down the page:

- **Mandatory**: follow it. Breaking it gives code that is wrong, or that will be wrong after the next change.
- **Optional**: follow it unless you have a reason not to; it is a good default, not a correctness matter.

The code below is taken from the example in the [README](README.md#example), where it runs. Where the example has no counterpart, the rule is told in prose and tables.

## Built from use cases

An application is built from its use cases, not from its screens. Think of the frontend as the tip of an iceberg: it is what people see, and it is a small part of what the application does. Under the waterline lies the larger part, and the more complex one: the business rules that decide what is allowed, the validation and the errors that tell a caller why not, requests that arrive at the same moment, transactions that fail halfway, effects that must wait for the commit, and values that are not predictable. None of it shows on a screen, and all of it must be right for the screen to be worth anything.

This is a claim about where the complexity lies, not about what matters. The frontend is as important as the rest: it is what the user meets, and it deserves the same care. What is smaller is the complexity of its rules, so a design that follows the screens downwards shapes the larger part after the smaller one.

What lies under the waterline, and the rules that cover each part:

| Under the waterline | Covered by |
| --- | --- |
| Business rules and invariants | B11 to B14 and B16 |
| Validation and errors | B24 to B26 |
| Concurrent requests | B28 to B32 |
| Transactions that fail halfway | T12 to T14 |
| Effects that must wait for the commit | B33 to B35 |
| Unpredictable values (the clock, generated ids) | B22 |

This principle says what an application is designed from, and holds for every change. Which use cases are built first, when a new application or a large new part of one is started, is decided by the Core-first order of [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md), which depends on this principle: only use cases and business areas can be ordered, and a screen cannot.

A use case is the unit that holds all of this: one business operation, with a Request and a Response, that any caller can ask for. The screen is one caller among others (B27). Building from the use cases therefore builds the whole iceberg and not only its tip, and a second caller, a scheduled job or a test, finds the application already complete.

It buys one more thing. Once the Request and the Response of a use case are agreed, the frontend and the backend can be built at the same time: the frontend against the agreed contract with made-up data, the backend against the same contract with the real rules. Neither waits for the other, and they meet when both honour the contract.

### B1. Start from the list of use cases, not from the list of screens (Optional)

Why: a list of screens says what is shown, and a list of use cases says what the business does. An agent given a screen design that builds downwards from it ends with a backend shaped after one screen, and with rules missing that no screen happened to show. Starting from the use cases finds those rules first. It is Optional because not every project starts from nothing: an application that already exists is extended where it stands, and a change there starts from the use case it touches.

### B2. Name and shape the Request and the Response after the business operation, not after a screen; no field exists only because a screen shows it (Mandatory)

Why: a Request or a Response shaped after a screen changes when the screen changes, and every other caller of that use case pays for it. A field that exists only because one screen shows it, such as a label, a column that is already formatted, or a flag that says which part of the page to open, is the screen's concern, and belongs on the caller's side. The Request holds what the operation needs, the Response holds what the operation decided, and both are named after the operation (B9).

### B3. A screen may call many use cases and a use case may serve many callers; the two are not paired one to one (Mandatory)

Why: a screen that shows stock and offers a transfer needs at least two use cases, and the transfer is also asked for by a job and a test. Pairing each screen with a use case of its own either duplicates the rule once per caller or ties the use case to the one screen that first needed it. A screen whose use cases are not all built yet is incomplete on purpose, not broken: it waits for what lies under it, and that is the order in which the work should go.

### B4. A view that needs data gathered for one screen is served on the caller's side, or by a query use case of its own, not by changing an existing use case (Optional)

Why: bending an existing use case to hand one screen the data it wants puts the screen's shape into the contract of every other caller (B2). Gathering the data on the caller's side, from the use cases that already exist, leaves them as they are. When the gathering is itself a business question that more than one caller asks, it becomes a query use case of its own (B10), with a Request and a Response named after it.

## Use cases and gateways

A **use case** is an `@Action` that stands for one business operation of your application: something a user, a job or another system asks for. A **gateway** is an `@Action` that reaches something outside the process (a store, a service, the clock) on the use case's behalf.

### B5. Mark every use case `@UseCase` and every gateway `@Gateway`, next to `@Action` (Mandatory)

Why: to Skeleto both are actions, so the difference has to be written down where wrappers, checks and readers can see it. A name or a folder is a convention that drifts; a marker is data that a wrapper reads (a logging wrapper that wraps use cases only, for example) and that a test can count. Every action is exactly one of the two.

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
 * @Action
 * @UseCase
 * @Transaction
 * @Audit {"level": "info"}
 */
```

```ts
// src/gateway/memory/warehouse.ts (excerpt)
/**
 * Locks and reads warehouses in the store.
 *
 * @Action
 * @Gateway
 */
export function implLockWarehouses(database: Database): LockWarehouses {
```

Never tell them apart by their names (`...Gateway`, `Find...`) or by where their files are.

### B6. Put each use case in a file of its own, named after it (Mandatory)

Why: nobody can say where a "simple" operation ends and a "complex" one begins, so a rule with no exceptions is applied the same way by everyone, and a use case that grows never has to be moved. One file per use case also makes the list of files the list of what the application can do.

The file name comes from the use case's name, the type its function returns:

1. Split the name before every capital letter: `StockTransfer` becomes `Stock`, `Transfer`.
2. Write the words in lower case, joined by `_`, and add `.ts`: `stock_transfer.ts`.
3. Put the file in `usecase/<area>/`, where `<area>` is the business area the use case belongs to, usually its first word: `usecase/stock/stock_transfer.ts`.

Write an abbreviation in a name as a word (`SendSmsCode`, not `SendSMSCode`), so that it gives `send_sms_code.ts`. This holds for plain create, read, update and delete operations too: `UserCreate`, `UserGet`, `UserList` each have their own file in `usecase/user/`.

Gateways, wrappers and configs may be grouped: all the gateways of one technology for one entity can share a file, as `src/gateway/memory/warehouse.ts` does in the example.

### B7. A use case only orchestrates: it fetches through gateways, calls entity functions, and saves through gateways (Mandatory)

Why: a business rule written in a use case is a rule only that use case obeys. The next use case that touches the same entity forgets it, and the two disagree. Kept in entity functions, the rule is applied wherever the entity changes and is tested once, without a gateway.

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
  return async (ctx, { from, to, units }) => {
    const [source, target] = await lockWarehouses(ctx, [from, to]);
    const moved = Warehouse.transfer(source, target, units);
    await saveWarehouses(ctx, moved);
    await notifyWarehouses(ctx, moved);
    return { fromUnits: moved[0].units, toUnits: moved[1].units };
  };
```

The use case decides nothing about stock; `Warehouse.transfer` does (B13).

### B8. A use case never depends on another use case (Mandatory)

Why: a use case is one business operation with its own transaction, its own audit and its own errors. Calling another one drags in all of those, joins two operations that change for different reasons, and soon builds a chain nobody can follow. When two use cases share a step, the shared rule belongs in an entity function and the shared access in a gateway.

Skeleto still lets an action depend on another action, and this rule does not change that: a gateway may be built from other gateways. The rule only keeps use cases apart from one another.

### B9. A use case has its own Request and Response types and does not return entities (Mandatory)

Why: an entity is the business's internal shape and changes when the rules change. A use case that returns it hands that shape to every caller, so an internal change breaks callers, and fields a caller should never see go out with the rest. Its own Response says exactly what the operation answers.

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
export type StockTransferRequest = { from: string; to: string; units: number };
export type StockTransferResponse = { fromUnits: number; toUnits: number };
export type StockTransfer = ActionHandler<StockTransferRequest, StockTransferResponse>;
```

### B10. A query never writes: a use case without `@Transaction` depends only on gateways that read (Mandatory)

Why: a use case that writes outside a transaction can leave half of its change stored when it fails. Keeping writes to use cases marked `@Transaction` makes the marker a true statement of which operations change state, and lets a reader trust that a query has no effect.

A gateway's contract says whether it reads or writes (B19). In the example every gateway works inside the transaction its use case opens; a store that allows reads outside a transaction gives its reading gateways a way to do so.

## Entities

An **entity** is a business object, such as a warehouse, together with the rules over it.

### B11. An entity is a plain type with pure functions that return new copies (Mandatory)

Why: plain data and pure functions fit what the other parts of the application already hand around, and keep the rules easy to test.

- Data that comes from a store or from a caller is already a plain object. A plain type takes it as it is; a class would need every gateway to turn it into an instance first.
- A change that returns a new copy leaves the old state intact. If saving fails and the transaction is rolled back, the entity you held before the change still matches what was stored.
- Pure functions are tested with inputs and outputs alone: no gateway, no container, no stand-in for either.
- Importing an entity's file as a namespace (`import * as Warehouse from "../../entity/warehouse.js"`, then `Warehouse.transfer(source, target, units)`) makes its functions as easy to find as methods: type `Warehouse.` and the editor lists them.

```ts
// src/entity/warehouse.ts (excerpt)
export type Warehouse = { readonly id: string; readonly units: number };
```

An entity file carries no markers, so it adds nothing to the container.

### B12. A new entity is brought into being only by `new<Entity>`, which holds the creation rules and the initial values (Mandatory)

Why: the rules for something that does not exist yet (what it needs, what it starts with) must live in one place. With one creating function there is exactly one answer to "what does a new warehouse look like", and no caller can make one that skips a rule.

```ts
// src/entity/warehouse.ts (excerpt)
/** The only way to bring a new warehouse into being: it needs an id, and it starts empty. */
export function newWarehouse(id: string): Warehouse {
  if (id === "") throw new BusinessError("validation", "a warehouse needs an id");
  return { id, units: 0 };
}
```

"Brought into being" means created by the business, for the first time. Reading a warehouse that is already stored does not bring it into being, and does not go through `newWarehouse` (B15).

### B13. An existing entity is changed only by entity functions, which check its invariants (Mandatory)

Why: an invariant (stock never below zero, a warehouse never sends to itself) holds only if every change goes through code that checks it. A change written anywhere else is a change that may break it. The function returns changed copies directly; it does not pass them through `new<Entity>`, whose initial values are for new entities only.

```ts
// src/entity/warehouse.ts (excerpt)
export function transfer(from: Warehouse, to: Warehouse, units: number): [Warehouse, Warehouse] {
  if (from.id === to.id) throw new BusinessError("validation", `warehouse ${from.id} cannot send stock to itself`);
  if (!Number.isInteger(units) || units <= 0) throw new BusinessError("validation", `cannot move ${units} units`);
  if (from.units < units) throw new BusinessError("conflict", `warehouse ${from.id} holds ${from.units} units, not ${units}`);
  return [{ ...from, units: from.units - units }, { ...to, units: to.units + units }];
}
```

### B14. A use case never writes an entity literal (Mandatory)

Why: an object literal of an entity in a use case is a new or changed entity that went through neither `new<Entity>` (B12) nor an entity function (B13), so it skipped every rule. The use case gets entities from gateways and from entity functions, and from nowhere else.

### B15. A gateway that reads maps stored data to the type and applies no business rule: validate on write, not on read (Mandatory)

Why: rules change, and data stored under an old rule must stay readable after the rule is tightened. A gateway that checked the current rules on read would refuse a warehouse that was valid when it was written, and the business could no longer even look at it, let alone correct it. What was stored was checked when it was written (B12, B13); reading only turns the stored form into the type.

```ts
// src/gateway/memory/warehouse.ts (excerpt)
      if (!record) throw new BusinessError("not_found", `no warehouse ${id}`);
      // Stored data is mapped to the type and nothing more: it was checked when it was written.
      return { id: record.id, units: record.units };
```

This literal is allowed: it is a gateway mapping stored data, not a use case making an entity (B14).

### B16. Let the store enforce the most important invariants as well (Optional)

Why: a constraint in the store (a value that may not be negative, an id that must be unique) catches what slips past the code: a script run by hand, a bug, an old version still running. It mirrors a rule the entity already holds; it never replaces it, and the entity's check stays the one that gives a clear business error. Not every store can express every rule, so this is chosen per invariant.

### B36. A state that depends on time is derived from the stored state, its time and the current time; no scheduler changes stored state (Mandatory)

Why: a job that rewrites stored state when time passes makes the state wrong between its runs, needs a second place for business rules, and cannot be tested without waiting. A state computed from what is stored and the clock is correct at every moment, needs no background job, and is tested with a fixed clock.

- Example: a transfer is sent and must be received within 48 hours. What is stored is its last action, "sent", and when that happened. Whether it is "late" is a function of the entity: `transferStatus(transfer, now)` says late when the transfer was sent and `now` is more than 48 hours after the time of sending.
- The current time comes from the clock gateway, asked for once at the start of the use case (B22), and is passed to the entity function. The entity function never reads the clock itself.
- A scheduler is allowed only as infrastructure, for example to remind people of late transfers. It starts use cases through the context like any other caller (B27) and holds no business rule: what is late, and what follows from it, is decided by the entity and the use case.

### B37. A derived status is never stored: store the result of the last action and its time, and compute the effective status with a function of the entity (Mandatory)

Why: a stored status that can be computed is a second copy of the truth. It drifts from the data it was computed from, and whoever forgets to update it leaves the application contradicting itself. With only the last action and its time stored, there is one truth and the status is always an answer, never a record.

- Example: store that the transfer was sent and when; do not store a field "status: late". The effective status, whether sent, late or received, is always `transferStatus(transfer, now)`.
- A status that no stored fact can produce, such as one a person chose, is not derived and may be stored.
- A query that must filter by a derived status asks the gateway for the stored facts it depends on, such as the sending time, and applies the entity function to the rows it gets back. It does not add a status column to answer the query faster.

## Direction of dependencies

### B17. Entities import nothing outside entities (Mandatory)

Why: entities are the most stable part of the application and the one most worth testing alone. An entity that imports a gateway, a config or Skeleto ties the business rules to a technology and cannot be tested with inputs and outputs only.

```ts
// src/entity/warehouse.ts (excerpt)
import { BusinessError } from "./error.js";
```

### B18. A use case knows gateways only by their contract types (Mandatory)

Why: a use case that imports an implementation depends on its technology, and replacing the store, or a stand-in for tests, means changing the use case. Imported with `import type`, the contract is all it knows; Skeleto hands it whichever implementation returns that type.

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
import type { ActionHandler } from "skeleto";
import * as Warehouse from "../../entity/warehouse.js";
import type { LockWarehouses, NotifyWarehouses, SaveWarehouses } from "../../gateway/warehouse.js";
```

## Gateways

### B19. Keep a gateway's contract apart from its implementation (Mandatory)

Why: the contract is what the use case depends on (B18) and what a reviewer reads to know what the gateway promises: what it reads or writes, what it guards against (B29), which errors it gives. Kept in a file of its own (`src/gateway/warehouse.ts`), it outlives any implementation (`src/gateway/memory/warehouse.ts`), and two implementations of one contract can live side by side.

### B20. Give the gateways that insert, save, find one and find many their standard shapes (Optional)

Why: the same four operations appear for nearly every entity. When they always look alike, a reader knows them at a glance and a use case knows what a missing entity looks like without reading the gateway.

| Operation | Contract | Behaviour |
| --- | --- | --- |
| Insert | `InsertWarehouses = ActionHandler<Warehouse[], void>` | adds new entities as part of the open transaction; a `conflict` error for the whole call when the store already holds one of the ids, the store's uniqueness constraint refusing it (B31); returns nothing |
| Save | `SaveWarehouses = ActionHandler<Warehouse[], void>` | writes back, as part of the open transaction, entities that the store already holds; never creates one: an entity the store does not hold is a `not_found` error; returns nothing |
| Find one | `FindWarehouse = ActionHandler<string, Warehouse \| undefined>` | `undefined` when there is none; the use case decides whether that is a `not_found` error |
| Find many | `FindWarehouses = ActionHandler<WarehouseQuery, Warehouse[]>`, the query holding a filter and a limit | an empty list when there are none; always bounded by the limit |

A new entity, made by `new<Entity>` (B12), goes through Insert and never through Save: a Save that also created would silently replace an entity of the same id that another request stored first, the check-then-insert of B28.

A gateway that guards against a concurrent change, such as `LockWarehouses` in the example, departs from these shapes on purpose and says so in its name and contract (B29).

### B21. Everything outside the process is reached through a gateway, not only stores (Mandatory)

Why: queues and message brokers, caches, third-party services, the file system and the generators of unpredictable values (B22) are all things a use case cannot test, repeat or replace when it reaches them directly. Behind a contract, each can be swapped for a stand-in, and the use case stays orchestration.

## Determinism

### B22. Every unpredictable value comes from a gateway of its own and is asked for once, at the start of the use case (Mandatory)

Why: the current time, new ids, random tokens and salted hashes differ on every call. A use case that makes them itself cannot be tested with a known outcome, and one that asks twice can get two different "now"s within one operation. Fetched once at the start and passed to the entity functions as plain values, they make every function after them deterministic.

| Unpredictable value | Gateway contract, for example |
| --- | --- |
| The current time | `Now = ActionHandler<void, Date>` |
| A new id | `NewId = ActionHandler<void, string>` |
| A random token | `NewToken = ActionHandler<void, string>` |
| A salted hash | `HashSecret = ActionHandler<string, string>` |

An entity function never reads the clock: it takes the time as an argument, like `transfer` takes its units.

## The context

### B23. A use case passes the context on and never reads it (Mandatory)

Why: the context carries what the technical level needs (the open transaction, effects waiting for the commit, a trace id), not business input. A use case that reads it depends on which wrappers ran, and on data no type of its Request declares. Everything the business needs comes in the Request (B9) or from a gateway.

Who may use the context, and how:

| Who | Uses the context to |
| --- | --- |
| Caller | make it, with `newContext()`, and set what identifies the call, such as its trace id |
| Wrapper | add and remove what it manages, such as the open transaction |
| Gateway | read what a wrapper put there for it, such as the transaction to work in, and queue an effect for the wrapper to run after the commit (B34) |
| Use case | pass it on to every gateway it calls, unread |
| Entity | nothing: it never receives the context |

The context's `date` says when the context was made, for tracing; the business's own time comes from a gateway (B22).

## Validation and errors

### B24. Check the shape of the input in the caller and the business rules in the entities (Mandatory)

Why: they are two different questions. Whether the input is well formed (a number where a number is expected, a required field present) depends on how the input arrived, and only the caller knows that. Whether the operation is allowed (enough stock, an id that is not empty) is the business's question, and must be answered the same way for every caller, so it lives in the entity (B12, B13). A use case receives a Request that already has its type.

### B25. Business errors are typed by kind: validation, not found, conflict, tech debt (Mandatory)

Why: a caller has to tell "your input broke a rule" from "that does not exist" from "the state does not allow it now" from "the business has not decided yet what should happen" in order to answer usefully. A kind does that without the caller reading messages, and without the business knowing anything of the caller.

There are four kinds:

- `validation`: the input breaks a rule. Example: a transfer of zero units, or of a negative number.
- `not_found`: what the input names does not exist. Example: a transfer from a warehouse id the store does not hold.
- `conflict`: the input is fine, but the current state does not allow the operation. Example: a transfer of 50 units from a warehouse that holds 3.
- `tech_debt`: the condition is possible, but the business has not decided yet what should happen in it. The use case may be called, and refuses honestly, saying that this is a debt and not a rule. Example: a transfer between two warehouses in different countries, for which nobody has decided the customs and tax treatment. Never use it for a rule that forbids the operation: if the business has decided that the operation is refused, the refusal is a `validation`, `not_found` or `conflict` error, and calling it debt would hide a decision behind a promise to decide. And never use it to avoid choosing among the first three: it is for a decision that has not been made, not for one that has not been written.

A caller translates `tech_debt` into its own answer of "not available yet", distinct from the refusals of the other three kinds: those say that a rule was applied and retrying the same call changes nothing until the input or the state changes, while this one says that the operation will exist once the business decides. A caller must not present it as the user's mistake (`validation`), as a missing thing (`not_found`) or as a state to wait out (`conflict`). Because it is a kind and not a message, the debt can be counted without reading messages.

A `tech_debt` refusal that comes from a gap of a scenario map ([P10](DEVELOPMENT_PROCESS.md)) carries the id of that gap, as a field of its own and not inside the message: a reached gap refuses with `tech_debt` and its gap id. The field is optional and is set only with this kind, so there is still one error type and one `instanceof` check. Counted by gap id at run time, and by the marker of the gap in the code ([T25](TECHNICAL_PRACTICES.md)), the debt is counted in both places.

```ts
// src/entity/error.ts (excerpt)
export type BusinessErrorKind = "validation" | "not_found" | "conflict" | "tech_debt";
```

```ts
// src/entity/error.ts (excerpt)
  readonly gap?: string;

  constructor(kind: BusinessErrorKind, message: string, gap?: string) {
    super(message);
    this.name = "BusinessError";
    this.kind = kind;
    if (gap !== undefined) this.gap = gap;
  }
```

### B26. The caller translates business errors; entities and use cases never mention a transport (Mandatory)

Why: the same use case is called over HTTP, by a scheduled job, from a queue and by tests. A use case that speaks of status codes serves only one of them. Each caller turns a kind into its own answer.

```ts
// main.ts (excerpt)
// The caller translates the kind of a business error into what its own users understand.
const answers = { validation: "rejected", not_found: "unknown", conflict: "refused", tech_debt: "not available yet" } satisfies Record<BusinessErrorKind, string>;
```

## The boundary with callers

### B27. A caller makes the context and calls use cases only, never a gateway (Mandatory)

Why: callers are an HTTP handler, a scheduled job, a queue consumer, a test. A caller that calls a gateway goes around every business rule and every wrapper of the use case: no transaction, no audit, no check. The use cases are the whole of what the application offers to the outside.

```ts
// main.ts (excerpt)
const stockTransfer: StockTransfer = container.get("StockTransfer")!.getInstance();
console.log(await stockTransfer(newContext(), { from: "north", to: "south", units: 3 }));
```

## Concurrency

### B28. A use case that reads, decides and then writes is protected by its gateways against a concurrent change (Mandatory)

Why: a decision is only as good as what it was based on. If another request changes that state between the read and the write, the decision is wrong, and the write breaks the rule the decision was meant to keep.

**A transaction alone does not give this protection.** A transaction makes a change all-or-nothing and hides it from others until commit. It does not stop two transactions from reading the same state, each deciding on it, and both committing. Most stores, by default, let each transaction see what was committed when it read, and nothing of what the other has not committed yet; neither sees the other's decision. The problem has two shapes.

**Check-then-insert.** A use case creates a warehouse with id `east` only if there is none yet.

| Step | Request A | Request B |
| --- | --- | --- |
| 1 | begins a transaction | begins a transaction |
| 2 | looks for `east`: none | |
| 3 | | looks for `east`: none, since A has not committed |
| 4 | inserts `east` | |
| 5 | | inserts `east` |
| 6 | commits | |
| 7 | | commits: there are now two warehouses `east` |

Each check was true when it was made. There was nothing to lock, because the thing they both checked for did not exist yet.

**Read-change-save.** Warehouse `north` holds 10 units; two transfers of 6 units each start at once. The rule says stock never goes below zero.

| Step | Transfer A | Transfer B |
| --- | --- | --- |
| 1 | begins, reads `north`: 10 | |
| 2 | | begins, reads `north`: 10, since A has not committed |
| 3 | checks 10 ≥ 6: allowed, computes 4 | |
| 4 | | checks 10 ≥ 6: allowed, computes 4 |
| 5 | saves `north`: 4, commits | |
| 6 | | saves `north`: 4, commits |

Twelve units left a warehouse that held ten, and the store shows 4: one transfer's change is lost, and the rule was broken without either transfer seeing it.

The protection has to keep B from deciding on what A is about to change: B waits for A, or B's write fails because A's came first. Which of the two, and how, is the business of the gateway (B29). In the example, `LockWarehouses` makes B wait at step 2 until A has committed, and B then reads 4 and is refused with a `conflict` error.

### B29. The mechanism of the protection belongs to the gateway and its technology, and shows in the gateway's contract (Mandatory)

Why: the use case is the same whatever stands behind its gateways; only the technology knows how it can guard a change. Written in the contract, the protection is something a reviewer can see and a second implementation must keep. A gateway whose contract says nothing about concurrent change gives no protection, whatever its implementation happens to do.

| Store | Mechanism, for example |
| --- | --- |
| A database | a uniqueness constraint (B31); a lock taken when reading and held until the transaction ends; a version read with the entity and checked when saving, the save failing when it changed |
| A third-party service | a conditional request: change only if the resource still has the version that was read |
| A cache | compare-and-set: write only if the value is still the one that was read |
| A queue | an idempotency key on every message, so that a message handled twice changes things once |

```ts
// src/gateway/warehouse.ts (excerpt)
/**
 * Fetches the warehouses with the given ids, in that order, and keeps every other transaction from changing them until this one commits or rolls back.
 * It takes the locks sorted by id, so that two transactions locking the same warehouses never wait on each other for ever.
 * An id the store does not hold is a `not_found` error.
 */
export type LockWarehouses = ActionHandler<string[], Warehouse[]>;
```

A version checked when saving turns the lost change of B28 into a `conflict` error for the later save, which its caller may retry from the start.

### B30. The entities a use case changes are locked once, by one gateway, which takes the locks in a fixed order (Mandatory)

Why: two transfers between the same two warehouses, one each way, that lock one warehouse each and then wait for the other wait on each other for ever. One gateway call for all of them, locking in an order that does not depend on the request (sorted by id, for example), makes every transaction take the locks the same way, so one always gets both first.

Locking again what the same transaction already holds is not allowed, whatever the store. A lock that is not re-entrant, like the one of the README example, waits for itself, and the transaction hangs. One that is re-entrant lets the second lock through, but hides a second fetch of the same entity: the entities are then no longer locked once, by one gateway, and the second lock is taken outside the fixed order.

### B31. Uniqueness is guarded by the store, not by checking first (Mandatory)

Why: a check before the insert is the check-then-insert of B28, and is true only for the moment it was made. Only the store sees every insert, so only a uniqueness constraint in the store holds. The gateway that inserts, the Insert of B20, turns the store's refusal into a `conflict` business error, and its contract says it does; Save never inserts, so it cannot overwrite a duplicate. A check first is still allowed, for a friendlier message, as long as the constraint is what is relied on.

### B32. An atomic update that moves a business rule into the store is allowed only with a written reason (Optional)

Why: a single conditional update, such as "take 6 units from `north` only if it holds at least 6", is safe against a concurrent change and needs no lock. But the rule "stock never goes below zero" then lives in the store, not in the entity, and B7 and B13 no longer hold for it: the entity's function is bypassed, and the rule exists twice. When the speed is worth that, write down why next to the gateway, and keep the entity's rule as the one that tests describe.

## Effects outside the store

An **effect** is anything a use case does beyond the store its transaction runs on: an email, a message on a queue, a call to a third party, an entry removed from a cache.

### B33. No effect outside the transaction's store happens before the commit (Mandatory)

Why: until the commit, the change may still be rolled back. An effect made before it announces something that may never be stored: an email confirms a transfer that failed, another system takes stock that never moved. An effect cannot be rolled back with the transaction.

### B34. Choose the form of each effect by whether it may be lost: after commit when it may, an outbox when it must not (Mandatory)

Why: an effect run after the commit can still be lost, if the process stops between the commit and the effect, or the effect itself fails. For some effects that is acceptable now and then; for others it is not, and they need a form that survives a stop.

| Effect | May it be lost now and then? | Form |
| --- | --- | --- |
| A notification email, a cache entry removed | yes | after commit |
| A payment event, stock synchronised to another system | no | outbox |

**After commit.** The gateway queues the effect, and it runs once the commit has succeeded; on a rollback it is dropped. How the example wires this is a technical rule, in [TECHNICAL_PRACTICES.md](TECHNICAL_PRACTICES.md).

```ts
// src/gateway/log/warehouse.ts (excerpt)
    // A change that may still be rolled back must not be announced: the line waits for the commit.
    ctx.data.afterCommit.push(() => logger(line));
```

**Outbox.** The message is not sent by the use case at all. Instead:

1. The use case's gateway writes the message as a record in the same store, in the same transaction as the change it reports.
2. The transaction commits: the change and the message are stored together, or neither is.
3. Another process reads the stored messages that have not been sent, and sends each one.
4. Only after the receiver has accepted a message is it marked as sent.

If the sending process stops between steps 3 and 4, the message is sent again when it restarts. Nothing is lost, but a message may arrive twice.

### B35. The receiver of a message sent through an outbox tolerates duplicates (Mandatory)

Why: an outbox guarantees that every message is sent at least once, not exactly once (B34, steps 3 and 4). A receiver that acts twice on the same message pays twice or moves stock twice. Each message carries a key of its own, and the receiver ignores a key it has already handled: the idempotency key of B29.

## Technical rules

How to use Skeleto's mechanism in an application laid out this way (how markers are written, how component functions are named, which wrappers exist and in which order, how the transaction wrapper joins and commits, how effects are queued after commit, and how the list of allowed markers is kept) is the subject of [TECHNICAL_PRACTICES.md](TECHNICAL_PRACTICES.md). The rules here assume those, and do not repeat them.
