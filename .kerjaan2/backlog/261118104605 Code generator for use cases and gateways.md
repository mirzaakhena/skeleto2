---
type: feature
priority: low
lane: standard
labels: [tooling]
blocked_by: [261118104602, 261118104603]
related: []
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
