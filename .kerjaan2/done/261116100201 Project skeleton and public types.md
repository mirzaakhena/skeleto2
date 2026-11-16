---
type: task
priority: high
lane: standard
solo: true
labels: []
blocked_by: []
related: []
touches: [package.json, package-lock.json, tsconfig.json, tsconfig.build.json, src/index.ts, src/type.ts, src/skeleto.ts, test/type.test.ts]
created: 2026-11-16 10:02
---

## Background

The repository holds only its guide (`CLAUDE.md`) and no code yet. Every later ticket needs a TypeScript project that can be type-checked, tested and built, and a fixed set of public types to build against. The framework keeps its working name, `skeleto` (owner's decision, 2026-11-16).

## Request

Set up the project as `CLAUDE.md` sections 6, 7, 8 and 9 describe it, and provide the whole public API of section 5: the public types, the metadata holder class and the context factory. The main class may be a placeholder that fails with "not implemented" until the startup ticket replaces it.

## Done when

- [x] On a fresh checkout, after installing packages, the three commands of `CLAUDE.md` section 9 (typecheck, test, build) all pass.
- [x] The build output contains the package entry point with its type declarations, and those declarations expose exactly the names listed in `CLAUDE.md` section 5, nothing more.
- [x] None of the names removed in `CLAUDE.md` section 3 (`Payload`, `TypeField`, `DecoratorRule`, `FieldDecoratorRule`, `readTypeArguments`) appear anywhere in the source or the build output.
- [x] A test shows that a new context has empty data, an empty trace id and a current date, and that two new contexts do not share their data object.
- [x] The only runtime dependency declared by the package is `ts-morph`; the test runner is `node:test` through `tsx`, with no Jest.
- [x] The package is an ES module with strict TypeScript settings, as `CLAUDE.md` section 7 requires.

## Out of scope

Any behaviour of markers, scanning, dependency ordering or startup. Publishing the package to npm.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Assumptions
- A1 [confirmed] The newContext test lives in test/type.test.ts
  Why: CLAUDE.md section 6 pairs each source file with a test file of the same name; type.ts has none listed and npm test already picks up test/*.test.ts
  If wrong: move the test into test/skeleto.test.ts and delete test/type.test.ts
  Confirmed by owner, 2026-11-16
- A2 [confirmed] package.json: name skeleto, version 0.1.0, license MIT, 'exports'/'types' pointing at dist/index.js and dist/index.d.ts; the build compiles src/ only (tests are type-checked but not emitted); no author, repository or engines field; dev dependencies are typescript, tsx and @types/node only
  Why: name is the owner's decision; MIT and the dist entry point are what the reference package declares; section 9 says dist holds .js and .d.ts; publishing is out of scope
  If wrong: edit the fields in package.json
  Confirmed by owner, 2026-11-16
- A3 [confirmed] FuncInstanceMetadata lives in src/type.ts and takes (instance, metadata) in its constructor; the placeholder Skeleto lives in src/skeleto.ts with a start() that rejects with 'not implemented'
  Why: section 6 puts public types in type.ts and the Skeleto class in skeleto.ts; the constructor is not part of section 5 so its shape is free
  If wrong: move the class or change the constructor; only skeleto.ts calls it
  Confirmed by owner, 2026-11-16
- A4 [confirmed] Only the files this ticket needs exist: src/index.ts, type.ts, skeleto.ts and their two test files. decorator.ts, dependency.ts, scanner.ts and test/fixture.ts of section 6 are left to the tickets that fill them
  Why: empty placeholder files carry no behaviour and those modules are out of scope here
  If wrong: add the missing files in the ticket that needs them
  Confirmed by owner, 2026-11-16
- A5 [confirmed] Toolchain versions are the current releases: typescript ^7.0.2, tsx ^4.23, @types/node ^22 (matching the local Node 22), ts-morph ^28; a package-lock.json is committed. test/skeleto.test.ts holds one placeholder test (start rejects with 'not implemented')
  Why: CLAUDE.md names the tools but no versions; a lockfile makes a fresh checkout reproducible
  If wrong: change the ranges in package.json and run npm install; the startup ticket replaces test/skeleto.test.ts
  Confirmed by owner, 2026-11-16

## Decisions
- Lane standard: project setup and the public types every other ticket builds against; no money, login or unrecoverable data
- Solo and first: it creates the package, the compiler settings and the shared public types; every other ticket is blocked by it directly or through its chain

## Handoff
Created the package (ESM, strict, NodeNext), tsconfig.json (typecheck over src and test) and tsconfig.build.json (emits src only to dist with declarations). src/type.ts holds all public types, FuncInstanceMetadata (constructor: instance, metadata) and newContext; src/skeleto.ts is a placeholder Skeleto whose start() rejects with 'not implemented'; src/index.ts only re-exports. Must not break: index.ts exports exactly the nine names of CLAUDE.md section 5, ts-morph stays the only runtime dependency, relative imports end in .js. The startup ticket replaces src/skeleto.ts and test/skeleto.test.ts wholesale.

## Review
- 2026-11-16 standard, round 1, at b192fb1: passed.
  1: Fresh copy from git archive HEAD: npm ci, npm run typecheck and npm run build all exit 0; all four tests pass by name on that fresh install. Full npm test not re-run (recorded pass on this content).
  2: Built dist has index.js and index.d.ts; index.d.ts re-exports exactly the nine names of section 5. Importing the package through its exports map gives runtime keys FuncInstanceMetadata, Skeleto, newContext only; emitted signatures match section 5.
  3: grep for Payload, TypeField, DecoratorRule, FieldDecoratorRule, readTypeArguments (and the other section 3 names) over src, test, dist, package.json and both tsconfigs exits 1, no match.
  4: Both context tests in test/type.test.ts pass by name. They can fail: in a copy, a shared data object fails the second test; new Date(0) and traceId 'x' each fail the first.
  5: dependencies holds only ts-morph; npm ls --omit=dev --depth=0 lists only ts-morph@28.0.0; test script is tsx --test test/*.test.ts with node:test imports; grep -i jest finds nothing in package.json, src, test, tsconfigs, and the lockfile has no jest package.
  6: type is module; tsc --showConfig reports strict true, module and moduleResolution nodenext; a probe file with an untyped parameter fails typecheck with TS7006; every relative import ends in .js; node loads the build as ESM.
  note: Section 6 files decorator.ts, dependency.ts, scanner.ts, test/fixture.ts are absent and test/type.test.ts is extra (A1, A4, unseen by the owner). Out of scope here, not blocking; the owner may want to confirm A1.
  note: npm audit shows 3 moderate advisories, one minimatch issue via ts-morph (GHSA-g3hv-75wg-m249); the only fix offered downgrades ts-morph to 17. The repo has no scripts or CI beyond the three section 9 commands, so no other checks were run.
