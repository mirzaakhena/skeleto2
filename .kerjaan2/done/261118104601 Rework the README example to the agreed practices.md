---
type: task
priority: high
lane: standard
labels: [docs, best-practices]
blocked_by: []
related: [261118104602, 261118104603, 261118104604]
touches: [README.md, BEST_PRACTICES.md, test/readme.test.ts]
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

- [x] Every action, wrapper and config function in the example is prefixed `impl`.
- [x] The use case carries `@Action`, `@UseCase` and `@Transaction`; every gateway carries `@Action` and `@Gateway`; startup passes the allowed markers (`UseCase`, `Gateway`, `Transaction`, `Audit`) as `decorators` from one exported constant `MARKERS` in `src/markers.ts`.
- [x] The use case takes a Request and returns its own Response type, not the warehouse entities.
- [x] The warehouse entity is brought into being by `newWarehouse`; the transfer rule checks the invariants without calling it; no gateway calls it.
- [x] Gateways reach the store only through a function of the context, and the transaction wrapper keeps the open transaction at `ctx.data.transaction` and joins one already there. The transaction wrapper runs the effects queued in the context (`ctx.data.afterCommit`) after a successful commit and drops them when the transaction fails.
- [x] The gateway that fetches the two warehouses for the transfer guards them against a concurrent transfer and fetches them in a fixed order, and the README says in one or two sentences what that guard stands for in a real store. The guard is a real lock (`LockWarehouses` sorts the ids and holds a per-warehouse lock until commit or rollback), and a README test runs two overlapping transfers that together exceed the stock in a separate fixture and expects exactly one error.
- [x] Failures in the example are a `BusinessError` with kind `"validation" | "not_found" | "conflict"`, `main.ts` shows one failing transfer and how the caller translates its kind, and the logging wrapper wraps use cases only, so the printed output no longer lists the gateways.
- [x] The printed output shown in the README matches what the example prints, and the README test passes, with only the words `request` and `response` removed from its ban list.

## Out of scope

- Writing TECHNICAL_PRACTICES.md and the new BEST_PRACTICES.md (separate tickets).
- Any change to Skeleto's own behaviour.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] The README test bans the words 'request' and 'response' (case-insensitive, whole word) in README.md and BEST_PRACTICES.md, a guard left from dropping payload reading. Decision 4 and 603 topic 12 need those words in prose ('a use case has its own Request and Response'). Options: (a) drop only the request/response words from that ban, keep readTypeArguments, @Controller, @RequestPart and payload banned; (b) keep the ban and use other words (Input/Output) everywhere. Recommended (a): the ban guarded against Skeleto reading payload types, not against an application naming its own use-case types; type names like StockTransferRequest are allowed either way.
  → (a) remove only request/response from the ban; readTypeArguments, @Controller, @RequestPart and payload stay banned. (owner, 2026-11-18)
- Q2 [answered] The impl prefix: is the function name always exactly 'impl' + the component (return type) name, for every kind? E.g. the config returning Promise<Database> becomes implDatabase (not implConnectDatabase), LogWrapper's function implLogWrapper, StockTransfer's implStockTransfer. Options: (a) always impl + component name, nothing else; (b) impl + a free verb phrase. Recommended (a): it leaves no word to choose, which 602's naming rules require, and the example must already show it.
  → Yes: always impl + the component name (implDatabase, implLogWrapper, implStockTransfer). (owner, 2026-11-18)
- Q3 [answered] 603 topic 7 keeps gateway contracts apart from implementations, and 602/603 may only quote the README example verbatim. Should this ticket already separate the contract types from the gateway implementations (separate files), so 603 can quote them? Options: (a) yes, in this ticket; (b) no, 603 explains it in prose only. Recommended (a): otherwise 603 cannot show it without changing the README example while 602 runs beside it.
  → Yes: separate contract types from gateway implementations in this ticket. (owner, 2026-11-18)
- Q4 [answered] Form of the typed business errors. Options: (a) one class BusinessError extends Error with kind: 'validation' | 'not_found' | 'conflict', in src/entity/error.ts; (b) three classes ValidationError, NotFoundError, ConflictError in the same file; (c) plain objects thrown with a kind field, no class. Recommended (a): one type to catch and one union to switch on in the caller, and entities import nothing outside the entity folder. Also: should main.ts show one failing transfer and print how the caller translates the kind (one extra output line)? Recommended yes, it is the only place the example shows a caller translating.
  → (a) one BusinessError class with kind 'validation' | 'not_found' | 'conflict'. Yes, main.ts also shows one failing transfer and how the caller translates it. (owner, 2026-11-18)
- Q5 [answered] Context keys and the after-commit queue. Recommended: the transaction wrapper stores the open transaction at ctx.data.transaction and joins it when already set; and this ticket also gives the transaction wrapper the after-commit queue that 602 topic 8 describes (ctx.data.afterCommit, run after a successful commit, dropped on failure), because 602 must show it as running code and may only quote the example. That adds a Done when line: 'The transaction wrapper runs the effects queued in the context after a successful commit and drops them when the transaction fails.' Options: (a) add it here as recommended; (b) leave after-commit to 602 under the code mechanism of 602's question. Which?
  → Yes (a): transaction at ctx.data.transaction, joined when set; add the after-commit queue (ctx.data.afterCommit) here, with the new Done when line. (owner, 2026-11-18)
- Q6 [answered] The @Audit {"level": "info"} marker: keep it on the use case next to @UseCase and @Transaction? It is the only example of a marker with data, which the README test asserts. Options: (a) keep, decorators list becomes UseCase, Gateway, Transaction, Audit; (b) drop it and show marker data elsewhere or not at all. Recommended (a).
  → (a) keep @Audit {"level": "info"}; decorators are UseCase, Gateway, Transaction, Audit. (owner, 2026-11-18)
- Q7 [answered] The config that fills the in-memory store: may it call newWarehouse to seed it? Options: (a) it writes the stored records as plain data, since they stand for rows already in a store, and nothing outside a use case's creation path calls newWarehouse; (b) it calls newWarehouse. Recommended (a), consistent with 'validate on write, not on read'.
  → (a) yes: the config writes the stored records as plain data and does not call newWarehouse. (owner, 2026-11-18)
- Q8 [answered] Name grammar and file layout (602 writes them as rules). Today use cases are noun-first (StockTransfer), gateways verb-first (FindWarehouse) and share one file per technology. Recommended: use case <Area><Verb>, file usecase/<area>/<snake_case name>.ts, <area> = first word of the name; gateway <Verb><Entity> (FindWarehouse, SaveWarehouse, LockWarehouses), contracts in gateway/<entity>.ts, implementations in gateway/<technology>/<entity>.ts; parameter = its type in camelCase. Alternatives: one gateway file per technology holding contracts too; entity-first gateway names (WarehouseFind). Which?
  → Recommended scheme: use cases <Area><Verb> in usecase/<area>/<snake_name>.ts (<area> = first word of the name); gateways <Verb><Entity>; contracts in gateway/<entity>.ts, implementations in gateway/<technology>/<entity>.ts; parameter named after its type in camelCase. (owner, 2026-11-18)
- Q9 [answered] The concurrency guard in the in-memory store. Recommended (a): gateway LockWarehouses (ActionHandler<string[], Warehouse[]>) sorts the ids, takes a real per-warehouse lock held until the transaction wrapper commits or rolls back, then reads; README says it stands for locking rows when reading. Alternatives: (b) a version checked on save (then fixed order is pointless); (c) a pretend lock. And should the README test prove it with two overlapping transfers exceeding the stock, expecting exactly one error, in a separate fixture main so the README output is unchanged? Recommended: (a) with that proof.
  → (a) a real lock: LockWarehouses sorts the ids and holds a per-warehouse lock until commit or rollback; plus a README test running two overlapping transfers in a separate fixture and expecting one error. (owner, 2026-11-18)
- Q10 [answered] 602 topic 5 keeps the list of allowed markers in one place. Should the example already hold it as an exported constant (e.g. export const MARKERS = ["UseCase", "Gateway", "Transaction", "Audit"] in src/markers.ts, passed as decorators: MARKERS in main.ts) instead of an inline array? Recommended yes, so 602 can quote it; the README test's typo check keeps working.
  → Yes: export const MARKERS in src/markers.ts, passed as decorators: MARKERS. (owner, 2026-11-18)

## Assumptions
- A1 [unseen] This ticket updates the excerpts and assertions of the current BEST_PRACTICES.md only as far as needed for the README test to pass with the new example; 261118104603 rewrites the file.
  Why: CLAUDE.md section 9 requires the tests to pass, and test/readme.test.ts requires every BEST_PRACTICES.md excerpt to be verbatim from the README example
  If wrong: Revert the BEST_PRACTICES.md edits; 603 rewrites the file anyway
- A2 [unseen] Use cases and gateways are found in tests by their @UseCase / @Gateway markers in the container metadata, no longer by the src/usecase/ path; the README test assertions are updated accordingly.
  Why: Decision 2 says they are told apart by markers, never by names
  If wrong: Restore the path-based lookup in test/readme.test.ts

## Decisions
- Lane standard: rewrites the runnable README example and the README test that checks it; docs only, no Skeleto code
- Not solo but first: 602 and 603 quote the README example verbatim (excerpt rule of test/readme.test.ts), so they wait for it via blocked_by; nothing else is in flight
- Two configs, Connection (async, begins transactions, used only by the transaction wrapper) and Database (ctx => the transaction in ctx, used by gateways), because decision 6 wants gateways to get a function of the context while the wrapper still needs something to begin with
- FindWarehouse was dropped; the transfer reads through LockWarehouses only. A third gateway NotifyWarehouses (log technology) exists to show ctx.data.afterCommit in the printed output

## Handoff
The README example now follows the 2026-11-18 decisions: impl+component names, @UseCase/@Gateway markers from MARKERS (src/markers.ts), BusinessError kinds, newWarehouse, contracts in src/gateway/warehouse.ts and implementations in src/gateway/memory and src/gateway/log, Database as a function of the context, a per-warehouse lock in implConnection, and a transaction wrapper that joins ctx.data.transaction and runs ctx.data.afterCommit after commit. test/readme.test.ts asserts these names and the exact output lines, and runs race.ts and transactions.ts fixtures. 602 and 603 must quote these blocks verbatim; editing any README block can break BEST_PRACTICES.md excerpts and the line-by-line output assertions.

## Review
- 2026-11-18 standard, round 1, at ab70129: passed.
  1: impl-name README test passes in a copy; by reading, all 9 marked functions match the 9 container entries in the asserted output
  2: output test asserts UseCase/Transaction/Audit on StockTransfer and Gateway on the 3 gateways; newWarehouse/MARKERS test asserts src/markers.ts and decorators: MARKERS; @Transction typo test still stops startup
  3: StockTransfer is ActionHandler<StockTransferRequest, StockTransferResponse>; output test asserts '{ fromUnits: 7, toUnits: 3 }'
  4: newWarehouse test: transfer does not call it, no gateway/usecase file mentions it, use case has no entity literal
  5: transactions.ts fixture test: one begin for nested actions (joined), effect after commit, dropped on rollback, context cleared; by reading, gateways only call database(ctx)
  6: race test passes; mutation in a copy: without the lock line it fails (both transfers succeed), without .sort() it fails (deadlock); README names SELECT ... FOR UPDATE
  7: error.ts kind union asserted; output test asserts the 'refused: ...' line and only StockTransfer enter/leave lines
  8: stdout equals README block (asserted); ban list diff removes only request/response; README test 16/16 in a copy; no old names left in docs (grep)
  note: impl-name test checks only that the 3 kinds were seen, not that every marked function matched its regex; criterion 1 confirmed by counting
  note: the per-warehouse lock is not re-entrant: a joined inner action that locks a warehouse its outer transaction holds would wait forever; the example never does this
