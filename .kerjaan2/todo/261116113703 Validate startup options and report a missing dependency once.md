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

- [ ] Tests show that a text, `null`, a number, and a list holding something that is not text, given as the list of allowed markers, each stop startup with a message naming that option.
- [ ] Tests show the same four cases for the list of exclusions.
- [ ] A test shows that with a text given as the list of allowed markers, a shorter marker name contained in that text is not accepted.
- [ ] A test shows that a function naming the same missing dependency in two parameters gets one line for it, and that two different functions missing the same dependency still get one line each.
- [ ] Leaving either option out, or passing `undefined`, behaves as before; existing tests still pass.
- [ ] The three commands of `CLAUDE.md` section 9 pass.

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
