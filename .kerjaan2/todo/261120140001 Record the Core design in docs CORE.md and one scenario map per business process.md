---
type: task
priority: medium
lane: standard
labels: [docs, process]
blocked_by: [261119090501]
related: [261119090501, 261118220101, 261120135803]
touches: [DEVELOPMENT_PROCESS.md, REVIEW_CHECKLIST.md, test/readme.test.ts]
created: 2026-11-20 14:00
---

## Background

Split on 2026-11-20 from ticket 261119090501 (Write DEVELOPMENT_PROCESS.md), whose Done when had grown past one round of work. That ticket writes DEVELOPMENT_PROCESS.md with the five steps, the classification, `docs/GLOSSARY.md` and `docs/AREAS.md`. This ticket adds to the same file the two records of step 4 that the owner decided on 2026-11-20, after the evidence from a second application (see 261119090501's Background):

- The result of step 4 is kept in a third file, `docs/CORE.md`: the Core use cases, basic entities and gateways, the owner's decisions, and every stub, assumption and simplification.
- The flow of step 4 is also written as one **scenario map per business process**, a JSON file: its states, the choices each actor can make in each state, time limits, and open questions as **gaps**, each with a stable id. The map is described generically, without naming any tool that reads it.

The gaps are what ticket 261118220101 ties technical-debt markers to, and what the guard test of ticket 261120135803 reads, so this ticket fixes where a gap id can be found.

## Request

Add to DEVELOPMENT_PROCESS.md the rules for `docs/CORE.md` and for the scenario maps, so that the result of step 4 is left behind in files a reviewer and a later mechanical check can find.

## Done when

- [ ] DEVELOPMENT_PROCESS.md has a numbered P rule, with a level and a reason, naming `docs/CORE.md` as the record of step 4 and saying what it holds.
- [ ] DEVELOPMENT_PROCESS.md has a numbered P rule, with a level and a reason, requiring one scenario map per business process and saying what it holds (states, choices per actor, time limits, gaps with stable ids).
- [ ] The rules say where the scenario maps live and where in a map the gap ids are, and name no tool that reads them.
- [ ] REVIEW_CHECKLIST.md lists the new P rules with their levels and who checks them, word for word as their headings.
- [ ] No rule refers to a particular application, product or the board tool, and the project's checks pass.

## Out of scope

- What a gap's marker in code looks like and when a Core area is done (ticket 261118220101).
- The guard test that matches gaps to markers (ticket 261120135803).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Where do scenario maps live, and how are they named? Options: (a) docs/scenarios/<process>.json, one per business process, file name the process name in snake_case like T8's file names; (b) docs/<process>.scenario.json; (c) anywhere, ending in .scenario.json. Recommended (a): next to the other docs/ files, and a guard knows one folder to read.
  → docs/scenarios/: (a) docs/scenarios/<process>.json (owner, 2026-11-20)
- Q2 [answered] How much of a map's JSON shape do the rules fix? Options: (a) only what a check needs: a top-level 'gaps' array of objects with 'id' (stable, never reused) and 'question'; states, choices and time limits are described in prose; (b) the whole shape (states, actors, choices, time limits, gaps) with field names; (c) nothing, prose only. Recommended (a): the guard of 261120135803 must find gap ids, and fixing more would freeze a format nobody has tried beyond one application.
  → Hanya gaps: (a) only a top-level 'gaps' array of {id, question} (plus 'decision' when there is one) is fixed; the rest is free (owner, 2026-11-20)
- Q3 [answered] Is there a form for gap ids? Options: (a) free text, unique within all maps of the application, never reused; (b) '<process>-<n>' (e.g. 'transfer-3'); (c) free text unique within one map. Recommended (b): readable in a TechDebt marker, unique across maps by construction, and a guard can tell which map to look in.
  → <process>-<n>: (b) gap ids are '<process>-<n>', unique across all maps (owner, 2026-11-20)
- Q4 [answered] Levels: proposal both rules Mandatory within the file's scope (a new application or a large new part), like the five steps. Options: (a) both Mandatory; (b) the scenario map Optional for processes with no time limit or choice. Recommended (a): the technical-debt rules (Q1 of 261118220101) make 'done' depend on the map.
  → Setuju semua: both rules Mandatory (owner, 2026-11-20)

## Assumptions
- A1 [unseen] DEVELOPMENT_PROCESS.md shows a short sample of docs/CORE.md and of one scenario map in its own text, neutral or from the warehouse domain, and the README example gets neither file
  Why: The owner chose the same for GLOSSARY.md and AREAS.md (261119090501 Q4)
  If wrong: Add the files to the README example

## Decisions
- Split from 261119090501 (9 Done-when lines): the docs/CORE.md and scenario-map rules are an outcome of their own. Waits for 261119090501, which creates DEVELOPMENT_PROCESS.md and the P numbering
- Lane standard: documentation and checklist rows; the gap-id location it fixes is read by 261118220101 and 261120135803
