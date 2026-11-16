---
type: bug
priority: medium
lane: standard
labels: []
blocked_by: []
related: []
touches: [src/skeleto.ts, src/scanner.ts, src/dependency.ts, test/skeleto.test.ts, test/scanner.test.ts, test/dependency.test.ts, CLAUDE.md]
created: 2026-11-16 11:37
---

## Background

An independent review (2026-11-16) found three small faults in how startup treats its input:

- The options are not checked. A caller without type checking who passes a text where a list is expected gets a raw failure (`exclude.filter is not a function`) or, worse, a wrong result: `decorators: "Logging"` is searched as text, so a marker `@Log` is accepted as allowed.
- `exclude: null` gives a bare type error instead of a usage mistake.
- A missing dependency that the same function names in two parameters is reported twice.

## Request

Check the startup options before anything is scanned: each of the two lists must be a list of texts when given, and anything else is a usage mistake that names the option and what was received, reported in the same single error as other mistakes. An option that is left out behaves as today. A missing dependency is reported once for each pair of component and dependency name.

## Done when

- [x] Tests show that a text, `null`, a number, and a list holding something that is not text, given as the list of allowed markers, each stop startup with a message naming that option.
- [x] Tests show the same four cases for the list of exclusions.
- [x] A test shows that with a text given as the list of allowed markers, a shorter marker name contained in that text is not accepted.
- [x] A test shows that a function naming the same missing dependency in two parameters gets one line for it, and that two different functions missing the same dependency still get one line each.
- [x] Leaving either option out, or passing `undefined`, behaves as before; existing tests still pass.
- [x] The three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Options that do not exist today. Returning a copy of the container instead of the live one.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Assumptions
- A1 [unseen] An option that fails the check does not end startup on its own: its mistake is added to the list, the scan still runs with that option treated as left out (every additional marker accepted, DEFAULT_EXCLUDE used), and everything is thrown as one error. A list holding something that is not text is one mistake for the option; the list is not used in part.
  Why: CLAUDE.md section 2 and 4.8: all usage mistakes are reported at once, not one by one; the ticket says 'in the same single error as other mistakes'
  If wrong: Throw right after the option check in build() in src/skeleto.ts, before scanDirectory is called
- A2 [unseen] CLAUDE.md gets the two rules in Indonesian although no Done-when line asks for it: 4.8 says each option list must be a list of texts and anything else is a mistake naming the option; 4.3 says a missing dependency is reported once per component and dependency name
  Why: CLAUDE.md section 4 is the specification and every tested behaviour is written there; ticket 261116110902 existed only to bring it back in line
  If wrong: Drop the two bullets from CLAUDE.md

## Decisions
- Lane standard: input checks at startup and one fewer duplicate message; nothing stored, covered by tests
- Runs beside 261116113701 and 261116113702: shares src/skeleto.ts and src/scanner.ts with them but needs neither's result
- The received value is shown with node:util inspect rather than JSON.stringify, which throws on a bigint or a circular value and shows undefined entries as null

## Handoff
Startup now checks options.decorators and options.exclude in src/skeleto.ts (listOption) before the scan: each must be a list of texts when given, otherwise one line 'options.<name>: must be a list of texts, received <value>' joins the single startup error and the option counts as left out for the scan. The sorter in src/dependency.ts looks at each dependency name of a component once, so a missing dependency (and a self cycle) written in two parameters gives one line. Must not break: option mistakes come first in the error, the scan still runs after a bad option, nothing is imported, and scanDirectory keeps its own per-entry exclude checks. CLAUDE.md 4.3 and 4.8 carry both rules.

## Review
- 2026-11-16 standard, round 1, at c1a847b: passed.
  1: ran the four 'options.decorators given as ...' tests by name: pass, each asserts the exact first line naming the option with deepEqual and no import; they fail against main's src in a copy. Hand probe with 'Logging' and [1n] printed the same line.
  2: the same four tests for options.exclude pass and fail against main's src; hand probe with exclude null printed 'options.exclude: must be a list of texts, received null'.
  3: the 'shorter marker name contained in that text' test passes here and fails on main's src; hand probe with decorators 'Logging' and a function marked @Log did not start.
  4: tests in test/skeleto.test.ts and test/dependency.test.ts assert exactly one line per function with deepEqual; pass here, fail on main's src. Hand probe with two Database parameters printed one line.
  5: the 'left out or undefined' test passes for undefined, {} and both options undefined; hand probe with no options gave only the dependency line. The diff only adds tests; the recorded full run on 890e8797c8 passed.
  6: relied on the board's recorded run of the three section 9 commands on exactly this content (890e8797c8); not rerun, as instructed.
  note: a sparse list (new Array(1)) passes listOption since every() skips holes; exclude then fails in the scanner, decorators acts as an empty list. Never wrongly permissive, so not blocking.
  note: src/ is 420 lines against the CLAUDE.md section 2 target of under 400; main was already at 403, this ticket adds 17. A target, not judged blocking.
  note: the kind-rule loop in src/skeleto.ts still walks duplicate parameters, so a forbidden dependency named twice may be reported twice; outside this ticket. No repo checks exist beyond the section 9 commands.
