---
type: task
priority: high
lane: standard
labels: [docs, best-practices]
blocked_by: [261118104601]
related: [261118104602, 261118104604]
touches: []
created: 2026-11-18 10:46
---

## Background

On 2026-11-18 the owner decided that BEST_PRACTICES.md becomes the **conceptual** half of the practices: how an application on Skeleto is divided. Its technical half, how to use Skeleto's mechanism, moves to TECHNICAL_PRACTICES.md (ticket 261118104602). Both files are read by AI agents writing code in any project. They must stand alone and must not refer to any particular application, database or web framework. Every rule carries a number and a level, **Mandatory** or **Optional**.

The current file is thin and has two flaws. It says an entity is "made only through its creating function", yet it also praises taking stored data "as it is"; the two contradict each other. Its example also teaches a read-change-save with no guard against concurrent change.

Decisions and topics the owner agreed for the conceptual side:

1. Keep the opening on the two levels (mechanism versus policy).
2. Use cases and gateways are told apart by the markers `@UseCase` and `@Gateway`, placed next to `@Action`, never by their names.
3. One use case per file, with the rule that turns a use case name into its file name.
4. Entities: a plain type and pure functions that return new copies. An entity is **brought into being** only by `new<Entity>`, which holds the creation rules and initial values (Mandatory). An existing entity is **changed** only by entity functions that check the invariants (Mandatory). A use case never writes an entity literal (Mandatory). A gateway that reads only maps stored data and applies no business rule, because rules change and old data must stay readable: validate on write, not on read (Mandatory). Storage constraints that mirror important invariants are Optional.
5. A use case only orchestrates and never depends on another use case.
6. Direction of imports: entities import nothing outside entities; use cases know only the contract types of gateways.
7. Gateway contracts are kept apart from their implementations, with standard shapes for save, find one and find many. Gateways are not only databases: queues, brokers, caches, third-party services and generators of unpredictable values are gateways too.
8. Determinism: every unpredictable value (current time, ids, random tokens, salted hashes) comes from its own gateway and is called once, at the start of the use case.
9. A use case only passes the context on and never reads it. Include a table of who may use the context and how.
10. Two levels of validation: the shape of the input is checked by the caller, business rules by entities.
11. Typed business errors (validation, not found, conflict). The caller translates them; entities and use cases never mention a transport such as HTTP.
12. A use case has its own Request and Response and does not return raw entities.
13. The boundary with callers (HTTP, scheduled jobs, queue consumers, tests): a caller makes the context, calls use cases only, and never calls a gateway.
14. A query never writes: a use case without `@Transaction` depends only on gateways that read.
15. Concurrency (Mandatory). A use case that reads, decides and then writes must be protected against a concurrent change by its gateways. A transaction alone does not give this protection; explain why, with the two shapes of the problem: check-then-insert and read-change-save. The mechanism belongs to the gateway and its technology: a uniqueness constraint, a lock taken when reading, a version checked when saving, a conditional request to a third party, compare-and-set in a cache, an idempotency key for a queue. The protection shows in the contract. Several entities locked together are fetched by one gateway, in a fixed order. Uniqueness is guarded by the store, not by checking first. An atomic update that moves a business rule into the store is allowed only with a written reason (Optional).
16. Effects outside the transaction's store never happen before commit (Mandatory), and the form is chosen per effect. An effect that may be lost now and then (a notification email, a cache invalidation) uses after-commit, which TECHNICAL_PRACTICES.md shows. An effect that must not be lost (a payment event, stock synchronised to another system) uses an outbox: the message is written to the store in the same transaction and sent by another process, so its receiver must tolerate duplicates. The outbox is explained as a concept, without code tied to a product.

## Request

Rewrite BEST_PRACTICES.md around the topics above as numbered rules, each marked Mandatory or Optional, each with its reason. Its examples follow the reworked README example and run under the README test, as they do today.

## Done when

- [ ] Every topic listed in Background appears as at least one numbered rule with a level and a reason.
- [ ] The file no longer contradicts itself about how an entity comes into being and how stored data is read.
- [ ] The concurrency rule explains, with a step-by-step timeline, why a transaction alone lets two requests break a rule, for both check-then-insert and read-change-save.
- [ ] The concurrency and outbox rules name no particular database product, and give at least one example for a store that is not a database.
- [ ] No rule refers to a particular application, database product or web framework.
- [ ] Every code block in the file runs or is checked by the README test.
- [ ] Technical rules are not repeated here; the file points to TECHNICAL_PRACTICES.md for them.

## Out of scope

- Technical rules (ticket 261118104602).
- The combined reviewer checklist and the architecture test (ticket 261118104604).
