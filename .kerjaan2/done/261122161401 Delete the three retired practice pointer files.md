---
type: task
priority: medium
lane: light
labels: []
blocked_by: []
related: [261122135603]
touches: [BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, DEVELOPMENT_PROCESS.md, docs/README.md, test/readme.test.ts]
created: 2026-11-22 16:14
---

## Background

Ticket 261122135603 made `docs/` the only rule set and reduced `BEST_PRACTICES.md`, `TECHNICAL_PRACTICES.md` and `DEVELOPMENT_PROCESS.md` to three-line pointers, so that old links would keep working. Skeleto has no users and needs no backward compatibility (owner, 2026-11-22), so those pointers only duplicate `docs/README.md`. The owner asked on 2026-11-22 to delete them. The old-to-new rule number table in `docs/README.md` stays, for old B/T/P citations in the board history and `TEMUAN.md`.

## Request

The three pointer files are gone, and nothing in the repository still points to them, except the records (`TEMUAN.md` and the board history).

## Done when

- [x] `BEST_PRACTICES.md`, `TECHNICAL_PRACTICES.md` and `DEVELOPMENT_PROCESS.md` no longer exist.
- [x] No document, test or configuration links to them; `docs/README.md` may still name them where it explains its old-to-new number table, without a link.
- [x] The repository's tests pass.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
Deleted BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, DEVELOPMENT_PROCESS.md. The test in test/readme.test.ts that checked they were one-paragraph pointers now asserts they do not exist. docs/README.md status paragraph names them without links and says the old-to-new number table stays. Do not recreate them; the README test still bans their names in README.md. Note the docs README test bans the phrase 'dokumen lama'.
