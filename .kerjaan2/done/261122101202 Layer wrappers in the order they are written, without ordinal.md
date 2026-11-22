---
type: feature
priority: high
lane: standard
labels: []
blocked_by: [261122101201]
related: [261122101201]
touches: [src/scanner.ts, src/skeleto.ts, test/scanner.test.ts, test/skeleto.test.ts, test/readme.test.ts, CLAUDE.md, README.md, TECHNICAL_PRACTICES.md, docs/teknis/wrapper.md, docs/]
created: 2026-11-22 10:12
---

## Background

Every action is wrapped by every wrapper. Today the layering is set by a number in the wrapper's marker, `@Wrapper {"ordinal": <integer>}`: the larger number is further outside, a missing number counts as 0, and equal numbers are layered by wrapper name. A reader has to compare numbers spread over the file to know the layering, and the tie-break by name changes silently when a wrapper is renamed.

On 2026-11-22 the owner decided to drop the number and make the order in which wrappers are written the official layering, like the skin of an onion (`TEMUAN.md` "Keputusan pemilik untuk implementasi, 2026-11-22", `docs/teknis/wrapper.md` WRP-5):
- The wrapper written **first** is the **innermost** layer: it is put on first, so the file reads from the core outward. On a call the order is the reverse: the wrapper written last runs first.
- There is no technical rule about which file a wrapper is in (owner, 2026-11-22): the layering follows the order in which the scan finds wrappers, files in sorted path order and functions in the order written. Keeping all wrappers in one file stays an optional default of the practice documents.
- `{"ordinal": ...}` is removed from the contract of `@Wrapper`: like `@Config` and `@Action`, it takes no data. There are no existing users, so no backward compatibility is needed.

## Request

The layering of wrappers follows the order in which they are written, first written innermost, across files in the scan's order, and the number is gone from the contract. The written contract for every later session (`CLAUDE.md`) and the public documents describe the new rule.

## Done when

- [x] With three wrappers written in one file, the first written is the innermost layer and the last written is the outermost, proven by a test that records the order of a call.
- [x] With wrappers in two files, those of the file that comes first in path order are inside those of the later file, proven by a test.
- [x] A wrapper marker that carries any data, such as `{"ordinal": 10}`, stops startup with the same "takes no data" message as `@Config` and `@Action`.
- [x] `CLAUDE.md` states the new layering rule, with a test, and no longer mentions the number.
- [x] The README example and its printed output, the practice documents and `docs/` describe and show the new order, recommend one wrappers file as an optional default, and nothing in them still uses the number.

## Out of scope

- Built-in `@UseCase` and `@Gateway` (a separate ticket).
- Changes in the scenario-explorer repository, whose example gateway observer wrapper uses `{"ordinal": -10}`. It will need its own follow-up once this lands.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Questions
- Q1 [answered] Is the one wrappers file any single file, or must it be src/wrappers.ts? Options: (a) any one file under the scanned directory; Skeleto only refuses wrappers spread over two or more files; (b) the file must be named wrappers.ts. Recommended (a): Skeleto does not impose file names anywhere else, and the name src/wrappers.ts stays a practice-document rule (KOM-8, T8).
  → Owner: 'Tidak ada aturan khusus secara teknis untuk meletakkan disatu berkas baik itu untuk wrapper, config, action bahkan usecase dan gateway. semua tergantung oleh scanner. Pengaturan boleh dikembangkan sendiri oleh developer. Tapi boleh ada pengaturan sebagai referensi best practise optional default.' So there is no one-file rule in the core: the layering follows the scanner's order (files in sorted path order, functions in source order); one wrappers file stays an optional default in the practice documents. (owner, 2026-11-22)
- Q2 [answered] Which data may @Wrapper still carry? Options: (a) none, like @Config and @Action; data with an ordinal gets the message that the number is no longer used and the order is the written order, any other data gets the usual 'takes no data'; (b) none, one message for every kind of data. Recommended (a): the old ordinal is the likely leftover and deserves a message that says what to do instead.
  → (b) One message for all data, like @Config and @Action: @Wrapper takes no data; no special message for ordinal (owner chose 'Satu pesan untuk semua'; no backward compatibility needed). (owner, 2026-11-22)

## Assumptions
- A1 [unseen] Wrappers are still created in dependency order; only the layering follows the written order (source order within the one file), and the one-file rule holds with or without SkeletoOptions.decorators
  Why: CLAUDE.md 4.7 keeps 'dependencies first' and 4.2 checks main markers regardless of the list
  If wrong: change the creation loop in src/skeleto.ts or gate the check on the list
- A2 [unseen] An application with zero or one wrapper, or with all wrappers in one file, passes the one-file rule; the message for wrappers in several files names every such file (paths relative to the scanned directory) and the wrappers in them
  Why: the ticket asks that the message names the files; CLAUDE.md 4.8 asks every line to name the function at fault
  If wrong: shorten the message in src/scanner.ts or src/skeleto.ts
- A3 [unseen] Wrappers are still created in dependency order; only the layering follows the scan order (files in sorted path order, functions in source order), the first found innermost
  Why: CLAUDE.md 4.7 keeps 'dependencies first'; owner answer Q1 sets the layering by scan order
  If wrong: change the creation and layering loop in src/skeleto.ts

## Decisions
- Lane standard: framework code and docs, contract change of @Wrapper data, cheap to undo
- Not solo and not blocked: shares files with 261122101201 only; the layering rule does not depend on the new action kinds
- Waits for 261122101201 (owner chose sequential work): both rewrite the README example wrappers, CLAUDE.md 4.4/4.7 and the creation loop in src/skeleto.ts
- A1 and A2 speak of a one-file rule that the owner dropped in Q1; there is no such rule and no such message. A3 replaces them

## Handoff
Wrapper layering now follows the scan order (files in sorted path order, functions as written): the first written is innermost. Creation still follows dependency order; src/skeleto.ts sorts the wrapper list by scan index after the Wrapper group. @Wrapper takes no data: checkMainData in src/scanner.ts gives one message for every kind. README example wrappers reordered (gateway observer, transaction, audit) and its printed container order changed. CLAUDE.md 4.4, 4.7 and 8, TECHNICAL_PRACTICES, docs/teknis/wrapper.md (WRP-5) and komponen.md updated; no public document may contain the word ordinal (tested). Must not break: no technical one-file rule.

## Review
- 2026-11-22 standard, round 1, at f51235f: passed.
  1: ran the one-file layering test (pass): written Zebra, apple, Middle gives trace Middle, apple, Zebra, SaveUser, which the old name tie-break would fail; the dependency-created-later layering test also passes
  2: ran 'wrappers in two files: those of the file first in path order are inside those of the later file' (pass); scanner sorts paths (src/scanner.ts:41), skeleto.ts sorts wrappers by scan index
  3: ran '@Wrapper with data {"ordinal": 1|10|-10} is a mistake naming the function' (pass); combined test asserts '@Wrapper takes no data, but has {"ordinal":10}'; one message for all main markers
  4: CLAUDE.md 4.4, 4.7 and 8 rewritten; ran 'CLAUDE.md states that wrappers layer in written order, and no public document mentions ordinal any more' (pass); grep finds no ordinal in CLAUDE.md
  5: README example reordered, README example output test passes; TECHNICAL_PRACTICES T11/T26, wrapper.md WRP-5, komponen.md call one wrappers file optional; grep outside test/ finds ordinal only in TEMUAN.md
  note: TEMUAN.md:232 still says WRP-5 is 'Belum diputuskan'; a findings record not named in Done when 5, so not blocking
  note: scenario-explorer's wrapper with {"ordinal": -10} will now fail startup; out of scope, ticket says it needs its own follow-up
  note: only targeted tests run via k2 test; full typecheck/test/build already recorded on dfdb52a278
