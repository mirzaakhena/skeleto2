---
type: feature
priority: medium
lane: standard
labels: []
blocked_by: [261116100205, 261116100206]
related: [261116100204]
touches: [src/scanner.ts, src/type.ts, src/index.ts, src/skeleto.ts, test/scanner.test.ts, test/skeleto.test.ts, test/readme.test.ts, README.md, CLAUDE.md]
created: 2026-11-16 10:36
---

## Background

The scanner reads every `.ts` file under the directory it is given, with no exception. That makes three traps: a test file inside the application folder that marks a fake component gets registered as a real one; a marked declaration in a `.d.ts` file becomes a component that has no body to call; and starting from the project root scans all of `node_modules`. The owner decided (2026-11-16) that the scan keeps its simple rule but takes a list of exclusions, with a default list that covers these traps. The part of the earlier assumption about order (files in sorted path order, functions in source order) stays as it is.

## Request

Let the application say what the scan leaves out, through the startup options, and ship a default list as one named constant that is part of the public API:

- `node_modules`
- `*.d.ts`
- `*.test.ts`
- `*.spec.ts`

The option is `exclude` in `SkeletoOptions` and the constant is `DEFAULT_EXCLUDE`. Without the option, the default list applies. With the option, the given list replaces the default, so an application can pass an empty list to scan everything or write `[...DEFAULT_EXCLUDE, "generated"]` to add its own entries. An entry without a wildcard names a folder or file at any depth; an entry starting with `*` matches file names by their ending. Entries are compared with names below the scanned directory only: the directory given to `Skeleto.start` is always scanned, even when its own path contains an excluded name. An entry this rule cannot express (a path separator, a `*` anywhere but the first character, a lone `*`, an empty string) is a usage mistake: it is collected with the other startup mistakes, names the entry, and stops startup before any application file is imported. No new runtime dependency is added for this. `CLAUDE.md` (sections 4.2 and 5, written in Indonesian like the rest of that file) and the README (in English) describe the option, the constant, the default entries and the rejected entry forms, so later sessions and users read the same rule.

## Done when

- [ ] With no option given, tests show that a marked function in a `.d.ts` file, in a `*.test.ts` file, in a `*.spec.ts` file and under a `node_modules` folder (also a nested one) is not a component and causes no mistake, while a normal file beside them is still found.
- [ ] A test shows that an empty list scans everything, so those same files do produce components.
- [ ] A test shows that a list built from the default constant plus one more entry leaves out both the defaults and the added entry, and that a list without the defaults no longer leaves the defaults out.
- [ ] Tests show that each of these entries stops startup with a message that names the entry, reported together with another mistake in the same directory and before any application file is imported: `generated/models`, `foo*`, `*.test.*`, `**/x`, `*`, and an empty string.
- [ ] A test shows that a directory whose own path contains `node_modules` is scanned when it is the directory given, with the default list.
- [ ] A directory whose only `.ts` files are excluded is reported the same way as a directory without `.ts` files.
- [ ] The default list is the one constant `DEFAULT_EXCLUDE` exported from the package, and the option `exclude` is part of `SkeletoOptions`; `CLAUDE.md` sections 4.2 and 5 and the README state both, with the four default entries.
- [ ] The only runtime dependency is still `ts-morph`, the framework source outside tests is still under 400 lines, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Full glob syntax (`**`, braces, negation). Reporting a misspelt main marker such as `@Acton`: the owner decided it stays silent and surfaces as a missing dependency at startup.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] What are the public names of the option and of the constant? CLAUDE.md section 5 says public names are not chosen without the owner. Options: (a) option 'exclude' in SkeletoOptions and constant 'DEFAULT_EXCLUDE'; (b) 'excludes' and 'DEFAULT_EXCLUDES'; (c) 'ignore' and 'DEFAULT_IGNORE'; (d) the worker chooses. Recommended: (a), it reads like the same setting in tsconfig.json, which every user of this package already knows.
  → ikut saranmu — (a): option 'exclude' in SkeletoOptions and constant 'DEFAULT_EXCLUDE' (owner, 2026-11-16)
- Q2 [answered] When the application passes its own list, does it replace the default list or is it added to it? Your words were only that exclusions go in the options and one constant excludes the four by default. Options: (a) replace: the given list is the whole list, an empty list scans everything, and an application writes [...DEFAULT, 'generated'] to keep the defaults; (b) add: the defaults always apply and cannot be switched off. Recommended: (a), it is the reason to export the constant, and it is what the ticket's Done-when lines now test.
  → ikut saranmu — (a): the given list replaces the default; an empty list scans everything (owner, 2026-11-16)
- Q3 [answered] What happens with an entry the simple rule cannot express: a path ('generated/models'), a wildcard that is not the first character ('foo*', '*.test.*', '**/x'), a lone '*', or an empty string? Options: (a) a startup mistake naming the entry, collected with the others before any import; (b) accepted silently, never matches; (c) also support paths relative to the scanned directory. Recommended: (a): a misspelt exclusion that matches nothing would register test files as components, and section 2 says mistakes fail early. (a) adds a Done-when line with a test per rejected form.
  → ikut saranmu — (a): an entry the simple rule cannot express is a startup mistake naming the entry, collected with the others before any import (owner, 2026-11-16)
- Q4 [answered] Are entries matched against names below the scanned directory only, or against the scanned directory's own path too? Example: Skeleto.start('node_modules/some-package/src'). Options: (a) below only: the directory you name is always scanned, even when its own path contains node_modules; (b) the whole absolute path: such a start finds nothing and reports an empty directory. Recommended: (a), naming a directory is an explicit request, and (b) would make a project that lives under a folder called node_modules impossible to start.
  → ikut saranmu — (a): entries are matched against names below the scanned directory only (owner, 2026-11-16)
- Q5 [answered] You said everything must be in English. CLAUDE.md is in Indonesian and its section 7 says documents for AI stay Indonesian. In which language does this ticket write its additions to CLAUDE.md sections 4.2 and 5? Options: (a) Indonesian, like the rest of the file; (b) English for the added lines only; (c) translate the whole CLAUDE.md to English and change the section 7 rule, as a separate ticket queued before this one. Recommended: (a) for this ticket, a file in two languages is worse than either; say (c) if you want the file itself in English and that ticket is added.
  → ikut saranmu — (a): the additions to CLAUDE.md are written in Indonesian, like the rest of the file (owner, 2026-11-16)

## Assumptions
- A1 [unseen] An excluded folder is not walked at all: nothing below it is listed, read or reported, including unreadable folders inside it
  Why: The ticket's third trap is the cost of scanning all of node_modules; skipping only the files would still walk it
  If wrong: Walk excluded folders and drop their files after listing
- A2 [unseen] Matching is exact and case-sensitive on one name at a time: an entry without a wildcard equals a folder name or a full file name ('node_modules', 'legacy.ts'), an entry starting with '*' is compared with the end of file names only, never folder names
  Why: The Request says 'names a folder or file' and 'matches file names by their ending'; the scanner already compares the .ts ending case-sensitively
  If wrong: Change the comparison in the one matcher function in src/scanner.ts
- A3 [unseen] The constant is declared in src/type.ts as a readonly string array and re-exported from src/index.ts; the option is an optional string array in SkeletoOptions; scanDirectory receives the list as a further parameter
  Why: Section 6 puts public types in type.ts and keeps index.ts without logic; scanner.ts already imports from type.ts
  If wrong: Move the constant to src/scanner.ts and re-export it from there

## Decisions
- Lane standard: adds a public option and constant and changes which files the scanner reads; no data at risk, easy to revert
- Waits for 205 and 206: the option is passed through Skeleto.start, which 205 builds, and the README it extends (with the test that runs its examples) is written by 206. Not solo: nothing else is queued beside it
- Line budget: src/ is 370 lines once 205 lands (scanner 130, skeleto 92, decorator 54, type 46, dependency 45, index 3), so this ticket has about 29 lines for the constant, the option, the matcher and any check of the entries
- Owner answered Q1 to Q5 with the recommended option each; Request and Done when now carry the names exclude and DEFAULT_EXCLUDE, the rejected entry forms and the below-the-directory rule. 205 and 206 are in main, so nothing blocks it
