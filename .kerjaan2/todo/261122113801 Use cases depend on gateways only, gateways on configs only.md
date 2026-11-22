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

- [ ] A use case that depends on a config stops startup before any application file is imported, and the message names both.
- [ ] A gateway that depends on another gateway stops startup before any application file is imported, and the message names both.
- [ ] A use case that depends only on gateways, and a gateway that depends only on configs, start as before; a plain `@Action` may still depend on configs and on every kind of action.
- [ ] `CLAUDE.md` states the new rules, each with a test, and no longer allows the old ones.
- [ ] The README, `docs/` and the old practice documents state the new rules, and nothing in them still says that a gateway may be built from other gateways or that a use case may use a config.
- [ ] The practice documents explain where a business parameter, code shared by gateways, and the time or a new id needed by a gateway come from instead.

## Out of scope

- The scenario-explorer tracer, whose "indirect gateway" feature becomes obsolete; it is part of the tracer follow-up already noted in `TEMUAN.md`.
- Shrinking the core code (`TEMUAN.md` finding 1).
