---
type: feature
priority: high
lane: standard
labels: []
blocked_by: [261116100201]
related: []
touches: [src/dependency.ts, test/dependency.test.ts]
created: 2026-11-16 10:02
---

## Background

A component must be created after everything it depends on, and a circular dependency must be refused with a message that shows the path of the cycle. `CLAUDE.md` also demands that all usage mistakes are reported together at startup, so this part must be able to report every problem it finds, not only the first.

## Request

Provide the dependency sorter described in `CLAUDE.md` sections 4.3, 4.6 (cycles) and 4.7 (order): a pure function, not a class, that takes a list of `{ name, dependencies }` and gives back the names ordered so that every dependency comes before what needs it. A dependency that names nothing in the list, and a cycle, are errors. The way it reports them must let the startup code collect all of them, together with its other findings, into one error.

## Done when

- [ ] Tests cover: components without dependencies, a straight chain, and a branching graph where one component is needed by several others (it appears once, before all of them).
- [ ] A missing dependency is reported with both the name of the component and the name of the missing dependency.
- [ ] Cycles of two and of three components are reported with their path in the form `A -> B -> A`, and a component that depends on itself is reported as `A -> A`.
- [ ] An input with several problems at once (two missing dependencies, or a missing dependency and a cycle) reports all of them.
- [ ] The same input always gives the same order, and that order does not depend on anything but the input (shown by a test that runs it repeatedly and one that checks a known expected order).
- [ ] The sorter does not import `ts-morph` and its tests create no files.

## Out of scope

Rules about which kind of component may depend on which kind (startup ticket).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Assumptions
- A1 [unseen] Among components that do not depend on each other, the order follows the input order (depth-first from the first item); the sorter returns its problems as a list of messages next to the order instead of throwing
  Why: the ticket demands an order that depends on the input only and a report that startup can merge with other findings; CLAUDE.md fixes no tie-break
  If wrong: change the tie-break in src/dependency.ts and the expected order in its test

## Decisions
- Lane standard: a pure ordering function with its own tests
- Waits for 201 only; runs side by side with 202 and, if 202 lands first, with 204
