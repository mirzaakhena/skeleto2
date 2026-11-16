---
type: feature
priority: high
lane: standard
labels: []
blocked_by: [261116100203, 261116100204]
related: []
touches: []
created: 2026-11-16 10:02
---

## Background

This is where everything comes together: startup scans the directory, checks every rule, and only then imports the application files, creates each component in order and wraps every action. Until now the main class is a placeholder.

## Request

Provide startup, instantiation and the container as `CLAUDE.md` sections 4.6 to 4.8 describe them, on top of the scanner and the dependency sorter, replacing the placeholder. Every mistake from sections 4.1 to 4.6 (scanner mistakes, missing dependencies, kind-rule violations, cycles) is collected and thrown as one error, one line per mistake, before any application file is imported. Application files are imported from the scanned TypeScript paths themselves, so an application runs under a TypeScript-capable runtime.

## Done when

- [ ] Tests on temporary directories show each kind-rule violation of section 4.6 (a config needing an action or a wrapper, a wrapper needing an action or a wrapper, an action needing a wrapper), a missing dependency, and a cycle whose message shows its path; every message names the component at fault.
- [ ] A fixture that has a scanner mistake and a kind-rule violation, and whose files throw at module level, fails with one error that lists both mistakes and is not the module's own throw.
- [ ] Tests show the creation order (all configs, then all wrappers, then all actions, dependencies first inside each group), that every function is called exactly once, and that each receives its dependencies in parameter order.
- [ ] Tests show wrapping: every wrapper is applied to every action and receives the action's metadata; a larger `ordinal` ends up further outside; equal ordinals (and a missing one, counted as 0) are ordered by wrapper name; a wrapper returning the handler unchanged adds no layer.
- [ ] A test shows that an action injected into another action is the wrapped version.
- [ ] The container holds every component of all three kinds under its component name, each giving its instance and its metadata.
- [ ] Tests show one instance per directory (also for two different spellings of the same path and for concurrent calls), a fresh scan after a failed startup, and an error for a directory without `.ts` files.
- [ ] The framework source outside tests stays under 400 lines, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Anything about HTTP, controllers, validation, logging or databases. Importing compiled `.js` output instead of the scanned `.ts` files.
