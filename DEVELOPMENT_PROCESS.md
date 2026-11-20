# Development process

In which order a new application on Skeleto is built, and what is agreed with its owner before code is written. It applies when a **new application, or a large new part of one**, is started. It does not apply to every change: a change to an application that already exists starts from the use case it touches ([B1](BEST_PRACTICES.md)).

This file is about the order of the work, not the shape of the code. The shape of the code is in [BEST_PRACTICES.md](BEST_PRACTICES.md) and [TECHNICAL_PRACTICES.md](TECHNICAL_PRACTICES.md). Skeleto does not check any rule here: they are agreed between the agent and the owner, and the agent leaves the results behind in files that a reviewer can read.

## How it relates to BEST_PRACTICES.md

The two files do not conflict, and each answers a different question.

- BEST_PRACTICES.md says what an application is **designed from**: its use cases, not its screens ([Built from use cases](BEST_PRACTICES.md#built-from-use-cases)). It holds for every change.
- This file says in which **order** the use cases are built: the ones that make the business what it is first. It holds when something large starts from nothing.

This file depends on that principle. A screen mixes parts that matter a great deal with parts that every application has, so a screen cannot be ordered; only use cases, and the business areas they belong to, can. That is why the order below is by business area, and the first thing built is the **Core**.

## How to read the rules

Every rule has a number (`P1`, `P2`, ...), a level and a reason, in the same form as the other practice files:

- **Mandatory**: follow it. Breaking it gives a design that is wrong, or that will be wrong after the next change.
- **Optional**: follow it unless you have a reason not to.

The rules below follow the five steps of the process, in order (steps 2 and 4 take more than one rule). Every one of them is Mandatory, within the scope given at the top: a new application, or a large new part of one.

## The steps

### P1. Start from what the user tells, and interview until the business areas are visible (Mandatory)

Step 1. The user tells what is to be built, who uses it and how it works. The agent then interviews the user, with questions in the words of the business, until the **business areas** can be named: the parts of the business that have a purpose of their own, such as stock, ordering or invoicing. The agent does not start to design before it can name them.

Why: a classification (P2) and a glossary (P5) are only as good as the list of areas they are made over. An agent that designs from the first description fills the gaps with guesses, and a wrong guess about what the business is shows only after much has been built on it.

### P2. Classify every business area, never every use case, as Core, Supporting or Generic, by three questions asked in order (Mandatory)

Step 2. The unit of the classification is the **business area**. It is never a use case, because the use cases of one area depend on each other: half of an area built deeply and the other half left as a stub does not work.

The three questions, asked in this order, and the first yes decides:

1. If this were wrong, would the business lose its reason to exist? Then it is **Core**: why the business exists, and what sets it apart.
2. Is it specific to this business, and needed? Then it is **Supporting**: it does not set the business apart, but nobody else has quite the same.
3. Otherwise it is **Generic**: what almost every application has, such as login, notifications, file upload or a payment integration.

Why: the order of the work is by how much a part matters to the business, and a rule of thumb that is asked the same way every time gives the same answer to two agents. Asking about the area and not the use case keeps the parts that depend on each other in one class.

### P3. The owner decides the classification; the agent only proposes it, with its reasons (Mandatory)

Step 2, continued. The agent proposes a class for each area and says why, in terms of the three questions of P2. It does not treat its proposal as agreed. The owner accepts it, or changes it, and the owner's answer is the classification.

Why: what sets a business apart is something only its owner knows. A wrong class sends the deepest work to the wrong part of the application, and the cost shows late.

### P4. Record the classification in `docs/AREAS.md`, in the application's repository (Mandatory)

The classification is kept in one file, `docs/AREAS.md`, in the repository of the application. It is a table with one row for each business area:

| Area | Class | Reason | Decision |
| --- | --- | --- | --- |
| Stock | Core | The business is moving stock between places without losing track of it | Accepted, owner, 2026-02-03 |
| Notifications | Generic | Every application tells its users something | Accepted, owner, 2026-02-03 |

- `Class` is one of `Core`, `Supporting` or `Generic`.
- `Reason` is the answer to the three questions of P2, in one line.
- `Decision` names the owner and the date of the decision of P3, and says whether the owner accepted the proposal or changed it.

The file has this name and this place so that a planner, a reviewer or a later mechanical check finds it without being told. A planner or a reviewer reads it to order and to weigh work, and does not have to know what Core means.

Why: a classification that lives only in a conversation is lost with it. A file in the repository is read by whoever plans or reviews next, and the owner's decision is the one thing in it that must not be reconstructed from memory.

### P5. Agree the words of the business in `docs/GLOSSARY.md` before any entity or use case is named (Mandatory)

Step 3. The words of the business are agreed with the owner in one file, `docs/GLOSSARY.md`, in the repository of the application. This is what Domain-Driven Design calls the **ubiquitous language**: one word for one thing, used by the owner, in the code and in the conversation. The file is a table with one row for each term:

| Term | Meaning |
| --- | --- |
| Warehouse | A place where stock is kept, with a name and a count of units for each product |
| Stock | The units of one product that a warehouse holds |

- **Every entity name and every business-area name appears in the glossary**, as a term, with its meaning. An entity or an area that is not in the glossary has not been agreed.
- A word that has two meanings in the business gets one term for each, in the owner's words, before either is used.
- The glossary is changed when the language changes, and the names in the code are changed with it.

Why: an entity or a use case named before the words are agreed carries the agent's guess of what the business calls it, and the guess spreads into every file that uses the name. Renaming later costs more than agreeing first, and two names for one thing become two entities.

### P6. Design only the Core areas first: their use cases, their basic entities and their flow (Mandatory)

Step 4. For the areas classed Core in P4, and only for them, the agent works out the use cases, the basic entities and the flow between them, in the words of the glossary (P5). Supporting and Generic areas are **not started before they are needed**.

This is possible because a use case knows its gateways only by their contracts ([B18](BEST_PRACTICES.md)): the Core can be designed, built and tested while what lies behind a gateway is still undecided.

Why: the Core is what the business stands on, so it gets the most thought and the first of it. Designing the rest in the same pass spends effort on parts that every application has, and that may change once the Core is known.

### P7. What a Core area needs from another area is handled in one of three ways, and each way is recorded (Mandatory)

Step 4, continued. When a Core use case needs something from a Supporting or Generic area, the agent chooses one of three ways, and the owner agrees to it. Each way has something that must be written down, next to the Core use case that needs it:

| Way | What it means | What is recorded |
| --- | --- | --- |
| **Stub** | A fake behind the gateway contract; the real area is built later, by a later layer, and pays the debt | The gateway contract, what the stub does in place of the real one, and which layer is to replace it |
| **Assumed to exist** | An outside service or a library provides it, and the application only calls it | What is assumed it does, who provides it, and what the application cannot work without |
| **Simplified** | A minimal version that really works, not a fake | What the version does and leaves out, and what would make it grow |

In every case the owner's decision is recorded with it.

When a stub leaves a debt behind, how that debt is marked and when a Core area is called done are not decided yet; they belong to the practices on technical debt, which are still to be written (they cover when a Core area is done, obsolete code and skeleton use cases). Until then, a stub is recorded as above and nothing more is assumed.

Why: a Core use case that quietly depends on something unbuilt is either wrong or stuck. Naming the way makes the dependency visible, and writing it down is what lets a later reader tell a stub that is waiting for its layer from a part that was forgotten.

### P8. Write code only after P1 to P7, and write the Core first, in depth, before any other layer (Mandatory)

Step 5. No code is written before the business areas are classified and decided (P1 to P4), the glossary is agreed (P5), and the Core is designed with every dependency on another area handled (P6 and P7) and its result recorded (P9 and P10). Then the Core is built first, in depth: its entities, its use cases and their tests, until it works. Supporting and Generic layers follow, as they are needed.

Why: code written before the agreement is written against guesses, and has to be undone when a guess turns out wrong. Building the Core first means that what the business stands on is the best-tested part of the application, and that the rest is built on something that works.

### P9. Record the result of step 4 in `docs/CORE.md`, in the application's repository (Mandatory)

Step 4, continued. What the agent works out for the Core areas (P6, P7) is kept in one file, `docs/CORE.md`, in the repository of the application. It holds, for each Core area:

- its **use cases**, each in a line or two, in the words of the glossary (P5);
- its **basic entities**, with what each one is for;
- its **gateways**, each with what its contract promises, and not how anything behind it works;
- the **owner's decisions** that shaped the above, with their dates;
- every **stub, assumption and simplification** of P7, in the form P7 asks for, next to the use case that needs it.

A short sample of the file:

| Area | Kind | Name | What it says | Decision |
| --- | --- | --- | --- | --- |
| Stock | Use case | Transfer stock | Moves units of a product from one warehouse to another, and refuses when the source holds too few | Accepted, owner, 2026-02-10 |
| Stock | Entity | Warehouse | Holds a count of units for each product | Accepted, owner, 2026-02-10 |
| Stock | Gateway | Save warehouses | Stores the given warehouses whole, and reports a failure | Accepted, owner, 2026-02-10 |
| Stock | Stub | Notify the owner of a transfer | Writes nothing; the notifications layer is to send a message | Accepted, owner, 2026-02-10 |

The file has this name and this place so that a reviewer or a later mechanical check finds it without being told.

Why: the work of step 4 is the longest thing agreed with the owner, and it is the thing the code is written from. Left in a conversation, it is lost, and the stubs and simplifications in it are forgotten, which is how a part waiting for its layer becomes a part nobody knows is unfinished.

### P10. Write the flow of every business process as one scenario map, in `docs/scenarios/<process>.json` (Mandatory)

Step 4, continued. The flow between the Core use cases is also written as **one scenario map for each business process**, a JSON file at `docs/scenarios/<process>.json`, in the repository of the application. `<process>` is the name of the process in snake_case, such as `stock_transfer`. A map describes the process by:

- its **states**, the situations the process can be in;
- the **choices** each actor can make in each state, and the state each choice leads to;
- the **time limits**: what happens when time passes and nobody acts;
- its **gaps**: the questions about the process that the owner has not answered yet, each with a stable id.

The rules fix only the gaps. A map has a top-level array `gaps`, and each gap is an object with:

- `id`: `<process>-<n>`, such as `stock_transfer-3`, with `<process>` the name of the map's file and `<n>` a number. An id is unique across all maps of the application and is never reused, not even after its gap is closed;
- `question`: the open question, in the words of the glossary;
- `decision`: only once the owner has answered, the answer, and the date.

A sample of the part that is fixed, in a map named `stock_transfer.json`:

| Field in `gaps` | Value |
| --- | --- |
| `id` | `stock_transfer-3` |
| `question` | What happens to a transfer that nobody receives within three days? |
| `decision` | Absent until the owner answers |

How states, choices and time limits are written is left free: it is the map's author who decides, and nothing reads it but people. The gap ids are fixed, because a later check, and the marker of a debt in code, must find them in one place: the `gaps` array of a file under `docs/scenarios/`.

Why: a flow written as prose hides its holes: a state with no way out, a choice with no rule, a wait with no limit. Writing each state, choice and limit separately makes the missing ones visible, and giving each missing rule an id that never changes lets code and review point at it exactly.

## What a reviewer can check

Most of this file is agreed in conversation and cannot be seen in a repository. Some of it can, and a reviewer should check it by reading ([REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) says which):

- `docs/AREAS.md` and `docs/GLOSSARY.md` exist, under these names and in this place (P4, P5);
- every row of `docs/AREAS.md` has one of the three classes, a reason and a decision (P4);
- every entity name and every business-area name appears in `docs/GLOSSARY.md` (P5);
- `docs/CORE.md` exists, and holds use cases, entities, gateways, decisions and every stub, assumption and simplification of the Core areas (P9);
- every business process has a file under `docs/scenarios/`, and each has a `gaps` array whose ids are `<process>-<n>` and unique across the files (P10).

The other rules are checked with the owner, not in the code: the interview, the classification being the owner's decision, the handling of what Core needs, and the order of the work.
