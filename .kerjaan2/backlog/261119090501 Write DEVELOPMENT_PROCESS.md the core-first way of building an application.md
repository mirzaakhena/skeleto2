---
type: task
priority: medium
lane: standard
labels: [docs, process]
blocked_by: [261118134601]
related: [261118220101]
touches: []
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

Not decided yet, and **not** part of this ticket (ticket 261118220101 on technical debt): what "a Core area is done" means, whether obsolete code may stay, where the technical-debt mechanism lives, and whether skeleton use cases are still allowed. Where this file needs them, it says they are open and points to that ticket's subject without inventing an answer.

## Request

Write DEVELOPMENT_PROCESS.md so that an agent starting a new application on Skeleto follows the core-first process with the owner, and leaves behind the glossary and the classification in the agreed files.

## Done when

- [ ] DEVELOPMENT_PROCESS.md exists, and states the five steps above in order as numbered rules (P1, ...) with a level (Mandatory or Optional) and a reason for each.
- [ ] The classification, its three questions, its unit (the business area) and who decides it are rules of their own.
- [ ] The three ways of handling what Core needs from other areas are a rule, and each way says what must be recorded.
- [ ] The rules name `GLOSSARY.md` and `AREAS.md` as files in the application's repository, say what each holds, and require every entity and business-area name to appear in the glossary.
- [ ] The file says how it relates to BEST_PRACTICES.md (use cases first; Core first), and BEST_PRACTICES.md and the README point to it.
- [ ] No rule refers to a particular application, product or the board tool.
- [ ] REVIEW_CHECKLIST.md lists the P rules with their levels, marking which a reviewer can check in a repository (the glossary and areas files and their names), and the README test checks the rule format of the new file and passes.

## Out of scope

- Technical debt: its kinds, its markers and when a layer is done (ticket 261118220101).
- Packaging the process as a Claude skill (postponed by the owner until the process is stable).
