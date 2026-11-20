---
type: task
priority: medium
lane: light
labels: [docs, technical-practices]
blocked_by: []
related: [261120135803, 261119090501, 261118134601]
touches: []
created: 2026-11-20 20:23
---

## Background

The practice on a gateway observer wrapper says the observer calls the real gateway exactly once and returns its result. The main tool that uses the wrapper is a development tool that draws and replays use case runs. When it answers a call itself (the clock and id gateways, a call replayed from a recording, an output or error the owner typed in), it deliberately does not call the real gateway: doing so during a replay would run real writes and charges. The wrapper already works with that, because it returns whatever the observer returns; only the rule's wording forbids it. The owner decided (2026-11-20) to loosen the wording.

The reviews of the last tickets also left four small wording notes that did not block a merge:

- The README sentence that introduces the practice files still speaks of two rule files checked by "a machine or a reviewer", while the review checklist now covers three files and also has a "Process" checker.
- The row "Transactions that fail halfway" in the table of what lies under the waterline cites the two rules on effects after commit, while the rules on transactions are the direct ones.
- The "How to review" part of the review checklist names two tests now, but still says "Run it".
- The section on what a tool outside the application may rely on cites the JSDoc layout rule for marker data, a loose fit.

## Request

Loosen the observer rule so that an observer may answer a call itself, and fix the four wording notes.

## Done when

- [ ] The observer rule says an observer either calls the real gateway at most once and returns its result, or answers the call itself without calling it, and that an observer used in production always calls it.
- [ ] The README sentence introducing the practice files matches the three files and the three kinds of checker.
- [ ] The "Transactions that fail halfway" row cites the rules on transactions.
- [ ] "How to review" in the review checklist speaks of the two tests it names.
- [ ] The section on what outside tools may rely on cites a rule that fits for marker data, or none.
- [ ] The README example still runs with its documented output, and the project's checks pass.
