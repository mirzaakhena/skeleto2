---
type: task
priority: medium
lane: standard
labels: [docs, best-practices]
blocked_by: []
related: [261118104603]
touches: []
created: 2026-11-18 13:46
---

## Background

The practices already treat every caller (a screen over HTTP, a scheduled job, a queue consumer, a test) as something that only calls use cases. They also cover much of what no screen shows: business rules, concurrent requests, transactions that fail halfway, effects that must wait for the commit. What they never say is **why** an application is built from its use cases. An agent handed a screen design tends to build from the screen downwards: it shapes the backend after what one screen shows.

The owner's view (2026-11-18): the frontend is the tip of an iceberg, and what lies under the waterline is far larger and more complex. So an application is better built from its use cases than from its frontend.

Decisions the owner agreed (2026-11-18):

1. The principle is stated in BEST_PRACTICES.md as an opening section, after the section on the two levels, and the iceberg image is written out. The section is to be sharpened so that it is not misread: what is smaller is the complexity of the rules, not the importance of the frontend. It names what lies under the waterline and points to the rules that cover it.
2. Its consequences are also written as numbered rules, so that a reviewer can cite them:
   - Work starts from the list of use cases, not from the list of screens (Optional: not every project starts from nothing).
   - Request and Response are named and shaped after the business operation, not after a screen; no field exists only because a screen shows it (Mandatory).
   - One screen may call many use cases and one use case may serve many callers; the two are not paired one to one (Mandatory).
   - A view that needs data gathered for one screen is served on the caller's side or by a query use case of its own, not by changing an existing use case (Optional).
3. The section also says what this buys: once a use case's Request and Response are agreed, the frontend and the backend can be built at the same time, the frontend against the agreed contract with made-up data.

Widened by the owner later the same day (2026-11-18). Work also starts from the core of the business:

4. Every business area is classified as **Core**, **Supporting** or **Generic**, the terms of Domain-Driven Design. Core is why the business exists and what sets it apart. Supporting is specific to this business but does not set it apart. Generic is what almost every application has (login, notifications, file upload, payment integration). The rules give the three questions that decide it, asked in order: if this were wrong, would the business lose its reason to exist (Core)? Is it specific to this business (Supporting)? Otherwise Generic.
5. The unit that is classified is the **business area** (the folder of use cases), never a single use case, because the use cases of one area depend on each other.
6. The classification is the owner's decision. An agent proposes it, with its reasons, and the owner decides.
7. Core areas are built first and in depth. What a Core use case needs from a Supporting or Generic area is handled in one of three ways, each recorded: a stub behind the gateway contract, an assumption that it already exists (an outside service or a library), or a simplified version that really works. Supporting and Generic areas are not started before they are needed. This is possible because a use case knows its gateways only by their contracts.
8. Before use cases are named, the words of the business are agreed in a glossary (the **ubiquitous language** of Domain-Driven Design), and entities and use cases are named with those words only.
9. Rule 2's first consequence ("work starts from the list of use cases") becomes: work starts from the list of use cases of the Core areas.

The development process the owner works by (2026-11-18), which the section describes in order: the user tells what is to be built and how it works; the agent interviews the user to find the Core, Supporting and Generic areas; then, for the Core areas only, the agent identifies the use cases, the basic entities and the flow, while Supporting and Generic areas get stubs, are assumed to exist, or are simplified.

Not decided yet, and **not** part of this ticket (they belong to ticket 261118220101 on technical debt): what "a Core area is done" means, whether obsolete code may stay, where the technical-debt mechanism lives, and whether skeleton use cases are still allowed.

## Request

Add the principle and its rules to the conceptual practices, so that an agent given screens first still builds the application from its use cases.

## Done when

- [ ] BEST_PRACTICES.md has an opening section, after the two levels, that states the principle with the iceberg image and says plainly that it is about where the complexity lies, not that the frontend matters less.
- [ ] That section names what lies under the waterline and points to the existing rules that cover each part.
- [ ] The four consequences above appear as numbered rules at the levels given, each with its reason.
- [ ] The section says that an agreed Request and Response let the frontend and the backend be built at the same time.
- [ ] The classification into Core, Supporting and Generic per business area, its three questions, who decides it, and the three ways of handling what Core needs from other areas appear as numbered rules with levels and reasons.
- [ ] The glossary (ubiquitous language) and the order of the development process are stated, and the rules name entities and use cases only with the glossary's words.
- [ ] No rule refers to a particular application, frontend framework or product.
- [ ] REVIEW_CHECKLIST.md lists the new rules with their levels, every citation of a rule number in the documents still points to the right rule, and the README test passes.

## Out of scope

- Any rule about how a frontend itself is built.
- Changes to Skeleto's own behaviour.
