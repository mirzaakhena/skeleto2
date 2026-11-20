---
type: task
priority: low
lane: light
labels: [docs, best-practices, errors]
blocked_by: []
related: [261119201201]
touches: [README.md, BEST_PRACTICES.md]
created: 2026-11-20 10:08
---

## Background

Ticket 261119201201 made "tech debt" a fourth kind of business error, next to validation, not found and conflict. The best practices now say tech debt is a debt and not a rule: the business has simply not decided yet what should happen.

Two places still speak as if every business error were a broken rule. The comment on the error kind in the README example describes it as the kind of business rule an operation broke. The "Why" paragraph of the rule on business errors still names only three distinctions.

Note on rule numbers (2026-11-20): ticket 261118134601 renumbered the conceptual rules once, B(n) becoming B(n+4). Numbers written below before that ticket landed are the old ones: B21 is now B25.

## Request

Make the wording in those two places, and in the README sentence just above the example's error type that says the kind tells which rule was broken (owner, 2026-11-20), fit all four kinds, so that a reader is not told that a tech-debt error is a broken rule.

## Done when

- [ ] The comment on the error kind in the README example describes all four kinds, e.g. why the business refused an operation, not which rule it broke.
- [ ] The README sentence above the example's error type no longer says the kind tells which rule was broken.
- [ ] The "Why" paragraph of the business error rule names the "not decided yet" distinction next to the other three.
- [ ] The README example still runs with its documented output.
- [ ] The project's checks pass.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] The README prose just above the example's error.ts (line 29) also says a BusinessError's kind 'says which rule was broken'. Fix that sentence too? Options: (a) yes, same wording change as the comment; (b) no, only the two places the ticket names. Recommended (a): it tells the reader the same wrong thing, and leaving it would defeat the ticket's purpose.
  → Ya, ikut diperbaiki: (a) the README sentence above error.ts is fixed with the same wording change (owner, 2026-11-20)
- Q2 [answered] B21's heading ('Business errors are typed by kind: validation, not found, conflict, tech debt') stays as it is, and only its first Why paragraph gains the 'not decided yet' distinction? Options: (a) heading untouched, Why paragraph only; (b) reword the heading too. Recommended (a): the heading already lists the four kinds, and changing it also changes the REVIEW_CHECKLIST row and the test topic pattern for no gain.
  → Judul tetap: (a) B21 heading untouched, only its Why paragraph gains 'not decided yet' (owner, 2026-11-20)

## Assumptions
- A1 [unseen] The edited README comment stays inside src/entity/error.ts's block and no BEST_PRACTICES excerpt of that file includes the comment line, so excerpts stay verbatim; if one does, the excerpt is updated in the same change
  Why: Lessons: README excerpts must stay verbatim parts of the example file
  If wrong: Revert the excerpt edit

## Decisions
- Lane light: two wording edits in documentation, cheap to undo
- Not solo and waits for nothing: it touches B21 in BEST_PRACTICES.md and the error.ts block in README.md, which 261118134601 also edits, but only as overlapping text; the merge queue settles it
