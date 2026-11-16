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

- [ ] On a fresh checkout, after installing packages, the three commands of `CLAUDE.md` section 9 (typecheck, test, build) all pass.
- [ ] The build output contains the package entry point with its type declarations, and those declarations expose exactly the names listed in `CLAUDE.md` section 5, nothing more.
- [ ] None of the names removed in `CLAUDE.md` section 3 (`Payload`, `TypeField`, `DecoratorRule`, `FieldDecoratorRule`, `readTypeArguments`) appear anywhere in the source or the build output.
- [ ] A test shows that a new context has empty data, an empty trace id and a current date, and that two new contexts do not share their data object.
- [ ] The only runtime dependency declared by the package is `ts-morph`; the test runner is `node:test` through `tsx`, with no Jest.
- [ ] The package is an ES module with strict TypeScript settings, as `CLAUDE.md` section 7 requires.

## Out of scope

Any behaviour of markers, scanning, dependency ordering or startup. Publishing the package to npm.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Assumptions
- A1 [unseen] The newContext test lives in test/type.test.ts
  Why: CLAUDE.md section 6 pairs each source file with a test file of the same name; type.ts has none listed and npm test already picks up test/*.test.ts
  If wrong: move the test into test/skeleto.test.ts and delete test/type.test.ts
- A2 [unseen] package.json: name skeleto, version 0.1.0, license MIT, 'exports'/'types' pointing at dist/index.js and dist/index.d.ts; the build compiles src/ only (tests are type-checked but not emitted); no author, repository or engines field; dev dependencies are typescript, tsx and @types/node only
  Why: name is the owner's decision; MIT and the dist entry point are what the reference package declares; section 9 says dist holds .js and .d.ts; publishing is out of scope
  If wrong: edit the fields in package.json
- A3 [unseen] FuncInstanceMetadata lives in src/type.ts and takes (instance, metadata) in its constructor; the placeholder Skeleto lives in src/skeleto.ts with a start() that rejects with 'not implemented'
  Why: section 6 puts public types in type.ts and the Skeleto class in skeleto.ts; the constructor is not part of section 5 so its shape is free
  If wrong: move the class or change the constructor; only skeleto.ts calls it

## Decisions
- Lane standard: project setup and the public types every other ticket builds against; no money, login or unrecoverable data
- Solo and first: it creates the package, the compiler settings and the shared public types; every other ticket is blocked by it directly or through its chain
