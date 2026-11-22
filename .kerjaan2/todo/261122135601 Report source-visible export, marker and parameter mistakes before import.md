---
type: bug
priority: high
lane: standard
labels: []
blocked_by: []
related: []
touches: []
created: 2026-11-22 13:56
---

## Background

An independent review of main at `78d4ab8` (`TEMUAN.md` finding 19) found mistakes that are visible in the source text but are accepted, wrongly rejected, or reported only after the application's files were imported. `CLAUDE.md` section 4.8 says every mistake visible in the source is reported at startup, together with the others, before any application file is imported. The reviewer reproduced each one.

The owner decided on 2026-11-22: only the form `export function implX` counts as exported (one way only, for consistency); an export list such as `export { implX }` is refused with a clear message.

## How to reproduce

1. Start with `decorators: ["logging"]` and a function marked `@logging`: startup says "write @logging", repeating the mistake. Marked `@Logging` instead, it says `@Logging` is not allowed. The entry can never be satisfied.
2. Write a marked `export declare function implY(): Y;`: the scan accepts it, and startup fails only after importing, with "create is not a function", after earlier configs were already built.
3. Write a marked function and export it with `export { implX }`: startup says it "is not exported by name", which reads as if it were not exported at all.
4. Write `implY(this: void, db: Db)`: startup says "dependency void is not a known component"; with a name that resolved, every argument after it would be shifted by one.
5. Put a main marker on a static class method and pass `decorators`: it is dropped without a word, although `CLAUDE.md` 4.2 lists methods among the misplaced places reported once `decorators` is given.
6. Rename or move a wrapper file on Windows: wrapper layering follows sorted file paths, and the path separator `\` sorts differently from `/`, so the same application layers differently on Windows and macOS.

## Request

Every one of these mistakes is reported at startup, before any application file is imported, together with the other mistakes, with a message that names the function or the option entry and says what to write instead. A `this` parameter is not a dependency. Wrapper layering is the same on every operating system. The rule that configs are awaited one at a time is proven by a test.

## Done when

- [ ] An entry of `decorators` that does not start with an uppercase letter (such as `"logging"` or `"@Logging"`) is reported at startup as an option mistake that names the entry.
- [ ] A marked function declared with `declare` is reported before any application file is imported, naming the function.
- [ ] A marked function exported only through an export list is reported with a message that says to write `export function`, naming the function.
- [ ] A `this` parameter is ignored: it is not a dependency and does not shift the arguments.
- [ ] A main marker on a class method is reported when `decorators` is given, as `CLAUDE.md` 4.2 says.
- [ ] Wrapper layering compares file paths with `/` as separator on every operating system, proven by a test.
- [ ] A test proves that two independent asynchronous configs are awaited one after the other, not at the same time.
- [ ] `CLAUDE.md` states each of these rules, each with a test.

## Out of scope

- Refusing plain `@Action` (a separate ticket).
- Retiring the old practice documents (a separate ticket).
