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

- [x] A test shows that an action function returning `undefined` stops startup with an error naming the action and its function.
- [x] A test shows that a wrapper function returning something that is not a function stops startup with an error naming the wrapper and its function, not an action.
- [x] A test shows the case from "How to reproduce": startup stops with an error naming the wrapper and the action it was wrapping.
- [x] A wrapper that returns the handler unchanged, and one that returns a new function, both still work; existing tests still pass.
- [x] After each of these failures the next start of the same directory scans again.
- [x] The three commands of `CLAUDE.md` section 9 pass, and `CLAUDE.md` section 4.7 (in Indonesian) says that an action and every wrapping must yield a function.

## Out of scope

Checking what a config returns. Checking the number or types of a handler's parameters.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Assumptions
- A1 [confirmed] A promise counts as not a function too, and is reported as 'a promise'
  Why: An async wrapper layer or an action that returns a promise would be stored as a promise and fail on the first request, the same fault the ticket is about
  If wrong: Nothing to change in behaviour; drop the Promise branch of describe() in src/skeleto.ts to report it as 'object'
  Confirmed by owner, 2026-11-16

## Decisions
- Lane standard: a startup check on what components return; no data kept, a failure is a loud startup error covered by tests
- Runs beside 261116113701 and 261116113703: shares src/skeleto.ts and CLAUDE.md with them but needs neither's result

## Handoff
src/skeleto.ts build() now checks, right after a @Wrapper or @Action function returns and after each wrapper is applied to an action, that the result is a function. If not, startup throws after the try block (no cause) with a message that leads with the component at fault: the action or wrapper and its function, or for a wrapping the wrapper, its function and the action. Configs are not checked. The wrappers list carries an 'at' label (name, function, file) for that message. Must not break: a throwing wrapper still reports under the action's name; failures are still forgotten so the next start rescans. CLAUDE.md 4.7 gained one line.

## Review
- 2026-11-16 standard, round 1, at 35443c0: passed.
  1: Ran the five 'an action function that returns ...' tests by name (pass); they assert the exact message 'SaveUser: function makeSaveUser (<file>) returned <x>; a @Action must return a function'. Own fixture outside the suite gave the same message for an action returning undefined.
  2: Ran the five 'a wrapper function that returns ...' tests (pass); exact message 'Audit: function makeAudit (<file>) returned <x>; a @Wrapper must return a function' and an assertion that the action name is absent. Own fixture with a wrapper returning an object: message names Tx and makeTx, no action.
  3: Ran the 'certain marker' test (pass) and built the How-to-reproduce case myself: startup fails with 'Tx: function makeTx (<file>) returned undefined when wrapping Save; a wrapper must return a function for every action'.
  4: Ran the 'unchanged and one that returns a new function' test (pass); own fixture with a pass-through and a layering wrapper returned 'new:s' when the action was called. Full suite passed on this exact content per the board's test record (eb6962b475).
  5: Each of the 15 failure tests starts the same directory again after adding later.ts and finds AddedLater in the container, which can only come from a new scan; own run: second start of the same directory after the action and wrapper failures succeeded with function instances.
  6: typecheck, test and build passed on the content under review per the board's record, not rerun as instructed. CLAUDE.md 4.7 has the new Indonesian line saying the @Action function, the @Wrapper function and every wrapping must yield a function (judged by reading the diff).
  note: src/ is now 414 lines (403 on main) against the CLAUDE.md section 2 target of under 400; it is worded as a target and was already exceeded before this ticket, so not blocking.
  note: assumption A1 (a promise is reported as 'a promise') is still unseen by the owner; behaviour is covered by tests either way.
