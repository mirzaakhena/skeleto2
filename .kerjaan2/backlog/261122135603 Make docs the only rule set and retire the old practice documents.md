---
type: task
priority: medium
lane: standard
labels: []
blocked_by: [261122135602]
related: []
touches: []
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

## Out of scope

- Changes to Skeleto's code.
- The scenario-explorer tracer follow-up.
