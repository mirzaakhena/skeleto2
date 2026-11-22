---
type: task
priority: medium
lane: standard
labels: []
blocked_by: [261122135602]
related: []
touches: [BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, DEVELOPMENT_PROCESS.md, REVIEW_CHECKLIST.md, CLAUDE.md, README.md, docs/README.md, docs/konsep, docs/teknis, docs/proses, test/readme.test.ts]
created: 2026-11-22 13:56
---

## Background

Two rule sets for applications live side by side: the Indonesian per-component set in `docs/`, and the older English `BEST_PRACTICES.md`, `TECHNICAL_PRACTICES.md` and `DEVELOPMENT_PROCESS.md`. `CLAUDE.md` names `docs/` first, while `docs/README.md` says the old files still apply until the owner decides. `REVIEW_CHECKLIST.md` uses only the old rule numbers and lacks newer rules (a gateway depends on configs only). Two AI sessions can therefore apply different rules. The independent review (`TEMUAN.md` finding 19) also found contradictions inside the rules.

On 2026-11-22 the owner decided:
- `docs/` becomes the only rule set; the three old documents are retired.
- Every use case carries `@Transaction`, queries too. The rule "a query has no `@Transaction`" (old B10, UC-7) is replaced; "a query never writes" stays, guarded by the gateways' contracts.
- Wrapper layering stays the scan order (no technical one-file rule); the documents make it plain that wrappers whose order matters belong in one file, since moving or renaming a file can change the layering.

## Request

Every later session and reviewer finds one rule set, `docs/`, with no contradiction left inside it, and the review checklist and the repository's tests follow that set. Nothing tells a reader that the old documents still apply.

## Done when

- [ ] `BEST_PRACTICES.md`, `TECHNICAL_PRACTICES.md` and `DEVELOPMENT_PROCESS.md` no longer hold rules: they are removed, or reduced to a pointer to `docs/`.
- [ ] `CLAUDE.md`, `README.md` and `docs/README.md` name `docs/` as the only rule set, and no document says the old files still apply.
- [ ] `REVIEW_CHECKLIST.md` uses the new rule numbers and lists every rule of `docs/`, including that a gateway depends on configs only.
- [ ] The repository's tests that checked the old documents check `docs/` instead, including that the code excerpts in `docs/` match the README example.
- [ ] `docs/` says that every use case carries `@Transaction`, and no rule says a query has none.
- [ ] WRP-5 has one status everywhere (built) and sits among the rules that describe fixed behaviour, not the optional ones; the wrapper naming rule covers a wrapper that reads a main marker, such as the gateway observer wrapper.
- [ ] `docs/` says plainly that moving or renaming a wrapper file can change the layering, and that wrappers whose order matters belong in one file.
- [ ] Nothing in `docs/`, `REVIEW_CHECKLIST.md`, `README.md` or `CLAUDE.md` describes a plain `@Action` or a start option for it: the main markers are `@Config`, `@Wrapper`, `@UseCase` and `@Gateway` (261122135602).

## Out of scope

- Changes to Skeleto's code.
- The scenario-explorer tracer follow-up.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] The three old files: (a) delete them; (b) keep each as a one-paragraph pointer to docs/ and to the old-to-new number table in docs/README.md. Recommended: (b). Applications and old tickets cite B/T/P numbers and link to these files, and a pointer keeps those links working at almost no cost. With (a), git history still holds them.
  → (b) Keep each as a one-paragraph pointer to docs/ and to the old-to-new number table (owner chose 'Jadi penunjuk satu paragraf'). (owner, 2026-11-22)
- Q2 [answered] REVIEW_CHECKLIST.md must list every docs/ rule, and the repo test requires rows to match rule headings word for word, but docs/ headings are Indonesian. Options: (a) rewrite the checklist in Indonesian, one table per docs file, row text = heading verbatim, level from the section (Aturan wajib/opsional), checked by Mesin/Reviewer/Proses; keep it at the repo root with the gap test; (b) keep English rows translated, and test only number and level; (c) move it into docs/ (e.g. docs/review.md). Recommended: (a). A verbatim match is what keeps the checklist from drifting, and the root path keeps existing links working.
  → (a) Rewrite the checklist in Indonesian, one table per docs file, row text = rule heading verbatim, level from its section, kept at the repo root with the gap test (owner chose 'Tulis ulang berbahasa Indonesia'). (owner, 2026-11-22)
- Q3 [answered] The README is English and public, and the only rule set becomes Indonesian. Options: (a) the README's one practice line links docs/README.md and says the rules are in Indonesian; (b) the README also keeps a short English summary of the structure. It already explains the kinds and the dependency line, so this would only add a pointer. Recommended: (a). A second English summary of the rules is a second rule set again.
  → (a) The README's one practice line links docs/README.md and says the rules are in Indonesian; no English summary (owner chose 'Satu baris penunjuk'). (owner, 2026-11-22)
- Q4 [answered] Which old-document tests in test/readme.test.ts move to docs/? Options: (a) structural only: each docs rule is '### <PREFIX>-<n>. ...' under 'Aturan wajib' or 'Aturan opsional' with a body; numbers unique per prefix; every cited rule exists; the checklist lists every rule; excerpts verbatim; whole files type-check and pass; no product or framework names, no dropped features, no ordinal. Topic-specific prose tests (two timelines, iceberg, agreed topics) are dropped; (b) also port each prose test to the matching docs/ rule in Indonesian patterns. Recommended: (a). The prose tests guarded the writing of the old files, and porting them adds hundreds of brittle lines.
  → (a) Structural checks only; topic-specific prose tests of the old files are dropped (owner chose 'Hanya pemeriksaan struktur'). (owner, 2026-11-22)
- Q5 [answered] docs/ has code blocks that are not README excerpts: copies of Skeleto's own types (ActionHandler, WrapperHandler, Context in action.md and wrapper.md), and illustrative fragments (the '// Use case ... // Gateway' block in action.md, the bare JSDoc in use-case-gateway-bawaan.md). Options: (a) type copies are checked verbatim against src/type.ts; illustrative fragments are rewritten as README excerpts or removed, so no unchecked block is left (any fence form); (b) same, but illustrative fragments may stay unchecked if marked. Recommended: (a). An unchecked block goes stale without anyone noticing.
  → (a) Type copies checked verbatim against src/type.ts; illustrative fragments rewritten as README excerpts or removed, so no unchecked block is left (owner chose 'Semua blok dicek'). (owner, 2026-11-22)
- Q6 [answered] Rule numbers are never reused (docs/README.md). UC-7 reads 'a query never writes: a use case without @Transaction depends only on reading gateways', and the owner keeps 'a query never writes' but drops 'without @Transaction'. Options: (a) keep UC-7 as 'Query tidak pernah menulis: ia hanya bergantung pada gateway yang kontraknya membaca', and add UC-16 'Setiap use case ditandai @Transaction, termasuk query'; (b) retire UC-7 and add two new numbers. Recommended: (a). The core meaning of UC-7 stays, so citations keep their meaning, and the new obligation gets its own number. Checked by: Reviewer for both.
  → (a) Keep UC-7 as 'a query never writes: it depends only on gateways whose contract reads', add UC-16 'every use case carries @Transaction, including queries' (owner chose 'UC-7 dipertahankan + UC-16 baru'). (owner, 2026-11-22)
- Q7 [answered] WRP-5 (layering is the written order) sits under 'Aturan opsional'. Where does it go, and how is the one-file advice written? Options: (a) WRP-5 moves to 'Aturan wajib', status built, checked by Mesin (Skeleto); new WRP-7 (Wajib, Reviewer): 'Wrapper yang urutannya penting ditulis di satu berkas', with the warning that moving or renaming a wrapper file can change the layering; KOM-8's src/wrappers.ts row stays the optional default; (b) WRP-5 goes to the 'Perilaku yang dijamin Skeleto' section without a number, and the advice is prose there. Recommended: (a). A reviewer needs a number to cite, and every rule needs a level in the checklist.
  → (a) WRP-5 moves to the mandatory rules, built, checked by Skeleto; new WRP-7 (mandatory, reviewer): wrappers whose order matters are written in one file, with the warning about moving or renaming a file; src/wrappers.ts stays the optional default (owner chose 'WRP-5 wajib + WRP-7 baru'). (owner, 2026-11-22)
- Q8 [answered] DEV-2 (screens are hints; dig out the use cases) is marked Wajib, with a note that the level change from old B1 (Opsional) is not yet decided by the owner. Finding 19 calls this a contradiction. Which level? Options: (a) Wajib, and the note is removed; (b) Opsional. Recommended: (a). The owner had it rephrased as a rule of the process (2026-11-21), and DEV-1/DEV-11 already require starting from the use cases.
  → (a) DEV-2 is mandatory and the 'not yet decided' note is removed (owner chose 'Wajib, catatan dihapus'). (owner, 2026-11-22)
- Q9 [answered] Before the old files go, should the worker check that everything in them is in docs/? Some content has no rule number, e.g. TECHNICAL_PRACTICES 'What a tool outside the application may rely on', BEST_PRACTICES 'Built from use cases' and 'Two levels', DEVELOPMENT_PROCESS 'What a reviewer can check'. Options: (a) yes: anything missing is moved into the matching docs/ file in Indonesian, with no new rule invented, and listed in the handover; (b) no: what docs/ lacks is dropped. Recommended: (a). Retiring the files must not silently drop a rule that applications follow.
  → (a) Yes: content of the old files missing from docs/ is moved into the matching docs file in Indonesian, with no new rule invented, and listed in the handover (owner chose 'Ya, pindahkan yang belum ada'). (owner, 2026-11-22)

## Assumptions
- A1 [unseen] The old-to-new number table in docs/README.md stays, as the lookup for B/T/P citations in existing code and tickets. Its status block and every 'old files still apply' or 'rencana WRP-5' wording go, and CLAUDE.md 1.1's 'untuk sementara BEST_PRACTICES.md ...' is removed.
  Why: Done when: nothing may say the old files still apply. Citations by number keep their meaning (docs/README.md: numbers are never reused).
  If wrong: Delete the table
- A2 [unseen] TEMUAN.md and the .kerjaan2 board files keep their mentions of the old files and numbers: they are a record of past decisions, not rules. Only CLAUDE.md, README.md, REVIEW_CHECKLIST.md, docs/ and the tests are changed.
  Why: TEMUAN.md is the record of findings and decisions (CLAUDE.md 1.1), and board history is never rewritten
  If wrong: Edit TEMUAN.md as well
- A3 [unseen] WRP-1 and the wrapper 'Nama dan berkas' table are widened from 'one additional marker' to 'one marker it reads, additional or main', so GatewayWrapper (reads mainDecorator.name Gateway) is named after its marker. The KOM-7 word table gets the same wording if it says 'additional'.
  Why: Done when line 6 asks for the naming rule to cover a wrapper that reads a main marker; WRP-1 already says main markers are read via mainDecorator.name
  If wrong: Revert the wording
- A4 [unseen] The REVIEW_CHECKLIST example finding is re-cited with the new number (old B18 is UC-9) at the real line, and the repo test keeps checking that line. The controller-naming 'Usulan, belum diputuskan pemilik' note in controller.md stays as a marked proposal: it is not a contradiction.
  Why: The lessons say the example finding cites a real line that the test checks; docs/README.md defines Usulan as not yet in force
  If wrong: Change the example finding

## Decisions
- Lane standard: documents and the repository's document tests only, no src/ change; reversible from git, but the test rewrite in test/readme.test.ts is large
- Waits for 261122135602 (blocked_by): it needs that ticket's result, a checklist without the architecture test and docs/ that already state the plainActions option. Not solo: nothing else is queued, so it runs alone anyway.
- Waits for 261122135602 (blocked_by): that ticket removes @Action and the copied architecture test, and the rewritten checklist and docs must build on main without them.
