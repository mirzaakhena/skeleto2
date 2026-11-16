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

- [ ] A test shows an async config whose value arrives after a delay: a component depending on it declares the plain type name, receives the finished value, and is created only after the config has finished.
- [ ] A test shows that an async config needed by several components (other configs and several actions) is called exactly once and that all of them receive the very same instance.
- [ ] The container lists that config under the plain type name, with the finished value as its instance.
- [ ] A test shows that an async config that fails stops startup with an error naming the component and its function and carrying the original error as its cause, that later components are not created, and that the next start scans again.
- [ ] A test shows that two configs, one returning `X` and one returning `Promise<X>`, are reported as two functions returning the same type name.
- [ ] Tests show that a `Promise<...>` return type on a `@Wrapper` and on an `@Action` is each a mistake naming the function, reported together with other mistakes and before any application file is imported.
- [ ] `CLAUDE.md` sections 4.3 and 4.7 (in Indonesian) and the README (in English, with an example that its test starts) state the rule; the README also says that startup waits for a config without a time limit, so a config should set its own timeout.
- [ ] The only runtime dependency is still `ts-morph` and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Running asynchronous configs side by side. Shutting resources down when the application stops. The 400-line figure in `CLAUDE.md` section 2: the owner said it is a reminder, not a limit, so this ticket does not have to stay under it.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] An async config that never finishes (a database that neither answers nor refuses): what does startup do? Options: (a) nothing special: start() waits as long as the config does, and a time limit is the business of the config itself (most clients have a connect timeout); (b) a new public option, say configTimeout in milliseconds, after which startup fails naming the config; (c) a fixed built-in limit. Recommended: (a) - a time limit is knowledge about the resource, which section 2 keeps out of the framework, and (b) adds a public name. With (a) the README says in one line that a config should set its own timeout.
  → Menunggu saja (Recommended) — (a): start() waits as long as the config does; a time limit is the config's own business, and the README says a config should set its own timeout (owner, 2026-11-16)

## Assumptions
- A1 [unseen] The rule goes by the written text of the return type only: exactly Promise<...> (spaces around the inner text trimmed) is unwrapped, once, and only such a config is waited for. A config whose return type is written any other way (an alias of a promise, PromiseLike<X>) keeps its written name and its result is stored as it is, as today
  Why: CLAUDE.md section 2: only the name of a type is read, never its definition. This also keeps types and values in agreement: who asks for X gets an X, who asks for an alias of a promise gets the promise
  If wrong: Await every config result in src/skeleto.ts instead of only the declared ones
- A2 [unseen] The Promise<...> wrapping is stripped from the name for all three kinds, so a wrapper or action declared Promise<X> gives one mistake (naming the function) and not a second 'X is not a known component' line for each component that depends on it; the scanner reports it, since it knows the kind and already collects mistakes before any import
  Why: Section 2: mistakes are reported early and all at once, without follow-up noise; section 6 puts 4.2 to 4.5 checks in scanner.ts
  If wrong: Move the check to src/skeleto.ts or keep the written name for wrappers and actions
- A3 [unseen] No public type changes: FuncMetadata keeps its four fields and the container shows nothing about a config having been async. The scanner tells startup which configs to wait for through its own, non-exported result type
  Why: CLAUDE.md section 5: public names are not changed without the owner, and nothing in the ticket asks for it
  If wrong: Add a field to FuncMetadata in src/type.ts and to section 5
- A4 [unseen] No new file under src/ or test/: the tests go into test/scanner.test.ts and test/skeleto.test.ts and the README example into test/readme.test.ts. Configs are waited for one after another in the existing creation order
  Why: Section 6 fixes the file list, and 110902 is rewriting that list at the same time; running configs side by side is out of scope
  If wrong: Add the file and list it in CLAUDE.md section 6

## Decisions
- Lane standard: changes how the core names and creates configs, fully covered by the Done-when tests; nothing unrecoverable
- Not solo and waits for nothing: 110902 edits other sections of CLAUDE.md (2, 4.8, 6) than this ticket (4.3, 4.7), and neither reads what the other builds, so they run side by side and the merge queue settles the shared file
- This ticket overturns assumption A1 of 261116100205 (a result is stored as it is, never awaited) for configs declared Promise<X>; src/ is at 383 lines and will pass 400, which the owner allowed (reminder, not a limit)
