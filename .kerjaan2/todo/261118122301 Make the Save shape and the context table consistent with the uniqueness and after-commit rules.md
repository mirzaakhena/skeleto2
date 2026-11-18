---
type: bug
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: []
related: [261118104603]
touches: [BEST_PRACTICES.md, REVIEW_CHECKLIST.md, README.md, test/readme.test.ts]
created: 2026-11-18 12:23
---

## Background

The reviewer of ticket 261118104603 found two places where BEST_PRACTICES.md contradicts itself (follow-up F1, accepted by the owner on 2026-11-18):

1. The rule on standard gateway shapes (B16) says the standard Save "inserts or replaces". The uniqueness rule (B27) requires the gateway that inserts to let the store refuse a duplicate and turn the refusal into a conflict error. A new entity saved through a Save that inserts or replaces silently overwrites an existing one with the same id. That is the check-then-insert problem the concurrency rules forbid.
2. The table of who may use the context (B19) says gateways only read the context. The after-commit rule (B30) shows a gateway adding an effect to the after-commit queue in the context.

## How to reproduce

1. Read rule B16 in BEST_PRACTICES.md, then rule B27.
2. A gateway that follows B16 to save a newly created entity breaks B27.
3. Read the context table in B19, then the excerpt in B30: the excerpt does something the table does not allow.

## Request

Make the rules agree. Creating a new entity goes through an Insert shape that fails on a duplicate with a `conflict` error; Save only writes back existing entities and gives `not_found` for one the store does not hold. The context table allows a gateway to queue an after-commit effect.

## Done when

- [ ] The standard shapes of B16 gain a fourth shape, Insert (`InsertWarehouses = ActionHandler<Warehouse[], void>`), which refuses the call with a `conflict` error when the store already holds one of the ids; the B16 heading names insert, and its REVIEW_CHECKLIST.md row and the topic pattern in test/readme.test.ts follow.
- [ ] Save only writes back entities that exist and never creates one: an entity the store does not hold is a `not_found` error, stated in B16 and in the `SaveWarehouses` contract comment, and checked by `implSaveWarehouses` in the README example, whose output does not change.
- [ ] The uniqueness rule and the standard shapes say the same thing.
- [ ] The context table lists queueing an after-commit effect as something a gateway may do, and says nothing B30 contradicts.
- [ ] REVIEW_CHECKLIST.md still lists every rule with the right level, and the README test passes.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] What does Save do with an entity the store does not hold? (a) It is a not_found business error, said in the B16 table and in the SaveWarehouses contract comment of the README example, and implSaveWarehouses (src/gateway/memory/warehouse.ts in the README) checks it like implLockWarehouses does; the example's output does not change because it only saves locked warehouses. (b) B16 only says Save replaces entities fetched earlier in the same transaction and never creates one; what happens otherwise is left to the implementation, and the README example code stays as it is. Recommended: (a), so that a Save that silently creates cannot pass unnoticed and the example shows the rule it states.
  → (a) not_found business error, stated in B16 and the SaveWarehouses contract, checked in implSaveWarehouses. (owner, 2026-11-18)
- Q2 [answered] How does B16 save a new entity? (a) A fourth standard shape, Insert: InsertWarehouses = ActionHandler<Warehouse[], void>, refusing the whole call with a conflict error when the store holds one of the ids (B27); Save only writes back existing entities. The B16 heading becomes 'Give the gateways that insert, save, find one and find many their standard shapes'; its REVIEW_CHECKLIST.md row and the topic pattern in test/readme.test.ts follow. (b) Same, named Create. (c) Three shapes; only say Save never creates. Recommended: (a), 'insert' is the word B24 and B27 use.
  → (a) a fourth standard shape named Insert (InsertWarehouses), refusing with a conflict error when an id exists; Save only writes back existing entities; heading, checklist row and test pattern follow. (owner, 2026-11-18)

## Assumptions
- A1 [unseen] B27 is reworded only to name the Insert shape of B16 as the gateway that inserts (its heading and level stay); the check-then-insert timeline of B24 stays as it is
  Why: the ticket asks the two rules to say the same thing, and B27 already says the right thing; the smallest change is a cross-reference
  If wrong: reword B27 further or change its heading together with its REVIEW_CHECKLIST.md row
- A2 [unseen] The Gateway row of the B19 table becomes: read what a wrapper put there for it, such as the transaction to work in, and queue an effect for the wrapper to run after the commit (B30); the other rows stay
  Why: B19's own Why already says the context carries effects waiting for the commit, and B30 and the README transaction wrapper show the gateway pushing to ctx.data.afterCommit, which the wrapper made
  If wrong: edit that one table row

## Decisions
- Lane standard: docs plus a possible small change to the README example code and its test; cheap to undo but the example is run and excerpted
- Not solo, no blocked_by: shares BEST_PRACTICES.md, REVIEW_CHECKLIST.md and test/readme.test.ts with 261118122302 but in different rules (B16, B19, B27 vs B26) and different tests; the merge queue settles it, provided 261118122302 does not renumber rules (its Q1)
