---
type: feature
priority: high
lane: standard
labels: []
blocked_by: [261116100201]
related: []
touches: [src/decorator.ts, test/decorator.test.ts]
created: 2026-11-16 10:02
---

## Background

Skeleto components are marked by lines inside JSDoc comments (`@Config`, `@Wrapper`, `@Action`, and additional markers such as `@Transaction`). Reading those lines must be exact, and it must be testable on plain text, with no files and without the TypeScript parsing library.

## Request

Provide the marker reader described in `CLAUDE.md` section 4.1: given the text of one JSDoc block, it returns the markers found, each with its data, in the order written, together with the list of problems found. It is a pure function. It reads every marker it sees and leaves it to its caller to tell main markers from additional ones. A Skeleto marker starts with an uppercase letter. Any tag that starts with a lowercase letter (`@param`, `@returns`, `@deprecated`, `@example`, `@see`, `@throws`, `@todo`, `@internal`, and every other one) is a standard JSDoc tag: it never comes out as a marker, but it still ends the data of the marker before it (owner's decision, Q1).

## Done when

- [x] Tests show a marker without data (its data is `undefined`) and a marker with text data (trimmed).
- [x] Tests show JSON data on the marker's own line, JSON data that starts on the following line, and JSON data spread over several lines; each is returned as the parsed value.
- [x] Tests show that an `@` in the middle of a sentence and an `@` inside an e-mail address are not read as markers, and that a marker line may be preceded by spaces and `*`.
- [x] Tests show that tags starting with a lowercase letter are ignored, both well-known ones (`@param`, `@returns`) and one that is on no list (such as `@defaultValue`), including when they sit between two Skeleto markers, and that their text does not leak into the data of the marker before them.
- [x] Tests show that invalid JSON is reported as a problem that names the marker, and that the other markers of the same block are still returned.
- [x] Several markers in one block come back in the order written.
- [x] The reader does not import `ts-morph` and its tests create no files.

## Out of scope

Deciding whether a function is a component, and validating the data of main markers (both belong to the scanner ticket).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Which JSDoc tags count as 'standard' and are ignored? CLAUDE.md 4.1 lists some 'and the like', which nobody can check. (a) Any tag starting with a lowercase letter is standard and ignored (it still ends the data of the marker before it); Skeleto markers start with an uppercase letter. (b) The fixed list of the old code (param, returns, deprecated, example, see, throws, todo, internal, remarks and about 17 more); any other tag is an additional marker. Recommended (a): one rule, no list to maintain, and a tag such as @defaultValue can never stop a startup. Its cost: a lowercase typo such as @transaction is ignored silently.
  → Huruf kecil = standar (Recommended) — option (a): any tag starting with a lowercase letter is standard and ignored, though it still ends the data of the marker before it; Skeleto markers start with an uppercase letter. (owner, 2026-11-16)

## Assumptions
- A1 [confirmed] A marker whose JSON is invalid is still returned, with data undefined, next to the problem that names it.
  Why: The scanner then still sees the function as a component and can report its other problems in the same startup error.
  If wrong: Drop the push of the marker in the catch branch of close() in src/decorator.ts and adjust two tests.
  Confirmed by owner, 2026-11-16
- A2 [confirmed] Text data that continues over several lines keeps its line breaks (lines joined with a newline, then trimmed); text before the first marker is ignored.
  Why: CLAUDE.md 4.1 says data may continue on following lines but not how they are joined; keeping the breaks loses nothing.
  If wrong: Change the join separator in close() in src/decorator.ts.
  Confirmed by owner, 2026-11-16

## Decisions
- Lane standard: a pure parsing function with its own tests
- Waits for 201 (needs the project and the Decorator type); runs side by side with 203, they share no file

## Handoff
Added src/decorator.ts with readDecorators(jsDoc: string): { decorators: Decorator[]; problems: string[] }, a pure function over the text of one JSDoc block (comment delimiters optional), plus test/decorator.test.ts. A tag counts only at the start of a line, after spaces and asterisks. Uppercase-first tags are markers, returned in written order; lowercase-first tags are dropped but end the previous marker's data. Data starting with { is parsed as JSON; invalid JSON adds a problem naming the marker (the caller should prefix the function name) and the marker is still returned with data undefined. Must not break: no ts-morph import here, and no main/additional distinction in this file.

## Review
- 2026-11-16 standard, round 1, at 722a598: passed.
  1: ran test/decorator.test.ts in a copy (19 pass); no-data and trimmed-text tests assert exact values; removing the trim in a copy made them fail.
  2: JSON on the marker line, starting on the next line, and over five lines are asserted as parsed objects; removing JSON.parse in a copy failed 8 tests.
  3: sentence and e-mail tests assert no marker; eight prefixes of spaces, tabs and asterisks yield Action. Dropping the line-start anchor failed 2 tests, dropping the prefix strip 15.
  4: param, returns, six more and unlisted defaultValue/somethingNew yield nothing; between two markers both come back with data undefined. Mutants 'lowercase is a marker' (4 fail) and 'lowercase does not end data' (2 fail) are caught.
  5: '@Wrapper {"ordinal": }' gives one problem matching /@Wrapper/, other three markers still returned; silencing the problem or dropping the name failed 2 tests each.
  6: five markers incl. a repeated Transaction asserted in written order with data; reversing the push order failed 6 tests.
  7: src/decorator.ts imports only the Decorator type from ./type.js; grep of the test file finds no writeFile/mkdtemp/mkdir.
  note: for the scanner ticket, not blocking: '/** @Action @Transaction */' reads as Action with text data '@Transaction'; '@Action-foo' as Action with data '-foo'; description lines after JSON data make that JSON invalid (data runs to the next tag).
  note: no AGENTS.md; the repo offers no checks beyond typecheck/test/build.
