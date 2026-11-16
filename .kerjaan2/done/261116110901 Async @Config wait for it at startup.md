---
type: feature
priority: high
lane: standard
labels: []
blocked_by: []
related: [261116100205]
touches: [src/scanner.ts, src/skeleto.ts, test/scanner.test.ts, test/skeleto.test.ts, README.md, test/readme.test.ts, CLAUDE.md]
created: 2026-11-16 11:09
---

## Background

Some resources are only usable after an asynchronous start: a database connection through an ORM that must load all its entities first, a cache client, a secret read from a remote service. Today a component function is called and its result stored as it is, never awaited. A `@Config` written as an async function therefore gets the component name `Promise<X>`, every component that needs it receives a promise and must await it on each call, and a failed connection does not stop startup: it surfaces on the first request. The owner wants such a resource to be initialised once, through `@Config`, rather than by hand before the framework starts (2026-11-16).

## Request

Let a `@Config` be asynchronous. When its declared return type is `Promise<X>`, its component name is `X`, startup waits for it to finish before creating anything that depends on it, and every component that depends on `X` receives the finished value, not a promise. The function is still called exactly once, however many components depend on it, and all of them receive the same instance. A config that fails stops startup the same way a config that throws does today. `@Wrapper` and `@Action` stay synchronous: a `Promise<...>` return type on either is a usage mistake reported with the others before anything is imported. Only the name of the type is read, never its definition. Startup sets no time limit of its own: it waits as long as the config does, and a time limit is the config's own business (owner, Q1). `CLAUDE.md` (sections 4.3 and 4.7) and the README describe the rule.

## Done when

- [x] A test shows an async config whose value arrives after a delay: a component depending on it declares the plain type name, receives the finished value, and is created only after the config has finished.
- [x] A test shows that an async config needed by several components (other configs and several actions) is called exactly once and that all of them receive the very same instance.
- [x] The container lists that config under the plain type name, with the finished value as its instance.
- [x] A test shows that an async config that fails stops startup with an error naming the component and its function and carrying the original error as its cause, that later components are not created, and that the next start scans again.
- [x] A test shows that two configs, one returning `X` and one returning `Promise<X>`, are reported as two functions returning the same type name.
- [x] Tests show that a `Promise<...>` return type on a `@Wrapper` and on an `@Action` is each a mistake naming the function, reported together with other mistakes and before any application file is imported.
- [x] `CLAUDE.md` sections 4.3 and 4.7 (in Indonesian) and the README (in English, with an example that its test starts) state the rule; the README also says that startup waits for a config without a time limit, so a config should set its own timeout.
- [x] The only runtime dependency is still `ts-morph` and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Running asynchronous configs side by side. Shutting resources down when the application stops. The 400-line figure in `CLAUDE.md` section 2: the owner said it is a reminder, not a limit, so this ticket does not have to stay under it.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] An async config that never finishes (a database that neither answers nor refuses): what does startup do? Options: (a) nothing special: start() waits as long as the config does, and a time limit is the business of the config itself (most clients have a connect timeout); (b) a new public option, say configTimeout in milliseconds, after which startup fails naming the config; (c) a fixed built-in limit. Recommended: (a) - a time limit is knowledge about the resource, which section 2 keeps out of the framework, and (b) adds a public name. With (a) the README says in one line that a config should set its own timeout.
  → Menunggu saja (Recommended) — (a): start() waits as long as the config does; a time limit is the config's own business, and the README says a config should set its own timeout (owner, 2026-11-16)

## Assumptions
- A1 [confirmed] The rule goes by the written text of the return type only: exactly Promise<...> (spaces around the inner text trimmed) is unwrapped, once, and only such a config is waited for. A config whose return type is written any other way (an alias of a promise, PromiseLike<X>) keeps its written name and its result is stored as it is, as today
  Why: CLAUDE.md section 2: only the name of a type is read, never its definition. This also keeps types and values in agreement: who asks for X gets an X, who asks for an alias of a promise gets the promise
  If wrong: Await every config result in src/skeleto.ts instead of only the declared ones
  Confirmed by owner, 2026-11-16
- A2 [confirmed] The Promise<...> wrapping is stripped from the name for all three kinds, so a wrapper or action declared Promise<X> gives one mistake (naming the function) and not a second 'X is not a known component' line for each component that depends on it; the scanner reports it, since it knows the kind and already collects mistakes before any import
  Why: Section 2: mistakes are reported early and all at once, without follow-up noise; section 6 puts 4.2 to 4.5 checks in scanner.ts
  If wrong: Move the check to src/skeleto.ts or keep the written name for wrappers and actions
  Confirmed by owner, 2026-11-16
- A3 [confirmed] No public type changes: FuncMetadata keeps its four fields and the container shows nothing about a config having been async. The scanner tells startup which configs to wait for through its own, non-exported result type
  Why: CLAUDE.md section 5: public names are not changed without the owner, and nothing in the ticket asks for it
  If wrong: Add a field to FuncMetadata in src/type.ts and to section 5
  Confirmed by owner, 2026-11-16
- A4 [confirmed] No new file under src/ or test/: the tests go into test/scanner.test.ts and test/skeleto.test.ts and the README example into test/readme.test.ts. Configs are waited for one after another in the existing creation order
  Why: Section 6 fixes the file list, and 110902 is rewriting that list at the same time; running configs side by side is out of scope
  If wrong: Add the file and list it in CLAUDE.md section 6
  Confirmed by owner, 2026-11-16
- A5 [confirmed] The README example for the rule is the existing loadSettings config, turned into an async function declared Promise<Settings>, rather than a new example file; the printed output of the example is unchanged
  Why: The README test allows one command and one output only, and the existing example then proves the rule end to end: the greeting delivered late is the one the action prints, and the container line reads Settings
  If wrong: Make loadSettings synchronous again in README.md and add a separate async config file to the example, updating the output block and test/readme.test.ts
  Confirmed by owner, 2026-11-16

## Decisions
- Lane standard: changes how the core names and creates configs, fully covered by the Done-when tests; nothing unrecoverable
- Not solo and waits for nothing: 110902 edits other sections of CLAUDE.md (2, 4.8, 6) than this ticket (4.3, 4.7), and neither reads what the other builds, so they run side by side and the merge queue settles the shared file
- This ticket overturns assumption A1 of 261116100205 (a result is stored as it is, never awaited) for configs declared Promise<X>; src/ is at 383 lines and will pass 400, which the owner allowed (reminder, not a limit)
- The scanner recognises an async config from the syntax tree (a type reference named Promise with exactly one type argument), not from a pattern over the text, so Promise<A> | Promise<B> or Array<Promise<X>> are never opened by accident; it is still only the written annotation that is read
- A failed async config reports the step 'waiting for it' (a config that throws in the call itself still reports 'creating it'), so the message tells whether the function or its promise failed

## Handoff
A @Config whose return type is written Promise<X> is now the component X. src/scanner.ts strips the wrapping (one level, exact spelling only) and sets ScannedFunction.awaited, true for configs only; a Promise<...> return on a @Wrapper or @Action is a scan mistake, still listed under the inner name so dependants get no second message. src/skeleto.ts awaits such a config, one at a time, before creating the next component; failure reports 'failed while waiting for it' with the cause. No time limit. Must not break: public types unchanged, other results never awaited, README example output unchanged. src/ is now 403 lines.

## Review
- 2026-11-16 standard, round 1, at fecb480: passed.
  1: ran 'an async config is waited for' and 'startup is still pending...' by name: pass; order is Settings, Database, Database ready, then Pool/Audit/SaveUser, each given the identical finished object. Both fail in a copy with the await removed.
  2: ran 'an async config needed by other configs, a wrapper and several actions is called once': pass; one call, one 'ready', identity asserted for two configs, a wrapper and two actions. Fails under the same mutation.
  3: same test: container has Database and no Promise<Database>, getInstance() is the finished object, metadata name is Database; README example run lists 'Settings: @Config'.
  4: ran 'an async config that fails stops startup...': pass; exact message names Database and makeDatabase, cause is the TypeError, calls stop at Clock, Database, second start calls again, a file added later is picked up. Fails under the mutation.
  5: ran the scanner test and the startup test for X plus Promise<X>: both pass with the single line 'Database: returned by both ...' and nothing called.
  6: ran scanner and startup tests for @Wrapper and @Action declared Promise<X>: pass; line names makeLate (a.ts), comes with the not-exported and unknown-dependency mistakes, module-level throw never ran.
  7: read CLAUDE.md 4.3/4.7 (Indonesian) and README 'Asynchronous configs' (no time limit, own timeout); ran readme tests: example with async loadSettings type-checks, starts and prints the README output.
  8: package.json untouched, dependencies is ts-morph only, only src/scanner.ts imports it. The three commands were not rerun, per the brief (recorded passing on this content); 39 targeted tests pass.
  note: k2 test passes its arguments through sh, so a test-name pattern with | or spaces needs inner quotes. src/ at 403 lines is covered by Out of scope. The repo offers no checks beyond the section 9 commands.
