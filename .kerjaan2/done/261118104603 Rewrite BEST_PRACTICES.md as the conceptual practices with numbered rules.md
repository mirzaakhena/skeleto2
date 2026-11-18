---
type: task
priority: high
lane: standard
labels: [docs, best-practices]
blocked_by: [261118104601]
related: [261118104602, 261118104604]
touches: [BEST_PRACTICES.md, test/readme.test.ts]
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

- [x] Every topic listed in Background appears as at least one numbered rule with a level and a reason.
- [x] The file no longer contradicts itself about how an entity comes into being and how stored data is read.
- [x] The concurrency rule explains, with a step-by-step timeline, why a transaction alone lets two requests break a rule, for both check-then-insert and read-change-save.
- [x] The concurrency and outbox rules name no particular database product, and give at least one example for a store that is not a database.
- [x] No rule refers to a particular application, database product or web framework.
- [x] Every code block in the file runs or is checked by the README test; it shows excerpts of the README example only, and the timelines are tables or numbered lists.
- [x] Every rule is a heading `### B<n>. <rule> (Mandatory|Optional)` followed by a `Why:` paragraph, and the README test checks each has both.
- [x] Technical rules are not repeated here; the file points to TECHNICAL_PRACTICES.md for them.

## Out of scope

- Technical rules (ticket 261118104602).
- The combined reviewer checklist and the architecture test (ticket 261118104604).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Rule number and level format, shared with 602 and parsed by 604. Recommended: heading '### B<n>. <rule in one line> (Mandatory|Optional)' followed by a 'Why:' paragraph; B1, B2, ... here, T1, ... in TECHNICAL_PRACTICES.md; the README test checks every rule heading has a level and a Why. Must match the answer to 602's same question.
  → Heading '### B<n>. <rule> (Mandatory|Optional)' then a 'Why:' paragraph, same format as 602 (T<n>); checked by the README test. (owner, 2026-11-18)
- Q2 [answered] Rules with no counterpart in the README example (determinism gateways for time and ids, a query use case without @Transaction, check-then-insert, the outbox, the context table): shown how? Options: (a) prose, tables and excerpts of the example only, and the two concurrency timelines as Markdown tables or numbered lists (the README test refuses unchecked code blocks); (b) full checked files through 602's mechanism, which 603 cannot rely on while running beside 602. Recommended (a): keeps 602 and 603 independent, and the topics are conceptual.
  → (a) prose, tables and excerpts only; the concurrency timelines as Markdown tables or numbered lists. (owner, 2026-11-18)

## Assumptions
- A1 [confirmed] The README test assertions that pin the old BEST_PRACTICES.md structure (section headings, reasons list, opening table) are rewritten to pin the new structure; the opening on two levels and its table stay asserted.
  Why: Topic 1 keeps the two-level opening; CLAUDE.md section 9 requires the tests to pass
  If wrong: Restore the old assertions
  Confirmed by owner, 2026-11-18
- A2 [confirmed] The Why paragraph comes directly after the rule heading, and any explanation or excerpt follows it
  Why: The owner's format is heading then a Why paragraph; putting it first makes it parseable for 604 without guessing
  If wrong: Relax the README test to accept a Why paragraph anywhere in the rule's section, and move the Why paragraphs
  Confirmed by owner, 2026-11-18
- A3 [confirmed] Standard shapes for save, find one and find many are an Optional rule (B16), separate from the Mandatory rule that keeps contracts apart (B15); find one returns undefined, find many takes a query with a limit
  Why: The owner gave no level for the shapes; they are a convention, not a correctness matter
  If wrong: Change B16 to Mandatory or adjust the shapes in its table
  Confirmed by owner, 2026-11-18
- A4 [confirmed] The link to TECHNICAL_PRACTICES.md is written now although that file arrives with ticket 261118104602
  Why: The two tickets run side by side; the pointer is required by Done when 8
  If wrong: Remove the links if 602 is cancelled
  Confirmed by owner, 2026-11-18

## Decisions
- Lane standard: rewrites a document and the README test assertions that pin it
- Waits for 261118104601: its code blocks are excerpts of the reworked README example. Runs side by side with 261118104602

## Handoff
BEST_PRACTICES.md is rewritten as 31 conceptual rules (B1-B31), each '### B<n>. <rule> (Mandatory|Optional)' followed directly by a 'Why:' paragraph, grouped under ## sections: use cases and gateways, entities, direction of dependencies, gateways, determinism, context, validation and errors, callers, concurrency, effects. Code blocks are verbatim excerpts of README example files, so editing the README example can break them. test/readme.test.ts replaced the old BEST_PRACTICES assertions: rule numbering, level and Why per rule, one heading per agreed topic, per-shape timeline tables, a ban on product and framework names, links to TECHNICAL_PRACTICES.md, and the two-level opening table, which must stay before ### B1. Cited rule numbers (B<n>) must exist.

## Review
- 2026-11-18 standard, round 1, at b937b83: passed.
  1: read all 16 topics against B1-B31 (each has a numbered rule with level and Why); test 'has a rule for every agreed topic' passes on a copy and fails when a level is removed from B10
  2: 'made only through its creating function' is gone; B8 limits new<Entity> to bringing new entities into being and states reading stored data does not use it, B11/B10 allow the gateway mapping literal; asserted by 'resolves how an entity comes into being' (passes)
  3: B24 has a step table per shape (check-then-insert 7 steps, read-change-save 6 steps) with the reason a transaction alone allows both commits; read and checked by the timelines test
  4: B25 and B30/B31 name no product; B25 table covers a third-party service, a cache and a queue; inserting 'Postgres' or 'DynamoDB' into B25 makes the test fail, and removing the queue row fails it as well
  5: read the whole file: no application, database product or web framework; HTTP appears only as a kind of caller (topic 13 itself names it); product-name test passes
  6: all 15 blocks are '(excerpt)' blocks of README example files; on a copy, changing an excerpt (units: 0 -> 1) and adding an unchecked ts block both fail test/readme.test.ts; timelines and outbox are tables and a numbered list
  7: every heading matches '### B<n>. <rule> (Mandatory|Optional)' with 'Why:' next; on a copy, removing a Why, removing a level, renumbering and citing B40 each fail the numbering test
  8: opening and closing paragraphs point to TECHNICAL_PRACTICES.md (present on main from 602); no wiring rule is restated, and after-commit refers to it; removing the links fails the test
  note: the timeline regex needs only 7 lines after the header, so removing one check-then-insert row still passes; criterion 3 was settled by reading the tables
  note: B19 says a gateway 'reads' what a wrapper put in the context, but the B30 excerpt has a gateway pushing to ctx.data.afterCommit; consider 'reads or adds to'
  note: follow-up F1: B16's upserting Save conflicts with B27 (insert must fail on duplicate)
  note: no checks beyond the README test were needed; the full suite had already passed on 77eb64cfdd per the brief and was not re-run

## Follow-ups
- F1 [ticketed] BEST_PRACTICES.md B16 gives the standard Save gateway the behaviour 'inserting or replacing', while B27 requires the gateway that inserts to let the store refuse a duplicate and turn that into a conflict error. A new entity saved through an upserting Save silently replaces an existing one with the same id, which is the check-then-insert of B24. Make B16 say that creating a new entity goes through an insert that fails on a duplicate (or exclude creation from the Save shape), and keep B27 consistent with it.
  → 261118122301
