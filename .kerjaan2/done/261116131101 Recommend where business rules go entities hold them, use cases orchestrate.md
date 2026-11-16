---
type: task
priority: medium
lane: standard
labels: []
blocked_by: []
related: [261116123201]
touches: []
created: 2026-11-16 13:11
---

## Background

The README recommends one use case per file, but says nothing about what a use case should contain, or where the rules of the business live. Its own example has a use case (`GreetAll`) that depends on another use case (`Greet`). Skeleto allows an action to depend on an action, and it should keep allowing it: gateways are built from other gateways. But an application whose use cases call each other mixes orchestration with business rules.

The owner decided on 2026-11-16 that the README recommends, for every application built on Skeleto:

- An **entity** is a plain type plus pure functions. It holds the business rules: valid values, allowed changes of state, and rules that involve several entities (for example moving stock from one warehouse to another). A function that changes an entity returns a new copy and never changes the one it was given. An entity is created only through its creating function, which validates it. Entities carry no markers and are not scanned by Skeleto.
- A **use case** only orchestrates: it fetches through gateways, calls entity functions, and saves the results through gateways. It holds no business rule of its own, and it does not call another use case.

The owner chose the functional style over classes with methods, and chose to keep rules that span several entities in the entities' side as pure functions rather than in the use case.

## Request

Move the application-layout recommendations out of the README into a new file `BEST_PRACTICES.md` at the repository root, in English, and leave the README one line that links to it, so the README stays about using the framework (owner, 2026-11-16). The new file opens with a short explanation of the two levels: the technical level that Skeleto recognises and enforces (`@Config`, `@Wrapper`, `@Action`, the dependency rules, ordering and wrapping) and the architectural level that applications build on top (entities, use cases, gateways), which Skeleto does not know about; it calls this a matter of mechanism versus policy. A table maps each architectural concept to what expresses it and says whether Skeleto checks it: entity (plain types and functions, no marker, not a component), use case and gateway (both `@Action`; checked as actions, not in their role), resources such as a database or settings (`@Config`), cross-cutting concerns such as logging or transactions (`@Wrapper` with additional markers). After that opening, the file holds the existing section "One use case per file" and a new section next to it that recommends the split above and says why:

- Data that comes from a database or over HTTP is already a plain object, so a plain type needs no conversion into a class instance in every gateway.
- A change that returns a new copy leaves the old state intact if saving fails and the transaction is rolled back.
- Pure functions are tested with inputs and outputs alone.
- Importing an entity's file as a namespace (`import * as Receipt from ...`, then `Receipt.approve(receipt, now)`) makes its functions as easy to find as methods.

Show a rule that involves two entities as a pure function, and a use case that fetches, calls it and saves. State plainly that these are recommendations, that Skeleto does not check them, and that Skeleto still allows an action to depend on another action, which gateways may use. Code shown in the new file is checked by a test the same way the README's code is, so it cannot drift from what runs.

Change the README's own example so that it follows the recommendation: no use case depends on another use case, and the business rule sits in a plain entity function that a use case calls.

## Done when

- [x] `BEST_PRACTICES.md` opens by separating the technical level Skeleto enforces from the architectural level it does not know about, with a table that maps entity, use case, gateway, resources and cross-cutting concerns to what expresses each and whether Skeleto checks it.
- [x] `BEST_PRACTICES.md` exists at the repository root and holds both recommendations: one use case per file, and entities as plain types with pure functions holding the business rules while use cases only orchestrate entities and gateways, with each of the four reasons above.
- [x] It shows a rule involving two entities as a pure function, and a use case that fetches, calls that function and saves.
- [x] It says that these are recommendations, that Skeleto does not check them, and that an action may still depend on another action (for gateways).
- [x] The README no longer holds either recommendation, and has one line that links to `BEST_PRACTICES.md`.
- [x] In the README's example, no use case depends on another use case, and a business rule is a plain function that is not a component.
- [x] Every code example in the README still starts in its test and the output the README shows is the output the example prints; every code block in `BEST_PRACTICES.md` is checked by a test; neither file can hold a code block that no test checks.
- [x] Nothing outside `README.md`, `BEST_PRACTICES.md` and their tests changed, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Any check in the framework. Changes to `CLAUDE.md`. Changes to `~/Workspace/nukitu`. Removing the framework's support for an action that depends on an action.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Assumptions
- A1 [unseen] The owner's 'entities are not scanned by Skeleto' is written as: an entity file has no markers, Skeleto reads it like any file and makes no component of it; no exclusion is recommended
  Why: The default exclusions do not cover entity files, and excluding them changes nothing at runtime
  If wrong: Add a sentence suggesting exclude: [...DEFAULT_EXCLUDE, "entity"]
- A2 [unseen] The example's domain changed from greetings to moving stock between two warehouses, with one use case (StockTransfer), two gateways and an async connectDatabase config replacing loadSettings
  Why: The section must show a two-entity rule from the runnable example, and the greeting example had a use case depending on a use case
  If wrong: Rework the example files, the output block and the assertions in test/readme.test.ts

## Decisions
- test/readme.test.ts accepts a ts block whose first line is '// <path>.ts (excerpt)' only if its body is a verbatim substring of the example file of that path, so the new section can show code from the example without a second full copy while every block stays run
- 2026-11-16 the owner changed what this ticket asks for: Owner, 2026-11-16: move the best practices out of the README into BEST_PRACTICES.md so the README stays lite ("supaya README bisa lebih lite"); chosen options: BEST_PRACTICES.md, and change this ticket now.
- 2026-11-16 the owner changed what this ticket asks for: Owner, 2026-11-16: move the best practices out of the README into BEST_PRACTICES.md so the README stays lite ("supaya README bisa lebih lite"); chosen options: BEST_PRACTICES.md, change this ticket now.
- 2026-11-16 the owner changed what this ticket asks for: Owner, 2026-11-16: open BEST_PRACTICES.md with the split between the technical level (@Action, @Config, @Wrapper and their rules) and the architectural level (use case, gateway, entity), with a mapping table; chosen option: add it now.
- BEST_PRACTICES.md runs no code of its own: it may hold only '(excerpt)' ts blocks, each verified verbatim against a README example file; whole files, commands or output there are refused, so the README stays the single runnable example

## Handoff
Layout recommendations live in BEST_PRACTICES.md: Two levels opening with mapping table, One use case per file (moved from README), and Entities hold the rules, use cases orchestrate with excerpts of the example. README keeps one link line (Example intro); its example is a stock transfer with entity, gateways and one use case. test/readme.test.ts reads both files: only plain backtick fences with a bare language are sorted; every other code form (info strings, tilde fences, indented fences, indented blocks, pre tags) is refused; BEST_PRACTICES.md may hold only verbatim excerpts. Must not break: no unchecked code in either file; README output equals the real run.

## Review
- 2026-11-16 standard, round 1, at 04b6f03: sent back.
  7 (blocking): readBlocks() in test/readme.test.ts only sees fences matching /^```(\w*)\n...^```$/gm; other CommonMark fences are skipped, not refused. Appended to BEST_PRACTICES.md in an archive copy, then 'k2 test 261116131101 --dir <copy> -- npx tsx --test test/readme.test.ts': (D) ```ts title="x" fence -> pass 12 fail 0; (E) ~~~ts fence -> pass 12 fail 0; (F) indented ```ts fence in a list item -> pass 12 fail 0. All render as code, no test checks them; same gap applies to README.md. So 'neither file can hold a code block that no test checks' is false.
  7 fix: in readBlocks also count every fence-opening line (/^\s*(```|~~~)/) and fail unless each was consumed by the strict pattern; re-run D, E, F, each must fail. Controls that already fail correctly: altered excerpt, ```js block, bare ``` block.
  1: test 'BEST_PRACTICES.md opens with the two levels...' passes; opening and table read and match the request
  2: file at repo root; test asserts both headings and the four reasons; text read
  3: excerpts of Warehouse.transfer and the StockTransfer handler; altering the use-case excerpt failed the test
  4: opening says Skeleto does not check them; last paragraph keeps action-on-action for gateways; asserted by test
  5: diff removes both sections; README line 27 is the only BEST_PRACTICES.md link; asserted by test
  6: example runs in the test; StockTransfer depends only on FindWarehouse, SaveWarehouses; entity file has no marker, no component
  8: diff --name-only lists only BEST_PRACTICES.md, README.md, test/readme.test.ts; three commands passed on 5f1f707cff per board, not re-run
  note: the regex predates this ticket on the README side, but line 7 states the guarantee for both files
- 2026-11-16 standard, round 2, at c42f9ce: passed.
  1: carried from round 1 (BEST_PRACTICES.md untouched since 04b6f03); test still passes
  2: carried, file untouched
  3: carried, file untouched
  4: carried, file untouched
  5: carried, README untouched
  6: carried, README example untouched
  7: re-proven on an archive copy of c42f9ce via k2 test --dir: unmodified passes 12/12; info-string fence, ~~~ fence, list-indented fence and indented code block in BEST_PRACTICES.md, plus info-string fence and a 4-backtick fence wrapping a strict block in README.md, each fail with 'has code that no test checks'
  8: diff main...HEAD --name-only still lists only BEST_PRACTICES.md, README.md, test/readme.test.ts; three commands passed on 0e335d21a5 per board, not re-run
  note: the reported line number counts lines of the text with checked blocks removed, so it does not match the file's line; cosmetic
