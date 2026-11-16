---
type: task
priority: medium
lane: light
labels: []
blocked_by: []
related: []
touches: []
created: 2026-11-16 11:10
---

## Background

The package declares the MIT license in its package description, but the repository has no license file. Without the license text and the name of the copyright holder, nobody else may legally use the code, and the package should not be published.

## Request

Add the standard MIT license text as a `LICENSE` file at the root of the repository, with the copyright line `Copyright (c) 2026 Mirza Akhena` (the owner's words, 2026-11-16).

## Done when

- [x] A `LICENSE` file at the repository root holds the unmodified standard MIT license text.
- [x] Its copyright line reads exactly `Copyright (c) 2026 Mirza Akhena`.
- [x] The file is part of what the package would publish, and the package description still says MIT.

## Out of scope

Publishing the package. Author or repository fields in the package description.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
Added the standard MIT LICENSE at the repo root with the owner's copyright line. No code or package.json change; npm includes LICENSE in the package automatically even though files lists only dist.
