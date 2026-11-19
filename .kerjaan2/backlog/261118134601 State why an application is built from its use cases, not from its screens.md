---
type: task
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: []
related: [261118104603, 261119090501]
touches: []
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
