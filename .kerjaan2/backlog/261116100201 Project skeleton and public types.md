---
type: task
priority: high
lane: standard
labels: []
blocked_by: []
related: []
touches: []
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
