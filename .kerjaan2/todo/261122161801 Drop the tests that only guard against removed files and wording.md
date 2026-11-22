---
type: task
priority: medium
lane: light
labels: []
blocked_by: []
related: [261122161401, 261122160601]
touches: [test/readme.test.ts]
created: 2026-11-22 16:18
---

## Background

Skeleto has no users and needs no backward compatibility. The owner decided on 2026-11-22 that something removed must vanish completely, with no handling, message or guard about it, and that the tests forbidding particular words in the documents go. Ticket 261122161401 then added a test asserting that the three deleted practice files "must stay deleted". The owner asked on 2026-11-22 to drop it.

The repository's README tests hold more checks of the same kind, which assert only that something removed or old stays absent. Examples found in `test/readme.test.ts` at main `46b6f31`:
- the deleted practice files must not exist, and the README must not name them;
- no document may say "masih berlaku", "untuk sementara", "dokumen lama", "Rencana, belum terealisasi" and the like;
- no rule may say "tanpa `@Transaction`"; `pengembangan.md` must not hold an old note about a level change;
- the checklist must not mention the startup guard wrapper or the architecture test;
- the README, the checklist and `docs/` must not mention dropped features (`readTypeArguments`, `@Controller`, `@RequestPart`, `payload`, "tes arsitektur").

The table of dropped features in `CLAUDE.md` section 3 stays: it is the one place that records what must not come back.

## Request

The repository's tests check what the code and the documents say now, and no test exists only to keep something removed or old from reappearing.

## Done when

- [ ] Every test or assertion whose only purpose is to keep a removed file, feature or old wording absent is removed, including the examples in Background.
- [ ] Tests that check current rules and structure (rule format, numbering, citations, checklist sync, code excerpts, the example's behaviour) stay and still pass.
- [ ] The repository's tests pass.

## Out of scope

- The dropped-features table in `CLAUDE.md` section 3.
