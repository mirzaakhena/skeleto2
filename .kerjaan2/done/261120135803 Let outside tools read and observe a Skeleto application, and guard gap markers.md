---
type: feature
priority: medium
lane: standard
labels: [docs, technical-practices, tooling]
blocked_by: [261118220101, 261120140001]
related: [261118220101]
touches: [README.md, TECHNICAL_PRACTICES.md, REVIEW_CHECKLIST.md, test/readme.test.ts]
created: 2026-11-20 13:58
---

## Background

A second application of the owner, built core-first on Skeleto, wrote down rules that hold for any Skeleto application. The owner decided (2026-11-20) that Skeleto is the source of truth for every application built on it: such rules live in Skeleto's practice files, and an application keeps only its own decisions and cites Skeleto's rule numbers. The owner chose which of those rules become Skeleto rules; this ticket carries three of them, all about tools outside an application that read or check it.

A tool for another project of the owner draws one real run of a use case as a sequence diagram. It reads the Skeleto container (each component's dependencies and the names of its markers) and finds a component's type by its name in the container. To see each gateway call, it needs the application to pass every gateway call to an observer when the context carries one, and otherwise to pass the call through untouched. The second application wrote that as a wrapper on its gateways.

Ticket 261118220101 ties technical debt to the gaps of a scenario map: a gap has a stable id, and the code marks it with a marker naming that id. The second application has a test that fails when a gap on a map has neither a marker nor a recorded owner decision, or when a marker names an id that is on no map. Like the architecture test Skeleto already offers, such a guard can be copied into any application.

Skeleto's core stays binding only: none of this goes into Skeleto itself. It is practice and copyable code.

## Request

Make it possible, by documented practice, for outside tools to rely on any Skeleto application in the same way:

- reading the container is a supported way for a tool to learn an application's components, their dependencies, their markers and their types;
- an application that lets a tool observe it has a gateway observer wrapper (an Optional rule, owner 2026-11-20 Q5), copyable from the README example, innermost among the wrappers (Q4), that hands each gateway call (the gateway's name, its input and a way to call through, in the signature of Q3) to an observer carried by the context at `ctx.data.gatewayObserver` (Q2), and passes the call through untouched when there is none;
- a guard test, copyable like the architecture test, fails when a gap on a scenario map has no marker and no recorded decision, or a marker names an id that is not on any map.

## Done when

- [x] The practices say that reading the container is a supported way for tools to learn an application's components, dependencies, markers and types, and what a tool may rely on.
- [x] The README example has a gateway observer wrapper that does nothing when the context carries no observer, and its documented output changes only by the one line the wrapper adds to the container listing (owner, 2026-11-20).
- [x] A test shows that with an observer in the context, every gateway call of a use case run reaches it with the gateway's name and input, and the use case's result is unchanged.
- [x] A copyable guard test for gap ids and markers is documented, and a test proves it fails both for a gap without a marker or decision and for a marker naming an unknown id.
- [x] Nothing is added to Skeleto's own source, and no rule names a particular application or tool.
- [x] The review checklist reflects the new rules, and the project's checks pass.

## Out of scope

- The diagram tool itself and its coverage summary, which live in another project.
- What "a Core area is done" means and the marker's exact form (ticket 261118220101).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Done when says the README example's documented output is unchanged, but main.ts prints every container entry, so a new wrapper adds one line (e.g. 'GatewayWrapper: @Wrapper {...}'). Options: (a) the output gains exactly that one container line and nothing else changes (the gateways' calls print nothing without an observer); (b) keep the output identical by leaving the wrapper out of the run example and showing it as a separate copyable file. Recommended (a): the wrapper is then proven to start under Skeleto, and the change is one line.
  → Terima satu baris: (a) the documented README output gains exactly one line for the wrapper (owner, 2026-11-20)
- Q2 [answered] Where does the observer sit in the context, so every tool finds it the same way? Options: (a) ctx.data.gatewayObserver; (b) ctx.data.observer; (c) a key exported as a constant from the example. Recommended (a): Context.data is the only place an application may put things, and a name that says what it observes avoids clashes.
  → ctx.data.gatewayObserver (owner, 2026-11-20)
- Q3 [answered] What is the observer's signature? Proposal: (call: { gateway: string; input: unknown; proceed: () => Promise<unknown> }) => Promise<unknown>, where the observer must call proceed() once and return its result. Options: (a) as proposed; (b) also pass ctx; (c) notify only (before/after with input and output), with no proceed. Recommended (a): 'a way to call through' in the Request means the observer controls the call, and it can still time it and see the output.
  → Usulan planner: '(call: { gateway: string; input: unknown; proceed: () => Promise<unknown> }) => Promise<unknown>', the observer calls proceed() once and returns its result (owner, 2026-11-20)
- Q4 [answered] Where does the observer wrapper sit among the wrappers? Options: (a) innermost (an ordinal below every other wrapper, e.g. -10), so it sees each gateway call itself; (b) outermost. Recommended (a): in the example only gateways are wrapped by it, and inner placement keeps transaction and audit out of what it reports.
  → Paling dalam: innermost, closest to the gateway (owner, 2026-11-20)
- Q5 [answered] Levels: (a) the container-reading rule Mandatory-free statement (a guarantee, not a rule) and the observer wrapper and the gap guard Mandatory; (b) the observer wrapper Optional (only needed when a tool observes the app). Recommended (b): an application with no outside tool gains nothing from the wrapper; the gap guard stays Mandatory because the technical-debt rules depend on it.
  → Setuju semua: the observer wrapper Optional, the gap guard Mandatory (owner, 2026-11-20)

## Assumptions
- A1 [unseen] The wrapper is named GatewayWrapper (implGatewayWrapper) and reads the @Gateway marker, returning the handler unchanged for actions without it
  Why: T7 names a wrapper <Marker>Wrapper after the marker it reads, and T11 requires the unchanged-handler first step
  If wrong: Rename the wrapper
- A2 [unseen] The gap guard test lives in REVIEW_CHECKLIST.md next to the architecture test, and test/readme.test.ts runs it against a fixture map and code, as it does the architecture test
  Why: The Request says copyable like the architecture test, which lives and is proven there
  If wrong: Move it to TECHNICAL_PRACTICES.md

## Decisions
- Lane standard: a new wrapper in the README example, two copyable tests and rules; nothing in src/. Waits for 261118220101 (marker form) and 261120140001 (where gap ids are in a map), which the guard test reads

## Handoff
Added to the README example an optional GatewayWrapper (ordinal -10, innermost) that passes each gateway call to ctx.data.gatewayObserver and passes through when absent; its output gains one container line. TECHNICAL_PRACTICES gains a numberless section on what outside tools may rely on, T26 (observer wrapper, Optional) and T27 (gap guard, Mandatory). REVIEW_CHECKLIST gains the copyable gaps.test.ts, rows T26/T27 (T27 Machine). Tests in test/readme.test.ts prove the observer and both guard failures. Do not change the wrapper's excerpts in TECHNICAL_PRACTICES without the README, nor the TechDebt marker regex without T25. Nothing in src/.

## Review
- 2026-11-20 standard, round 1, at 1889fe6: passed.
  1: TECHNICAL_PRACTICES.md section 'What a tool outside the application may rely on' covers getContainer, getMetadata dependencies/additionalDecorators, name = type, markers, observer key; test 'the practices state what a tool may rely on...' passes
  2: README GatewayWrapper (ordinal -10) passes through without observer; test 'the README examples start and print exactly the output the README shows' passes, and the diff of the output block is exactly one added GatewayWrapper line (Q1)
  3: test 'with an observer in the context...' passes, asserting all three gateway calls with name and input in order and the documented result; mutating the wrapper in a copy to bypass the observer makes it fail
  4: gaps.test.ts in REVIEW_CHECKLIST.md 'The gap test'; tests 'the gap test passes...' and 'the gap test fails...' run the copied file in a fixture and assert fail 1 with the offending id for missing marker/decision, unknown id, and no map
  5: git diff main...HEAD --stat -- src is empty; added text names no application or tool (read, and asserted by test 18)
  6: T26/T27 rows present, Machine list B5,B8,T27 asserted by the checklist test; full typecheck/test/build passed on 58e91b9cf3 per board, targeted tests rerun green
  note: REVIEW_CHECKLIST 'How to review' now names two tests but still says 'Run it'; the reliance section cites T9 (JSDoc layout) for marker data, a loose citation; gaps.test.ts uses readdirSync recursive, needing Node 20.1+
