---
type: task
priority: medium
lane: standard
solo: true
labels: [docs, best-practices]
blocked_by: []
related: [261118104603, 261119090501]
touches: [BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, REVIEW_CHECKLIST.md, README.md, test/readme.test.ts]
created: 2026-11-18 13:46
---

## Background

The practices already treat every caller (a screen over HTTP, a scheduled job, a queue consumer, a test) as something that only calls use cases. They also cover much of what no screen shows: business rules, concurrent requests, transactions that fail halfway, effects that must wait for the commit. What they never say is **why** an application is built from its use cases. An agent handed a screen design tends to build from the screen downwards: it shapes the backend after what one screen shows.

The owner's view (2026-11-18): the frontend is the tip of an iceberg, and what lies under the waterline is far larger and more complex. So an application is better built from its use cases than from its frontend.

On 2026-11-19 the owner split this ticket in two. This ticket keeps the architectural principle, which holds for every change for as long as the application lives. The core-first development process (interview, classification into Core, Supporting and Generic, glossary, order of work) moved to ticket 261119090501 and a file of its own. The two are not in conflict. This one says *what* an application is designed from; the other says *which* use cases are built first. Together: build from the use cases, starting with the Core ones. Each file points to the other.

Decisions the owner agreed:

1. The principle is stated in BEST_PRACTICES.md as an opening section, after the section on the two levels, and the iceberg image is written out. The section is sharpened so that it is not misread: what is smaller is the complexity of the rules, not the importance of the frontend. It names what lies under the waterline and points to the rules that cover it.
2. Its consequences are written as numbered rules, so that a reviewer can cite them:
   - Work starts from the list of use cases, not from the list of screens (Optional: not every project starts from nothing).
   - Request and Response are named and shaped after the business operation, not after a screen; no field exists only because a screen shows it (Mandatory).
   - One screen may call many use cases and one use case may serve many callers; the two are not paired one to one (Mandatory). A screen whose use cases are not all built yet is incomplete on purpose, not broken.
   - A view that needs data gathered for one screen is served on the caller's side or by a query use case of its own, not by changing an existing use case (Optional).
3. The section says what this buys: once a use case's Request and Response are agreed, the frontend and the backend can be built at the same time, the frontend against the agreed contract with made-up data.
4. The new rules are **inserted** where they belong and **all rules are renumbered**, so that the file reads in order. The numbers are new and no application cites them yet, so now is the cheapest time. Every citation in BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, REVIEW_CHECKLIST.md, the README and the tests follows.

## Request

Add the principle and its rules to the conceptual practices, so that an agent given screens first still builds the application from its use cases.

## Done when

- [ ] BEST_PRACTICES.md has an opening section, after the two levels, that states the principle with the iceberg image and says plainly that it is about where the complexity lies, not that the frontend matters less.
- [ ] That section names what lies under the waterline and points to the existing rules that cover each part.
- [ ] The four consequences above appear as numbered rules at the levels given, each with its reason.
- [ ] The section says that an agreed Request and Response let the frontend and the backend be built at the same time.
- [ ] The rules of BEST_PRACTICES.md are numbered in reading order, and every citation of a rule number anywhere in the repo points to the right rule.
- [ ] No rule refers to a particular application, frontend framework or product.
- [ ] REVIEW_CHECKLIST.md lists the new rules with their levels, and the README test passes.

## Out of scope

- The development process and the classification into Core, Supporting and Generic (ticket 261119090501).
- Any rule about how a frontend itself is built.
- Changes to Skeleto's own behaviour.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Where do the four new rules sit? Options: (a) all four in the new opening section after 'Two levels', so they become B1-B4 and today's B1 (@UseCase/@Gateway) becomes B5; (b) each in the section it belongs to: 'work starts from use cases' in the opening section, the Request/Response rule next to today's B5, the screen-to-use-case rule in 'The boundary with callers' next to today's B23, the view/query-use-case rule next to today's B6. Recommended (a): they are consequences of one principle and read best with it, and the principle section is where a reviewer finds them; (b) scatters the principle.
  → Bagian pembuka, B1-B4: (a) all four rules in the new opening section as B1-B4; today's B1 becomes B5 (owner, 2026-11-20)
- Q2 [answered] The repo's test already bans database products and backend frameworks in BEST_PRACTICES.md. Should test/readme.test.ts also ban frontend framework names (React, Vue, Angular, Svelte, Next.js, and the like) to prove the Done when line 'No rule refers to a particular ... frontend framework'? Options: (a) yes, extend the banned list; (b) no, a reviewer checks it. Recommended (a): it is a one-line extension and keeps the line checkable by machine.
  → Ya, dilarang juga: (a) extend the banned list in test/readme.test.ts with frontend framework names (owner, 2026-11-20)
- Q3 [answered] REVIEW_CHECKLIST.md and TECHNICAL_PRACTICES.md say rule numbers are 'never reused, so a citation keeps its meaning'. After this renumbering, what holds? (a) one-time renumbering now, while nothing cites them; afterwards numbers are fixed, a new rule takes the next free number, and the sentence stays; (b) numbers always follow reading order and are renumbered on every insert, and the sentence is replaced; (c) drop the sentence. Recommended (a): 'now is the cheapest time' implies later is expensive, and reviewers cite by number only.
  → Sekali ini saja: (a) one-time renumbering now; numbers fixed afterwards, a new rule takes the next free number, and the 'never reused' sentence stays (owner, 2026-11-20)

## Assumptions
- A1 [unseen] The four new rules are checked by 'Reviewer' in REVIEW_CHECKLIST.md; the Machine rules stay the same two rules (today's B1 and B4), only under their new numbers, and the architecture test's messages, the startup guard's message ('which B4 forbids') and the test assertions on them follow
  Why: The architecture test checks only container metadata; none of the new rules is visible there
  If wrong: Change the Checked by column
- A2 [unseen] test/readme.test.ts gains assertions on the new section (its heading before the first rule, the iceberg image, the sentence that it is about complexity not importance, the parallel frontend/backend sentence) like the existing tests on the 'Two levels' opening
  Why: Every earlier practice ticket pinned its content with readme.test.ts assertions
  If wrong: Remove the added assertions
- A3 [unseen] 'What lies under the waterline' lists at least business rules, validation and errors, concurrency, transactions that fail halfway, effects after commit, and determinism, each pointing to the existing rules by their new numbers
  Why: The Background names these, and the existing sections cover them
  If wrong: Rewrite the list

## Decisions
- Lane standard: documentation only, but a renumbering of every B rule across five files and the tests, where a missed citation silently points at the wrong rule
- Solo: renumbering every B rule is a rename across BEST_PRACTICES.md, TECHNICAL_PRACTICES.md, REVIEW_CHECKLIST.md, README.md and test/readme.test.ts (including the architecture test's B1/B4 messages); anything running beside it would cite old numbers. It goes first; 261119090501 already waits for it
