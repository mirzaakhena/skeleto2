---
type: bug
priority: high
lane: standard
labels: []
blocked_by: []
related: [261116100205]
touches: [src/skeleto.ts, test/skeleto.test.ts, CLAUDE.md]
created: 2026-11-16 11:37
---

## Background

What a wrapper or an action hands back is stored as it is. An independent review (2026-11-16) showed the result: a wrapper that forgets to return the handler on one of its paths lets startup succeed with every action in the container being `undefined`, including the ones injected into other actions. The failure then appears elsewhere, with a message that points away from the cause ("X is not found in the container", or "x is not a function" on the first request). An action function that returns nothing is stored the same way. A wrapper function that itself returns something that is not a function does fail at startup, but the message blames the action and reads `wrapper.wrap is not a function`.

## How to reproduce

1. Write a wrapper whose returned function returns the handler only when the action has a certain additional marker, and returns nothing otherwise.
2. Write an action without that marker.
3. Start the directory.
4. Startup succeeds, and the action's instance in the container is `undefined`.

## Request

Stop startup, the same way a component that throws stops it today, when:

- an action function returns something that is not a function;
- a wrapper function returns something that is not a function;
- a wrapper, applied to an action, returns something that is not a function.

Each error names what is at fault: the action and its function in the first case, the wrapper and its function in the other two (and the action being wrapped in the third). Nothing is remembered, so the next start scans again.

## Done when

- [ ] A test shows that an action function returning `undefined` stops startup with an error naming the action and its function.
- [ ] A test shows that a wrapper function returning something that is not a function stops startup with an error naming the wrapper and its function, not an action.
- [ ] A test shows the case from "How to reproduce": startup stops with an error naming the wrapper and the action it was wrapping.
- [ ] A wrapper that returns the handler unchanged, and one that returns a new function, both still work; existing tests still pass.
- [ ] After each of these failures the next start of the same directory scans again.
- [ ] The three commands of `CLAUDE.md` section 9 pass, and `CLAUDE.md` section 4.7 (in Indonesian) says that an action and every wrapping must yield a function.

## Out of scope

Checking what a config returns. Checking the number or types of a handler's parameters.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Decisions
- Lane standard: a startup check on what components return; no data kept, a failure is a loud startup error covered by tests
- Runs beside 261116113701 and 261116113703: shares src/skeleto.ts and CLAUDE.md with them but needs neither's result
