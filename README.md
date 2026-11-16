# Skeleto

Skeleto wires up an application made of plain functions. You mark a function with `@Config`, `@Wrapper` or `@Action` in its JSDoc comment; Skeleto reads the TypeScript sources, works out which function needs which, calls each one once with its dependencies, puts every wrapper around every action, and hands you the results in a container.

## What it does, and what it leaves out

It does **binding only**:

- It scans every `.ts` file below one directory for marked, exported, top-level functions, except the files and folders on its [exclusion list](#files-the-scan-leaves-out).
- The **name** of a component is its return type, exactly as written (`Greet`, `winston.Logger`); a config written `Promise<Settings>` is [asynchronous](#asynchronous-configs) and is named `Settings`. Its **dependencies** are the types of its parameters, in order. Nothing else is read: Skeleto never opens a type definition.
- Every mistake (a missing dependency, a cycle, a misspelled marker, two functions returning the same type, ...) is reported at startup, all in one error, before any of your files is imported.

It deliberately does **not** know about HTTP, routing, validation, OpenAPI, databases or logging. Anything of that sort belongs to your application, usually as a wrapper or as code that reads the container. Its only runtime dependency is `ts-morph`.

## The three kinds

| Marker | What the function returns | May depend on |
| --- | --- | --- |
| `@Config` | anything: settings, a client, a logger; or a promise of it, which startup waits for | `@Config` |
| `@Wrapper` | a function that takes an action and returns the action to use instead | `@Config` |
| `@Action` | an async function `(ctx, input) => result` | `@Config`, `@Action` |

Any other dependency, and any circular one, stops startup. Configs are created first, then wrappers, then actions.

## Example

Configs. Each is called once, and its result is passed to whoever asks for its type. `loadSettings` is asynchronous: it is declared `Promise<Settings>`, so its component is `Settings`, startup waits for it, and `makeGreet` below receives the finished settings, not a promise.

```ts
// src/config.ts
export type Settings = { greeting: string };
export type Logger = (line: string) => void;

/** @Config */
export async function loadSettings(): Promise<Settings> {
  // Stands in for something slow: a secret read from a remote service, a connection that has to be opened first.
  await new Promise((resolve) => setTimeout(resolve, 10));
  return { greeting: "Hello" };
}

/** @Config */
export function makeLogger(): Logger {
  return (line) => console.log(line);
}
```

Actions. Each use case has its own file, and the files of one business area share a folder (see [One use case per file](#one-use-case-per-file)). `GreetAll` asks for `Greet` simply by naming its type.

```ts
// src/usecase/greet/greet.ts
import type { ActionHandler } from "skeleto";
import type { Settings } from "../../config.js";

export type Greet = ActionHandler<string, string>;

/** @Action */
export function makeGreet(settings: Settings): Greet {
  return async (ctx, name) => `${settings.greeting}, ${name}!`;
}
```

`GreetAll` also carries two **additional markers**, `@Transaction` and `@Audit`: Skeleto gives them no meaning, it only records them, with their data, for wrappers and for your own code to read.

```ts
// src/usecase/greet/greet_all.ts
import type { ActionHandler } from "skeleto";
import type { Greet } from "./greet.js";

export type GreetAll = ActionHandler<string[], string[]>;

/**
 * Greets several people in one go.
 *
 * @Action
 * @Transaction
 * @Audit {"level": "info"}
 */
export function makeGreetAll(greet: Greet): GreetAll {
  return async (ctx, names) => {
    const greetings: string[] = [];
    for (const name of names) greetings.push(await greet(ctx, name));
    return greetings;
  };
}
```

Wrappers. **Every** wrapper is offered **every** action, together with the action's metadata. A wrapper that returns the handler it was given leaves that action alone. The wrapper with the larger `ordinal` ends up further outside; without one the `ordinal` is `0`, and wrappers with equal ordinals are layered by name, the later name outside.

```ts
// src/wrappers.ts
import type { WrapperHandler } from "skeleto";
import type { Logger } from "./config.js";

export type LogWrapper = WrapperHandler;
export type TransactionWrapper = WrapperHandler;

/** @Wrapper {"ordinal": 10} */
export function makeLogWrapper(log: Logger): LogWrapper {
  return (handler, metadata) => async (ctx, input) => {
    log(`enter ${metadata.name}`);
    try {
      return await handler(ctx, input);
    } finally {
      log(`leave ${metadata.name}`);
    }
  };
}

/** @Wrapper */
export function makeTransactionWrapper(log: Logger): TransactionWrapper {
  return (handler, metadata) => {
    // Only actions marked @Transaction get this layer.
    if (!metadata.additionalDecorators.some((marker) => marker.name === "Transaction")) return handler;
    return async (ctx, input) => {
      log("begin");
      const result = await handler(ctx, input);
      log("commit");
      return result;
    };
  };
}
```

Starting it and reading the container. `decorators` lists the additional markers you allow, so that a typo such as `@Transction` stops startup instead of silently doing nothing; leave it out and every additional marker is accepted.

```ts
// main.ts
import { Skeleto, newContext } from "skeleto";
import type { ActionHandler } from "skeleto";

const skeleto = await Skeleto.start("src", { decorators: ["Transaction", "Audit"] });
const container = skeleto.getContainer();

const greetAll: ActionHandler<string[], string[]> = container.get("GreetAll")!.getInstance();
console.log(await greetAll(newContext(), ["Ada", "Linus"]));

for (const [name, component] of container) {
  const { mainDecorator, dependencies, additionalDecorators } = component.getMetadata();
  console.log(`${name}: @${mainDecorator.name}`, JSON.stringify({ dependencies, additionalDecorators }));
}
```

```sh
npx tsx main.ts
```

```text
enter GreetAll
begin
enter Greet
leave Greet
enter Greet
leave Greet
commit
leave GreetAll
[ 'Hello, Ada!', 'Hello, Linus!' ]
Settings: @Config {"dependencies":[],"additionalDecorators":[]}
Logger: @Config {"dependencies":[],"additionalDecorators":[]}
LogWrapper: @Wrapper {"dependencies":["Logger"],"additionalDecorators":[]}
TransactionWrapper: @Wrapper {"dependencies":["Logger"],"additionalDecorators":[]}
Greet: @Action {"dependencies":["Settings"],"additionalDecorators":[]}
GreetAll: @Action {"dependencies":["Greet"],"additionalDecorators":[{"name":"Transaction"},{"name":"Audit","data":{"level":"info"}}]}
```

The output shows the layering: `LogWrapper` (ordinal 10) is outside `TransactionWrapper` (ordinal 0), `Greet` was left alone by the transaction wrapper, and the `Greet` that `GreetAll` received is the wrapped one.

## One use case per file

This is a recommendation for the applications you build. Skeleto does not check it.

A **use case** is an `@Action` that stands for one business operation of your application. Put each use case in its own file, named after it, and group the files of one entity or business area in a folder:

- `usecase/user/user_create.ts`
- `usecase/user/user_get.ts`
- `usecase/user/user_list.ts`
- `usecase/user/user_update.ts`
- `usecase/user/user_delete.ts`
- `usecase/user/user_reset_password.ts`

Do this for simple create, read, update and delete operations too. Nobody can say where "simple" ends and "complex" begins, so a rule with no exceptions is applied the same way by everyone, and a use case that grows never has to be moved to a file of its own.

Gateways (actions that reach a database or another service), wrappers and configs may be grouped: all the gateways of one technology can live in one file, for example.

The scan ignores file names and folders, so nothing breaks if you lay your files out differently. What the framework does enforce keeps use case names unique: two functions may not return the same type name.

## Rules worth knowing

- A component must be an exported top-level `function` declaration with a return type annotation, and every parameter needs a type annotation. Arrow functions and methods are not picked up. A marked function that is a default export is a mistake, not something skipped: only a named `export` counts, and startup says so.
- One component per type name. To offer two things of the same shape, give each its own type alias, as `LogWrapper` and `TransactionWrapper` do above.
- A marker starts its line inside the JSDoc block. Text after it is its data: JSON when it starts with `{`, otherwise plain text. `@Config` and `@Action` take no data; `@Wrapper` takes none or `{"ordinal": <integer>}`. Any tag that starts with a lowercase letter (`@param`, `@returns`, `@example`, ...) is a standard JSDoc tag and is ignored.
- **Where markers go.** Write the description first, then the markers, one per line, with nothing after a marker but its data. Data runs on to the next marker, so a sentence written after a marker becomes that marker's data: after `@Action` that stops startup (it takes no data), and after an additional marker such as `@Audit` it silently becomes the data of that marker. For the same reason a line inside an `@example` body that starts with a main marker is read as a real marker and turns that function into a component; do not begin an example line with `@Config`, `@Wrapper` or `@Action`.
- Pass `decorators` to catch markers that are misspelt or misplaced. Without it, a function with no main marker is not looked at, so a wrapper marked `@Wraper` is skipped and every action runs without it. With it, these stop startup, each naming the function or constant, its file and the marker:
  - a top-level function whose JSDoc block has markers but no main marker (`@Wraper`, `@Actions`, or only `@Transaction`);
  - a lowercase tag on any top-level function that equals a main marker or one of your markers when letter case is ignored (`@transaction`, `@action`, `@wrapper`);
  - a main marker on an exported top-level constant or on a function inside a namespace: only top-level function declarations can be components.
- `Skeleto.start(directory)` defaults to `"src"` and gives one instance per directory: a second call for the same directory returns the first instance, and its options are ignored. A failed start is not remembered.
- **Retrying a failed start.** A failed start does not undo what it already did: configs created before the failure stay alive, and their connections stay open. The next `Skeleto.start` scans again and creates those configs again. A loop that retries `start` can therefore leak connections; give a config that opens something a way to be closed, or restart the process instead of retrying.
- **Type names are matched exactly as written.** `Map<string,number>` and `Map<string, number>` are two different names, so a dependency spelt one way does not find a component spelt the other way; it is reported as a missing dependency. Copy the spelling, or give the type an alias and use that.
- The container holds every component, configs and wrappers included, under its type name.

## Asynchronous configs

Some things are usable only after an asynchronous start: a database connection, a cache client, a secret kept elsewhere. Write such a config with the return type `Promise<X>`, as `loadSettings` does above:

- Its component is `X`. Whoever needs it names the plain type `X` and receives the finished value; nobody gets a promise. The container lists it under `X` as well, with the finished value as its instance.
- Startup waits for it before it creates anything that depends on it. It is still called once only, however many components need it, and they all receive the same instance. Configs are waited for one after another, not side by side.
- A config that fails (its promise is rejected) stops startup, exactly as a config that throws does: the error names the component and its function and carries the original error as its `cause`. Nothing after it is created.
- **Startup sets no time limit.** It waits for as long as the config does, so a config that never finishes keeps `Skeleto.start` pending for ever. Give the config its own timeout, usually the connect timeout of the client it creates.
- Only a `@Config` may be asynchronous. A `@Wrapper` or an `@Action` whose return type is `Promise<...>` is a mistake, reported at startup with the others. (An action's *handler* is asynchronous as always; the function that creates it is not.)
- The rule goes by what is written, like every other: only a return type spelled `Promise<...>` counts. A config declared with an alias of a promise, or `PromiseLike<X>`, keeps that name and its result is stored as it is.
- `X` and `Promise<X>` are the same name, so two configs returning them are two functions returning the same type.

## Files the scan leaves out

Without further word, the scan skips what `DEFAULT_EXCLUDE` lists:

| Entry | What it leaves out |
| --- | --- |
| `node_modules` | every folder of that name, with all it holds |
| `*.d.ts` | declaration files, whose functions have no body to call |
| `*.test.ts` | test files |
| `*.spec.ts` | test files |

The `exclude` option **replaces** that list; it is not added to it. Import `DEFAULT_EXCLUDE` from `skeleto` to keep the defaults and add your own, as in `Skeleto.start("src", { exclude: [...DEFAULT_EXCLUDE, "generated"] })`. Pass `exclude: []` to scan everything.

An entry takes one of two forms:

- **A name**, such as `generated` or `legacy.ts`: a folder or a file of exactly that name, at any depth. An excluded folder is not entered at all.
- **`*` and an ending**, such as `*.gen.ts`: every file whose name ends that way. It never matches a folder.

Names are compared exactly, upper and lower case included, and only below the directory you start: that directory itself is always scanned, even when its own path contains an excluded name, as in `Skeleto.start("node_modules/some-package/src")`.

Anything else is a mistake that stops startup like the others, naming the entry: a path (`generated/models`), a `*` that is not the first character (`foo*`, `*.test.*`, `**/x`), a lone `*`, and an empty string. Full glob syntax is not supported.

A directory in which every `.ts` file is excluded is reported like a directory without `.ts` files.

## Runtime

Skeleto imports your `.ts` files as they are; it does not compile them. The application therefore has to run under something that can load TypeScript, such as [`tsx`](https://tsx.is), in development and in production alike. Pointing Skeleto at compiled `.js` output does not work: it looks for `.ts` files only.

Node keeps a module that failed to load for as long as the process lives, so after fixing a file that threw while being imported, restart the process instead of calling `start` again.
