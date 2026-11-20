---
type: feature
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: [261118134601]
related: [261118220101]
touches: [BEST_PRACTICES.md, REVIEW_CHECKLIST.md, test/readme.test.ts]
created: 2026-11-20 13:58
---

## Background

A second application of the owner, built core-first on Skeleto, wrote down rules that hold for any Skeleto application. The owner decided (2026-11-20) that Skeleto is the source of truth for every application built on it: such rules live in Skeleto's practice files, and an application keeps only its own decisions and cites Skeleto's rule numbers. The owner chose which of those rules become Skeleto rules; this ticket carries two of them.

Business processes often depend on time: a payment window, an answer window, a deadline. One way to build them is a scheduler that changes stored state when time passes. The second application chose instead to derive every time-dependent state from what is stored (the last action's result and when it happened) and the current time, and never to store a status that can be computed. That keeps the state correct without a background job, makes the rule testable with a fixed clock, and leaves nothing to drift.

The rules on business errors and entities are renumbered by ticket 261118134601, so this ticket comes after it and takes the next free numbers.

Note on rule numbers (2026-11-20): ticket 261118134601 renumbered the conceptual rules once, B(n) becoming B(n+4). Numbers written below before that ticket landed are the old ones: B18 is now B22.

## Request

Add to the conceptual practices two rules that hold for any application:

- A state that depends on time is derived from the stored state, its time and the current time; no scheduler changes stored state. If a scheduler is ever needed, it is infrastructure that calls use cases, never a place for business rules.
- A derived status is never stored. Only the result of the last action and its time are stored; the effective status is always computed by a function of the entity.

## Done when

- [ ] The conceptual practices hold both rules, each with a level, a reason and an example from the warehouse domain or a neutral one.
- [ ] The rules say what a scheduler may be, if one is ever needed, and that it calls use cases.
- [ ] The review checklist lists both rules, word for word as their headings.
- [ ] No rule names a particular application, product or tool.
- [ ] The project's checks pass.

## Out of scope

- Any change to how Skeleto itself starts or runs.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Where do the two rules sit, now that numbers are fixed and a new rule takes the next free number (261118134601 Q3)? Options: (a) in the section they belong to (Entities, near the entity-function rules), numbered B36/B37 though out of numeric order there; (b) in a new section at the end of the file, so numbers stay in reading order. Recommended (a): readers find them by topic, and the checklist test only needs file order, not numeric order. This choice also settles where 261120135802's T rules go.
  → Di bagian topiknya: (a) in the topical section with the next free numbers, out of numeric order; the T rules of 261120135802 follow the same way (owner, 2026-11-20)
- Q2 [answered] Levels: (a) both Mandatory; (b) 'no scheduler changes stored state' Optional (some domains need one) and 'derived status never stored' Mandatory. Recommended (a): the rule already allows a scheduler as infrastructure that calls use cases, so Mandatory leaves that door open.
  → Setuju semua: both rules Mandatory; a scheduler stays allowed as infrastructure that calls use cases (owner, 2026-11-20)

## Assumptions
- A1 [unseen] The current time in a derived state comes from the clock gateway once at the start of the use case (today's B18) and is passed to the entity function; the rule says so and cites B18 by its new number
  Why: B18 already fixes where unpredictable values come from
  If wrong: Drop the citation

## Decisions
- Lane standard: two new conceptual rules with checklist rows. Waits for 261118134601 (it takes the next free B numbers after the renumbering)
