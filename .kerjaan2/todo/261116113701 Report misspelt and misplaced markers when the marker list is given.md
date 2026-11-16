---
type: feature
priority: high
lane: standard
labels: []
blocked_by: []
related: [261116100204]
touches: [src/scanner.ts, src/decorator.ts, test/scanner.test.ts, test/decorator.test.ts, test/skeleto.test.ts, CLAUDE.md, README.md]
created: 2026-11-16 11:37
---

## Background

A function is examined only when it carries a main marker. An independent review (2026-11-16) showed what that lets through, even when the application gives its list of allowed markers:

- A wrapper marked `@Wraper` instead of `@Wrapper` is skipped. Startup succeeds and every action runs without that wrapper, for example without its transaction. Nothing depends on a wrapper, so nothing else fails.
- An additional marker written in lowercase, `@transaction` on an action, is dropped as a standard JSDoc tag. Startup succeeds and the action has no additional marker.
- A main marker on something that is not a top-level function declaration (an exported constant holding a function, a function inside a namespace) is skipped without a word.

The owner had decided to leave functions without a main marker alone (assumption A3 of the scanner ticket), judging by the case of a misspelt action, which surfaces as a missing dependency. After seeing the wrapper case the owner agreed to report these mistakes when the marker list is given (2026-11-16). Without the list, nothing changes.

## Request

When the application gives its list of allowed additional markers, report as usage mistakes, together with all others and before any application file is imported:

- a JSDoc block on a top-level function that has uppercase markers but no main marker (this covers a misspelt main marker such as `@Wraper` or `@Actions`, and an additional marker with no main marker at all);
- a lowercase tag on any top-level function, component or not, that equals an allowed marker or a main marker when letter case is ignored (`@transaction`, `@action`, `@wrapper`), also when the block has no uppercase marker at all;
- a main marker in the JSDoc block of a top-level exported constant or of a function inside a namespace, saying that only top-level function declarations can be components.

Each message names the function or constant, its file and the marker. When the list is not given, all of these stay silent, as today. `CLAUDE.md` (sections 4.2 and 4.5, in Indonesian) and the README state the rule.

## Done when

- [ ] With the list given, tests show that `@Wraper` and `@Actions` on an exported top-level function, and a function carrying only `@Transaction`, each stop startup with a message naming the function and the marker.
- [ ] With the list given, tests show that `@transaction` on an action, and `@action` and `@wrapper` each alone on a top-level function with no uppercase marker, are each a mistake naming the function and the tag, while ordinary lowercase tags (`@param`, `@returns`, `@defaultValue`) are still ignored.
- [ ] With the list given, tests show that a main marker on an exported constant holding a function, and on a function inside a namespace, is each a mistake that says only top-level function declarations can be components.
- [ ] A top-level function with no JSDoc, or with a JSDoc block that has no uppercase marker and no lowercase tag equal to a main or allowed marker when letter case is ignored, is still left alone with the list given.
- [ ] Without the list, every case above starts (or is skipped) exactly as before this ticket; tests show it.
- [ ] These mistakes are reported together with other mistakes in one error, before any application file is imported (shown with a file that throws at module level).
- [ ] `CLAUDE.md` sections 4.2 and 4.5 and the README state the rule, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Markers inside plain `//` or `/* */` comments. Markers on overload signatures. Any report when the list is not given.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] With the list given, is a function whose JSDoc holds only a lowercase near-marker and no uppercase marker (/** @wrapper */ or /** @action */ above a top-level function) a mistake? The Request says 'on a component' and Done-when line 4 leaves a block without uppercase markers alone, but line 2 says '@action on a function' is a mistake. Options: (a) report it on any top-level function, so line 4 means 'no uppercase marker and no lowercase tag equal to a main or allowed marker'; (b) components only, so a lone @wrapper is still skipped in silence. Recommended: (a), a lone @wrapper is the same silent loss of a wrapper this ticket exists to stop.
  → Ya, laporkan (Recommended) — (a): a lowercase tag equal to a main or allowed marker is reported on any top-level function, also when the block has no uppercase marker (owner, 2026-11-16)

## Decisions
- Lane standard: new checks in the text scan only, nothing is run or stored; a wrong check stops a startup loudly and is caught by tests
- Runs beside 261116113702 and 261116113703: same files in places (src/scanner.ts, CLAUDE.md, tests) but it needs neither's result; the merge queue settles the overlap
- Q1 answered (a): Request bullet 2 and Done-when lines 2 and 4 reworded so a lowercase tag equal to a main or allowed marker is reported on any top-level function, also with no uppercase marker in the block
