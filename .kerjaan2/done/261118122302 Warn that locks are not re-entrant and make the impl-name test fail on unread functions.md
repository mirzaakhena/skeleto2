---
type: task
priority: low
lane: standard
labels: [docs, best-practices, test]
blocked_by: []
related: [261118104601]
touches: [BEST_PRACTICES.md, REVIEW_CHECKLIST.md, README.md, test/readme.test.ts]
created: 2026-11-18 12:23
---

## Background

The reviewer of ticket 261118104601 left two notes that did not block it. The owner asked on 2026-11-18 for both to be ticketed.

1. The per-warehouse lock in the README example is not re-entrant. If an action inside a transaction locks a warehouse that the same transaction already holds, it waits for itself and hangs. The example never does this, but nothing in the practices warns against it, and agents copy the example.
2. The README test that checks every component function is named `impl` plus its component name finds the functions with a text pattern. A marked function the pattern does not match is skipped without any message, so a wrongly named function can pass unseen.

## Request

Warn against relocking in the concurrency rules, and make the naming check fail instead of skipping when it cannot read a marked function.

## Done when

- [x] B26 is extended, without renumbering any rule, to say that the entities a use case changes are locked once, by one gateway, and that locking again what the same transaction already holds is not allowed for any store, with both reasons: a lock that is not re-entrant, like the example's, waits for itself and hangs; a re-entrant one hides a second fetch that breaks "locked once, by one gateway" and the fixed order. Its heading, REVIEW_CHECKLIST.md row and the topic pattern in test/readme.test.ts follow.
- [x] One comment line at the lock in `implConnection` of the README example says the lock is not re-entrant; the example output does not change.
- [x] The naming check in the README test runs the real scanner (`scanDirectory`) on a fixture of the example instead of a text pattern, and fails, naming the function, on a wrong name or on any scanner error.
- [x] A test proves that the naming check fails for a marked function with a wrong name written in a form the old pattern skipped.
- [x] REVIEW_CHECKLIST.md still lists every rule with the right level, and the README test passes.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Where does the warning against relocking go? (a) Extend B26 without renumbering: its heading becomes 'The entities a use case changes are locked once, by one gateway, which takes the locks in a fixed order', its Why gains the relocking paragraph, and its REVIEW_CHECKLIST.md row and the 'locks in a fixed order' topic pattern in test/readme.test.ts follow. (b) A new rule right after B26, which renumbers B27-B31 and every citation of them in all four documents and the checklist (this ticket would then have to wait for 261118122301, which edits B27 and cites B30). Recommended: (a), the Done-when line is what B26 already half says, and both tickets can run side by side.
  → (a) extend B26, no renumbering. (owner, 2026-11-18)
- Q2 [answered] How strongly is the reason stated? Many stores let a transaction take a lock it already holds (their locks are re-entrant); the README example's lock is not, and waits for itself. (a) The rule forbids relocking for every store, and gives the reason as: a lock that is not re-entrant, like the example's, waits for itself and the transaction hangs; one that is re-entrant hides a second fetch that breaks 'locked once, by one gateway' and the fixed order. (b) Say flatly that relocking hangs. Recommended: (a), BEST_PRACTICES.md is meant to be true for any store, and (b) is false for many.
  → (a) forbid relocking for every store, with both reasons (non-re-entrant waits for itself; re-entrant hides a second fetch that breaks 'locked once, by one gateway' and the fixed order). Adjust that Done when line, which currently says only 'it hangs', to match. (owner, 2026-11-18)
- Q3 [answered] Should the README example say it too, at the lock itself? (a) Yes: one comment line in lock() of implConnection (src/config.ts in the README) saying it is not re-entrant and that a transaction locking a warehouse it already holds waits for itself; the output does not change, and any excerpt of that file is kept verbatim. (b) No, the practice rule is enough. Recommended: (a), agents copy the example, and the comment travels with the copied code.
  → (a) yes, one comment line at the example's lock. (owner, 2026-11-18)
- Q4 [answered] How does the naming check find marked functions? (a) Write the README example to a fixture and run the real scanner (scanDirectory, src/scanner.ts): each component's function name must be 'impl' + its component name, any scanner error fails the check. The check becomes a function of the files; the new test feeds it the example with one function rewritten in a form the old regex skipped (parameters over several lines) and a wrong name, and asserts it fails naming it. (b) Keep the regex and also fail on any JSDoc block with a main marker it did not read. Recommended: (a), it reads what Skeleto reads.
  → (a) run the real scanner on a fixture of the example. (owner, 2026-11-18)

## Assumptions
- A1 [unseen] The proving test uses forms the old pattern really skipped (blank line or line comment between JSDoc and function, a type parameter), and keeps the multi-line parameters form as an extra case
  Why: The old pattern's [^)]* matched across lines, so multi-line parameters alone would not have shown the old gap
  If wrong: Drop the extra forms from the test's table in test/readme.test.ts

## Decisions
- Lane standard: a rule text plus a rewrite of a README test check and a new test proving it fails
- Not solo, no blocked_by: runs beside 261118122301 as long as the warning extends B26 instead of inserting a new rule; if the owner chooses a new numbered rule (Q1 option b), it renumbers B27-B31 and must wait for 261118122301

## Handoff
B26 keeps its number; its heading now reads 'The entities a use case changes are locked once, by one gateway, which takes the locks in a fixed order', and its Why gains a paragraph forbidding relocking for every store (non-re-entrant waits for itself; re-entrant hides a second fetch). REVIEW_CHECKLIST.md row and the topic pattern in test/readme.test.ts follow, plus an assertion on that paragraph. The README lock() in implConnection has one comment line; output unchanged, and excerpts of src/config.ts must stay verbatim. The impl-name check is now checkImplNames(files) in test/readme.test.ts: it scans a fixture with scanDirectory and the example's MARKERS, so any scanner error fails it; a new test feeds it a renamed implSaveWarehouses in several forms.

## Review
- 2026-11-18 standard, round 1, at 3f8eb3b: passed.
  1: B26 heading/Why extended without renumbering (BEST_PRACTICES.md:361-365), both reasons present; checklist row and topic pattern follow; grep finds no stale 'locked together' wording; README test file passes (38/38) incl. the new body assertions
  2: one comment line above lock() in implConnection (README.md:116); README output and excerpt tests pass in the readme.test.ts run
  3: checkImplNames runs scanDirectory with the example's MARKERS (parsed from README src/markers.ts, non-null) and asserts errors empty; instrumented copy showed the failure message lists 'storeWarehouses is not impl + SaveWarehouses'
  4: new test's 4 forms + scanner-error subtest all pass; ran the old regex in a copy: it matched none of the blank-line, line-comment and type-parameter forms (multi-line form matched, kept as extra as the test says), so the test covers forms the old pattern skipped
  5: REVIEW_CHECKLIST test (ok 27) passes with B26 Mandatory; full suite recorded green on 8c3f78519b by k2 test; no other check scripts beyond typecheck/test/build
  note: assert.deepEqual with a custom message relies on Node 22 appending the diff to name the function; works on v22.20.0 here
