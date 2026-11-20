---
type: feature
priority: low
lane: standard
labels: [tooling]
blocked_by: [261118104602, 261118104603, 261118220101]
related: [261118220101]
touches: []
created: 2026-11-18 10:46
---

## Background

The owner wants to leave as few choices of words as possible when code is written, so that every agent writes the same thing. Once the naming rules in TECHNICAL_PRACTICES.md are complete and fixed, a generator could write the skeleton of a use case or a gateway from a name alone, and no word would be left to choose.

Open questions for the owner before this is ready:

- Does the generator belong to the Skeleto package, or to a separate tool? Skeleto's core is meant to do binding only.
- What does it write: only the use case file, or also its test file and the gateway contracts it names?

## Request

A generator that writes, from a name, a use case or gateway skeleton that follows the naming and layout rules of the practice files.

## Done when

- [ ] Generating a use case from its name writes a file whose names, markers, Request, Response and contract type follow the practice files without any edit.
- [ ] The generated skeleton starts under Skeleto as it is.
- [ ] Generating a name that already exists refuses instead of overwriting.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [blocking] Where does the generator live? Options: (a) a separate package in this repo (e.g. a bin with its own entry), not in src/, so Skeleto's core stays binding-only with ts-morph as its one dependency (CLAUDE.md section 2); (b) a separate repository; (c) inside Skeleto's src/; (d) a Claude skill instead of code. Recommended (a), or (d) once the process skill is unpostponed: (c) breaks the 'only binding' rule.
- Q2 [blocking] What does one run write? Options: (a) the use case file only; (b) the use case, its test file (T18 style, with fakes), and the gateway contract types it names; (c) (b) plus stub gateway implementations so the application starts. Note: Done when says 'starts under Skeleto as it is', but a use case naming gateways that do not exist stops startup (missing dependency), so (a) and (b) can only start if the gateways already exist. Recommended (c) with each stub marked as debt, pending 261118220101.
- Q3 [blocking] What input does it take, and how is it run? A name alone gives no Request/Response fields or gateway list. Options: (a) a name only; Request and Response are empty types to fill in; (b) a name plus a list of gateways; (c) an interactive prompt. And: an npm script / npx command with which arguments? Recommended (b) as a CLI 'npx <tool> usecase <Name> --gateway <Name>...': still no word left to choose, and the gateway contracts can be written.

## Assumptions
- A1 [unseen] 'Refuses instead of overwriting' means: if any file it would write exists, it writes none, exits non-zero and names the existing file
  Why: Partial writes would leave a half skeleton; CLAUDE.md's fail-early-and-at-once spirit
  If wrong: Write the missing files only

## Decisions
- Stays in backlog: where it lives and what it writes are open; it now also waits for 261118220101, which decides whether skeleton use cases (what a generator writes) are allowed at all
- 2026-11-20 moved to cancel: Owner: 'Kalau memang LLM lebih baik, maka generator tidak perlu ada sama sekali' - initial skeletons are written by an LLM, guarded by startup checks, the architecture test, the gap guard test and review
