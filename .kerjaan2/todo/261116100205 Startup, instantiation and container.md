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

- [ ] Tests on temporary directories show each kind-rule violation of section 4.6 (a config needing an action or a wrapper, a wrapper needing an action or a wrapper, an action needing a wrapper), a missing dependency, and a cycle whose message shows its path; every message names the component at fault.
- [ ] A fixture that has a scanner mistake and a kind-rule violation, and whose files throw at module level, fails with one error that lists both mistakes and is not the module's own throw.
- [ ] Tests show the creation order (all configs, then all wrappers, then all actions, dependencies first inside each group), that every function is called exactly once, and that each receives its dependencies in parameter order.
- [ ] Tests show wrapping: every wrapper is applied to every action and receives the action's metadata; a larger `ordinal` ends up further outside; among equal ordinals (a missing one counts as 0) the wrapper whose name sorts later, in plain code-unit order, ends up further outside; a wrapper returning the handler unchanged adds no layer; an action injected into another action is the wrapped version.
- [ ] The container holds every component of all three kinds under its component name, each giving its instance and its metadata.
- [ ] Tests show one instance per directory (also for two different spellings of the same path and for concurrent calls), and an error for a directory without `.ts` files.
- [ ] Tests show what happens when, after all checks passed, a component function throws while being created or its file fails to import: startup stops at once and rejects with an error whose message names the component and the function and whose `cause` is the original error. After this failure, and after a failed check, the next start of the same directory scans again.
- [ ] The framework source outside tests stays under 400 lines, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Anything about HTTP, controllers, validation, logging or databases. Importing compiled `.js` output instead of the scanned `.ts` files.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Two wrappers have the same ordinal: which one ends up outside? CLAUDE.md 4.7 says only 'stable by wrapper name'. Options: (a) the name that sorts later is further outside (wrappers sorted ascending by ordinal, then by name, and applied in that order, the same direction as 'larger ordinal = further outside'); (b) the name that sorts earlier is further outside. Recommended: (a) - one sort, one direction for both keys. Names are compared by plain code-unit order, not by locale.
  → Nama lebih akhir di luar (Recommended) — option (a): sort ascending by ordinal, then by name (plain code-unit order, not locale), and apply in that order, so the name that sorts later is further outside. (owner, 2026-11-16)
- Q2 [answered] After all checks pass, an application file fails to import or a component function throws while being created: what does start() do? Options: (a) stop at once and reject with an Error whose message names the component and the function and carries the original error as 'cause'; nothing is remembered, so the next start() scans again; (b) let the original error through untouched; (c) go on and collect every such failure. Recommended: (a) - the owner sees which component broke and still has the original stack; (c) is not possible in a useful way because later components need the failed one.
  → Berhenti, bungkus error (Recommended) — option (a): stop at once and reject with an Error that names the component and function and carries the original error as cause; nothing is remembered, so the next start() scans again. (owner, 2026-11-16)

## Assumptions
- A1 [unseen] Only files that hold at least one component are imported, each by its absolute path as a file URL; a component function is called synchronously and its return value is stored as it is, never awaited
  Why: the reference imports only the files of scanned functions; the consumer convention (nukitu CLAUDE.md section 4) defines stage one of every component as a synchronous closure, and an async function would be named Promise<X>
  If wrong: await the result or import every scanned file in src/skeleto.ts
- A2 [unseen] Options are used by the first start of a directory only; a later start of the same directory with other options returns the existing instance. A missing dependency is listed once, not once per check
  Why: CLAUDE.md 4.8: one instance per directory; the reference documents options as applied on the first start only
  If wrong: compare options on later starts and reject a mismatch

## Decisions
- Lane standard: the core behaviour, fully covered by the Done-when tests; nothing unrecoverable
- Waits for 203 and 204: it is built on the sorter and the scanner
