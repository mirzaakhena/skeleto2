---
type: feature
priority: high
lane: standard
labels: []
blocked_by: []
related: [261122101201]
touches: []
created: 2026-11-22 11:38
---

## Background

Ticket 261122101201 made `@UseCase` and `@Gateway` built-in kinds of action with these dependency rules: a use case may depend on configs and gateways, a gateway on configs and gateways, and a plain `@Action` on configs and every kind of action.

On 2026-11-22 the owner decided the rules must be stricter (`TEMUAN.md` finding 18), so that the structure is one straight line, controller → use case → gateway → config, which a reviewer checks at a glance:
- A use case depends on gateways only, never on a config.
- A gateway depends on configs only, never on another gateway.
- A plain `@Action` keeps its free rules: it may depend on configs and on every kind of action.

The README example already follows the new rules (its use case depends only on gateways, its gateways only on configs).

Consequences the owner accepted, which the practice documents must explain so that nobody has to invent a way around them:
- A business parameter (a limit, a fee rate, a feature flag) reaches a use case through a gateway that reads it, or is a constant of the entity, never through a config.
- Code shared by several gateways (an HTTP client, a mapping) is a config (the client) or a plain function that is not a component, never another gateway.
- A gateway that needs the current time or a new id gets it in its input; the use case asks for it once, at its start.
- One gateway can no longer call another (for example an outbox gateway calling a payment gateway). The sender of an outbox is a separate process: a controller that calls a use case.

## Request

Skeleto refuses at startup, before any application file is imported and together with every other mistake, a use case that depends on a config and a gateway that depends on another gateway, naming both components. The written contract (`CLAUDE.md`), the README and the practice documents state the new rules and the four consequences above.

## Done when

- [x] A use case that depends on a config stops startup before any application file is imported, and the message names both.
- [x] A gateway that depends on another gateway stops startup before any application file is imported, and the message names both.
- [x] A use case that depends only on gateways, and a gateway that depends only on configs, start as before; a plain `@Action` may still depend on configs and on every kind of action.
- [x] `CLAUDE.md` states the new rules, each with a test, and no longer allows the old ones.
- [x] The README, `docs/` and the old practice documents state the new rules, and nothing in them still says that a gateway may be built from other gateways or that a use case may use a config.
- [x] The practice documents explain where a business parameter, code shared by gateways, and the time or a new id needed by a gateway come from instead.

## Out of scope

- The scenario-explorer tracer, whose "indirect gateway" feature becomes obsolete; it is part of the tracer follow-up already noted in `TEMUAN.md`.
- Shrinking the core code (`TEMUAN.md` finding 1).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
ALLOWED_DEPENDENCIES in src/skeleto.ts now makes UseCase depend on Gateway only and Gateway on Config only; plain Action unchanged. Tests: VIOLATIONS table and a new startup-before-import test in test/skeleto.test.ts; the creation-order test now uses configs for gateways. CLAUDE.md 4.6, README, B8/B22/B34, REVIEW_CHECKLIST, docs/konsep and docs/teknis state the rules and the four consequences. Do not reintroduce gateway-to-gateway or use-case-to-config dependencies; the readme tests assert the new wording.

## Review
- 2026-11-22 standard, round 1, at a1f258d: sent back.
  1: pass. Ran test 'a UseCase that needs a Config is a mistake naming both components' and 'a use case that depends on a config, and a gateway that depends on another gateway, stop startup before any import, together with another mistake' (boom fixture, asserts no 'module was imported', calls empty, exact line names Transfer and Settings): both pass.
  2: pass. Same new test asserts '- Cache: is a @Gateway and depends on Store, which is a @Gateway; a @Gateway may depend on @Config only', plus VIOLATIONS ['Gateway','Gateway']: pass.
  3: pass. 'a plain @Action may depend on a config, a use case, a gateway and another action; a use case depends on gateways only and a gateway on configs only' passes (container size 6); ALLOWED_DEPENDENCIES in src/skeleto.ts matches.
  4: pass. CLAUDE.md 4.6 table now Gateway->Config, UseCase->Gateway, text cites owner decision 2026-11-22 / TEMUAN 18; each forbidden pair has a VIOLATIONS row in test/skeleto.test.ts.
  5: FAIL. Stale copy of the old dependency table left in docs/. Instance: docs/teknis/komponen.md lines 27-28 still read '| `@Gateway` | `@Config`, `@Gateway` |' and '| `@UseCase` | `@Config`, `@Gateway` |', i.e. it still says a gateway may depend on gateways and a use case on a config. Shown by: grep -rn '`@Config`, `@Gateway`' docs (in the worktree). Fix: set Gateway to `@Config` and UseCase to `@Gateway`, as in CLAUDE.md 4.6. Same class, also fix: docs/README.md line 19 still says 'dua aturan antara use case dan gateway dijaga Skeleto' — the rules between them are no longer two; reword (e.g. 'aturan antara use case, gateway dan config'). All other docs (README.md, BEST_PRACTICES.md, REVIEW_CHECKLIST.md, TECHNICAL_PRACTICES.md, docs/konsep/*, docs/teknis/action.md, config.md, use-case-gateway-bawaan.md, wrapper.md) and every @UseCase/@Gateway code example were checked and comply.
  6: pass by reading (documentation content). BEST_PRACTICES B8 consequences list, B22, outbox step 3; docs/konsep/gateway.md GW-2, GW-12; use-case.md UC-4, UC-10; docs/teknis/config.md and use-case-gateway-bawaan.md cover business parameter, shared gateway code, time/id in input, outbox sender as controller.
  note: test/readme.test.ts asserts the new wording; full suite not rerun per brief (passed on 92c8c897bc). No extra repo checks beyond typecheck/test/build exist.
- 2026-11-22 standard, round 2, at 287c7a1: passed.
  1: carried from round 1; src and test untouched since a1f258d (only 287c7a1, docs).
  2: carried from round 1; code and tests untouched since a1f258d.
  3: carried from round 1; code and tests untouched since a1f258d.
  4: carried from round 1; CLAUDE.md untouched since a1f258d.
  5: pass. grep '`@Config`, `@Gateway`' over README, CLAUDE.md, practice docs and docs/ now matches only plain @Action rows; komponen.md table is Gateway->Config, UseCase->Gateway; 'dua aturan' gone from docs/README.md.
  6: carried from round 1 (by reading); its documents untouched since a1f258d.
  note: full suite not rerun per brief (passed on 4c35d79b5a); no repo checks beyond typecheck/test/build.
