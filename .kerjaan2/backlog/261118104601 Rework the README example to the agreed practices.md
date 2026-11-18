---
type: task
priority: high
lane: standard
labels: [docs, best-practices]
blocked_by: []
related: [261118104602, 261118104603, 261118104604]
touches: []
created: 2026-11-18 10:46
---

## Background

The owner reviewed BEST_PRACTICES.md with an independent reviewer on 2026-11-18. The documents are meant to be read by AI agents writing applications on Skeleto, in any project, so they must stand on their own. They must not refer to any particular application, database or web framework. The README is not the source of truth and may be changed for clarity.

The example in the README (moving stock between warehouses) is what agents will copy. It currently teaches patterns the owner has now decided against. Two of them are actually wrong: a read-change-save with no protection against concurrent change, and a single "create" function used both to bring an entity into being and to check a changed one.

Decisions the owner made (2026-11-18), which the example must follow:

1. The function behind every `@Action` is prefixed `impl` (`implStockTransfer`), because every action implements a contract type. Wrappers and configs follow the same prefix.
2. Two additional markers sit next to `@Action`: `@UseCase` and `@Gateway`. Neither takes data. Skeleto itself is not changed. Both go in the `decorators` list. Use cases and gateways are told apart by these markers, never by their names.
3. `@Transaction` stays a marker of its own, placed on use cases.
4. A use case has its own Request and Response types and does not return raw entities.
5. An entity is brought into being only through `new<Entity>` (for example `newWarehouse`). An existing entity is changed only through entity functions that check the invariants and return a new copy. A use case never writes an entity literal. A gateway that reads only maps stored data to the type: it applies no business rule and does not call `new<Entity>`.
6. A resource that holds a connection or session reaches gateways as a function of the context (for example `type Database = (ctx: Context) => ...`). That way a gateway cannot skip the transaction the wrapper opened.
7. The transaction wrapper puts the open transaction into the context. When the context already carries a transaction, the wrapper joins it instead of opening a second one.
8. A use case that reads, decides and then writes is protected against concurrent change by its gateway, and the contract shows it. Several entities locked together are fetched by one gateway, in a fixed order.
9. Business errors are typed (validation, not found, conflict). The caller translates them; entities and use cases never mention HTTP.

## Request

Rework the README example so that every part of it follows the decisions above and none of it shows a pattern they rule out. The example must stay small enough to read in one sitting, keep its in-memory store, and keep running under the README test.

## Done when

- [ ] Every action, wrapper and config function in the example is prefixed `impl`.
- [ ] The use case carries `@Action`, `@UseCase` and `@Transaction`; every gateway carries `@Action` and `@Gateway`; startup lists both new markers in `decorators`.
- [ ] The use case takes a Request and returns its own Response type, not the warehouse entities.
- [ ] The warehouse entity is brought into being by `newWarehouse`; the transfer rule checks the invariants without calling it; no gateway calls it.
- [ ] Gateways reach the store only through a function of the context, and the transaction wrapper joins a transaction already in the context.
- [ ] The gateway that fetches the two warehouses for the transfer guards them against a concurrent transfer and fetches them in a fixed order, and the README says in one or two sentences what that guard stands for in a real store.
- [ ] Failures in the example are typed business errors, and the logging wrapper wraps use cases only, so the printed output no longer lists the gateways.
- [ ] The printed output shown in the README matches what the example prints, and the README test passes.

## Out of scope

- Writing TECHNICAL_PRACTICES.md and the new BEST_PRACTICES.md (separate tickets).
- Any change to Skeleto's own behaviour.
