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

- [x] An entry of `decorators` that does not start with an uppercase letter (such as `"logging"` or `"@Logging"`) is reported at startup as an option mistake that names the entry.
- [x] A marked function declared with `declare` is reported before any application file is imported, naming the function.
- [x] A marked function exported only through an export list is reported with a message that says to write `export function`, naming the function.
- [x] A `this` parameter is ignored: it is not a dependency and does not shift the arguments.
- [x] A main marker on a class method is reported when `decorators` is given, as `CLAUDE.md` 4.2 says.
- [x] Wrapper layering compares file paths with `/` as separator on every operating system, proven by a test.
- [x] A test proves that two independent asynchronous configs are awaited one after the other, not at the same time.
- [x] `CLAUDE.md` states each of these rules, each with a test.

## Out of scope

- Refusing plain `@Action` (a separate ticket).
- Retiring the old practice documents (a separate ticket).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
Scanner now reports export-list exports, declare functions and class-method markers (with decorators); this parameters are skipped; file paths are built with / so layering is OS independent. Startup drops and reports decorators entries not matching /^[A-Z][A-Za-z0-9_]*$/. CLAUDE.md updated with tests. Must not break: all errors collected before any import; export function is the only counted export form.

## Review
- 2026-11-22 standard, round 1, at df2ad4f: passed.
  1: skeleto.test 'options.decorators entry "logging"/"@Logging" is an option mistake...' passes on HEAD and fails on main's src (copy with main src/ + new tests); regex matches decorator.ts TAG_LINE + uppercase rule
  2: scanner.test 'a marked function declared with declare...' and skeleto.test combined test (module-level throw not reached) fail on main src, pass on HEAD
  3: scanner.test 'exported through an export list' (plain and renamed) and combined skeleto test assert the 'export function <name>' advice; fail on main src
  4: scanner.test deps [Db, Cache] and skeleto.test 'a this parameter is not passed' (Beta got only alpha); main src fails with 'dependency void is not a known component'
  5: scanner.test class-method test (reported as Holder.makeIt with list, silent without) fails on main src, passes on HEAD
  6: scanner.test a/b.ts before a0.ts and skeleto.test layering test pass; they cannot fail on POSIX, so the Windows behaviour is judged by reading listFiles ('/' 0x2F < '0', '\\' 0x5C > '0'). Repo has no CI to run Windows
  7: skeleto.test 'two independent async configs are awaited one after the other' (delays 40/10, asserts Alpha, Alpha ready, Beta, Beta ready); concurrent awaiting would put Beta before Alpha ready. Passes on main too, as the behaviour already held
  8: CLAUDE.md 4.2, 4.3, 4.5, 4.7 diff states each rule and names its test file; tests confirmed above
  note: 'export { makeR as other } from "./b.js"' (a re-export of another module's name) is still reported, but with the export-list message, because the check matches export specifiers by name without checking the module specifier
  note: class methods are checked only for top-level class declarations; classes inside namespaces and class expressions are not checked. Messages still build the file part with path.relative, so Windows messages show backslashes (outside this ticket)
