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

- [ ] Tests show a marker without data (its data is `undefined`) and a marker with text data (trimmed).
- [ ] Tests show JSON data on the marker's own line, JSON data that starts on the following line, and JSON data spread over several lines; each is returned as the parsed value.
- [ ] Tests show that an `@` in the middle of a sentence and an `@` inside an e-mail address are not read as markers, and that a marker line may be preceded by spaces and `*`.
- [ ] Tests show that tags starting with a lowercase letter are ignored, both well-known ones (`@param`, `@returns`) and one that is on no list (such as `@defaultValue`), including when they sit between two Skeleto markers, and that their text does not leak into the data of the marker before them.
- [ ] Tests show that invalid JSON is reported as a problem that names the marker, and that the other markers of the same block are still returned.
- [ ] Several markers in one block come back in the order written.
- [ ] The reader does not import `ts-morph` and its tests create no files.

## Out of scope

Deciding whether a function is a component, and validating the data of main markers (both belong to the scanner ticket).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Which JSDoc tags count as 'standard' and are ignored? CLAUDE.md 4.1 lists some 'and the like', which nobody can check. (a) Any tag starting with a lowercase letter is standard and ignored (it still ends the data of the marker before it); Skeleto markers start with an uppercase letter. (b) The fixed list of the old code (param, returns, deprecated, example, see, throws, todo, internal, remarks and about 17 more); any other tag is an additional marker. Recommended (a): one rule, no list to maintain, and a tag such as @defaultValue can never stop a startup. Its cost: a lowercase typo such as @transaction is ignored silently.
  → Huruf kecil = standar (Recommended) — option (a): any tag starting with a lowercase letter is standard and ignored, though it still ends the data of the marker before it; Skeleto markers start with an uppercase letter. (owner, 2026-11-16)

## Decisions
- Lane standard: a pure parsing function with its own tests
- Waits for 201 (needs the project and the Decorator type); runs side by side with 203, they share no file
