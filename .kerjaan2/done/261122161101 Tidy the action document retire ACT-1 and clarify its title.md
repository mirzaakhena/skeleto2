---
type: task
priority: medium
lane: light
labels: []
blocked_by: []
related: [261122160601]
touches: [docs/teknis/action.md, docs/README.md, REVIEW_CHECKLIST.md, test/readme.test.ts]
created: 2026-11-22 16:11
---

## Background

`docs/teknis/action.md` describes the shape shared by use cases and gateways: the handler type, the comparison "same structure, different concept", the context and its rules (ACT-2, ACT-3). It no longer describes the removed `@Action` marker, and the owner decided (2026-11-22) that it is neither deleted nor marked obsolete.

Two things are left over from the time `@Action` existed:
- ACT-1, "every action is a use case or a gateway", is now always true by itself, since Skeleto knows only those two kinds of action. A rule nobody can break is noise for a reviewer.
- The title "Action" alone can be read as being about the removed marker.

Rule numbers are never reused.

## Request

The action document says plainly that it is about the shape shared by use cases and gateways, and carries no rule that cannot be broken.

## Done when

- [x] The document's title reads "Action: bentuk bersama use case dan gateway" (or the same meaning), and its file name and the links to it stay as they are.
- [x] ACT-1 is no longer a rule: what it said is kept as one explanatory sentence, its number is not reused, and the checklist, the old-to-new number table and every citation of ACT-1 are updated to match.
- [x] The repository's tests pass.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
action.md retitled and ACT-1 retired: its content is one sentence under 'Kenapa ada', a note in 'Aturan wajib' says the number is not reused. REVIEW_CHECKLIST row, docs/README mapping (B5) and a note, and the Mesin list in test/readme.test.ts updated. The citation test rejects any cite of a missing number, so notes refer to 'nomor 1 dari awalan ACT' instead of the literal. TEMUAN.md left as history.
