---
type: task
priority: low
lane: light
labels: [docs, best-practices, errors]
blocked_by: []
related: [261119201201]
touches: []
created: 2026-11-20 10:08
---

## Background

Ticket 261119201201 made "tech debt" a fourth kind of business error, next to validation, not found and conflict. The best practices now say tech debt is a debt and not a rule: the business has simply not decided yet what should happen.

Two places still speak as if every business error were a broken rule. The comment on the error kind in the README example describes it as the kind of business rule an operation broke. The "Why" paragraph of the rule on business errors still names only three distinctions.

## Request

Make the wording in those two places fit all four kinds, so that a reader is not told that a tech-debt error is a broken rule.

## Done when

- [ ] The comment on the error kind in the README example describes all four kinds, e.g. why the business refused an operation, not which rule it broke.
- [ ] The "Why" paragraph of the business error rule names the "not decided yet" distinction next to the other three.
- [ ] The README example still runs with its documented output.
- [ ] The project's checks pass.
