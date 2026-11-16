---
type: task
priority: medium
lane: light
labels: []
blocked_by: []
related: []
touches: []
created: 2026-11-16 12:32
---

## Background

The owner wants "one use case per file" to be a practice every application built on Skeleto follows, not only the first application that uses it (2026-11-16). The README says how to use the framework but says nothing about how to lay out an application. Its own example even puts two actions in one file, one depending on the other.

Skeleto itself does not know what a use case is: a use case and a gateway are both `@Action`, and the framework only binds them. The owner decided that the practice is a recommendation in the README, not a rule the framework checks, and that it covers use cases only (2026-11-16).

## Request

Add a short section to the README, in English, that recommends one use case per file:

- A use case is an `@Action` that stands for one business operation of the application. Put each in its own file, named after it, and group the files of one entity or business area in a folder (for example `usecase/user/user_create.ts`, `user_get.ts`, `user_list.ts`, `user_update.ts`, `user_delete.ts`, `user_reset_password.ts`).
- This holds for simple create, read, update and delete operations too. Say why: there is no line between "simple" and "complex" to judge, so the rule is applied the same way by everyone, and a use case that grows never has to be moved.
- Gateways (actions that reach a database or another service), wrappers and configs may be grouped, for example all gateways of one technology in one file.
- Skeleto does not check this: file names and folders do not matter to the scan, and the rule that two functions may not return the same type name keeps use case names unique.

Make the README's own example follow the advice, so the page does not contradict itself.

## Done when

- [x] The README has a section that recommends one use case per file, shows the folder layout, and states each of the four points above.
- [x] The section says plainly that this is a recommendation and that Skeleto does not check it.
- [x] No action example in the README puts two use cases in one file.
- [x] Every code example in the README still starts in its test, and the test still refuses a README code block that no test runs.
- [x] Nothing outside the README and its test changed, and the three commands of `CLAUDE.md` section 9 pass.

## Out of scope

Any check in the framework. Changes to `CLAUDE.md`. Changes to `~/Workspace/nukitu`. Rules about test file layout.

<!-- k2:record — written by k2 only; do not edit by hand -->

## Handoff
README gains a 'One use case per file' section (recommendation only, layout shown as a list so the readme test's fence rule is untouched). The example action file src/greet.ts is split into src/usecase/greet/greet.ts (Greet) and greet_all.ts (GreetAll); output unchanged. test/readme.test.ts only had its path for the async-config assertion updated. Must not break: every README fence stays ts with a path line, one sh, one text.
