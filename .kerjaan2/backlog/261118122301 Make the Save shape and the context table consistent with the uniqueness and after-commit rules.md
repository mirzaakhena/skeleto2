---
type: bug
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: []
related: [261118104603]
touches: []
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

Make the rules agree. Creating a new entity goes through an insert that fails on a duplicate. The context table allows a gateway to queue an after-commit effect.

## Done when

- [ ] The standard shapes say how a new entity is saved so that a duplicate is refused, and no longer allow creating by replacing.
- [ ] The uniqueness rule and the standard shapes say the same thing.
- [ ] The context table lists queueing an after-commit effect as something a gateway may do, and says nothing B30 contradicts.
- [ ] REVIEW_CHECKLIST.md still lists every rule with the right level, and the README test passes.
