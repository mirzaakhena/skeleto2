---
type: task
priority: low
lane: standard
labels: [docs, best-practices, test]
blocked_by: []
related: [261118104601]
touches: []
created: 2026-11-18 12:23
---

## Background

The reviewer of ticket 261118104601 left two notes that did not block it. The owner asked on 2026-11-18 for both to be ticketed.

1. The per-warehouse lock in the README example is not re-entrant. If an action inside a transaction locks a warehouse that the same transaction already holds, it waits for itself and hangs. The example never does this, but nothing in the practices warns against it, and agents copy the example.
2. The README test that checks every component function is named `impl` plus its component name finds the functions with a text pattern. A marked function the pattern does not match is skipped without any message, so a wrongly named function can pass unseen.

## Request

Warn against relocking in the concurrency rules, and make the naming check fail instead of skipping when it cannot read a marked function.

## Done when

- [ ] The concurrency rules say that the entities a use case changes are locked once, by one gateway, and that locking again what the same transaction already holds is not allowed, with the reason (it hangs).
- [ ] The naming check in the README test fails, naming the function, when a marked function in the example is one it could not check.
- [ ] A test proves that the naming check fails for a marked function with a wrong name written in a form the old pattern skipped.
- [ ] REVIEW_CHECKLIST.md still lists every rule with the right level, and the README test passes.
