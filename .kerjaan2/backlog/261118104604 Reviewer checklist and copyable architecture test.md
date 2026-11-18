---
type: task
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: [261118104602, 261118104603]
related: [261118104601]
touches: []
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

- [ ] A checklist lists every rule of both practice files with its number, its level, and whether a machine or a reviewer checks it.
- [ ] The checklist shows the expected form of a review finding: rule number, file and line, and the fix asked for.
- [ ] An architecture test that applications can copy is shown in full and run by the README test. It fails when an action carries neither marker, when a use case depends on a use case, and when a gateway depends on a use case.
- [ ] The optional startup guard is shown as a wrapper, marked Optional, with the ordering it relies on stated.
- [ ] Tests prove that the architecture test and the guard both catch a use case that depends on another use case.

## Out of scope

- Any change to Skeleto's own behaviour or public API.
- A packaged Claude skill built from these documents (to be ticketed once they settle).
