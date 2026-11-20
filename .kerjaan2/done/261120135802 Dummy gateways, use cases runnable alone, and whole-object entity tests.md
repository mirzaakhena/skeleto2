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

- [x] The technical practices say a gateway may be an in-memory or hardcoded dummy behind its contract during development, with a reason.
- [x] The technical practices say each use case can be run on its own, with a reason.
- [x] The rule on comparing whole objects says it covers entity tests as well as use case tests.
- [x] The review checklist reflects the new and changed rules, word for word as their headings.
- [x] The README example still runs with its documented output, and the project's checks pass.

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

## Handoff
Added T23 (dummy gateway allowed, Optional) and T24 (each use case runs alone, Mandatory) under Tests in TECHNICAL_PRACTICES.md, after T19, with the next free numbers out of order, as the owner decided on 261120135801. Checklist rows follow the same file order. The T numbering test now requires each number 1..n once, not in reading order. T20 heading unchanged; its body and Why cover entity tests. T23 states how a started dummy differs from a T18 fake.

## Review
- 2026-11-20 standard, round 1, at 3af1d12: sent back.
  Placement contradicts the owner's decision (one instance, for T23 and T24 both). A1 defers to 261120135801 Q1, which the owner answered: '(a) in the topical section with the next free numbers, out of numeric order; the T rules of 261120135802 follow the same way (owner, 2026-11-20)'. The change does the option the owner turned down: a new '## Development' section at the end (TECHNICAL_PRACTICES.md:361-373).
  Fix: move T23/T24 into their topical section, likely '## Tests' near T18/T20, keeping the numbers. Drop '## Development'. Move the REVIEW_CHECKLIST.md rows to the same file order. Relax test/readme.test.ts:531, which requires T{index+1} in reading order, the way 261120135801 did for B (each number 1..n used once). Evidence: on a copy with T23/T24 moved before T21, 'k2 test --dir <copy> -- npx tsx --test test/readme.test.ts' gave pass 38 / fail 2: the T numbering test, and :624 (checklist rows not moved).
  1: The T23 text is sound (Optional per Q1, a Why, and the Q3 dummy-vs-T18-fake sentence). It fails only on placement.
  2: The T24 text is sound (Mandatory per Q1, a Why). It fails only on placement.
  3: Met. The T20 heading is unchanged per Q2, and its body and Why name entity tests with an example. Judged by reading.
  4: Met as written. The rows match the headings word for word, proved by the checklist readme test (ok on a copy of HEAD). They must move with the rules.
  5: Met. readme.test.ts (runs the README example) gave pass 40 / fail 0 on a copy of HEAD. The full suite was recorded as passed on ec674f0839 and was not rerun.
- 2026-11-20 standard, round 2, at 3a42992: passed.
  1: Round 1 finding fixed. T23 is now under '## Tests' after T19 (TECHNICAL_PRACTICES.md:330), keeps its number per 261120135801 Q1, and '## Development' is gone. Text unchanged: Optional, Why, Q3 sentence.
  2: T24 is under Tests (line 336), Mandatory, with a Why. Its T18/T23 citations point to rules that exist.
  3: Carried from round 1, text untouched. T20 heading kept per Q2; body and Why cover entity tests. Judged by reading.
  4: Rows T23/T24 are in file order (REVIEW_CHECKLIST.md:91-92). The checklist readme test passes on a copy of HEAD. The relaxed T numbering test still requires 1..n each once: with T24 renamed T23 in a copy it fails (pass 40 / fail 2).
  5: test/readme.test.ts on a copy of HEAD gave pass 42 / fail 0, and it runs the README example. The full suite was recorded as passed on 69e89092d5 and was not rerun.
