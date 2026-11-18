---
type: task
priority: high
lane: standard
labels: [docs, best-practices]
blocked_by: [261118104601]
related: [261118104603, 261118104604]
touches: [TECHNICAL_PRACTICES.md, README.md, test/readme.test.ts]
created: 2026-11-18 10:46
---

## Background

On 2026-11-18 the owner decided that the practices for applications built on Skeleto are split into two files with a hard line between them:

- **TECHNICAL_PRACTICES.md**: how to use Skeleto's mechanism well (this ticket).
- **BEST_PRACTICES.md**: how to divide an application into entities, use cases and gateways (ticket 261118104603).

The README remains the reference for what Skeleto does. Both practice files are read by AI agents writing code in any project, so they must stand alone and must not refer to any particular application, database or web framework. Every rule carries a number and a level, **Mandatory** or **Optional**, so that a reviewing agent can cite it.

Topics the owner agreed belong on the technical side:

1. The two-step closure: the marked function takes its dependencies and returns the handler.
2. Naming leaves no word to choose. The function behind every component is prefixed `impl`. Every component has a named type alias. A dependency parameter is named after its type in camelCase. File names follow a stated rule.
3. A named alias for every type used as a dependency, never an inline generic type.
4. Order inside a JSDoc block: description first, then one marker per line (already in the README; refer to it).
5. The list of allowed markers is kept in one place and always passed to start. It includes `UseCase`, `Gateway` and `Transaction`.
6. Wrapper pattern: one wrapper per marker, whose first step returns the handler unchanged when its marker is absent.
7. Transactions through the context. The wrapper opens the transaction and puts it in the context. Gateways reach their resource only through a function of the context, so they cannot skip the transaction (Mandatory). A transaction already in the context is joined, never doubled (Mandatory).
8. Effects outside the transaction's store (sending a message, an email, a call to a third party) never happen before commit (Mandatory). The after-commit form is shown as working code: gateways queue the effect in the context and the transaction wrapper runs the queue after a successful commit. The file states plainly that such an effect can be lost if the process dies right after commit, and points to the outbox form in BEST_PRACTICES.md for effects that must not be lost.
9. An asynchronous config sets its own timeout (already in the README; refer to it).
10. One exit from the container: instances are taken once at startup, not per request.
11. Testing a use case without starting Skeleto: hand-written fake gateways typed by their contract, no mock library, unpredictable values fixed by the fakes, whole objects compared.
12. One integration test that starts Skeleto, which proves the application starts.
13. Excluding test and generated files from the scan (already in the README; refer to it).

## Request

Write TECHNICAL_PRACTICES.md covering the topics above as numbered rules, each marked Mandatory or Optional, each with its reason, in the same plain style as the README. Code shown in it follows the reworked README example and runs under the README test, as the code in BEST_PRACTICES.md does today.

## Done when

- [x] TECHNICAL_PRACTICES.md exists, and every topic listed in Background appears in it as at least one numbered rule with a level and a reason.
- [x] No rule refers to a particular application, database product or web framework.
- [x] The naming rules leave no choice of words for the names of components, functions, parameters and files.
- [x] The after-commit form is shown as code that runs, and the risk of losing the effect is stated next to it.
- [x] Every code block in the file runs or is checked by the README test: excerpts of the README example, or full files at new paths (never a README path) that the README test adds to the example, type-checks, and runs when they are `*.test.ts`.
- [x] Every rule is a heading `### T<n>. <rule> (Mandatory|Optional)` followed by a `Why:` paragraph, and the README test checks each has both.
- [x] The README points to TECHNICAL_PRACTICES.md next to its pointer to BEST_PRACTICES.md.

## Out of scope

- Conceptual rules: entities, use cases, gateways, concurrency, errors (ticket 261118104603).
- The combined reviewer checklist and the architecture test (ticket 261118104604).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Where does code the README example lacks live (the use-case test with hand-written fakes, the one integration test, and after-commit if 601 Q5 says so)? Options: (a) TECHNICAL_PRACTICES.md may show full files at new paths, never a README path; the README test adds them to the example fixture, type-checks them, and runs every *.test.ts among them with tsx --test; (b) widen 601 so the README example holds them and this file quotes excerpts only. Recommended (a), built in this ticket: the README stays readable in one sitting, the code is still checked, and 604 reuses the mechanism. 603 then keeps to excerpts and prose.
  → (a) full files at new paths, never a README path; the README test adds them to the example fixture, type-checks them and runs every *.test.ts; built in this ticket, reused by 604. (owner, 2026-11-18)
- Q2 [answered] Rule number and level format, shared with 603 and parsed by 604. Recommended: a heading '### T<n>. <rule in one line> (Mandatory|Optional)' followed by a 'Why:' paragraph; numbers T1, T2, ... here and B1, B2, ... in BEST_PRACTICES.md, never reused; the README test checks every rule heading has a level and a Why. Alternatives: plain 1, 2, ... per file (citations then need the file name); a table of rules. Which?
  → Heading '### T<n>. <rule> (Mandatory|Optional)' then a 'Why:' paragraph; T<n> here, B<n> in BEST_PRACTICES.md; the README test checks each rule has both. (owner, 2026-11-18)
- Q3 [answered] Where does a use case's test file go (a file-name rule the naming rules must state)? Options: (a) next to the use case as <file>.test.ts (usecase/stock/stock_transfer.test.ts), which DEFAULT_EXCLUDE already keeps out of the scan; (b) a mirror tree under test/ (test/usecase/stock/stock_transfer.test.ts), kept out by pointing start at src only. And the integration test: (a) one file main.test.ts at the project root? Recommended (a) for both: no extra exclude, and the file is found from the use case by one rule.
  → Yes (a): use-case tests next to the use case as <file>.test.ts; one main.test.ts at the project root for the integration test. (owner, 2026-11-18)

## Assumptions
- A1 [confirmed] The naming rules state exactly the scheme answered in 261118104601 Q2 (impl prefix) and Q8 (names and file layout), with no additional word left to choose.
  Why: The ticket requires the code here to follow the reworked README example, which follows those answers
  If wrong: Rewrite the naming rules section
  Confirmed by owner, 2026-11-18
- A2 [confirmed] The README example's LogWrapper becomes AuditWrapper and reads the @Audit marker instead of @UseCase, so that every wrapper is named <Marker>Wrapper after the one marker it reads; the printed output changes only in the container line of that wrapper
  Why: The naming rules must leave no word to choose and topic 6 asks for one wrapper per marker; LogWrapper read @UseCase, so no rule could derive its name, while @Audit had no wrapper at all
  If wrong: Rename AuditWrapper back to LogWrapper reading @UseCase in README.md and give the wrapper naming rule in TECHNICAL_PRACTICES.md a stated exception
  Confirmed by owner, 2026-11-18
- A3 [confirmed] The parameter naming rule covers dependency parameters (camelCase of the type), the handler's ctx and the wrapper's (handler, metadata); the name of a handler's input is left to the author
  Why: Background topic 2 speaks of dependency parameters; the README gateways name their input ids and warehouses, which no rule over the type alone derives
  If wrong: Add a rule for the input parameter and rename the gateway inputs in the README example
  Confirmed by owner, 2026-11-18

## Decisions
- Lane standard: a new document whose code blocks must be checked by the README test, so the test changes too
- Waits for 261118104601: its code blocks are excerpts of the reworked README example. Runs side by side with 261118104603; both edit test/readme.test.ts, which the merge queue settles
- run() in test/readme.test.ts drops NODE_TEST_CONTEXT from the child env: without it a nested tsx --test inside the fixture prints nothing and always exits 0, so the added tests would never really be checked

## Handoff
New TECHNICAL_PRACTICES.md holds rules T1-T22 as '### T<n>. <rule> (Mandatory|Optional)' plus a Why: line; 604 lists them. Its code blocks are verbatim excerpts of README example files, or full files at new paths (src/usecase/stock/stock_transfer.test.ts, main.test.ts) that test/readme.test.ts adds to the example as example.additions, type-checks and runs with tsx --test. The README example's LogWrapper is now AuditWrapper reading @Audit, so every wrapper is <Marker>Wrapper. run() in the README test strips NODE_TEST_CONTEXT so a nested tsx --test reports normally. Editing README blocks quoted by T-rules, or the rule headings matched by the topic test, breaks the README test.

## Review
- 2026-11-18 standard, round 1, at f69fec5: passed.
  1: readme.test 'covers every agreed topic' ran green in a copy; read all 22 rules and mapped each of the 13 Background topics to T1-T22 (topic 2 -> T3,T5-T8; 7 -> T12-T14; 8 -> T15)
  2: product/framework ban test passes; an extra grep for ORM, queue, cloud, API-style names and nukitu found none (only winston, see note)
  3: judged by reading: T5 impl prefix, T3 alias, T6 camelCase params plus ctx/(handler, metadata), T7 name table, T8 path table incl. both test files; free words limited to business words and resource/marker name; handler input names left free per A3
  4: T15 excerpts are verbatim from the README example whose printed output (stock changed after commit, nothing on rollback) the README test checks; loss risk and outbox pointer sit right after the code
  5: mutating one T14 excerpt in a copy made readme.test.ts fail at load with 'excerpt of src/wrappers.ts is not part of that README example file'; additions test type-checks and runs the two new test files (pass 3), mutation test shows fail 2
  6: rule-format test passes; removing the Why: of T2 in a copy made it fail with 'T2 ... gives no Why: paragraph'
  7: README line 27 links both files; the new README test passes
  note: T4 names winston.Logger (a logging library) as a counterexample; not a database or web framework, so outside line 2, but it could be replaced by a neutral qualified name
  note: k2 test runs its command through sh, so an unquoted '|' in --test-name-pattern must be quoted twice
