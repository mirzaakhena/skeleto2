---
type: feature
priority: medium
lane: standard
labels: [docs, technical-practices, testing]
blocked_by: [261118134601]
related: [261118220101]
touches: [TECHNICAL_PRACTICES.md, REVIEW_CHECKLIST.md, test/readme.test.ts]
created: 2026-11-20 13:58
---

## Background

A second application of the owner, built core-first on Skeleto, wrote down rules that hold for any Skeleto application. The owner decided (2026-11-20) that Skeleto is the source of truth for every application built on it: such rules live in Skeleto's practice files, and an application keeps only its own decisions and cites Skeleto's rule numbers. The owner chose which of those rules become Skeleto rules; this ticket carries three of them, all about how code is written and tested while the Core is being built.

Core-first development builds the Core before the layers it depends on. The second application kept every gateway of that time as a dummy, either in memory or hardcoded, and made sure each use case could be run on its own, without first running other use cases to put data in place. It also found that the rule on comparing whole objects in tests, written for use case tests, holds just as well for tests of entities.

## Request

Add to the technical practices:

- During development a gateway may be a dummy, in memory or hardcoded, behind the same contract as the real one.
- Each use case can be run on its own: its test or its dummy gateways give it the data it needs, without running another use case first.
- The rule that a test compares whole objects, never picked fields, applies to entity tests too.

## Done when

- [ ] The technical practices say a gateway may be an in-memory or hardcoded dummy behind its contract during development, with a reason.
- [ ] The technical practices say each use case can be run on its own, with a reason.
- [ ] The rule on comparing whole objects says it covers entity tests as well as use case tests.
- [ ] The review checklist reflects the new and changed rules, word for word as their headings.
- [ ] The README example still runs with its documented output, and the project's checks pass.

## Out of scope

- How a dummy gateway is marked as technical debt (ticket 261118220101).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Levels: proposal 'a gateway may be a dummy during development' Optional (it is a permission) and 'each use case can be run on its own' Mandatory. Options: (a) as proposed; (b) both Mandatory; (c) other. Recommended (a).
  → Setuju semua: 'dummy gateway allowed' Optional, 'use case runnable alone' Mandatory (owner, 2026-11-20)
- Q2 [answered] T20's heading 'A test compares whole objects, never picked fields' already covers entity tests. Options: (a) keep the heading, extend only its Why and add an entity-test example; (b) reword the heading to name entity and use case tests, which changes its checklist row. Recommended (a): smaller, and the heading is already general.
  → Judul tetap: (a) T20's heading kept, only its Why extended with an entity example (owner, 2026-11-20)
- Q3 [answered] How does a dummy gateway differ from a T18 fake? Options: (a) a dummy is a real component (@Action @Gateway, in memory or hardcoded) that Skeleto starts, used to run the application; a fake is hand-written in a test and never started; the rule says so; (b) leave the distinction unstated. Recommended (a): otherwise the two rules read as overlapping.
  → Ya: one sentence states how a dummy gateway (a started component) differs from a T18 fake (test only) (owner, 2026-11-20)

## Assumptions
- A1 [unseen] Placement and numbering of the new T rules follow the owner's answer on 261120135801's placement question (next free numbers T23, T24)
  Why: 261118134601 Q3 fixed numbers, and the same choice should hold for both files
  If wrong: Place them as answered separately

## Decisions
- Lane standard: two new technical rules and a widened T20 with checklist rows. Waits for 261118134601, which is solo and edits TECHNICAL_PRACTICES.md citations
