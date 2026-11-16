---
type: task
priority: medium
lane: light
labels: []
blocked_by: [261116113701]
related: []
touches: [README.md, CLAUDE.md]
created: 2026-11-16 11:37
---

## Background

An independent review (2026-11-16) found places where the README or `CLAUDE.md` is wrong, or silent about a rule the code follows:

- The README says a default export is "not picked up"; in fact a marked default export is a usage mistake.
- Marker data runs to the next marker, so a sentence written after a marker becomes its data: after `@Action` it stops startup, after an additional marker it silently becomes that marker's data. A line starting with a main marker inside an `@example` body turns a helper into a component. The working rule, markers last and one per line, is written nowhere.
- A failed startup does not undo the configs it already created, and a later start creates them again, so a retry loop can leak connections. Nothing says so.
- `CLAUDE.md` 4.1 says standard tags "and the like" are ignored; the rule the owner chose is that any tag starting with a lowercase letter is standard.
- `CLAUDE.md` 4.7 says equal ordinals are ordered "by wrapper name" without saying which name ends up outside; the owner chose the later name.
- `CLAUDE.md` 4.8 says all mistakes are reported before any import; it cannot cover what only an import reveals (a syntax error, a file that throws).
- Type names are matched as written text, so `Map<string,number>` and `Map<string, number>` are two different names.

## Request

Correct and complete the two documents on exactly these points: the README in English, `CLAUDE.md` in Indonesian. No code changes.

## Done when

- [ ] The README says a marked default export is a mistake, not that it is skipped.
- [ ] The README tells where markers go in a JSDoc block (after the description, one per line, nothing but their data after them) and what happens otherwise.
- [ ] The README says that a failed startup leaves already created configs alive and that starting again creates them again.
- [ ] The README says type names are matched exactly as written, with the spacing example.
- [ ] `CLAUDE.md` 4.1 states the lowercase rule, 4.7 states which name is outside for equal ordinals, and 4.8 states the limit of "before any import" and that a failed start does not undo created configs.
- [ ] Every code example in the README still starts in its test, and nothing outside `README.md` and `CLAUDE.md` changed.

## Out of scope

Anything in `~/Workspace/nukitu`. A script that builds the package on install. Startup time.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Decisions
- Lane light: text in README.md and CLAUDE.md only, cheap to undo; test/readme.test.ts still guards the examples
- Waits for 261116113701: that ticket changes the rules this one writes down (with the marker list a lowercase tag equal to a marker is a mistake, and a marked constant is a mistake rather than skipped), so CLAUDE.md 4.1 and the README line on what is not picked up must be written against main as 261116113701 left it, and must not contradict what it added to 4.2, 4.5 and the README. Does not wait for 261116113702 or 261116113703: it only shares CLAUDE.md with them
