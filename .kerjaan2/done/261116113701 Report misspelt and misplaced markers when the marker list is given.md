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

- [x] With the list given, tests show that `@Wraper` and `@Actions` on an exported top-level function, and a function carrying only `@Transaction`, each stop startup with a message naming the function and the marker.
- [x] With the list given, tests show that `@transaction` on an action, and `@action` and `@wrapper` each alone on a top-level function with no uppercase marker, are each a mistake naming the function and the tag, while ordinary lowercase tags (`@param`, `@returns`, `@defaultValue`) are still ignored.
- [x] With the list given, tests show that a main marker on an exported constant holding a function, and on a function inside a namespace, is each a mistake that says only top-level function declarations can be components.
- [x] A top-level function with no JSDoc, or with a JSDoc block that has no uppercase marker and no lowercase tag equal to a main or allowed marker when letter case is ignored, is still left alone with the list given.
- [x] Without the list, every case above starts (or is skipped) exactly as before this ticket; tests show it.
- [x] These mistakes are reported together with other mistakes in one error, before any application file is imported (shown with a file that throws at module level).
- [x] `CLAUDE.md` sections 4.2 and 4.5 and the README state the rule, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Markers inside plain `//` or `/* */` comments. Markers on overload signatures. Any report when the list is not given.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] With the list given, is a function whose JSDoc holds only a lowercase near-marker and no uppercase marker (/** @wrapper */ or /** @action */ above a top-level function) a mistake? The Request says 'on a component' and Done-when line 4 leaves a block without uppercase markers alone, but line 2 says '@action on a function' is a mistake. Options: (a) report it on any top-level function, so line 4 means 'no uppercase marker and no lowercase tag equal to a main or allowed marker'; (b) components only, so a lone @wrapper is still skipped in silence. Recommended: (a), a lone @wrapper is the same silent loss of a wrapper this ticket exists to stop.
  → Ya, laporkan (Recommended) — (a): a lowercase tag equal to a main or allowed marker is reported on any top-level function, also when the block has no uppercase marker (owner, 2026-11-16)

## Assumptions
- A1 [confirmed] The 'markers but no main marker' mistake applies to every top-level function, exported or not, and to any tag starting with an uppercase letter
  Why: The Request says 'a top-level function'; a misspelt main marker is often on a function that also lacks export
  If wrong: In readFunction (src/scanner.ts) add an export check to that report
  Confirmed by owner, 2026-11-16
- A2 [confirmed] A main marker on any exported top-level constant is reported, whether or not it holds a function; a constant that is not exported stays silent
  Why: The Request says 'top-level exported constant'; reading the initialiser adds code for no gain
  If wrong: In reportMisplaced (src/scanner.ts) change the hasExportKeyword condition
  Confirmed by owner, 2026-11-16
- A3 [confirmed] If the allowed list holds a name that is also a standard JSDoc tag in lowercase (Deprecated, Internal), that lowercase tag is reported as a miswritten marker
  Why: It is the rule as written: equal to an allowed marker when case is ignored
  If wrong: Skip a fixed list of standard tag names in the lowercase check of readFunction
  Confirmed by owner, 2026-11-16

## Decisions
- Lane standard: new checks in the text scan only, nothing is run or stored; a wrong check stops a startup loudly and is caught by tests
- Runs beside 261116113702 and 261116113703: same files in places (src/scanner.ts, CLAUDE.md, tests) but it needs neither's result; the merge queue settles the overlap
- Q1 answered (a): Request bullet 2 and Done-when lines 2 and 4 reworded so a lowercase tag equal to a main or allowed marker is reported on any top-level function, also with no uppercase marker in the block
- Three existing scanner tests asserted the old decision (function with only an additional marker, arrow constant, namespace function left alone WITH a list given); they now assert that only without the list, since this ticket reverses it
- readDecorators returns a third field, tags (names of lowercase tags); the case comparison lives in the scanner so decorator.ts stays unaware of the allowed list

## Handoff
With options.decorators given, the scanner now reports three more mistakes: a top-level function whose JSDoc has uppercase markers but no main marker; a lowercase tag equal, ignoring case, to a main or allowed marker on any top-level function; a main marker on an exported top-level constant or a function inside a namespace (reportMisplaced in src/scanner.ts). readDecorators gained the field tags. All of it is gated on the list: without it nothing may be reported, and that silence is tested case by case. Must not break: mistakes are collected, never thrown, and found before any import. src/ is now about 440 lines, above the 400 target.

## Review
- 2026-11-16 standard, round 1, at 10f41e9: passed.
  1: scanner tests by name pass (@Wraper, @Actions, lone @Transaction: one mistake naming function, file, marker); own Skeleto.start probe on a copy printed 'makeAudit (a.ts): has @Wraper but no main marker' and the same for the other two
  2: tests by name pass for @transaction on an action and @action, @wrapper, @config alone; own probe printed 'has the tag @transaction ... write @Transaction' (same for @action, @wrapper) and nothing for a function with @param/@returns/@defaultValue
  3: tests by name pass (arrow and function-expression constant, namespace, nested namespace); own probe printed 'cfg (a.ts): is marked @Config but is an exported constant; only top-level function declarations can be components' and the namespace line for inNs
  4: the 'still left alone' test passes and asserts the whole result equals {functions: [], errors: []}; own probe gave no line for a function without JSDoc or with ordinary tags only
  5: all 13 'without the list ... silent as before' tests pass, asserting no errors and the same components; own probe without options reported only the unrelated missing dependency, and 11 extra edge cases scanned without a list gave no errors
  6: startup test passes (six lines in one error, module-level throw present, nothing called); own probe with a throw at the top of the file gave 9 problems in one error, the missing dependency among them, and not the throw
  7: by reading: CLAUDE.md 4.2, 4.5 and the README rules state the three reports and the silence without the list. Section 9 commands not rerun: the board records them passing on this exact content (36aa5d271f)
  note: a main marker in a namespace written on one line (namespace ns { /** @Wrapper */ export function f()...}) is not reported: TypeScript attaches no JSDoc after a token on the same line. Same for top-level functions before this ticket, so not this change's bug
  note: a lowercase near-marker written twice is reported twice; a lowercase tag on an exported constant or namespace function stays silent, as the request limits that check to top-level functions
  note: src/ is 468 lines (main: 431), further above the under-400 target of CLAUDE.md section 2; the handoff's 'about 440' predates the merge with main. The target was already missed on main, so not blocking
  note: the repo offers no checks beyond typecheck, test and build (no lint script, no CI)
