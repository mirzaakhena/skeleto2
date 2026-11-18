---
type: task
priority: medium
lane: light
labels: [docs]
blocked_by: []
related: []
touches: [CLAUDE.md, test/readme.test.ts]
created: 2026-11-18 22:19
---

## Background

The owner decided on 2026-11-18 that Skeleto must not refer to nukitu or to any other project at all. The study-case application has just been moved aside and will be started again, so the paths the repo points to no longer exist.

The project instructions for AI sessions still refer to other projects in three ways:

- they name the study-case application as the main user, send the reader to its conventions, and justify the public API by what that application uses;
- they describe the repo as a rewrite of an older repo, tell the reader to use it as a behaviour reference and not to change it, and introduce the list of discarded features by where they came from;
- the README test's list of banned product names includes the study-case application's name.

The board's past tickets and logs are history and stay as they are.

## Request

Make the repo stand alone. Keep what still guards the code: the public API stays stable and changes only by the owner's decision, and the features listed as discarded must still never come back. Say both without naming any other project.

## Done when

- [ ] No file tracked in the repo outside the board names another project or a path into one.
- [ ] The project instructions still say that the public API names change only by the owner's decision, with a reason that does not depend on another project.
- [ ] The project instructions still list the discarded features and forbid their return, without saying where they came from.
- [ ] The README test passes, and `npm run typecheck`, `npm test` and `npm run build` pass.
