---
type: feature
priority: medium
lane: standard
labels: [request-from-nukitu]
blocked_by: []
related: []
touches: []
created: 2026-11-23 14:08
---

## Background

Request from the nukitu application (a client of Skeleto). On 2026-11-23 the nukitu owner decided: "data response yang dikembalikan oleh server ke aplikasi client harus difilter agar tidak mengekspose data yang tidak relevan untuk usernya" — the data a server sends to a client app must be filtered so it does not expose data that is not relevant to that user. nukitu has three kinds of users (Customer, Partner, Admin), each with its own client app, looking at the same Contract.

The owner agreed this is a general rule that belongs in Skeleto, not in nukitu. Skeleto today has UC-5 (a use case has its own Response and does not return an entity) and UC-6 (Response shaped by the business operation, not the screen), but no rule on shaping or filtering a Response per user, and `TEMUAN.md` finding 15, item 1 notes that identity and authorization have no rule yet.

This ticket only carries the request and its evidence. What the rule says, where it lives, and whether it waits for the identity and authorization rule is the Skeleto owner's decision.

## Request

Skeleto's rules tell an application how to keep each user from receiving data that is not relevant to them, so that every app (nukitu included) does it the same way instead of each agent inventing its own.

## Done when

- [x] The Skeleto owner has decided whether and how this is ruled, and the decision is recorded where every later session reads it (the rule docs or `TEMUAN.md`).
- [x] If a rule is adopted, it has a number, appears in `REVIEW_CHECKLIST.md`, and the README example follows it.
- [x] The nukitu session is told the outcome (the nukitu board keeps a ticket waiting to consume it).

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Should Skeleto rule per-user Response filtering now? Option 1 (built, recommended): defer until the identity/authorization rule (TEMUAN 15) exists, record the request as TEMUAN 20, no new rule; filtering depends on who the user is, which is unruled, so a half-rule risks being replaced. Option 2: add a standalone UC rule now (role arrives via Request not context; each role gets its own business operation and Response type; no filtering in controller/wrapper), with a REVIEW_CHECKLIST row and README example. Also: someone must tell the nukitu session the outcome.
  → Tunda (yang dikerjakan): catat sebagai temuan 20 saja, tanpa aturan baru; aturannya ditulis nanti bersama aturan identitas dan otorisasi (temuan 15). (owner, 2026-11-23)

## Manual checks
- M1 [ok] (item 3) 1. Answer Q1 on the ticket.
  2. Tell the nukitu session the outcome (it keeps a ticket waiting to consume it).
  3. If a rule was chosen, open a follow-up ticket to write it.
  Checked by owner, 2026-11-23

## Handoff
Added TEMUAN 20 recording nukitu's request to filter Response data per user. Owner decided 2026-11-23: defer, no new rule; the rule will be written together with the identity and authorization rule (TEMUAN 15), near UC-5/UC-6. Finding 15 item 1 carries a pointer so whoever writes that rule sees this request. Docs-only: no rule number, checklist row or README change. Telling the nukitu session is done outside the repo (M1).

## Review
- 2026-11-23 standard, round 1, at cb53620: sent back.
  Ticked boxes whose own record says the work is pending. Line 1 needs the owner to HAVE decided, with the decision recorded. The only change is TEMUAN.md (+11). Its new row 20 says 'menunggu keputusan pemilik; ... belum jadi aturan', its section says '**Status:** belum diputuskan.', and Q1 [blocking] has no answer. No decision is recorded. Line 3 needs nukitu to have been told. TEMUAN 20 says 'nukitu belum diberi tahu hasilnya' and M1 is [waiting]. The line carries no (owner) marker, so it is judged as usual and is unmet. Fix: once Q1 is answered, record the owner's dated decision in TEMUAN 20 and in its table row, and do line 2 if option 2 is picked. For line 3, deliver the outcome to nukitu, or the owner marks it (owner).
  2: conditional on line 1 and cannot be settled while Q1 is open. Option 1 satisfies it as is. Option 2 needs a UC number, a REVIEW_CHECKLIST row, a README example and an adapted numbering test.
  note: TEMUAN 20's facts check out against the repo: UC-5, UC-6, UC-11 and TEMUAN 15 item 1. The tests pass (k2 test, node --test, exit 0). There is no AGENTS.md.
- 2026-11-23 standard, round 2, at eb8753d: passed.
  1: eb8753d records the owner's dated decision in TEMUAN 20. The row says 'diputuskan pemilik (2026-11-23): ditunda', the section has 'Keputusan pemilik (2026-11-23): pilihan 1' quoting Q1's answer, and finding 15 item 1 links to it.
  2: The owner chose option 1 (defer, no rule), so there is nothing to number. The diff touches only TEMUAN.md, which matches the decision.
  3: Checked by reading, outside the repo. The nukitu backlog ticket 261123140802 has a 'Kabar dari sesi Skeleto (2026-11-23)' paragraph stating the deferral and findings 20 and 15. It matches the foreman's report.
  note: the worker's claim for line 2 still says 'decision pending', which is stale. I did not re-run the suite (the brief records it passing on 961ebc8c4f).
