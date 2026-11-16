---
type: feature
priority: high
lane: standard
labels: []
blocked_by: [261116100203, 261116100204]
related: []
touches: [src/skeleto.ts, src/index.ts, test/skeleto.test.ts, test/fixture.ts]
created: 2026-11-16 10:02
---

## Background

This is where everything comes together: startup scans the directory, checks every rule, and only then imports the application files, creates each component in order and wraps every action. Until now the main class is a placeholder.

## Request

Provide startup, instantiation and the container as `CLAUDE.md` sections 4.6 to 4.8 describe them, on top of the scanner and the dependency sorter, replacing the placeholder. Every mistake from sections 4.1 to 4.6 (scanner mistakes, missing dependencies, kind-rule violations, cycles) is collected and thrown as one error, one line per mistake, before any application file is imported. Application files are imported from the scanned TypeScript paths themselves, so an application runs under a TypeScript-capable runtime. A failure while importing a file or creating a component is not collected: startup stops there and reports which component broke (owner's decision, Q2).

## Done when

- [x] Tests on temporary directories show each kind-rule violation of section 4.6 (a config needing an action or a wrapper, a wrapper needing an action or a wrapper, an action needing a wrapper), a missing dependency, and a cycle whose message shows its path; every message names the component at fault.
- [x] A fixture that has a scanner mistake and a kind-rule violation, and whose files throw at module level, fails with one error that lists both mistakes and is not the module's own throw.
- [x] Tests show the creation order (all configs, then all wrappers, then all actions, dependencies first inside each group), that every function is called exactly once, and that each receives its dependencies in parameter order.
- [x] Tests show wrapping: every wrapper is applied to every action and receives the action's metadata; a larger `ordinal` ends up further outside; among equal ordinals (a missing one counts as 0) the wrapper whose name sorts later, in plain code-unit order, ends up further outside; a wrapper returning the handler unchanged adds no layer; an action injected into another action is the wrapped version.
- [x] The container holds every component of all three kinds under its component name, each giving its instance and its metadata.
- [x] Tests show one instance per directory (also for two different spellings of the same path and for concurrent calls), and an error for a directory without `.ts` files.
- [x] Tests show what happens when, after all checks passed, a component function throws while being created or its file fails to import: startup stops at once and rejects with an error whose message names the component and the function and whose `cause` is the original error. After this failure, and after a failed check, the next start of the same directory scans again.
- [x] The framework source outside tests stays under 400 lines, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Anything about HTTP, controllers, validation, logging or databases. Importing compiled `.js` output instead of the scanned `.ts` files.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Two wrappers have the same ordinal: which one ends up outside? CLAUDE.md 4.7 says only 'stable by wrapper name'. Options: (a) the name that sorts later is further outside (wrappers sorted ascending by ordinal, then by name, and applied in that order, the same direction as 'larger ordinal = further outside'); (b) the name that sorts earlier is further outside. Recommended: (a) - one sort, one direction for both keys. Names are compared by plain code-unit order, not by locale.
  → Nama lebih akhir di luar (Recommended) — option (a): sort ascending by ordinal, then by name (plain code-unit order, not locale), and apply in that order, so the name that sorts later is further outside. (owner, 2026-11-16)
- Q2 [answered] After all checks pass, an application file fails to import or a component function throws while being created: what does start() do? Options: (a) stop at once and reject with an Error whose message names the component and the function and carries the original error as 'cause'; nothing is remembered, so the next start() scans again; (b) let the original error through untouched; (c) go on and collect every such failure. Recommended: (a) - the owner sees which component broke and still has the original stack; (c) is not possible in a useful way because later components need the failed one.
  → Berhenti, bungkus error (Recommended) — option (a): stop at once and reject with an Error that names the component and function and carries the original error as cause; nothing is remembered, so the next start() scans again. (owner, 2026-11-16)

## Assumptions
- A1 [confirmed] Only files that hold at least one component are imported, each by its absolute path as a file URL; a component function is called synchronously and its return value is stored as it is, never awaited
  Why: the reference imports only the files of scanned functions; the consumer convention (nukitu CLAUDE.md section 4) defines stage one of every component as a synchronous closure, and an async function would be named Promise<X>
  If wrong: await the result or import every scanned file in src/skeleto.ts
  Confirmed by owner, 2026-11-16
- A2 [confirmed] Options are used by the first start of a directory only; a later start of the same directory with other options returns the existing instance. A missing dependency is listed once, not once per check
  Why: CLAUDE.md 4.8: one instance per directory; the reference documents options as applied on the first start only
  If wrong: compare options on later starts and reject a mismatch
  Confirmed by owner, 2026-11-16
- A3 [confirmed] A directory that has .ts files but no component at all is rejected with the same error as a directory without .ts files (the message names the directory)
  Why: the scanner returns the same empty result for both, and a directory with nothing to bind is almost certainly a wrong path
  If wrong: have the scanner report how many files it read and reject only a count of zero, in src/skeleto.ts
  Confirmed by owner, 2026-11-16
- A4 [confirmed] A wrapper that throws while wrapping an action is reported like a creation failure: the error names the action, its function and the wrapper, with the original error as cause
  Why: Q2 covers failures while creating a component; wrapping is part of creating an action
  If wrong: change the message in the catch block of src/skeleto.ts
  Confirmed by owner, 2026-11-16

## Decisions
- Lane standard: the core behaviour, fully covered by the Done-when tests; nothing unrecoverable
- Waits for 203 and 204: it is built on the sorter and the scanner

## Handoff
src/skeleto.ts now holds the real startup: scan, kind rules plus sorter errors collected into one error (header line, then one '- ' line per mistake) before any import; then each component's .ts file is imported by file URL and its function called, configs then wrappers then actions, following the single sorted order. Wrappers are sorted ascending by ordinal, then by name in code-unit order, and applied in that order. A failure after the checks rejects with 'Name: function fn (path) failed while <step>' and the original as cause. Must not break: the promise per resolved directory is stored before work starts and removed on rejection. src/ is at 370 of 400 lines.

## Review
- 2026-11-16 standard, round 1, at b7eba9d: passed.
  1: ran test/skeleto.test.ts by name (25 pass): five kind-violation tests, missing dependency, cycle 'A -> B -> C -> A' and self-cycle each assert the line starting with the component name; disabling the kind rule in a copy fails 6 tests
  2: test 'all mistakes are thrown as one error before any application file is imported' passes and asserts three listed lines, no cause, no module message; removing the pre-import throw in a copy fails 13 tests
  3: creation-order test passes with file and source order opposed to dependency order; asserts the full call list (so each once) and arguments by position and identity
  4: five wrapping tests pass; in a copy, flipping the ordinal direction, flipping the name direction and swapping in localeCompare each fail the ordinal test, so the Zebra/apple case pins code-unit order
  5: container test passes: keys, instanceof FuncInstanceMetadata, instance identity and full metadata for a config (winston.Logger), a wrapper and an action in nested folders
  6: one-instance test passes for four spellings started concurrently, 2 calls recorded in total; storing the promise late fails it in a copy; empty, .txt-only, component-less and missing directories reject naming the directory
  7: tests 21-25 pass (message names component, function, path; cause is the original TypeError/RangeError; nothing later created; next start sees a file added in between, also after a failed check); removing the forget-on-failure line or the cause fails them in a copy
  8: cat src/*.ts | wc -l gives 370; typecheck, test and build are the recorded k2 run on this content, not rerun as the brief says
  note: probe: a file that threw at import and is then corrected in place still fails on the next start in the same process, because Node caches the failed module; the scan does run again. A runtime limit that a process restart clears; worth a README line
  note: CLAUDE.md is the only rule file (no AGENTS.md); no console.log, default export, interface or ts-morph import outside scanner.ts in src. The repo offers no checks beyond the three section 9 commands
  note: A3 goes beyond 4.8: a directory with .ts files but no component is rejected with the same message as one without .ts files; unseen by the owner
