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

- [x] With no option given, tests show that a marked function in a `.d.ts` file, in a `*.test.ts` file, in a `*.spec.ts` file and under a `node_modules` folder (also a nested one) is not a component and causes no mistake, while a normal file beside them is still found.
- [x] A test shows that an empty list scans everything, so those same files do produce components.
- [x] A test shows that a list built from the default constant plus one more entry leaves out both the defaults and the added entry, and that a list without the defaults no longer leaves the defaults out.
- [x] Tests show that each of these entries stops startup with a message that names the entry, reported together with another mistake in the same directory and before any application file is imported: `generated/models`, `foo*`, `*.test.*`, `**/x`, `*`, and an empty string.
- [x] A test shows that a directory whose own path contains `node_modules` is scanned when it is the directory given, with the default list.
- [x] A directory whose only `.ts` files are excluded is reported the same way as a directory without `.ts` files.
- [x] The default list is the one constant `DEFAULT_EXCLUDE` exported from the package, and the option `exclude` is part of `SkeletoOptions`; `CLAUDE.md` sections 4.2 and 5 and the README state both, with the four default entries.
- [x] The only runtime dependency is still `ts-morph`, the framework source outside tests is still under 400 lines, and the three commands of `CLAUDE.md` section 9 pass.

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
- A4 [unseen] A backslash in an entry is rejected like a slash, and so is an entry that is not text; when a list has a rejected entry, its other entries still apply for that failed scan
  Why: A backslash is the path separator on Windows; keeping the usable entries means the report shows the bad entry and not a pile of mistakes from files that were meant to be left out
  If wrong: Loosen the one pattern in scanDirectory (src/scanner.ts), or pass an empty list to listFiles when any entry is rejected
- A5 [unseen] DEFAULT_EXCLUDE is frozen and typed readonly string[], and the option exclude accepts readonly string[] (a plain string[] still fits)
  Why: A shared constant that one caller could push to would change the scan of every later start; the readonly option type lets DEFAULT_EXCLUDE itself be passed
  If wrong: Drop Object.freeze and the readonly in src/type.ts

## Decisions
- Lane standard: adds a public option and constant and changes which files the scanner reads; no data at risk, easy to revert
- Waits for 205 and 206: the option is passed through Skeleto.start, which 205 builds, and the README it extends (with the test that runs its examples) is written by 206. Not solo: nothing else is queued beside it
- Line budget: src/ is 370 lines once 205 lands (scanner 130, skeleto 92, decorator 54, type 46, dependency 45, index 3), so this ticket has about 29 lines for the constant, the option, the matcher and any check of the entries
- Owner answered Q1 to Q5 with the recommended option each; Request and Done when now carry the names exclude and DEFAULT_EXCLUDE, the rejected entry forms and the below-the-directory rule. 205 and 206 are in main, so nothing blocks it
- A rejected exclude entry is reported by scanDirectory, as a line starting with 'exclude entry "<entry>"', ahead of the file mistakes: the scanner already collects everything found before any import, so no second check in skeleto.ts was needed. src/ is now 383 lines

## Handoff
The scan now skips names on an exclusion list. DEFAULT_EXCLUDE (src/type.ts, frozen, exported from index.ts) holds node_modules, *.d.ts, *.test.ts, *.spec.ts; SkeletoOptions.exclude replaces it. scanDirectory takes the list as its third parameter, rejects entries with a separator, a non-leading or lone *, or no text as collected errors ('exclude entry ...'), and listFiles compares each name below the root: exact name for folders and files, leading * as a file-name ending only. Excluded folders are never entered. Must not break: the given root is never matched, the list replaces rather than adds, errors come before any import, src/ stays under 400 lines (now 383). README and CLAUDE.md 4.2/5 describe it; test/readme.test.ts checks they name every default entry.

## Review
- 2026-11-16 standard, round 1, at 9cb45e1: passed.
  1: Named 'without a list' tests pass. Own probe: default start over a.ts plus .d.ts, .test.ts, .spec.ts, node_modules and nested node_modules files that throw at module level gave container ['A'], no throw.
  2: Named empty-list tests pass. Own probe with exclude: [] gave A, G, H, N, NN, S, T: every trap file became a component.
  3: Named tests pass. Own probe: [...DEFAULT_EXCLUDE, 'generated'] gave only A (generated at two depths out); ['generated'] alone gave A, N, NN, S, T.
  4: The six start tests pass. Own probe per entry, files throwing at module level: each error had 'exclude entry "<entry>"' beside 'Save: dependency Missing is not a known component', never the module throw.
  5: Named tests pass. Own probe: start of <tmp>/node_modules/app/src with the default list gave ['A']; the node_modules below it stayed out.
  6: Own probe: a directory with only a .txt, one with only default-excluded .ts files, and a.ts under exclude ['*.ts'] gave the identical line 'no .ts file with a @Config, @Wrapper or @Action function was found'.
  7: Probe imported DEFAULT_EXCLUDE from src/index.ts: four entries, frozen. dist/type.d.ts has exclude in SkeletoOptions. Readme test passes and can fail. By reading: CLAUDE.md 4.2 and 5 and the README section state both and the entries.
  8: package.json and lock have no diff against main, dependencies is ['ts-morph']; wc -l src/*.ts is 383. The three commands: the board's recorded pass on d501643ae7, not rerun as the brief says.
  note: no AGENTS.md; CLAUDE.md read, no rule broken. The repo offers no checks beyond the three commands.
  note: not blocking, by reading scanner.ts: exclude: null from untyped JS throws a TypeError instead of a collected mistake; '.' and '..' pass the check and match nothing; a bad entry given twice is reported twice.
  note: k2 test passes its arguments through a shell unquoted; a command with | or spaces in an argument has to go in a script.
