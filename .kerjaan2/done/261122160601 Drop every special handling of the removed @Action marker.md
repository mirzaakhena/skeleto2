---
type: task
priority: high
lane: standard
labels: []
blocked_by: []
related: [261122135602]
touches: []
created: 2026-11-22 16:06
---

## Background

Ticket 261122135602 removed `@Action` as a marker, but it also added special handling for it: a dedicated check that refuses a function marked `@Action` with the advice to use `@UseCase` or `@Gateway`, a matching clause in `CLAUDE.md` 4.2, a sentence in the README, dedicated tests, and tests that forbid the words "plain action", "action polos" and "ordinal" in the documents.

The owner had already decided that Skeleto has no users and needs no backward compatibility. On 2026-11-22 the owner said: "Kenapa seakan-akan @Action masih exist dan dipakai? Kenapa tidak completely tidak ada sama sekali. ... tidak perlu melakukan handling terhadap hal-hal yang diluar apa yang memang hanya perlu dihandlenya saja." A removed feature must vanish completely. With nothing special, `@Action` is simply an unknown marker and falls under the generic rules that already exist: without `decorators` a function that carries it has no main marker and is no component; with `decorators` the generic "markers but no main marker" mistake reports it.

The owner decided to keep the `@Action` row in the "Fitur yang dibuang" table of `CLAUDE.md` section 3 (the official place to record what must not come back), and to drop the tests that forbid particular words in the documents.

## Request

Nothing in Skeleto's code, its contract or its public documents treats `@Action` specially any more. It behaves like any marker Skeleto does not know, and no message, rule or test mentions it, except the row in the table of dropped features.

## Done when

- [x] Skeleto's code holds no check, constant or message about `@Action`.
- [x] Without `decorators`, a function marked only `@Action` is no component and startup says nothing about it; with `decorators`, it is reported by the existing generic "markers but no main marker" mistake, proven by a test.
- [x] `CLAUDE.md` no longer has a clause about `@Action` outside the dropped-features table, and the README no longer has a sentence about it.
- [x] The tests dedicated to refusing `@Action`, and the tests that forbid the words "plain action", "action polos" or "ordinal" in the documents, are removed.
- [x] `docs/` and `REVIEW_CHECKLIST.md` say nothing about how `@Action` is refused.

## Out of scope

- The dropped-features table in `CLAUDE.md` section 3, which keeps its `@Action` row.
- `TEMUAN.md` and the board history, which are records.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
Removed all special handling of @Action: REMOVED_MARKER/ADVICE and their checks in src/scanner.ts, the CLAUDE.md 4.2 clause, the README sentence, the dedicated scanner/skeleto/readme tests, and the doc tests banning 'plain action', 'action polos', 'ordinal', plainActions. @Action is now an unknown marker; a scanner test proves silence without decorators and the generic 'no main marker' mistake with them. Also fixed package.json description. Kept the CLAUDE.md section 3 table row.

## Review
- 2026-11-22 standard, round 1, at a5da526: passed.
  1: git grep for REMOVED_MARKER/REMOVED_ADVICE/'not a marker any more' finds nothing; grep -i action in src/ shows only ActionHandler/WrapperHandler and general comments; diff removes the constants and every check
  2: new scanner test passes (silent + no component without list; one generic 'has @Action but no main marker' with list); end to end in a copy, Skeleto.start succeeds with container [Db], and with decorators fails with that generic line
  3: grep of CLAUDE.md for @Action finds only line 57, the section 3 dropped-features row; grep of README.md finds no @Action
  4: diff removes the dedicated scanner, skeleto and readme e2e @Action tests and the ordinal/plain action/action polos/plainActions/@Action bans; remaining 'ordinal' hits in test/ are data-rejection tests
  5: grep -rni '@Action|action polos|plain action|plainActions' docs REVIEW_CHECKLIST.md finds nothing
  note: relevant tests run by name via k2 test in a copy (5 pass); full suite not rerun per brief; package.json description fix is outside Done when but fits the request
