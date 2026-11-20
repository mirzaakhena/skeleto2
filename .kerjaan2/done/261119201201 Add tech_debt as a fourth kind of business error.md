---
type: feature
priority: medium
lane: standard
labels: [docs, best-practices, errors]
blocked_by: []
related: [261118220101]
touches: []
created: 2026-11-19 20:12
---

## Background

Rule B21 of the best practices says business errors are typed by one of three kinds: validation (the input breaks a rule), not found (what the input names does not exist), and conflict (the input is fine but the current state does not allow it). Callers translate each kind into their own answer, without reading messages.

Building the Core first leaves conditions that are possible but not yet handled: the owner has not decided what should happen in them. The owner's decision (2026-11-19) is that a use case reaching such a condition may be called, but must refuse with an error that says honestly that this is technical debt, so that the debt is visible and can be counted.

None of the three kinds says that. A "conflict" would tell the caller the state forbids the operation, when in fact the business has simply not decided yet; and counting such cases would mean reading messages, which B21 exists to avoid.

The wider question of how technical debt fits the core-first workflow is ticket 261118220101; this ticket is only about the error kind.

## Request

Make "tech debt" a fourth kind of business error, next to validation, not found and conflict, everywhere the kinds are described: what it means, when to use it and when not to, and how a caller should treat it (an answer such as "not available yet", distinct from a refusal by a rule). The README example, the error type it shows, and the checklist stay consistent with the rule.

## Done when

- [x] Rule B21 lists four kinds, and says that tech debt is for a possible condition the business has not decided yet, never for a rule that forbids the operation.
- [x] The rule gives at least one example of each of the four kinds.
- [x] The rule says how a caller translates a tech-debt error, apart from the other three kinds.
- [x] The README example's error type includes the fourth kind, and the example still runs with its documented output.
- [x] The review checklist reflects the changed rule.
- [x] The project's checks pass.

## Out of scope

- How technical debt is marked in code, its kinds, and how it is listed and paid off (ticket 261118220101).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
Added tech_debt as the fourth BusinessErrorKind: B21 (heading, four kinds with examples, translation as 'not available yet'), README example type and answers map, BEST_PRACTICES excerpts, REVIEW_CHECKLIST row, and the regex in test/readme.test.ts. Keep README, B21/B22 excerpts and checklist heading in sync.

## Review
- 2026-11-20 standard, round 1, at 91af7a0: passed.
  1: BEST_PRACTICES.md B21 heading and list name four kinds; tech_debt bullet says 'possible, but the business has not decided yet' and 'Never use it for a rule that forbids the operation' (checked by reading; prose)
  2: B21 bullets give an example each: zero/negative units, unknown warehouse id, 50 from 3, cross-country transfer (by reading)
  3: B21 paragraph 'A caller translates tech_debt into ... not available yet, distinct from the refusals of the other three' plus what not to present it as (by reading)
  4: tsx --test test/readme.test.ts via k2 test: 38/38 pass, incl. 'README examples start and print exactly the output' and the error.ts regex with tech_debt; mutation in a copy (dropping tech_debt from answers in README/BEST_PRACTICES) made the type-check tests fail with TS2741, so type and map are tied
  5: REVIEW_CHECKLIST B21 row reads '... conflict, tech debt'; 'REVIEW_CHECKLIST.md lists every rule ... with its text' test passes, which compares it to the B21 heading
  6: k2 recorded typecheck+test+build passing on 8cfcc129ee; readme test file re-run green
  note: README error.ts doc comment 'Which kind of business rule an operation broke' no longer fits tech_debt; follow-up written

## Follow-ups
- F1 [open] README.md src/entity/error.ts example (line 33) documents BusinessErrorKind as 'Which kind of business rule an operation broke', but B21 now says tech_debt is 'a debt and not a rule'; reword the doc comment (e.g. 'Why the business refused an operation') so the type's comment fits all four kinds. Also B21's 'Why:' paragraph still names only three distinctions; consider adding 'not decided yet'.
