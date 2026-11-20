---
type: task
priority: medium
lane: standard
labels: [docs, best-practices, workflow]
blocked_by: [261119090501, 261120140001]
related: [261120140001, 261120135803]
touches: [DEVELOPMENT_PROCESS.md, TECHNICAL_PRACTICES.md, BEST_PRACTICES.md, README.md, REVIEW_CHECKLIST.md, test/readme.test.ts]
created: 2026-11-18 22:01
---

## Background

When Core areas are built first (ticket 261119090501), whatever a Core use case needs from Supporting and Generic areas becomes a stub, an assumption, or a simplified version. Technical debt is then planned, not a failure: it is how the core-first order works. Once the Core is done, the list of debts is the backlog of the next layer, so Supporting and Generic areas are built only as far as the Core really uses them, and no code is written before it is needed.

Evidence from the owner's study-case application (2026-11-18): every use case skeleton (about 151 use cases in 35 areas) was written before any of them was finished, which overwhelmed the owner. Of 45 technical-debt markers, 30 were obsolete: code written before later decisions replaced it, never removed.

Proposed kinds of debt, not yet agreed:

| Kind | Meaning | Rule |
| --- | --- | --- |
| Planned | a stub waiting for a later layer | names the layer that pays it |
| Shortcut | a deliberate shortcut or simplified version | names its reason and the ticket that pays it |
| Obsolete | code already replaced | possibly not allowed: removed at once |

### Evidence from a second application (added 2026-11-20)

A second application of the owner, built core-first on Skeleto (2026-11-19 to 2026-11-20), has already settled some of these questions **for itself**. This is evidence from one application, not a decision for Skeleto; the questions below stay open until the owner answers them here.

- **When the Core is done** (its own answer, different from the proposal in Q1): every step of the main path and every branch of the scenario map (a JSON file per business process, one node per state, one choice per thing that can happen) has a test, and every gap on that map carries a marker in the use case it concerns. Whether its own gateways are real is not part of it: during development the gateways are in-memory dummies.
- **Skeleton use cases are not used at all** (its answer to Q4, stricter than the proposal): a use case is an action, and a gap lives inside its branches, not in an empty body that throws "not implemented".
- **Every debt is tied to an id.** The scenario map gives each open question (a *gap*) a stable id. The code marker is `// TechDebt <gap id>: <reason>`, not `// TECH-DEBT: <kind> — <reason>`. A reached gap refuses with the `tech_debt` business error kind, which carries that gap id as a field of its own, so debt is counted both in code and at runtime (this bears on Q6).
- **A mechanical guard instead of a board feature** (bears on Q3): a test in the application fails when a gap on the map has no marker and no recorded decision, or when a marker names an id that is not on the map. The ten gaps that no use case touches got one owner decision each: Core and needs a new use case or process (with a follow-up ticket), belongs to another area, or outside Core.
- **Markers that are not gaps:** three markers are stubs or simplifications of non-Core areas (a payment stub, a notification stub, a flat rate). They fit the proposed kinds Planned and Shortcut. Since the kinds are not agreed, the application lists those three by name and its guard test accepts exactly that list.
- **Not decided there either:** the kinds of debt, and whether obsolete code is allowed.

## Questions for the owner (to be asked again, as the owner asked, before this ticket is ready)

1. Does "a Core area is done" mean: its use cases, entities and tests are complete, its own gateways are real, and only its dependencies on other layers are stubs?
2. Is obsolete code forbidden (removed at once), or allowed with a deadline?
3. Where does the debt mechanism live? Proposal: the order of layers and the kinds of debt in BEST_PRACTICES.md; the marker format in code (`// TECH-DEBT: <kind> — <reason>`) and the rule that every stub gateway carries one in TECHNICAL_PRACTICES.md; a list of debts linked to tickets, and a check that a ticket cannot land with an unmarked stub, as a feature of the kerjaan2 board (a separate project).
4. Are skeleton use cases (whose body only throws "not implemented") removed from the workflow, or allowed only for the area being worked on? Proposal: only for the area being worked on.

Note on rule numbers (2026-11-20): ticket 261118134601 renumbered the conceptual rules once, B(n) becoming B(n+4). Numbers written below before that ticket landed are the old ones: B21 is now B25.

## Request

Written from the owner's answers of 2026-11-20 (Q1-Q6 below); approved by the owner on 2026-11-20 (Q7).

Make technical debt a planned part of the core-first process, so that an agent building the Core leaves every debt marked, tied to a gap or a kind, and nothing obsolete behind:

- DEVELOPMENT_PROCESS.md says in which order the layers are built, when a Core area is done, which kinds of debt exist, that obsolete code is forbidden, and where skeleton use cases are allowed.
- TECHNICAL_PRACTICES.md fixes the marker a debt carries in code.
- A reached gap refuses with the `tech_debt` business error kind, which carries the gap's id as a field of its own, and the README example's error type shows that field.

## Done when

- [ ] DEVELOPMENT_PROCESS.md has a rule on the order of layers: Core first; Supporting and Generic areas are built only as far as the Core's recorded debts need them, and those debts are the backlog of the next layer.
- [ ] DEVELOPMENT_PROCESS.md has a rule on when a Core area is done: every main-path step and every branch of its scenario map has a test, and every gap has a marker in its use case or a recorded owner decision; its gateways may stay dummies.
- [ ] The rules name exactly two kinds of debt that are not gaps, Planned (names the layer that pays it) and Shortcut (names its reason), and forbid obsolete code: it is removed in the change that replaces it.
- [ ] A rule allows skeleton use cases (a body that only throws "not implemented") only in the area being worked on.
- [ ] TECHNICAL_PRACTICES.md has a rule fixing the marker: `// TechDebt <gap id>: <reason>` for a gap, and a fixed form for Planned and Shortcut debt; no marker refers to a ticket number.
- [ ] B25 (the business error rule) says that a reached gap refuses with `tech_debt` carrying the gap id as its own field, and the README example's `BusinessError` has that field; the README example still runs with its documented output.
- [ ] REVIEW_CHECKLIST.md lists every new rule word for word as its heading, with its level and who checks it.
- [ ] No rule refers to a particular application, product or the board tool, and the project's checks pass.

## Out of scope

- The copyable guard test that matches gaps to markers (ticket 261120135803).
- Where scenario maps live and how a gap id is written in them (ticket 261120140001).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Does 'a Core area is done' mean: its use cases, entities and tests are complete, its own gateways are real, and only its dependencies on other layers are stubs? Options: (a) yes, as written; (b) also its gateways may be stubs; (c) something else. Recommended (a): otherwise 'done' never touches a real store.
  → Versi nukitu: a Core area is done when every main-path step and every branch of its scenario map has a test, and every gap has a marker in its use case or a recorded owner decision; its gateways may stay dummies (owner, 2026-11-20)
  → As the second application did: a Core area is done when every main-path step and every branch of its scenario map has a test, and every gap has a marker in its use case or a recorded owner decision; its gateways may stay dummies (owner, 2026-11-20)
- Q2 [answered] Obsolete code (already replaced): (a) forbidden, removed in the change that replaces it; (b) allowed with a deadline. Recommended (a): the study case had 30 of 45 debt markers obsolete, and a deadline would need tracking that nobody does.
  → Dilarang: (a) obsolete code is forbidden, removed in the change that replaces it (owner, 2026-11-20)
- Q3 [answered] Where does the debt mechanism live? Proposal: the order of layers and the kinds of debt in BEST_PRACTICES.md (or DEVELOPMENT_PROCESS.md, now that it exists); the marker '// TECH-DEBT: <kind> — <reason>' and 'every stub gateway carries one' in TECHNICAL_PRACTICES.md; the list of debts tied to tickets and the landing check in the board tool, outside this repo. Options: accept, or say which part moves. Recommended: accept, but put the layer order in DEVELOPMENT_PROCESS.md, where the core-first order already is.
  → Versi nukitu: marker '// TechDebt <gap id>: <reason>' in TECHNICAL_PRACTICES.md; layer order in DEVELOPMENT_PROCESS.md; checked by a copyable guard test (gap ids on the map <-> markers in code), not by a board feature (owner, 2026-11-20)
- Q4 [answered] Skeleton use cases (body only throws 'not implemented'): (a) allowed only in the area being worked on; (b) not allowed at all; (c) allowed anywhere. Recommended (a): it keeps the study-case problem of 151 skeletons at once from returning, while still letting one area be sketched.
  → Hanya di area aktif: (a) skeleton use cases are allowed only in the area being worked on (owner, 2026-11-20)
- Q5 [answered] Are the three kinds Planned, Shortcut, Obsolete agreed, with their rules (Planned names the layer that pays it; Shortcut names its reason and the ticket that pays it)? Options: (a) yes; (b) only Planned and Shortcut, since Obsolete is removed at once (if Q2 is (a)); (c) other kinds. Recommended (b) if Q2 is (a). Note: 'names the ticket' would be a reference to the board tool, which the practice files avoid; say whether a ticket reference is allowed in code markers.
  → Planned + Shortcut: (b) two kinds, Planned (names the layer that pays it) and Shortcut (names its reason); code markers do not refer to a ticket number (owner, 2026-11-20)
- Q6 [answered] How does a planned stub relate to the business error kind tech_debt (B21)? Options: (a) a stub of a not-yet-decided rule throws BusinessError('tech_debt', ...) and carries a TECH-DEBT marker; a stub of a decided but unbuilt layer only carries the marker; (b) they stay unrelated. Recommended (a): tech_debt already means 'not available yet', and tying the two lets the debt be counted both in code and at runtime.
  → Ya, ada field gap: a reached gap refuses with BusinessError kind tech_debt carrying the gap id as a field of its own; the README example's error type gains that field (owner, 2026-11-20)
- Q7 [answered] Approve the drafted Request and Done when (8 lines)? Options: (a) approve as written; (b) change (say which line). Recommended (a): each line restates one of your answers Q1-Q6.
  → Setujui: the drafted Request and Done when are approved as written (owner, 2026-11-20)
- Q8 [answered] What is the marker of a debt that is not a gap (a payment stub, a flat rate)? Options: (a) '// TechDebt Planned <layer>: <reason>' and '// TechDebt Shortcut: <reason>', so every debt starts with 'TechDebt' and a guard can tell a gap id from a kind; (b) '// TechDebt <gap id>: <reason>' only, and non-gap debt gets a gap id of its own on the map. Recommended (a): Planned and Shortcut debts belong to no business process, and a reserved word cannot collide with a gap id.
  → Planned/Shortcut: (a) '// TechDebt Planned <layer>: <reason>' and '// TechDebt Shortcut: <reason>' (owner, 2026-11-20)
- Q9 [answered] Where is an owner's decision on a gap that has no marker recorded? Options: (a) on the gap itself in its scenario map (a 'decision' field); (b) in docs/CORE.md, by gap id. Recommended (a): the guard of 261120135803 then reads one file per process, and the decision sits next to the question it answers.
  → Field di peta: (a) a 'decision' field on the gap in its scenario map (owner, 2026-11-20)
- Q10 [answered] Levels of the new rules: proposal all Mandatory (layer order, Core done, two kinds and no obsolete code, skeleton use cases only in the active area, the marker). Options: (a) all Mandatory; (b) say which are Optional. Recommended (a): each answers a failure seen in the study case (151 skeletons, 30 of 45 markers obsolete).
  → Setuju semua: all rules of this ticket Mandatory (owner, 2026-11-20)
- Q11 [answered] Shape of the gap field on BusinessError: (a) an optional readonly 'gap?: string', set by an optional third constructor argument, used only with kind tech_debt; (b) a separate subclass for tech_debt with a required gap. Recommended (a): one error type stays, as B21 and the README already say, and callers keep a single instanceof check.
  → Opsional di kelas: (a) an optional 'readonly gap?: string', set by an optional third constructor argument (owner, 2026-11-20)

## Assumptions
- A1 [unseen] A dummy gateway (261120135802) that is a deliberate stand-in for a later layer carries a Planned marker; one that only exists for development of the Core (Q1: its gateways may stay dummies) carries none
  Why: Q1 lets a done Core keep dummy gateways, so not every dummy is a debt
  If wrong: Require a marker on every dummy gateway

## Decisions
- Stays in backlog: Request and Done when are not written yet, by the ticket's own word, until the owner answers its questions; it also waits for 261119090501
- Request and Done when drafted on 2026-11-20 from the owner's answers Q1-Q6; they need the owner's approval before the ticket may move
- Waits for 261119090501 (it adds P rules to DEVELOPMENT_PROCESS.md) and 261120140001 (its rules lean on scenario maps and gap ids defined there). Lane standard: documentation plus a field on the README example's error type
