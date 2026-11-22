---
type: feature
priority: high
lane: standard
labels: []
blocked_by: []
related: [261122101202]
touches: [src/scanner.ts, src/skeleto.ts, src/type.ts, test/scanner.test.ts, test/skeleto.test.ts, test/readme.test.ts, CLAUDE.md, README.md, REVIEW_CHECKLIST.md, BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, docs/]
created: 2026-11-22 10:12
---

## Background

Today Skeleto knows three kinds of component: `@Config`, `@Wrapper` and `@Action`. Use cases and gateways are both written as `@Action` plus an additional marker, `@UseCase` or `@Gateway`, which Skeleto only records. The two core rules of the architecture, "a use case never depends on another use case" and "a gateway never depends on a use case", are therefore checked only by an architecture test that every application has to copy from `REVIEW_CHECKLIST.md`, and by an optional guard wrapper that catches the first rule only after the application's files were imported.

On 2026-11-22 the owner decided that `@UseCase` and `@Gateway` become built-in kinds of action in Skeleto itself, not a separate preset, because the framework's purpose is one standard structure enforced by the machine (`CLAUDE.md` section 1.1, `TEMUAN.md` finding 12 and "Keputusan pemilik untuk implementasi, 2026-11-22", `docs/teknis/use-case-gateway-bawaan.md`).

The owner's decisions:
- `@UseCase` and `@Gateway` are kinds of action: everything that holds for an action holds for them (synchronous outer function, returns a function, wrapped by every wrapper, the injected one is the wrapped one).
- A use case may depend on configs and gateways. A gateway may depend on configs and gateways.
- A plain `@Action` stays allowed, with free rules: it may depend on configs and on every kind of action (`@Action`, `@UseCase`, `@Gateway`).
- A use case or a gateway may not depend on a plain `@Action` (answered 2026-11-22), so a plain action can never bridge one use case to another.
- The kind is told by the name of the main marker in the metadata (`UseCase`, `Gateway`, `Action`); there is no new field.
- After configs and wrappers, actions are created in three groups: all gateways, then all use cases, then all plain actions, each after its dependencies.
- There are no existing users: no backward compatibility is needed.
- The copied architecture test keeps only one check, that an application using use cases and gateways has no plain `@Action`; the optional guard wrapper and its text are removed.

## Request

An application can write `@UseCase` or `@Gateway` as the main marker of a function, without `@Action` beside it, and Skeleto refuses at startup, before any application file is imported and together with every other mistake, a use case that depends on another use case and a gateway that depends on a use case. The written contract for every later session (`CLAUDE.md`) says so, and the public documents and copied examples no longer tell applications to write `@Action` together with `@UseCase` or `@Gateway`.

## Done when

- [x] A function marked `@UseCase` alone, or `@Gateway` alone, becomes a component, and starts like any action.
- [x] Startup fails before any application file is imported when a use case depends on another use case, and the message names both.
- [x] Startup fails before any application file is imported when a gateway depends on a use case, and the message names both.
- [x] A plain `@Action` may depend on a use case, a gateway or another action, and startup succeeds; a use case or a gateway that depends on a plain `@Action` stops startup, naming both.
- [x] A function marked with more than one of `@Action`, `@UseCase`, `@Gateway` is a mistake reported at startup, like any function with two main markers.
- [x] The metadata of a use case and of a gateway tells which kind it is, and a wrapper can tell use cases from gateways without an additional marker.
- [x] `CLAUDE.md` describes the new kinds and their dependency rules, rewrites the "only binding" principle to fit, and every new rule there has a test; the README example, its printed output, the architecture test in `REVIEW_CHECKLIST.md` and the practice documents follow the new way of writing use cases and gateways.
- [x] Gateways are created before use cases, and use cases before plain actions, proven by a test; `CLAUDE.md` states the order.

## Out of scope

- The order of wrappers (a separate ticket).
- Changes in the scenario-explorer repository, whose tracer finds use cases as plain actions marked `@UseCase`. It will need its own follow-up once this lands.
- Shrinking the core code (`TEMUAN.md` finding 1).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] May a @UseCase or a @Gateway depend on a plain @Action? Options: (a) no: a use case may depend on @Config and @Gateway only, a gateway on @Config and @Gateway only, and a plain @Action in between is refused; (b) yes, both may also depend on @Action. Recommended (a): with (b) a plain @Action becomes a silent bridge use case -> action -> use case, which is exactly the rule this ticket makes the machine guard.
  → No (owner, 2026-11-22: 'Tidak boleh'). A use case may depend on @Config and @Gateway only, a gateway on @Config and @Gateway only. (owner, 2026-11-22)
- Q2 [answered] How does the metadata tell the kind? Options: (a) mainDecorator.name is "UseCase" or "Gateway" (as docs/teknis/use-case-gateway-bawaan.md plans), so code that checks mainDecorator.name === "Action" must learn the new names; (b) mainDecorator.name stays "Action" and FuncMetadata gains a new field (e.g. kind). Recommended (a): no new public field, matches the planned doc, and a wrapper reads one field it already has.
  → (a) mainDecorator.name is "UseCase" or "Gateway"; no new field (owner chose 'Nama penanda utama'). (owner, 2026-11-22)
- Q3 [answered] Creation order with three action kinds: are @Action, @UseCase and @Gateway created as one group after the wrappers (each after its dependencies, otherwise in scan order), or as separate groups (all gateways, then use cases, then plain actions)? Recommended: one group, dependencies first, because a plain @Action may depend on any kind and separate groups would add nothing a reader can rely on; CLAUDE.md 4.7 then says 'all @Config, all @Wrapper, then every action of any kind'.
  → Separate groups (owner chose 'Kelompok terpisah'): after configs and wrappers, all gateways, then all use cases, then all plain actions, each after its dependencies. (owner, 2026-11-22)
- Q4 [answered] What happens when SkeletoOptions.decorators still lists "UseCase" or "Gateway" (an application's old MARKERS)? Options: (a) a startup mistake naming the entry, saying it is now a main marker; (b) silently ignored. Recommended (a): fail early, and it points the application to its stale list; without it, a function still written '@Action @UseCase' is reported as having two main markers anyway, so (b) only leaves the list wrong.
  → Owner: 'Tidak ada aplikasi lama. Tidak perlu handle backward compatibility. Framework ini belum dipakai secara resmi sama sekali.' No special handling for UseCase or Gateway left in SkeletoOptions.decorators. (owner, 2026-11-22)
- Q5 [answered] Rule B5 and the copied architecture test in REVIEW_CHECKLIST.md: the core will refuse use case -> use case and gateway -> use case, but it still allows a plain @Action. Options: (a) keep B5 as 'every action of an application is a @UseCase or a @Gateway, never a plain @Action', and shrink the architecture test to that one check; (b) drop B5 and the whole architecture test, plain @Action is fine in applications; (c) keep B5 and the test as an Optional rule. Also: the optional guard implUseCaseWrapper in REVIEW_CHECKLIST.md becomes redundant, remove it with its text? Recommended (a) and remove the guard: the core now guards B8, the test keeps only what the core cannot see.
  → (a) Keep B5 as 'no plain @Action in an application that uses use cases and gateways' and shrink the architecture test to that one check; remove the implUseCaseWrapper guard and its text (owner chose 'Ciutkan, buang penjaga'). (owner, 2026-11-22)

## Assumptions
- A1 [confirmed] @UseCase and @Gateway take no data, like @Action (CLAUDE.md 4.4); a @Wrapper still depends on @Config only
  Why: the owner said everything that holds for an action holds for them, and 4.4/4.6 already settle data and wrapper dependencies
  If wrong: allow data or wrapper dependencies in scanner.ts checkMainData and ALLOWED_DEPENDENCIES
  Confirmed by owner, 2026-11-22
- A2 [confirmed] The new main markers join every existing check of main markers: lowercase near-markers (@usecase), main markers on exported constants or namespace functions, the 'no main marker' message, Promise return types, and the empty-directory message, which names all five kinds
  Why: CLAUDE.md 4.1, 4.2, 4.3 and 4.5 state these checks for main markers in general
  If wrong: keep the new names out of MAIN_DECORATORS for the checks concerned
  Confirmed by owner, 2026-11-22

## Decisions
- Lane standard: framework code and docs, public metadata changes but nothing unrecoverable
- Not solo and not blocked: it shares files with 261122101202 (README example wrappers, CLAUDE.md 4.4/4.7, src/skeleto.ts) but neither reads what the other builds; the merge queue settles the overlap
- Order: run after nothing; 261122101202 waits for this ticket (owner chose sequential work)
- Supersedes the earlier 'not blocked' note: it runs first and alone in this batch; 261122101202 waits for it by the owner's choice

## Handoff
UseCase and Gateway are main markers and kinds of action in src/skeleto.ts (ALLOWED_DEPENDENCIES per kind; creation order Config, Wrapper, Gateway, UseCase, Action; all three wrapped). Use cases and gateways depend on Config and Gateway only; plain Action is free. Kind is mainDecorator.name. README, BEST/TECHNICAL practices, docs/ (konsep, teknis), CLAUDE.md follow; the checklist keeps one architecture check (no plain Action), guard wrapper removed. Must not break: README output assertions, rule headings matching REVIEW_CHECKLIST rows, example finding line (stock_transfer.ts:17).

## Review
- 2026-11-22 standard, round 1, at df8c052: sent back.
  1: ok 21 '@UseCase alone, or @Gateway alone...' and scanner '@UseCase and @Gateway alone are main markers' run by name, pass
  2: 'a use case that depends on a use case, and a gateway...' passes: fixture module-level throw never run, exact lines name Transfer and Count
  3: same test, Notify -> Count line asserted exactly; VIOLATIONS Gateway/UseCase
  4: ok 22 (plain Report on Transfer, Store, Helper starts), ok 23 (Transfer and Store on Plain refused, both named)
  5: ok 24, all three pairs give 'more than one main marker' with another mistake
  6: ok 27, mainDecorator.name Gateway/UseCase seen by the wrapper; readme.test.ts 46/46 pass
  7 FAIL: CLAUDE.md 1.1 names docs/ as the practice documents, and docs/ still teaches the old form, which now stops startup. Found by: grep -rn '@Action\|Rencana\|kelak\|implUseCaseWrapper\|MARKERS' docs. (a) @Action written with @UseCase/@Gateway: teknis/komponen.md:125,132; konsep/use-case.md:49; konsep/gateway.md:46. (b) UseCase/Gateway in MARKERS or '@Action + marker' as current: teknis/komponen.md:136-141; konsep/use-case.md:97; konsep/gateway.md:82; README.md:27-28; teknis/action.md:19-20.
  7 cont: (c) stale 'Rencana, belum terealisasi' or status rows for what this ticket built: docs/README.md:19,69; teknis/komponen.md:151; teknis/action.md:15,137; konsep/use-case.md:95,113 (names implUseCaseWrapper),218-219; konsep/gateway.md:80,216,264-265; teknis/wrapper.md:153. (d) old rules: teknis/komponen.md:3,7 (three kinds),27 (@Action deps); teknis/action.md:11 (only kind wrapped),69,108 ('Usulan' though Q5 decided); teknis/wrapper.md:136 marked(metadata,'Gateway'); teknis/use-case-gateway-bawaan.md 'Yang belum diputuskan'/'Dampak' still a plan. Rewrite these; keep rule ids stable.
  8: ok 26, reverse-written fixture created Settings, Wrap, Cache, Store, Transfer, Count, Plain (one action group would differ); CLAUDE.md 4.7 states it
  note: src/ is 481 lines vs the ~400 guide (reminder only); no repo checks beyond typecheck/test/build
- 2026-11-22 standard, round 2, at 3c4e1b6: passed.
  1: carried from round 1 (ok 21 and scanner test); src/ and test/ untouched since df8c052
  2: carried (module-level throw never run, Transfer and Count named); code untouched
  3: carried (Notify -> Count line asserted); code untouched
  4: carried (ok 22, ok 23); code untouched
  5: carried (ok 24); code untouched
  6: carried (ok 27, readme.test.ts 46/46); code untouched
  7: round-1 grep over docs/ rerun: no @Action beside @UseCase/@Gateway, MARKERS is [Transaction, Audit], no implUseCaseWrapper, wrapper.md reads mainDecorator.name, rule and status rows updated; only Rencana left is wrapper.md:110 (wrapper order, out of scope)
  8: carried (ok 26, CLAUDE.md 4.7); code untouched
  note: docs/ has no test, so judged by grep and reading; no repo checks beyond typecheck/test/build
