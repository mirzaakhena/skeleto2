---
type: task
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: [261118104602, 261118104603]
related: [261118104601]
touches: [REVIEW_CHECKLIST.md, README.md, test/readme.test.ts]
created: 2026-11-18 10:46
---

## Background

The owner plans to guard the practices in two ways: mechanical checks, and a reviewing AI agent that runs after every use case is written. The numbered rules in TECHNICAL_PRACTICES.md and BEST_PRACTICES.md are what that agent cites.

Some rules can be checked by a machine using only what Skeleto already offers. After startup, the container holds each component's dependencies and additional markers. With the `@UseCase` and `@Gateway` markers (decided 2026-11-18), an application test can check that:

- every action carries exactly one of `@UseCase` and `@Gateway` (this also catches a forgotten marker, which Skeleto itself cannot see);
- no use case depends on another use case;
- no gateway depends on a use case.

The owner also liked an optional startup guard: a wrapper that remembers which actions are use cases and stops startup when a use case depends on another one. It relies on dependencies being created first, which Skeleto's contract guarantees.

## Request

Give agents one place that lists every rule, and give applications an architecture test they can copy as it is.

## Done when

- [x] REVIEW_CHECKLIST.md, linked from the README next to the two practice files, lists every rule of both practice files with its number, its level, and whether a machine or a reviewer checks it; the README test checks it lists each rule exactly once with the same level.
- [x] The checklist shows the expected form of a review finding: rule number, file and line, and the fix asked for.
- [x] An architecture test that applications can copy is shown in full and run by the README test. It fails when an action carries neither marker, when a use case depends on a use case, and when a gateway depends on a use case.
- [x] The optional startup guard is shown as a wrapper, marked Optional, with the ordering it relies on stated.
- [x] Tests prove that the architecture test and the guard both catch a use case that depends on another use case.

## Out of scope

- Any change to Skeleto's own behaviour or public API.
- A packaged Claude skill built from these documents (to be ticketed once they settle).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Where does the checklist live? Options: (a) a new REVIEW_CHECKLIST.md, linked from the README next to the two practice files; (b) a final section of TECHNICAL_PRACTICES.md. Recommended (a): one place for both files, and a reviewing agent can be given that file alone. And should the README test check that the checklist lists every rule heading of both files exactly once with the same level? Recommended yes, so the checklist cannot drift from the rules.
  → (a) REVIEW_CHECKLIST.md linked from the README next to the two practice files; the README test checks it lists every rule of both files exactly once with the same level. (owner, 2026-11-18)
- Q2 [answered] Where the architecture test and the guard live in the example. Recommended: the architecture test is a full file architecture.test.ts at the project root, starting Skeleto on src and reading the container; the guard is a full file at a new path (e.g. src/wrapper/use_case_guard.ts, per the naming answer) added to the example, printing nothing so the README output stays the same; both run through 602's code mechanism. The proof mutates a copy of the example so StockTransfer depends on another use case and expects both to fail. Alternative: the guard is shown only and not part of the running example. Which?
  → As recommended: architecture.test.ts at the project root; the guard is a running wrapper file at a new path that prints nothing; proof by a mutated copy where StockTransfer depends on another use case, expecting both to fail. (owner, 2026-11-18)

## Assumptions
- A1 [unseen] The guard lives at src/use_case_wrapper.ts and is named UseCaseWrapper; the checklist says that in an application it goes into src/wrappers.ts (T8)
  Why: T8 puts every wrapper in src/wrappers.ts, a README file that cannot be shown in full elsewhere, and the owner asked for a new path; T7 names a wrapper after the marker it reads
  If wrong: Rename the file and type in REVIEW_CHECKLIST.md and the two paths in test/readme.test.ts
- A2 [unseen] The check that no gateway depends on a use case is filed under B4, with a sentence saying why; no new rule was added to BEST_PRACTICES.md
  Why: A gateway runs inside a use case, so a use case behind it is one use case calling another; adding a rule would change the practice file beyond this ticket
  If wrong: Add a rule to BEST_PRACTICES.md, a row in the checklist, and point the third architecture test at it

## Decisions
- Lane standard: a document plus a copyable test and guard that the README test must run and prove
- Waits for 261118104602 and 261118104603: the checklist lists their numbered rules
- Only B1 and B4 are marked Machine: they are what the architecture test checks; everything else, including rules startup partly enforces, is Reviewer, and the README test pins the Machine set to B1 and B4 so the claim cannot outgrow the test

## Handoff
Added REVIEW_CHECKLIST.md: every B and T rule with text, level and Machine/Reviewer, the form of a finding, a full architecture.test.ts (B1 and B4 from container metadata) and an Optional startup guard src/use_case_wrapper.ts. README links it on the practice-files line. test/readme.test.ts reads the checklist's whole files as example.checklist, requires checklist rows to equal the practice headings exactly (renaming or relevelling a rule means editing the checklist), pins Machine to B1 and B4, checks the example finding's line (stock_transfer.ts:18 must stay implStockTransfer), and runs the architecture test and guard against the example and three mutated copies. Adding a wrapper to the README example changes nothing here; changing implStockTransfer's line does.

## Review
- 2026-11-18 standard, round 1, at ba122d6: passed.
  1: Checklist lists B1-B31, T1-T22 with level and checker; README links it on the practice-files line. Both tests pass in a copy; relevelling B5 or duplicating T3 in the copy made the rule test fail, so it guards drift.
  2: 'shows the form of a finding...' passes; it checks the template and that stock_transfer.ts:18 is the implStockTransfer line of the example.
  3: architecture.test.ts shown in full; tests 'type-check ... pass on it' (pass 3) and 'fails when an action carries neither marker, and when a gateway depends on a use case' pass, each asserting fail 1, test name and offender.
  4: Section '## Optional: the startup guard' says Optional and states the ordering; checked against src/skeleto.ts 78-114. Its test passes.
  5: 'both the architecture test and the startup guard catch...' passes; neutralising the guard's throw in a copy made it fail.
  note: repo has no CI or extra check scripts; full suite not rerun per brief. No src/ change (out of scope respected).
