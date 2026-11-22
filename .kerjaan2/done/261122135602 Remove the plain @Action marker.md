---
type: feature
priority: medium
lane: standard
labels: []
blocked_by: [261122135601]
related: []
touches: [src/skeleto.ts, src/type.ts, test/skeleto.test.ts, test/readme.test.ts, CLAUDE.md, README.md, REVIEW_CHECKLIST.md, BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, docs/teknis/action.md, docs/teknis/komponen.md, docs/teknis/use-case-gateway-bawaan.md, docs/konsep/use-case.md, docs/README.md]
created: 2026-11-22 13:56
---

## Background

A plain `@Action` is allowed today and has free rules: it may depend on configs and on every kind of action. In an application that follows the use case / gateway structure it is an escape hatch: a function marked `@Action` instead of `@UseCase` passes every use case and gateway rule unchecked (a use case calling a use case, a use case reading a config). The only guard is an architecture test each application copies from `REVIEW_CHECKLIST.md`, which starts the whole application a second time and runs only with the tests. The independent review (`TEMUAN.md` finding 19) pointed this out.

On 2026-11-22 the owner first chose a start option to refuse plain actions, then, after discussing why plain actions exist at all, decided: **remove `@Action` as a marker altogether**. The framework's purpose is one standard structure enforced by the machine (`CLAUDE.md` 1.1); an action is now always a `@UseCase` or a `@Gateway`. There are no existing users, so no backward compatibility is needed.

## Request

`@Action` is no longer a marker Skeleto knows. The main markers are `@Config`, `@Wrapper`, `@UseCase` and `@Gateway`, and every action of an application is a use case or a gateway, so no rule can be bypassed by writing a plain action. A function still marked `@Action` stops startup before any application file is imported, together with the other mistakes, with a message that says to use `@UseCase` or `@Gateway`. The copied architecture test is no longer needed and is removed.

## Done when

- [x] A function marked `@Action` stops startup before any application file is imported, naming the function and saying to mark it `@UseCase` or `@Gateway`.
- [x] An application with only configs, wrappers, use cases and gateways starts as before, and every use case and gateway is still wrapped by every wrapper.
- [x] Nothing in Skeleto's behaviour or public types still offers a plain action as a kind of component.
- [x] `CLAUDE.md` lists four main markers and no plain action, with tests; the README and its example no longer use `@Action`.
- [x] The copied architecture test and its text are removed from `REVIEW_CHECKLIST.md`, and the practice documents (`docs/` and, while they exist, the old ones) no longer describe a plain `@Action`.

## Out of scope

- Retiring the old practice documents (a separate ticket); this ticket only removes plain `@Action` from them where it appears.
- Renaming the public type of an action's handler.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Name and shape of the new start option (SkeletoOptions is public API, CLAUDE.md 5). Options: (a) plainActions?: boolean, where false refuses every plain @Action and true or absent keeps today's behaviour; (b) allowPlainActions?: boolean, same meaning; (c) refusePlainActions?: boolean, true refuses; (d) a list of the allowed kinds, e.g. kinds: ["Config","Wrapper","UseCase","Gateway"]. Recommended: (a) plainActions: false. It reads as 'plain actions: none', leaving it out changes nothing, and a list (d) offers choices nobody asked for.
  → Obsolete. Owner, 2026-11-22: 'Ya sudah, hapus saja @Action.' No option: @Action is removed as a marker altogether; the ticket's Request and Done when were rewritten to match. (owner, 2026-11-22)
- Q2 [answered] The integration test (T21, KOM-11 main.test.ts) starts Skeleto with { decorators: MARKERS } only, so it passes with a plain @Action that main.ts refuses. Options: (a) main.ts and main.test.ts both write { decorators: MARKERS, plainActions: false }, and a README test checks the two calls match; (b) one exported start-options constant (e.g. START_OPTIONS in src/markers.ts) used by both, with T10/KOM-10 changed to say so; (c) only main.ts passes it. Recommended: (a). It is the smallest change, and the check keeps the two calls the same. (b) changes a rule.
  → Obsolete: there is no start option any more (owner removed @Action altogether), so main.ts and main.test.ts need no new option. (owner, 2026-11-22)

## Assumptions
- A1 [overturned] A wrong value is anything other than true, false or undefined (also the text "false", 0 and null). It is reported as options.<name>: must be true or false, received <value>, in the same Error as the other option and scan mistakes and before them, and the option is then treated as not given, so plain actions are allowed and the scan still runs.
  Why: CLAUDE.md 4.8: a wrong option is reported naming the option and the value received, and is then treated as not given; listOption in src/skeleto.ts already works this way
  If wrong: Change the check in build() and its test; no data is affected
  Overturned by owner, 2026-11-22
- A2 [overturned] The refusal message is one line per plain @Action. It names the component, the function, its file and the option, and asks for @UseCase or @Gateway, e.g. 'X: function implX (path) is a plain @Action, which options.plainActions: false refuses; mark it @UseCase or @Gateway'. It is collected with the other mistakes before any import. The dependency-kind messages for the same component still appear as they do today.
  Why: CLAUDE.md 4.8: every line names the function or type, and all source-visible mistakes are reported at once before import; the other startup lines use the 'name: function impl (file)' form
  If wrong: Change the message text and its test
  Overturned by owner, 2026-11-22
- A3 [overturned] The removed copied architecture test is replaced, in test/readme.test.ts, by a test that adds a plain @Action to a copy of the README example and checks that startup with the example's options refuses it before import, naming it. This is the pattern of the existing 'a misspelled marker stops it' test. The two old tests on the checklist's architecture test are deleted. REVIEW_CHECKLIST.md 'How to review' says Machine rules are checked by Skeleto at startup and by the gap test. The B5 row stays word for word with the B5 heading, and its Checked by becomes 'Machine: Skeleto, at startup'.
  Why: Done when asks that the README example passes the option and that the copied test goes; test/readme.test.ts already proves the other start options this way, and the checklist rows must match the headings word for word (lessons)
  If wrong: Restore the deleted tests from git
  Overturned by owner, 2026-11-22
- A4 [overturned] 'The practice documents' means both sets while both exist: B5 in BEST_PRACTICES.md and T10 where it shows the start call, and ACT-1, UC-1 and use-case-gateway-bawaan.md in docs/. They say that an application using use cases and gateways sets the option. Every excerpt of main.ts in TECHNICAL_PRACTICES.md and docs/teknis/komponen.md is updated to the new start call. CLAUDE.md gets the option in 4.6 (refusal) and 4.8 (value check), each with the test that proves it.
  Why: 261122135603 retires the old documents only after this ticket, and the lessons say docs/ must be updated together with the old files (CLAUDE.md 1.1)
  If wrong: Revert the document edits
  Overturned by owner, 2026-11-22
- A5 [confirmed] @Action is refused whether or not options.decorators is given, also when listed in it and also beside another main marker. One line per function, naming component (if any), function and file, saying to mark it @UseCase or @Gateway. With decorators given, lowercase @action is still a near-marker error with the same advice. @Action on a constant, namespace function or method is reported only with decorators, as other misplaced main markers are.
  Why: Done when 1 says a function marked @Action stops startup; CLAUDE.md 2 fails early, 4.5 is how placement mistakes are reported today
  If wrong: Narrow the check in src/scanner.ts and its tests
  Confirmed by owner, 2026-11-22
- A6 [confirmed] Only the marker and kind go: ActionHandler, the 'action' word for use cases and gateways together, and docs/teknis/action.md stay. ALLOWED_DEPENDENCIES loses Action; the empty-directory message and every marker list name four main markers. In docs/, ACT-1 keeps its number and becomes 'every action is a use case or a gateway'. Old B5 keeps its heading, and its checklist row becomes 'Machine: Skeleto, at startup'. 'How to review' names Skeleto at startup and the gap test. The two README tests of the copied test are deleted.
  Why: Out of scope excludes renaming the handler type; rule numbers are never reused; checklist rows must match headings verbatim
  If wrong: Revert the wording; no data is affected
  Confirmed by owner, 2026-11-22

## Decisions
- Lane standard: a new start option and its check in src/skeleto.ts, plus document edits; no data, login or money, cheap to undo
- Not solo, waits for nothing open: blocked_by 261122135601 is already in main. 261122135603 waits for this one.
- Lane standard (scope now removal of @Action): changes the main markers and kinds in src/, tests and documents; no data, login or money, and no existing users, so cheap to undo from git

## Handoff
@Action is no longer a marker. scanner.ts drops it from MAIN_DECORATORS and reports one line per function marked @Action (with or without options.decorators, also beside another main marker, lowercase @action with decorators, and misplaced on constants/namespaces/methods with decorators), advising @UseCase or @Gateway. skeleto.ts drops the Action kind from ALLOWED_DEPENDENCIES and from the empty-directory message. Tests that used @Action as a generic action now use @Gateway/@UseCase. The copied architecture test is gone from REVIEW_CHECKLIST.md; B5 heading and row now read 'Mark every use case @UseCase and every gateway @Gateway', checked by Skeleto at startup. Docs, README and CLAUDE.md updated. Must not break: the four-kind dependency table and the heading/row match.

## Review
- 2026-11-22 standard, round 1, at 610395e: sent back.
  1: met. Ran (k2 test, spec reporter, 49 pass): skeleto.test 'a function marked @Action stops startup before any import...' (module-level throw not hit), scanner.test 'the removed @Action marker' section, readme.test 'Skeleto refuses ... a function marked @Action'.
  2: met. skeleto.test 'every wrapper wraps every action...' (Gateway and UseCase each traced through both wrappers) and readme.test 'the README examples start and print exactly the output' pass.
  3: met. ALLOWED_DEPENDENCIES and MAIN_DECORATORS hold four kinds; src/type.ts unchanged; grep of src finds Action only as REMOVED_MARKER.
  4,5 FAIL, kind: docs still describing a plain action or the removed test. Found by grep -rn -i -E 'plain action|action polos|@action\b|tes arsitektur|tiga jenis' CLAUDE.md README.md docs. (a) CLAUDE.md:39 'Skeleto hanya mengenal tiga jenis action (use case, gateway, action polos)' -> two kinds. (b) docs/teknis/wrapper.md:112 'dengan pesan yang sama seperti pada @Config dan @Action' -> @Config, @UseCase, @Gateway. (c) docs/teknis/komponen.md:184 'Tes arsitektur dan tes celah di REVIEW_CHECKLIST.md' -> gap test only.
  4 (same kind, cont.): (d) CLAUDE.md:119 and README.md:441 give '@action' as a lowercase tag that equals a main marker; Action is no longer one (use e.g. @usecase, or say @action gets the @UseCase/@Gateway advice). (e) CLAUDE.md:118 and README.md:440 give '@Actions' as a misspelled main marker; use e.g. @Gatway. Not instances: docs/README.md:131 and use-case-gateway-bawaan.md:23,50 (history); TEMUAN.md (findings log).
  note: test/skeleto.test.ts:184 is named '... like a plain action'; rename. The test 'the README and the practice files stay clear of what Skeleto dropped' missed (a)-(c); consider extending it. Repo has no checks beyond typecheck/test/build (no CI).
- 2026-11-22 standard, round 2, at 79f8cc7: passed.
  1: carried; src/ and its tests untouched since 610395e (only 79f8cc7, docs and two test edits). Re-ran: skeleto.test and readme.test @Action-before-import tests pass.
  2: carried; 'every wrapper wraps every action...' re-run, passes.
  3: carried; src/ unchanged since round 1.
  4: round-1 findings (a),(d),(e) fixed: CLAUDE.md:39 says 'dua jenis action'; CLAUDE.md:118-119 and README.md:440-441 use @Gatway/@usecase. Round-1 grep now finds only removal and history lines. Extended 'stay clear of what Skeleto dropped' test passes.
  5: findings (b),(c) fixed: wrapper.md:112 names @Config, @UseCase, @Gateway; komponen.md:184 names the gap test only. Remaining 'tes arsitektur' hits are history (docs/README.md:131, use-case-gateway-bawaan.md:23,50).
  note: no checks beyond typecheck/test/build exist in the repo (no CI).

## Follow-ups
- F1 [declined] Overturned A1: A wrong value is anything other than true, false or undefined (also the text "false", 0 and null). It is reported as options.<name>: must be true or false, received <value>, in the same Error as the other option and scan mistakes and before them, and the option is then treated as not given, so plain actions are allowed and the scan still runs.
- F2 [declined] Overturned A2: The refusal message is one line per plain @Action. It names the component, the function, its file and the option, and asks for @UseCase or @Gateway, e.g. 'X: function implX (path) is a plain @Action, which options.plainActions: false refuses; mark it @UseCase or @Gateway'. It is collected with the other mistakes before any import. The dependency-kind messages for the same component still appear as they do today.
- F3 [declined] Overturned A3: The removed copied architecture test is replaced, in test/readme.test.ts, by a test that adds a plain @Action to a copy of the README example and checks that startup with the example's options refuses it before import, naming it. This is the pattern of the existing 'a misspelled marker stops it' test. The two old tests on the checklist's architecture test are deleted. REVIEW_CHECKLIST.md 'How to review' says Machine rules are checked by Skeleto at startup and by the gap test. The B5 row stays word for word with the B5 heading, and its Checked by becomes 'Machine: Skeleto, at sta
- F4 [declined] Overturned A4: 'The practice documents' means both sets while both exist: B5 in BEST_PRACTICES.md and T10 where it shows the start call, and ACT-1, UC-1 and use-case-gateway-bawaan.md in docs/. They say that an application using use cases and gateways sets the option. Every excerpt of main.ts in TECHNICAL_PRACTICES.md and docs/teknis/komponen.md is updated to the new start call. CLAUDE.md gets the option in 4.6 (refusal) and 4.8 (value check), each with the test that proves it.
