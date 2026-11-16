---
type: feature
priority: high
lane: standard
labels: []
blocked_by: [261116100201]
related: []
touches: []
created: 2026-11-16 10:02
---

## Background

Skeleto components are marked by lines inside JSDoc comments (`@Config`, `@Wrapper`, `@Action`, and additional markers such as `@Transaction`). Reading those lines must be exact, and it must be testable on plain text, with no files and without the TypeScript parsing library.

## Request

Provide the marker reader described in `CLAUDE.md` section 4.1: given the text of one JSDoc block, it returns the markers found, each with its data, in the order written, together with the list of problems found. It is a pure function. It reads every marker it sees; deciding which names are main, additional or standard JSDoc tags to ignore must be possible for its caller, and standard tags (`@param`, `@returns`, `@deprecated`, `@example`, `@see`, `@throws`, `@todo` and the like) never come out as Skeleto markers.

## Done when

- [ ] Tests show a marker without data (its data is `undefined`) and a marker with text data (trimmed).
- [ ] Tests show JSON data on the marker's own line, JSON data that starts on the following line, and JSON data spread over several lines; each is returned as the parsed value.
- [ ] Tests show that an `@` in the middle of a sentence and an `@` inside an e-mail address are not read as markers, and that a marker line may be preceded by spaces and `*`.
- [ ] Tests show that standard JSDoc tags are ignored, including when they sit between two Skeleto markers, and that their text does not leak into the data of the marker before them.
- [ ] Tests show that invalid JSON is reported as a problem that names the marker, and that the other markers of the same block are still returned.
- [ ] Several markers in one block come back in the order written.
- [ ] The reader does not import `ts-morph` and its tests create no files.

## Out of scope

Deciding whether a function is a component, and validating the data of main markers (both belong to the scanner ticket).
