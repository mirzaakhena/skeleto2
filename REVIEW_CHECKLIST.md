# Review checklist

Every rule of [BEST_PRACTICES.md](BEST_PRACTICES.md) and [TECHNICAL_PRACTICES.md](TECHNICAL_PRACTICES.md), in one list, for whoever reviews a change to an application built on Skeleto: a person, or an agent given this file. The rules themselves, with their reasons and code, are in those two files; this one says only which rules there are, how strong each is, and who checks it.

## How to review

- **Machine** rules are checked by the [architecture test](#the-architecture-test) below. Run it; a reviewer does not check them by reading.
- **Reviewer** rules are checked by reading the change. Skeleto checks none of them.
- A change that breaks a **Mandatory** rule gets a finding, always.
- A change that departs from an **Optional** rule gets a finding only when it gives no reason in a comment.
- Cite a rule by its number only (`B8`, `T11`). Numbers are never reused, so a citation keeps its meaning.

## Writing a finding

Every finding names one rule, one place and one fix, on one line:

> `<rule> <file>:<line>: <what breaks the rule>. Fix: <the change asked for>.`

For example, in a copy of the README example where `implStockTransfer` also asks for a use case `StockCount`:

> B8 src/usecase/stock/stock_transfer.ts:18: `implStockTransfer` depends on the use case `StockCount`. Fix: move the step the two share into an entity function or a gateway, and depend on that instead.

The line is the line of the code that breaks the rule. A finding without a rule number, a place or a fix is not a finding: rewrite it until it has all three.

## Best practices

| Rule | What it says | Level | Checked by |
| --- | --- | --- | --- |
| B1 | Start from the list of use cases, not from the list of screens | Optional | Reviewer |
| B2 | Name and shape the Request and the Response after the business operation, not after a screen; no field exists only because a screen shows it | Mandatory | Reviewer |
| B3 | A screen may call many use cases and a use case may serve many callers; the two are not paired one to one | Mandatory | Reviewer |
| B4 | A view that needs data gathered for one screen is served on the caller's side, or by a query use case of its own, not by changing an existing use case | Optional | Reviewer |
| B5 | Mark every use case `@UseCase` and every gateway `@Gateway`, next to `@Action` | Mandatory | Machine: the architecture test |
| B6 | Put each use case in a file of its own, named after it | Mandatory | Reviewer |
| B7 | A use case only orchestrates: it fetches through gateways, calls entity functions, and saves through gateways | Mandatory | Reviewer |
| B8 | A use case never depends on another use case | Mandatory | Machine: the architecture test |
| B9 | A use case has its own Request and Response types and does not return entities | Mandatory | Reviewer |
| B10 | A query never writes: a use case without `@Transaction` depends only on gateways that read | Mandatory | Reviewer |
| B11 | An entity is a plain type with pure functions that return new copies | Mandatory | Reviewer |
| B12 | A new entity is brought into being only by `new<Entity>`, which holds the creation rules and the initial values | Mandatory | Reviewer |
| B13 | An existing entity is changed only by entity functions, which check its invariants | Mandatory | Reviewer |
| B14 | A use case never writes an entity literal | Mandatory | Reviewer |
| B15 | A gateway that reads maps stored data to the type and applies no business rule: validate on write, not on read | Mandatory | Reviewer |
| B16 | Let the store enforce the most important invariants as well | Optional | Reviewer |
| B17 | Entities import nothing outside entities | Mandatory | Reviewer |
| B18 | A use case knows gateways only by their contract types | Mandatory | Reviewer |
| B19 | Keep a gateway's contract apart from its implementation | Mandatory | Reviewer |
| B20 | Give the gateways that insert, save, find one and find many their standard shapes | Optional | Reviewer |
| B21 | Everything outside the process is reached through a gateway, not only stores | Mandatory | Reviewer |
| B22 | Every unpredictable value comes from a gateway of its own and is asked for once, at the start of the use case | Mandatory | Reviewer |
| B23 | A use case passes the context on and never reads it | Mandatory | Reviewer |
| B24 | Check the shape of the input in the caller and the business rules in the entities | Mandatory | Reviewer |
| B25 | Business errors are typed by kind: validation, not found, conflict, tech debt | Mandatory | Reviewer |
| B26 | The caller translates business errors; entities and use cases never mention a transport | Mandatory | Reviewer |
| B27 | A caller makes the context and calls use cases only, never a gateway | Mandatory | Reviewer |
| B28 | A use case that reads, decides and then writes is protected by its gateways against a concurrent change | Mandatory | Reviewer |
| B29 | The mechanism of the protection belongs to the gateway and its technology, and shows in the gateway's contract | Mandatory | Reviewer |
| B30 | The entities a use case changes are locked once, by one gateway, which takes the locks in a fixed order | Mandatory | Reviewer |
| B31 | Uniqueness is guarded by the store, not by checking first | Mandatory | Reviewer |
| B32 | An atomic update that moves a business rule into the store is allowed only with a written reason | Optional | Reviewer |
| B33 | No effect outside the transaction's store happens before the commit | Mandatory | Reviewer |
| B34 | Choose the form of each effect by whether it may be lost: after commit when it may, an outbox when it must not | Mandatory | Reviewer |
| B35 | The receiver of a message sent through an outbox tolerates duplicates | Mandatory | Reviewer |

## Technical practices

| Rule | What it says | Level | Checked by |
| --- | --- | --- | --- |
| T1 | A component is a function that takes its dependencies and returns what it provides | Mandatory | Reviewer |
| T2 | The outer step only keeps its dependencies; the work of a call happens in the handler | Mandatory | Reviewer |
| T3 | Every component has a named type alias, and the alias is the component's name | Mandatory | Reviewer |
| T4 | Every type used as a dependency is a named alias, never an inline or generic type | Mandatory | Reviewer |
| T5 | The function behind a component is named `impl` followed by the component's name | Mandatory | Reviewer |
| T6 | A dependency parameter is named after its type, with the first letter in lower case | Mandatory | Reviewer |
| T7 | A component's name is built from the words of the table below, and from nothing else | Mandatory | Reviewer |
| T8 | A file's path follows from the name of what it holds | Mandatory | Reviewer |
| T9 | A JSDoc block holds the description first, then the markers, one per line, with nothing after a marker but its data | Mandatory | Reviewer |
| T10 | The allowed markers are kept in one exported constant, which is always passed to `Skeleto.start` | Mandatory | Reviewer |
| T11 | One wrapper per marker, named after it, whose first step returns the handler unchanged when its marker is absent | Mandatory | Reviewer |
| T12 | The transaction wrapper opens the transaction and keeps it in the context | Mandatory | Reviewer |
| T13 | Gateways reach their resource only through a function of the context | Mandatory | Reviewer |
| T14 | A transaction already in the context is joined, never doubled | Mandatory | Reviewer |
| T15 | An effect outside the transaction's store happens only after commit | Mandatory | Reviewer |
| T16 | An asynchronous config sets its own timeout | Mandatory | Reviewer |
| T17 | Instances are taken from the container once, at startup, by the start of the application only | Mandatory | Reviewer |
| T18 | A use case is tested by calling its `impl` function with hand-written fakes typed by the gateway contracts, without starting Skeleto and without a mock library | Mandatory | Reviewer |
| T19 | The fakes fix every unpredictable value | Mandatory | Reviewer |
| T20 | A test compares whole objects, never picked fields | Mandatory | Reviewer |
| T21 | One integration test starts Skeleto, and proves that the application starts | Mandatory | Reviewer |
| T22 | Test files and generated files are left out of the scan | Mandatory | Reviewer |

## The architecture test

Skeleto knows nothing of use cases and gateways, but after startup its container holds every action with its dependencies and its additional markers, and that is enough to check B5 and B8. Copy this file as it is to the root of your application, next to `main.test.ts` (T21); it reads the same `MARKERS` (T10).

It fails, naming each action at fault:

- when an action carries neither `@UseCase` nor `@Gateway`, or both (B5). This also catches a forgotten marker, which Skeleto cannot see: to it an unmarked action is as good as any;
- when a use case depends on another use case (B8);
- when a gateway depends on a use case. A gateway is called from inside a use case, so a use case behind it is a use case called by another one, which B8 forbids.

```ts
// architecture.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { Skeleto } from "skeleto";
import { MARKERS } from "./src/markers.js";

type Role = "UseCase" | "Gateway";
type Action = { roles: Role[]; dependencies: string[] };

/** Every action in the container, with the roles its markers give it (B5). */
async function readActions(): Promise<Map<string, Action>> {
  const container = (await Skeleto.start("src", { decorators: MARKERS })).getContainer();
  const actions = new Map<string, Action>();
  for (const [name, component] of container) {
    const { mainDecorator, additionalDecorators, dependencies } = component.getMetadata();
    if (mainDecorator.name !== "Action") continue;
    const roles = additionalDecorators.map((decorator) => decorator.name).filter((marker): marker is Role => marker === "UseCase" || marker === "Gateway");
    actions.set(name, { roles, dependencies });
  }
  return actions;
}

/** Every dependency on a use case of the actions that have the given role, as `<action> -> <use case>`. */
function useCaseDependencies(actions: Map<string, Action>, role: Role): string[] {
  const useCases = [...actions].filter(([, action]) => action.roles.includes("UseCase")).map(([name]) => name);
  return [...actions]
    .filter(([, action]) => action.roles.includes(role))
    .flatMap(([name, action]) => action.dependencies.filter((dependency) => useCases.includes(dependency)).map((dependency) => `${name} -> ${dependency}`));
}

test("B5: every action is marked exactly one of @UseCase and @Gateway", async () => {
  const unmarked = [...(await readActions())].filter(([, action]) => action.roles.length !== 1).map(([name, action]) => `${name}: ${action.roles.join(" and ") || "neither"}`);
  assert.deepEqual(unmarked, []);
});

test("B8: no use case depends on another use case", async () => {
  assert.deepEqual(useCaseDependencies(await readActions(), "UseCase"), []);
});

test("B8: no gateway depends on a use case", async () => {
  assert.deepEqual(useCaseDependencies(await readActions(), "Gateway"), []);
});
```

## Optional: the startup guard

The architecture test catches a use case that depends on another one when the tests run. The guard below catches it every time the application starts, test or not, and stops startup with the names of both. It is **Optional**: the architecture test is enough, and the guard costs one wrapper.

It relies on an ordering that Skeleto guarantees: an action's dependencies are created before the action, and every action is offered to every wrapper as soon as it is created. So when a use case is offered to the guard, every use case it depends on has already been offered, and has been remembered.

```ts
// src/use_case_wrapper.ts
import type { WrapperHandler } from "skeleto";

export type UseCaseWrapper = WrapperHandler;

/**
 * Optional. Stops startup when a use case depends on another use case (B8).
 * It relies on Skeleto creating the dependencies of an action before the action, and offering each action to every wrapper as soon as it is created:
 * the use cases a use case depends on have therefore been offered, and remembered, before it.
 *
 * @Wrapper
 */
export function implUseCaseWrapper(): UseCaseWrapper {
  const useCases = new Set<string>();
  return (handler, metadata) => {
    if (!metadata.additionalDecorators.some((decorator) => decorator.name === "UseCase")) return handler;
    const called = metadata.dependencies.filter((dependency) => useCases.has(dependency));
    if (called.length > 0) throw new Error(`use case ${metadata.name} depends on use case ${called.join(", ")}, which B8 forbids`);
    useCases.add(metadata.name);
    // It only watches: the handler is returned as it is, so the guard adds nothing to a call.
    return handler;
  };
}
```

It is shown here in a file of its own so that it can be copied whole; in your application it goes into `src/wrappers.ts` with the other wrappers (T8). Its name follows T7: it reads the `@UseCase` marker. Being a wrapper, it is listed in the container like any other.
