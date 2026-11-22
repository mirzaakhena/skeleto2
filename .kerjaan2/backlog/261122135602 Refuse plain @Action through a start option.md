---
type: feature
priority: medium
lane: standard
labels: []
blocked_by: [261122135601]
related: []
touches: []
created: 2026-11-22 13:56
---

## Background

A plain `@Action` is allowed and has free rules. An application that follows the use case / gateway structure, however, should have none: a plain action there escapes every use case and gateway rule. Today this is guarded only by an architecture test that each application copies from `REVIEW_CHECKLIST.md`. That test starts the whole application a second time, reads the container (which another rule reserves to the start of the application), and runs only when tests run. The independent review (`TEMUAN.md` finding 19) pointed this out, and the framework's purpose is one structure enforced by the machine (`CLAUDE.md` 1.1).

On 2026-11-22 the owner decided that the machine guards it through an option of `Skeleto.start`.

## Request

An application can ask Skeleto, through a start option, to refuse every plain `@Action`. With the option, a plain `@Action` stops startup before any application file is imported, together with the other mistakes, naming the function. Without the option nothing changes. The copied architecture test is no longer needed and is removed from the documents.

## Done when

- [ ] With the option set, a plain `@Action` stops startup before any application file is imported, and the message names the function and the option.
- [ ] With the option set, an application with only configs, wrappers, use cases and gateways starts as before.
- [ ] Without the option, a plain `@Action` starts as before.
- [ ] A wrong value for the option is reported like the other option mistakes (`CLAUDE.md` 4.8).
- [ ] `CLAUDE.md` describes the option, with tests; the README example passes the option; the copied architecture test and its text are removed from `REVIEW_CHECKLIST.md`, and the practice documents tell applications that use use cases and gateways to set the option.

## Out of scope

- Retiring the old practice documents (a separate ticket); this ticket only removes the copied architecture test from them where it appears.
