---
type: task
priority: medium
lane: standard
labels: [docs, process]
blocked_by: [261118134601]
related: [261118220101, 261120140001]
touches: [DEVELOPMENT_PROCESS.md, BEST_PRACTICES.md, REVIEW_CHECKLIST.md, README.md, test/readme.test.ts]
created: 2026-11-19 09:05
---

## Background

On 2026-11-19 the owner split the principle "build from use cases, not from screens" (ticket 261118134601, in BEST_PRACTICES.md) from the process that decides **which** use cases are built first. The two do not conflict. The principle says what an application is designed from and holds for every change. The process says in which order a new application, or a large new part of one, is built. The process depends on the principle: a screen mixes Core, Supporting and Generic parts, so only use cases and business areas can be ordered.

The process is not about the shape of code, so it gets a file of its own, **DEVELOPMENT_PROCESS.md**, with its own rule numbers (P1, P2, ...). It is also what a future Claude skill for Skeleto would run, and a file of its own can move into that skill whole. BEST_PRACTICES.md and DEVELOPMENT_PROCESS.md point to each other.

The process the owner works by (2026-11-18), in order:

1. The user tells what is to be built, who uses it and how it works.
2. The agent interviews the user until the business areas are visible, then proposes a classification **per business area** (never per use case, because the use cases of one area depend on each other), with its reasons:
   - **Core**: why the business exists; what sets it apart.
   - **Supporting**: specific to this business and needed, but does not set it apart.
   - **Generic**: what almost every application has (login, notifications, file upload, payment integration).

   The three questions, asked in order: if this were wrong, would the business lose its reason to exist (Core)? Is it specific to this business (Supporting)? Otherwise Generic. **The classification is the owner's decision**; the agent only proposes.
3. The words of the business are agreed in a glossary (the **ubiquitous language** of Domain-Driven Design) before any entity or use case is named.
4. For Core areas only: the use cases, the basic entities and the flow. What Core needs from a Supporting or Generic area is handled in one of three ways, each recorded: a **stub** behind the gateway contract, paid by a later layer; **assumed to exist** (an outside service or a library); or **simplified**, a minimal version that really works. Supporting and Generic areas are not started before they are needed. This is possible because a use case knows its gateways only by their contracts.
5. Only then is code written: Core first, in depth, before any other layer.

Decisions the owner agreed (2026-11-19):

- The glossary is **one file in the application's repository**, `GLOSSARY.md`. Every entity name and every business-area name appears in it.
- The classification is recorded in **one file in the application's repository**, `AREAS.md`, listing each business area with its class (Core, Supporting or Generic), the reason, and the owner's decision. Planners and reviewers read it to order and weigh work without needing to know what Core means.
- The file names are fixed by the rules, so that a later mechanical check can find them.

### Evidence from a second application (added 2026-11-20)

A second application of the owner followed these five steps exactly (2026-11-19 to 2026-11-20). What it did differently or in addition, as evidence for this ticket, not as a decision:

- **Where the files live:** the glossary and the classification are `GLOSSARY.md` and `AREAS.md`, but in a `docs/` folder together with every other project document, not at the repository root. If the rules fix the names so that a mechanical check can find them, they should also say where the check looks (Q3 bears on this).
- **A design file for the Core:** the result of step 4 (the Core use cases, basic entities, gateways, and every stub, assumption or simplification with the owner's decisions) is kept in a third file, `CORE.md`, which this ticket does not name.
- **A scenario map per business process:** the flow of step 4 is also written as a JSON scenario map (states, choices per actor, time limits, and open questions as gaps with stable ids). The gaps became the link between the process and the code's technical-debt markers (see ticket 261118220101).
- **The project's instructions file** lists steps 1 to 4 as mandatory and in order, and forbids writing code before they are agreed.

Decisions the owner agreed (2026-11-20), after that evidence:

- `GLOSSARY.md` and `AREAS.md` live in the application's `docs/` folder, so a mechanical check knows exactly where to look.
- The result of step 4 is kept in a third file, `docs/CORE.md`: the Core use cases, basic entities and gateways, the owner's decisions, and every stub, assumption and simplification.
- The flow of step 4 is also written as one **scenario map per business process**, a JSON file: its states, the choices each actor can make in each state, time limits, and open questions as **gaps**, each with a stable id. The map is described generically, without naming any tool that reads it.

On 2026-11-20 the two records of step 4 above (`docs/CORE.md` and the scenario maps) were split into ticket 261120140001, which adds their rules to this file once it exists; this ticket's Done when had grown past one round of work. This ticket still names step 4 itself and its three ways of handling what Core needs.

The owner also decided (2026-11-20) the technical-debt questions: what "a Core area is done" means, obsolete code, where the technical-debt mechanism lives, and skeleton use cases. They are **not** part of this ticket: ticket 261118220101 writes them. Where this file needs them, it names the subject and leaves the rule to that ticket's text.

## Request

Write DEVELOPMENT_PROCESS.md so that an agent starting a new application on Skeleto follows the core-first process with the owner, and leaves behind the glossary and the classification in the agreed files.

## Done when

- [x] DEVELOPMENT_PROCESS.md exists, and states the five steps above in order as numbered rules (P1, ...) with a level (Mandatory or Optional) and a reason for each.
- [x] The classification, its three questions, its unit (the business area) and who decides it are rules of their own.
- [x] The three ways of handling what Core needs from other areas are a rule, and each way says what must be recorded.
- [x] The rules name `docs/GLOSSARY.md` and `docs/AREAS.md` as files in the application's repository, say what each holds, and require every entity and business-area name to appear in the glossary.
- [x] The file says how it relates to BEST_PRACTICES.md (use cases first; Core first), and BEST_PRACTICES.md and the README point to it.
- [x] No rule refers to a particular application, product or the board tool.
- [x] REVIEW_CHECKLIST.md lists the P rules with their levels, marking which a reviewer can check in a repository (the glossary and areas files and their names), and the README test checks the rule format of the new file and passes.

## Out of scope

- Technical debt: its kinds, its markers and when a layer is done (ticket 261118220101).
- The rules for `docs/CORE.md` and the scenario maps (ticket 261120140001).
- Packaging the process as a Claude skill (postponed by the owner until the process is stable).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Which level does each P rule get? Proposal: every step rule (P1 interview, classification, glossary before naming, Core use cases with stub/assumed/simplified handling, Core code first) is Mandatory, and the file states its scope at the top: it applies when a new application, or a large new part of one, is started, not to every change. Options: (a) as proposed; (b) some Optional (say which). Recommended (a): it mirrors 261118134601, which keeps 'work starts from use cases' Optional because not every project starts from nothing; here the scope sentence does that job.
  → Sesuai usulan: (a) every step rule Mandatory, with a scope sentence (new application or a large new part) (owner, 2026-11-20)
- Q2 [answered] REVIEW_CHECKLIST.md's 'Checked by' column today holds 'Machine' or 'Reviewer'. Most P rules (the interview, the owner deciding the classification) cannot be seen in a repository. What goes there? Options: (a) 'Reviewer' for the rules a repository shows (GLOSSARY.md and AREAS.md exist, are named so, every entity and area name is in the glossary) and a third value 'Process' for the rest, meaning checked with the owner, not in the code; (b) 'Reviewer' for all, with a note on the repo-checkable ones. Recommended (a): a reviewer is told plainly which rows they can check, and the test can pin the split.
  → Reviewer + nilai Process: (a) 'Reviewer' for rules a repository shows, a new value 'Process' for the rest (owner, 2026-11-20)
- Q3 [answered] Do the rules fix the layout of GLOSSARY.md and AREAS.md, or only their names and what they hold? Options: (a) layout fixed: GLOSSARY.md a table 'Term | Meaning'; AREAS.md a table 'Area | Class | Reason | Decision' with Class one of Core, Supporting, Generic and Decision naming the owner and date; (b) names and contents only, layout left to the application. Recommended (a): the ticket wants a later mechanical check to find these files, and a fixed table is what such a check could read.
  → Tabel tetap: (a) GLOSSARY.md a table 'Term | Meaning'; AREAS.md a table 'Area | Class | Reason | Decision' (owner, 2026-11-20)
- Q4 [answered] Does the README example gain a GLOSSARY.md and AREAS.md for its warehouse application? Options: (a) no: DEVELOPMENT_PROCESS.md shows a short sample of each file in its own text, and the example stays code only; (b) yes: both files are added to the example and the README test checks every entity name of the example is in its glossary. Recommended (a): smaller, and the example is a binding demo, not a process demo; (b) proves the rule but grows the README test.
  → Tidak: (a) the README example gets no GLOSSARY.md or AREAS.md; DEVELOPMENT_PROCESS.md shows samples (owner, 2026-11-20)

## Assumptions
- A1 [unseen] The README gains its link to DEVELOPMENT_PROCESS.md on the one line that already links BEST_PRACTICES.md, TECHNICAL_PRACTICES.md and REVIEW_CHECKLIST.md
  Why: test/readme.test.ts requires those links to sit on one line; earlier practice files followed it
  If wrong: Move the link to a line of its own and relax that test
- A2 [unseen] Where the file meets the open technical-debt questions, it says they are not decided yet and names the subject (technical debt: when a Core area is done, obsolete code, skeleton use cases) without a ticket number
  Why: Done when forbids referring to the board tool, and a ticket id is a reference to it
  If wrong: Add the ticket reference
- A3 [unseen] The REVIEW_CHECKLIST.md rule-row test and numberedRules in test/readme.test.ts are extended to P rules, which are listed in a section of their own after the technical practices, and checked word for word against DEVELOPMENT_PROCESS.md headings
  Why: That is how B and T rows are kept in sync today
  If wrong: Check P rows separately

## Decisions
- Lane standard: a new documentation file plus checklist rows and a new rule-format test; nothing that cannot be undone
- Waits for 261118134601: it points to that ticket's principle section and cites B rules by the numbers that ticket assigns. Not solo: a new file plus small edits elsewhere
- Split on 2026-11-20: the docs/CORE.md and scenario-map Done-when lines (9 lines in all) moved to 261120140001, which waits for this ticket

## Handoff
Added DEVELOPMENT_PROCESS.md with rules P1-P8 (all Mandatory, scope: new application or large new part): interview, classification per area by three questions, owner decides, docs/AREAS.md, docs/GLOSSARY.md before naming, Core-only design, three ways to handle what Core needs (stub, assumed, simplified, each recorded), Core-first code. REVIEW_CHECKLIST.md gained a Development process table and a Process checker value; BEST_PRACTICES.md and the README point to the file. test/readme.test.ts extends rule rows to P and checks the new file. Must not break: checklist rows match headings word for word; the new file holds no code fences.

## Review
- 2026-11-20 standard, round 1, at b432e66: passed.
  1: P1-P8, each '### Pn. ... (Mandatory)' with a Why:, mapped to steps 1-5 in order (P2-P4 step 2, P5 step 3, P6-P7 step 4, P8 step 5); all Mandatory per Q1 with scope sentence; the format test passes, and fails on a copy with P4's Why: removed
  2: P2 (unit = business area, never use case; three questions in order) and P3 (owner decides, agent proposes) are separate rules; read and pinned by the same test
  3: P7 table gives Stub, Assumed to exist, Simplified, each with a 'What is recorded' column plus owner decision; tech-debt left unnamed per A2; checked by reading and the P7 regex
  4: P4/P5 name docs/AREAS.md and docs/GLOSSARY.md in the application's repository, with the Q3 table layouts, and P5 requires every entity and area name in the glossary; pinned by test
  5: 'How it relates to BEST_PRACTICES.md' section links #built-from-use-cases (anchor exists), cites B1 and B18 correctly; BEST_PRACTICES.md and README link back; pinned by the scope/relation test
  6: grep for kerjaan/k2/ticket/board finds nothing; samples (Stock, Notifications, Warehouse) name no application; banned-word test passes
  7: Development process table, P4/P5 Reviewer, rest Process; checklist test passes and fails on a copy with P4 set to Process; full suite passed on e2c075438a per brief
  note: README line 27 still says 'Every rule of the two, with its level and whether a machine or a reviewer checks it' after the new sentence; the checklist now covers three files and a Process checker. Stale, not false; the README test name 'two practice files' likewise
