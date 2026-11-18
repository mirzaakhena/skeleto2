---
type: task
priority: medium
lane: standard
labels: [docs, best-practices, workflow]
blocked_by: [261118134601]
related: []
touches: []
created: 2026-11-18 22:01
---

## Background

When Core areas are built first (ticket 261118134601), whatever a Core use case needs from Supporting and Generic areas becomes a stub, an assumption, or a simplified version. Technical debt is then planned, not a failure: it is how the core-first order works. Once the Core is done, the list of debts is the backlog of the next layer, so Supporting and Generic areas are built only as far as the Core really uses them, and no code is written before it is needed.

Evidence from the owner's study-case application (2026-11-18): every use case skeleton (about 151 use cases in 35 areas) was written before any of them was finished, which overwhelmed the owner. Of 45 technical-debt markers, 30 were obsolete: code written before later decisions replaced it, never removed.

Proposed kinds of debt, not yet agreed:

| Kind | Meaning | Rule |
| --- | --- | --- |
| Planned | a stub waiting for a later layer | names the layer that pays it |
| Shortcut | a deliberate shortcut or simplified version | names its reason and the ticket that pays it |
| Obsolete | code already replaced | possibly not allowed: removed at once |

## Questions for the owner (to be asked again, as the owner asked, before this ticket is ready)

1. Does "a Core area is done" mean: its use cases, entities and tests are complete, its own gateways are real, and only its dependencies on other layers are stubs?
2. Is obsolete code forbidden (removed at once), or allowed with a deadline?
3. Where does the debt mechanism live? Proposal: the order of layers and the kinds of debt in BEST_PRACTICES.md; the marker format in code (`// TECH-DEBT: <kind> — <reason>`) and the rule that every stub gateway carries one in TECHNICAL_PRACTICES.md; a list of debts linked to tickets, and a check that a ticket cannot land with an unmarked stub, as a feature of the kerjaan2 board (a separate project).
4. Are skeleton use cases (whose body only throws "not implemented") removed from the workflow, or allowed only for the area being worked on? Proposal: only for the area being worked on.

## Request

To be written once the questions are answered.

## Done when

- [ ] To be written once the questions are answered.
