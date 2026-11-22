import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";
import { DEFAULT_EXCLUDE, FuncInstanceMetadata, Skeleto, newContext } from "../src/index.js";
import type { SkeletoOptions } from "../src/index.js";
import { withFixture } from "./fixture.js";

type Kind = "Config" | "Wrapper" | "Action" | "UseCase" | "Gateway";
type Shared = { calls: [string, unknown[]][]; raw: Record<string, unknown>; seen: [string, unknown][]; fail?: boolean };

// Fixture files are real modules, so the only way they can report back to a test is a global.
const shared = globalThis as unknown as { skeletoTest: Shared };
const S = "(globalThis as any).skeletoTest";

function reset(): Shared {
  shared.skeletoTest = { calls: [], raw: {}, seen: [] };
  return shared.skeletoTest;
}

/**
 * Source of one component. It records its call and its arguments, then returns `result` (an expression that may use `p0`, `p1`, ...).
 * By default a config is its own name, an action is a handler that adds its name to `ctx.data.trace`, and a wrapper adds a layer
 * that does the same before it calls the handler it wraps.
 */
function component(kind: Kind, name: string, dependencies: string[] = [], result?: string, marker: string = `@${kind}`): string {
  const parameters = dependencies.map((dependency, index) => `p${index}: ${dependency}`).join(", ");
  const defaults: Record<Kind, string> = {
    Config: `"${name}"`,
    Action: `async (ctx: any) => { ctx.data.trace.push("${name}"); return "${name}"; }`,
    UseCase: `async (ctx: any) => { ctx.data.trace.push("${name}"); return "${name}"; }`,
    Gateway: `async (ctx: any) => { ctx.data.trace.push("${name}"); return "${name}"; }`,
    Wrapper: `(handler: any, metadata: any) => { ${S}.seen.push(["${name}", metadata]); return async (ctx: any, request: any) => { ctx.data.trace.push("${name}"); return handler(ctx, request); }; }`,
  };
  const call = `${S}.calls.push(["${name}", [${dependencies.map((_, index) => `p${index}`).join(", ")}]]);`;
  return `/** ${marker} */\nexport function make${name.replace(/\W/g, "")}(${parameters}): ${name} {\n  ${call}\n  const made: any = ${result ?? defaults[kind]};\n  ${S}.raw["${name}"] = made;\n  return made;\n}\n`;
}

/**
 * Source of a config declared `Promise<name>`. It records its call, lets `delay` milliseconds pass, records `<name> ready` and then
 * gives `result`, an expression evaluated after the delay: one that throws makes the config fail late, as a refused connection would.
 */
function asyncConfig(name: string, dependencies: string[] = [], result: string = `{ id: "${name}" }`, delay: number = 25): string {
  const parameters = dependencies.map((dependency, index) => `p${index}: ${dependency}`).join(", ");
  const call = `${S}.calls.push(["${name}", [${dependencies.map((_, index) => `p${index}`).join(", ")}]]);`;
  const wait = `await new Promise((resolve) => setTimeout(resolve, ${delay}));`;
  const ready = `${S}.raw["${name}"] = made;\n  ${S}.calls.push(["${name} ready", []]);`;
  return `/** @Config */\nexport async function make${name}(${parameters}): Promise<${name}> {\n  ${call}\n  ${wait}\n  const made: any = ${result};\n  ${ready}\n  return made;\n}\n`;
}

async function failure(files: Record<string, string>, options?: SkeletoOptions): Promise<Error> {
  reset();
  return withFixture(files, async (directory) => {
    const error = await Skeleto.start(directory, options).then(
      () => assert.fail("startup should have failed"),
      (reason: unknown) => reason,
    );
    assert.ok(error instanceof Error);
    return error;
  });
}

/** The lines of a check error, without its header line. */
function problems(error: Error): string[] {
  const [header, ...lines] = error.message.split("\n");
  assert.match(header ?? "", new RegExp(`${lines.length} problem\\(s\\)`));
  return lines;
}

async function trace(handler: (ctx: any, request: any) => Promise<unknown>): Promise<string[]> {
  const ctx = newContext();
  ctx.data.trace = [];
  await handler(ctx, {});
  return ctx.data.trace;
}

// ---- checks before any import (4.6, 4.8) ----

const VIOLATIONS: [Kind, Kind, string][] = [
  ["Config", "Action", "@Config only"],
  ["Config", "Wrapper", "@Config only"],
  ["Wrapper", "Action", "@Config only"],
  ["Wrapper", "Wrapper", "@Config only"],
  ["Action", "Wrapper", "@Config, @Gateway, @UseCase and @Action only"],
  ["UseCase", "Config", "@Gateway only"],
  ["UseCase", "UseCase", "@Gateway only"],
  ["UseCase", "Action", "@Gateway only"],
  ["UseCase", "Wrapper", "@Gateway only"],
  ["Gateway", "Gateway", "@Config only"],
  ["Gateway", "UseCase", "@Config only"],
  ["Gateway", "Action", "@Config only"],
  ["Gateway", "Wrapper", "@Config only"],
];

for (const [kind, dependencyKind, allowed] of VIOLATIONS) {
  test(`a ${kind} that needs a ${dependencyKind} is a mistake naming both components`, async () => {
    const error = await failure({ "a.ts": component(kind, "Needy", ["Needed"]) + component(dependencyKind, "Needed") });
    const lines = problems(error);
    assert.equal(lines.length, 1, error.message);
    assert.match(lines[0] ?? "", new RegExp(`^- Needy: is a @${kind} and depends on Needed, which is a @${dependencyKind}`));
    assert.ok(lines[0]?.endsWith(allowed), lines[0]);
    assert.deepEqual(shared.skeletoTest.calls, []);
  });
}

test("a use case that depends on a use case, and a gateway that depends on a use case, stop startup before any import, together with another mistake", async () => {
  const boom = `throw new Error("module was imported");\n`;
  const error = await failure({
    "a.ts": boom + component("UseCase", "Transfer", ["Count"]) + component("UseCase", "Count") + component("Gateway", "Notify", ["Count"]) + component("Action", "Other", ["Nowhere"]),
  });
  const lines = problems(error);
  assert.equal(lines.length, 3, error.message);
  assert.ok(lines.includes("- Transfer: is a @UseCase and depends on Count, which is a @UseCase; a @UseCase may depend on @Gateway only"), error.message);
  assert.ok(lines.includes("- Notify: is a @Gateway and depends on Count, which is a @UseCase; a @Gateway may depend on @Config only"), error.message);
  assert.ok(lines.some((line) => /Other: dependency Nowhere is not a known component/.test(line)));
  assert.doesNotMatch(error.message, /module was imported/);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("a function marked @UseCase alone, or @Gateway alone, is a component that starts like an action", async () => {
  const state = reset();
  const files = { "a.ts": component("Gateway", "Store") + component("UseCase", "Transfer", ["Store"], `async (ctx: any, request: any) => p0(ctx, request)`) };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()].sort(), ["Store", "Transfer"]);
    assert.equal(container.get("Store")?.getInstance(), state.raw["Store"]);
    assert.deepEqual(await trace(container.get("Transfer")?.getInstance()), ["Store"]);
  });
});

test("a plain @Action may depend on a config, a use case, a gateway and another action; a use case depends on gateways only and a gateway on configs only", async () => {
  reset();
  const files = {
    "a.ts": component("Config", "Base") + component("Gateway", "Store", ["Base"]) + component("Gateway", "Cache", ["Base"]),
    "b.ts": component("UseCase", "Transfer", ["Cache", "Store"]) + component("Action", "Report", ["Transfer", "Store", "Helper", "Base"]) + component("Action", "Helper"),
  };
  await withFixture(files, async (directory) => {
    assert.equal((await Skeleto.start(directory)).getContainer().size, 6);
  });
});

test("a use case that depends on a config, and a gateway that depends on another gateway, stop startup before any import, together with another mistake", async () => {
  const boom = `throw new Error("module was imported");\n`;
  const error = await failure({
    "a.ts": boom + component("Config", "Settings") + component("UseCase", "Transfer", ["Settings"]) + component("Gateway", "Store") + component("Gateway", "Cache", ["Store"]) + component("Action", "Other", ["Nowhere"]),
  });
  const lines = problems(error);
  assert.equal(lines.length, 3, error.message);
  assert.ok(lines.includes("- Transfer: is a @UseCase and depends on Settings, which is a @Config; a @UseCase may depend on @Gateway only"), error.message);
  assert.ok(lines.includes("- Cache: is a @Gateway and depends on Store, which is a @Gateway; a @Gateway may depend on @Config only"), error.message);
  assert.ok(lines.some((line) => /Other: dependency Nowhere is not a known component/.test(line)));
  assert.doesNotMatch(error.message, /module was imported/);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("a use case or a gateway that depends on a plain @Action stops startup, naming both", async () => {
  const error = await failure({ "a.ts": component("Action", "Plain") + component("UseCase", "Transfer", ["Plain"]) + component("Gateway", "Store", ["Plain"]) });
  const lines = problems(error);
  assert.equal(lines.length, 2, error.message);
  assert.ok(lines.some((line) => /Transfer: is a @UseCase and depends on Plain, which is a @Action/.test(line)), error.message);
  assert.ok(lines.some((line) => /Store: is a @Gateway and depends on Plain, which is a @Action/.test(line)), error.message);
});

test("a function with two of @Action, @UseCase and @Gateway is a mistake naming it, reported with the others", async () => {
  const cases: [string, string][] = [
    ["@Action\n * @UseCase", "@Action, @UseCase"],
    ["@UseCase\n * @Gateway", "@UseCase, @Gateway"],
    ["@Gateway\n * @Action", "@Gateway, @Action"],
  ];
  for (const [marker, written] of cases) {
    const error = await failure({ "a.ts": component("UseCase", "Doubled", [], undefined, marker) + component("Action", "Other", ["Nowhere"]) });
    const lines = problems(error);
    assert.equal(lines.length, 2, error.message);
    assert.ok(lines.some((line) => line.includes("Doubled") && line.includes(`more than one main marker (${written})`)), error.message);
    assert.ok(lines.some((line) => line.includes("Other: dependency Nowhere")), error.message);
  }
});

test("a use case or a gateway that returns a promise, or a result that is not a function, is a mistake like a plain action", async () => {
  const promised = await failure({ "a.ts": `/** @UseCase */\nexport async function makeLate(): Promise<Late> { return null as any; }\n` + component("Gateway", "Store", [], "undefined") });
  assert.match(promised.message, /makeLate .*is marked @UseCase but returns Promise<Late>/);
  const state = reset();
  await withFixture({ "a.ts": component("Gateway", "Store", [], "undefined") }, async (directory) => {
    await assert.rejects(Skeleto.start(directory), /Store: function makeStore .* returned undefined; a @Gateway must return a function/);
  });
  assert.ok(state.calls.length > 0);
});

test("every allowed kind of dependency starts", async () => {
  reset();
  const files = {
    "a.ts": component("Config", "Base") + component("Config", "OnConfig", ["Base"]) + component("Wrapper", "Wrap", ["Base"]),
    "b.ts": component("Action", "First", ["Base"]) + component("Action", "Second", ["First", "OnConfig"]),
  };
  await withFixture(files, async (directory) => {
    assert.equal((await Skeleto.start(directory)).getContainer().size, 5);
  });
});

test("a missing dependency is a mistake naming the component and the dependency, once", async () => {
  const error = await failure({ "a.ts": component("Action", "SaveUser", ["Database"]) });
  assert.deepEqual(problems(error), ["- SaveUser: dependency Database is not a known component"]);
});

test("a missing dependency named in two parameters gets one line, and two functions missing the same one get one line each", async () => {
  const error = await failure({ "a.ts": component("Action", "SaveUser", ["Database", "Database"]) + component("Action", "FindUser", ["Database"]) });
  assert.deepEqual(problems(error), ["- SaveUser: dependency Database is not a known component", "- FindUser: dependency Database is not a known component"]);
});

test("a cycle is a mistake whose message shows its path", async () => {
  const error = await failure({ "a.ts": component("Action", "A", ["B"]) + component("Action", "B", ["C"]) + component("Action", "C", ["A"]) });
  const lines = problems(error);
  assert.equal(lines.length, 1, error.message);
  assert.match(lines[0] ?? "", /circular dependency: A -> B -> C -> A/);
});

test("a component that needs itself is a cycle", async () => {
  const error = await failure({ "a.ts": component("Config", "Self", ["Self"]) });
  assert.match(error.message, /circular dependency: Self -> Self/);
});

test("all mistakes are thrown as one error before any application file is imported", async () => {
  const boom = `throw new Error("module was imported");\n`;
  const error = await failure({
    "a.ts": boom + `/** @Action */\nfunction makeHidden(): Hidden { return null as any; }\n`,
    "b.ts": boom + component("Config", "Settings", ["SaveUser"]) + component("Action", "SaveUser", ["Nowhere"]),
  });
  assert.doesNotMatch(error.message, /module was imported/);
  assert.equal(error.cause, undefined);
  const lines = problems(error);
  assert.equal(lines.length, 3, error.message);
  assert.match(lines[0] ?? "", /makeHidden \(a\.ts\): .*not exported/);
  assert.match(lines[1] ?? "", /Settings: is a @Config and depends on SaveUser, which is a @Action/);
  assert.match(lines[2] ?? "", /SaveUser: dependency Nowhere is not a known component/);
});

test("a marker outside options.decorators stops startup, and without the option any marker is accepted", async () => {
  const files = { "a.ts": component("Action", "SaveUser", [], undefined, "@Action\n * @Transction") };
  const error = await failure(files, { decorators: ["Transaction"] });
  assert.match(error.message, /makeSaveUser.*@Transction is not an allowed marker/);
  await withFixture(files, async (directory) => {
    const metadata = (await Skeleto.start(directory)).getContainer().get("SaveUser")?.getMetadata();
    assert.deepEqual(metadata?.additionalDecorators, [{ name: "Transction", data: undefined }]);
  });
});

test("with options.decorators, misspelt and misplaced markers stop startup in one error with the other mistakes, before any import; without it the same files start", async () => {
  const boom = `throw new Error("module was imported");\n`;
  const flagged = `${S}.calls.push("imported");\n`;
  const files = {
    // The wrapper that would silently be missing from every action.
    "a.ts": `/** @Wraper */\nexport function makeAudit(): Audit { return ((handler: any) => handler) as any; }\n`,
    "b.ts": `/** @Action */\nexport const makeLost = (): Lost => null as any;\nexport namespace inner {\n  /** @Wrapper */\n  export function makeDeep(): Deep { return null as any; }\n}\n`,
    "c.ts": flagged + component("Action", "SaveUser", [], undefined, "@Action\n * @transaction"),
    "d.ts": `/** @wrapper */\nexport function makeTrace(): Trace { return null as any; }\n`,
  };
  const error = await failure({ ...files, "e.ts": boom + component("Action", "Other", ["Nowhere"]) }, { decorators: ["Transaction"] });
  assert.doesNotMatch(error.message, /module was imported/);
  assert.deepEqual(shared.skeletoTest.calls, []);
  const lines = problems(error);
  assert.equal(lines.length, 6, error.message);
  assert.match(lines[0] ?? "", /makeAudit \(a\.ts\): .*@Wraper.*no main marker/);
  assert.match(lines[1] ?? "", /makeLost \(b\.ts\): is marked @Action .*only top-level function declarations can be components/);
  assert.match(lines[2] ?? "", /makeDeep \(b\.ts\): is marked @Wrapper .*namespace inner.*only top-level function declarations can be components/);
  assert.match(lines[3] ?? "", /makeSaveUser \(c\.ts\): .*@transaction.*write @Transaction/);
  assert.match(lines[4] ?? "", /makeTrace \(d\.ts\): .*@wrapper.*write @Wrapper/);
  assert.match(lines[5] ?? "", /Other: dependency Nowhere is not a known component/);

  reset();
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()], ["SaveUser"]);
    assert.deepEqual(container.get("SaveUser")?.getMetadata().additionalDecorators, []);
  });
});

const notLists: [string, unknown, string][] = [
  ["a text", "Logging", "'Logging'"],
  ["null", null, "null"],
  ["a number", 7, "7"],
  ["a list holding something that is not text", ["Logging", 7], "[ 'Logging', 7 ]"],
];
for (const option of ["decorators", "exclude"] as const) {
  for (const [label, value, shown] of notLists) {
    test(`options.${option} given as ${label} stops startup naming the option, with the other mistakes and before any import`, async () => {
      const boom = `throw new Error("module was imported");\n`;
      const files = { "a.ts": boom + component("Action", "SaveUser", ["Nowhere"], undefined, "@Action\n * @Logging"), "b.test.ts": boom + component("Config", "Skipped", ["Nowhere"]) };
      const error = await failure(files, { [option]: value } as SkeletoOptions);
      assert.doesNotMatch(error.message, /module was imported/);
      assert.equal(error.cause, undefined);
      // The bad option counts as left out: @Logging is accepted and the default exclusions still keep b.test.ts out.
      assert.deepEqual(problems(error), [`- options.${option}: must be a list of texts, received ${shown}`, "- SaveUser: dependency Nowhere is not a known component"]);
      assert.deepEqual(shared.skeletoTest.calls, []);
    });
  }
}

test("both options given wrongly are reported together, also when nothing else is wrong", async () => {
  const error = await failure({ "a.ts": component("Config", "Settings") }, { decorators: 7, exclude: "node_modules" } as unknown as SkeletoOptions);
  assert.deepEqual(problems(error), ["- options.decorators: must be a list of texts, received 7", "- options.exclude: must be a list of texts, received 'node_modules'"]);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("a bad option on a directory without components reports the directory as well", async () => {
  const error = await failure({ "notes.txt": "@Config" }, { exclude: null } as unknown as SkeletoOptions);
  const lines = problems(error);
  assert.equal(lines.length, 2, error.message);
  assert.equal(lines[0], "- options.exclude: must be a list of texts, received null");
  assert.match(lines[1] ?? "", /: no \.ts file with a @Config, @Wrapper, @Action, @UseCase or @Gateway function was found/);
});

test("with a text as options.decorators, a shorter marker name contained in that text is not accepted", async () => {
  const files = { "a.ts": component("Action", "SaveUser", [], undefined, "@Action\n * @Log") };
  const error = await failure(files, { decorators: "Logging" } as unknown as SkeletoOptions);
  assert.deepEqual(problems(error), ["- options.decorators: must be a list of texts, received 'Logging'"]);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("an option left out or passed as undefined behaves as no option: any marker is accepted and the default exclusions hold", async () => {
  const files = { "a.ts": component("Action", "SaveUser", [], undefined, "@Action\n * @Anything"), "b.test.ts": `throw new Error("module was imported");\n` + component("Config", "Skipped") };
  for (const options of [undefined, {}, { decorators: undefined, exclude: undefined }] as (SkeletoOptions | undefined)[]) {
    reset();
    await withFixture(files, async (directory) => {
      const container = (await Skeleto.start(directory, options)).getContainer();
      assert.deepEqual([...container.keys()], ["SaveUser"]);
      assert.deepEqual(container.get("SaveUser")?.getMetadata().additionalDecorators, [{ name: "Anything", data: undefined }]);
    });
  }
});

test("a directory without .ts files, without components, or that does not exist is a mistake naming the directory", async () => {
  const cases: Record<string, string>[] = [{}, { "notes.txt": "@Config" }, { "plain.ts": "export function helper(): number { return 1; }\n" }];
  for (const files of cases) {
    await withFixture(files, async (directory) => {
      await assert.rejects(Skeleto.start(directory), (error: Error) => error.message.includes(`${directory}: no .ts file`));
      await assert.rejects(Skeleto.start(join(directory, "missing")), (error: Error) => error.message.includes(`${join(directory, "missing")}: directory cannot be read`));
    });
  }
});

// ---- exclusions (4.2, 4.8) ----

const declared = `/** @Config */\nexport declare function makeDeclared(): Declared;\n`;
const traps = (): Record<string, string> => ({
  "types.d.ts": declared,
  "a.test.ts": component("Config", "FromTest"),
  "sub/a.spec.ts": component("Config", "FromSpec"),
  "node_modules/pkg/a.ts": component("Config", "FromModules"),
  "sub/node_modules/pkg/a.ts": component("Config", "FromNestedModules"),
});

test("without options.exclude the default list holds: only the normal file becomes a component, and the others are not imported", async () => {
  const state = reset();
  await withFixture({ ...traps(), "a.ts": component("Config", "Settings") }, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()], ["Settings"]);
    assert.deepEqual(state.calls.map(([name]) => name), ["Settings"]);
  });
});

test("an empty options.exclude scans everything, and a list of the defaults plus one entry leaves out both", async () => {
  const files: Record<string, string> = { ...traps(), "a.ts": component("Config", "Settings"), "generated/g.ts": component("Config", "Generated") };
  delete files["types.d.ts"];
  reset();
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory, { exclude: [] })).getContainer();
    assert.deepEqual([...container.keys()].sort(), ["FromModules", "FromNestedModules", "FromSpec", "FromTest", "Generated", "Settings"]);
  });
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory, { exclude: [...DEFAULT_EXCLUDE, "generated"] })).getContainer();
    assert.deepEqual([...container.keys()], ["Settings"]);
  });
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory, { exclude: ["generated"] })).getContainer();
    assert.deepEqual([...container.keys()].sort(), ["FromModules", "FromNestedModules", "FromSpec", "FromTest", "Settings"]);
  });
});

test("with an empty options.exclude a marked declaration in a .d.ts file is a component again, which is then reported as having no body", async () => {
  const error = await failure({ "types.d.ts": declared }, { exclude: [] });
  assert.match(error.message, /makeDeclared \(types\.d\.ts\): .*declare/);
});

for (const entry of ["generated/models", "foo*", "*.test.*", "**/x", "*", ""]) {
  test(`options.exclude with ${JSON.stringify(entry)} stops startup naming the entry, with the other mistakes and before any import`, async () => {
    const boom = `throw new Error("module was imported");\n`;
    const error = await failure({ "a.ts": boom + component("Action", "SaveUser", ["Nowhere"]), "b.ts": boom + component("Config", "Settings") }, { exclude: [...DEFAULT_EXCLUDE, entry] });
    assert.doesNotMatch(error.message, /module was imported/);
    assert.equal(error.cause, undefined);
    const lines = problems(error);
    assert.equal(lines.length, 2, error.message);
    assert.ok(lines[0]?.startsWith(`- exclude entry ${JSON.stringify(entry)}: `), lines[0]);
    assert.match(lines[1] ?? "", /SaveUser: dependency Nowhere is not a known component/);
    assert.deepEqual(shared.skeletoTest.calls, []);
  });
}

test("a bad exclusion stops a directory that is otherwise fine, and nothing is created", async () => {
  const error = await failure({ "a.ts": component("Config", "Settings") }, { exclude: ["src/generated"] });
  assert.deepEqual(problems(error).map((line) => line.split(":")[0]), ['- exclude entry "src/generated"']);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("the directory given is started even when its own path contains node_modules", async () => {
  reset();
  await withFixture({ "node_modules/app/src/a.ts": component("Config", "Settings"), "node_modules/app/src/node_modules/x.ts": component("Config", "Inner") }, async (directory) => {
    const container = (await Skeleto.start(join(directory, "node_modules/app/src"))).getContainer();
    assert.deepEqual([...container.keys()], ["Settings"]);
  });
});

test("a directory whose only .ts files are excluded is reported like a directory without .ts files", async () => {
  const empty = await failure({ "notes.txt": "@Config" });
  const excluded = await failure({ "a.test.ts": component("Config", "A"), "b.spec.ts": component("Config", "B"), "c.d.ts": declared, "node_modules/d.ts": component("Config", "D") });
  const shape = (error: Error): string => error.message.replace(/\S*skeleto-\w+/g, "<directory>");
  assert.match(excluded.message, /: no \.ts file with a @Config, @Wrapper, @Action, @UseCase or @Gateway function was found/);
  assert.equal(shape(excluded), shape(empty));
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("the default directory is src of the working directory", async () => {
  // The framework's own src holds no component, so the error shows which directory was scanned.
  await assert.rejects(Skeleto.start(), (error: Error) => error.message.includes(`${join(process.cwd(), "src")}: no .ts file`));
});

// ---- instantiation (4.7) ----

test("configs are created first, then wrappers, then actions, dependencies first, each once and with its dependencies in parameter order", async () => {
  const state = reset();
  const files = {
    // Sorted file order and source order are the opposite of the order that the dependencies need.
    "a.ts": component("Action", "Report", ["FindUser", "Database", "SaveUser"]) + component("Action", "SaveUser", ["Database", "Clock"]),
    "b.ts": component("Wrapper", "Audit", ["Database"]) + component("Action", "FindUser", ["Database"]),
    "c.ts": component("Config", "Database", ["Settings", "Clock"]) + component("Config", "Clock") + component("Config", "Settings"),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    const instance = (name: string): unknown => container.get(name)?.getInstance();
    assert.deepEqual(state.calls.map(([name]) => name), ["Settings", "Clock", "Database", "Audit", "FindUser", "SaveUser", "Report"]);
    const callsByName = new Map(state.calls);
    assert.deepEqual(callsByName.get("Database"), ["Settings", "Clock"]);
    assert.deepEqual(callsByName.get("Audit"), ["Database"]);
    assert.deepEqual(callsByName.get("SaveUser"), ["Database", "Clock"]);
    const reportArguments = callsByName.get("Report") ?? [];
    assert.equal(reportArguments.length, 3);
    assert.equal(reportArguments[0], instance("FindUser"));
    assert.equal(reportArguments[1], "Database");
    assert.equal(reportArguments[2], instance("SaveUser"));
  });
});

test("gateways are created before use cases, and use cases before plain actions, each after its dependencies and otherwise in scan order", async () => {
  const state = reset();
  const files = {
    // Written in the opposite order, so that scan order alone would give the wrong result.
    "a.ts": component("Action", "Plain") + component("UseCase", "Transfer", ["Cache"]) + component("UseCase", "Count", ["Store"]) + component("Gateway", "Store", ["Settings"]) + component("Gateway", "Cache", ["Settings"]),
    "b.ts": component("Config", "Settings") + component("Wrapper", "Wrap"),
  };
  await withFixture(files, async (directory) => {
    await Skeleto.start(directory);
    assert.deepEqual(state.calls.map(([name]) => name), ["Settings", "Wrap", "Cache", "Store", "Transfer", "Count", "Plain"]);
  });
});

test("the metadata of a use case and of a gateway tells the kind by its main marker, and a wrapper can read it", async () => {
  const state = reset();
  const files = { "a.ts": component("Wrapper", "Audit") + component("Gateway", "Store") + component("UseCase", "Transfer", ["Store"], undefined, "@UseCase\n * @Transaction") + component("Action", "Plain") };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(container.get("Store")?.getMetadata().mainDecorator, { name: "Gateway", data: undefined });
    assert.deepEqual(container.get("Transfer")?.getMetadata().mainDecorator, { name: "UseCase", data: undefined });
    assert.deepEqual(container.get("Transfer")?.getMetadata().additionalDecorators, [{ name: "Transaction", data: undefined }]);
    // The wrapper was offered each kind of action, and tells them apart without an additional marker.
    const offered = state.seen.map(([, metadata]) => [(metadata as any).name, (metadata as any).mainDecorator.name]);
    assert.deepEqual(offered, [["Store", "Gateway"], ["Transfer", "UseCase"], ["Plain", "Action"]]);
    // Every kind of action is wrapped, and what is injected is the wrapped one.
    assert.deepEqual(await trace(container.get("Store")?.getInstance()), ["Audit", "Store"]);
    assert.deepEqual(await trace(container.get("Transfer")?.getInstance()), ["Audit", "Transfer"]);
    assert.notEqual(container.get("Store")?.getInstance(), state.raw["Store"]);
    assert.equal(new Map(state.calls).get("Transfer")?.[0], container.get("Store")?.getInstance());
  });
});

test("the new main markers join the other checks of main markers: a lowercase near-marker and a misplaced one stop startup with options.decorators", async () => {
  const files = {
    "a.ts": component("UseCase", "Fine") + `/**\n * Counts.\n *\n * @usecase\n */\nexport function countThings(): Counted { return null as any; }\n`,
    "b.ts": `/** @Gateway */\nexport const makeLost = (): Lost => null as any;\n`,
  };
  const error = await failure(files, { decorators: ["Transaction"] });
  assert.match(error.message, /countThings \(a\.ts\): has the tag @usecase.*write @UseCase/);
  assert.match(error.message, /makeLost \(b\.ts\): is marked @Gateway .*only top-level function declarations can be components/);
});

test("every wrapper wraps every action and receives the action's metadata", async () => {
  const state = reset();
  const files = {
    "a.ts": component("Wrapper", "Audit") + component("Wrapper", "Timing"),
    "b.ts": component("Action", "FindUser", [], undefined, "@Action\n * @Logging {\"level\": \"debug\"}") + component("Action", "SaveUser", ["FindUser"]),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    const find = { name: "FindUser", dependencies: [], mainDecorator: { name: "Action", data: undefined }, additionalDecorators: [{ name: "Logging", data: { level: "debug" } }] };
    const save = { name: "SaveUser", dependencies: ["FindUser"], mainDecorator: { name: "Action", data: undefined }, additionalDecorators: [] };
    assert.deepEqual(state.seen, [["Audit", find], ["Timing", find], ["Audit", save], ["Timing", save]]);
    assert.deepEqual(await trace(container.get("FindUser")?.getInstance()), ["Timing", "Audit", "FindUser"]);
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["Timing", "Audit", "SaveUser"]);
    // Wrappers themselves and configs are never wrapped.
    assert.equal(container.get("Audit")?.getInstance(), state.raw["Audit"]);
  });
});

test("wrappers written in one file layer from the first written (innermost) to the last written (outermost), whatever their names", async () => {
  reset();
  const files = {
    "a.ts": component("Wrapper", "Zebra") + component("Wrapper", "apple") + component("Wrapper", "Middle"),
    "b.ts": component("Action", "SaveUser"),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["Middle", "apple", "Zebra", "SaveUser"]);
  });
});

test("wrappers in two files: those of the file first in path order are inside those of the later file", async () => {
  reset();
  const files = {
    "b.ts": component("Wrapper", "OuterOne") + component("Wrapper", "OuterTwo"),
    "a.ts": component("Wrapper", "InnerOne") + component("Wrapper", "InnerTwo"),
    "c.ts": component("Action", "SaveUser"),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["OuterTwo", "OuterOne", "InnerTwo", "InnerOne", "SaveUser"]);
  });
});

test("the layering follows the written order even when a wrapper is created later because of its dependency", async () => {
  reset();
  const files = {
    "a.ts": component("Wrapper", "First", ["Late"]) + component("Wrapper", "Second") + component("Config", "Late") + component("Action", "SaveUser"),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["Second", "First", "SaveUser"]);
  });
});

test("a wrapper that returns the handler unchanged adds no layer", async () => {
  const state = reset();
  const files = { "a.ts": component("Wrapper", "Skip", [], "(handler: any) => handler") + component("Action", "SaveUser") };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.equal(container.get("SaveUser")?.getInstance(), state.raw["SaveUser"]);
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["SaveUser"]);
  });
});

test("an action injected into another action is the wrapped version", async () => {
  const state = reset();
  const outer = `async (ctx: any, request: any) => { ctx.data.trace.push("Report"); return p0(ctx, request); }`;
  const files = { "a.ts": component("Wrapper", "Audit") + component("Action", "Report", ["FindUser"], outer) + component("Action", "FindUser") };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    const injected = new Map(state.calls).get("Report")?.[0];
    assert.equal(injected, container.get("FindUser")?.getInstance());
    assert.notEqual(injected, state.raw["FindUser"]);
    assert.deepEqual(await trace(container.get("Report")?.getInstance()), ["Audit", "Report", "Audit", "FindUser"]);
  });
});

// ---- container and instances (4.8) ----

test("the container holds every component of all kinds under its name, with instance and metadata", async () => {
  const state = reset();
  const files = {
    "config/log.ts": component("Config", "winston.Logger"),
    "wrap.ts": component("Wrapper", "Audit", ["winston.Logger"], "(handler: any) => handler"),
    "user/save.ts": component("Action", "SaveUser", ["winston.Logger"], undefined, "@Action\n * @Transaction"),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()].sort(), ["Audit", "SaveUser", "winston.Logger"]);
    for (const entry of container.values()) assert.ok(entry instanceof FuncInstanceMetadata);
    assert.equal(container.get("winston.Logger")?.getInstance(), "winston.Logger");
    assert.equal(container.get("Audit")?.getInstance(), state.raw["Audit"]);
    assert.equal(container.get("SaveUser")?.getInstance(), state.raw["SaveUser"]);
    assert.deepEqual(container.get("winston.Logger")?.getMetadata(), { name: "winston.Logger", dependencies: [], mainDecorator: { name: "Config", data: undefined }, additionalDecorators: [] });
    assert.deepEqual(container.get("Audit")?.getMetadata(), { name: "Audit", dependencies: ["winston.Logger"], mainDecorator: { name: "Wrapper", data: undefined }, additionalDecorators: [] });
    assert.deepEqual(container.get("SaveUser")?.getMetadata(), {
      name: "SaveUser",
      dependencies: ["winston.Logger"],
      mainDecorator: { name: "Action", data: undefined },
      additionalDecorators: [{ name: "Transaction", data: undefined }],
    });
  });
});

test("a directory has one instance, also for other spellings of its path, for concurrent calls and for later options", async () => {
  const state = reset();
  const files = { "a.ts": component("Config", "Settings") + component("Action", "SaveUser", ["Settings"]) };
  await withFixture(files, async (directory) => {
    await withFixture(files, async (otherDirectory) => {
      const spellings = [directory, `${directory}/`, join(directory, "sub", ".."), relative(process.cwd(), directory)];
      const concurrent = await Promise.all(spellings.map((spelling) => Skeleto.start(spelling)));
      for (const instance of concurrent) assert.equal(instance, concurrent[0]);
      assert.equal(state.calls.length, 2);
      assert.equal(await Skeleto.start(directory), concurrent[0]);
      assert.equal(await Skeleto.start(directory, { decorators: [] }), concurrent[0]);
      assert.equal(state.calls.length, 2);

      const other = await Skeleto.start(otherDirectory);
      assert.notEqual(other, concurrent[0]);
      assert.equal(state.calls.length, 4);
    });
  });
});

test("concurrent calls for a directory that fails all reject, and the next start scans again", async () => {
  reset();
  await withFixture({ "a.ts": component("Action", "SaveUser", ["Database"]) }, async (directory) => {
    const results = await Promise.allSettled([Skeleto.start(directory), Skeleto.start(directory)]);
    assert.deepEqual(results.map((result) => result.status), ["rejected", "rejected"]);
    await assert.rejects(Skeleto.start(directory), /SaveUser: dependency Database is not a known component/);

    await writeFile(join(directory, "b.ts"), component("Config", "Database"));
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()], ["Database", "SaveUser"]);
  });
});

// ---- failures after the checks (owner's decision Q2) ----

test("a component function that throws stops startup at once with an error naming component and function, and the next start scans again", async () => {
  const state = reset();
  state.fail = true;
  const breaking = `(() => { if (${S}.fail) throw new TypeError("no connection"); return "Database"; })()`;
  const files = {
    "a.ts": component("Config", "Clock") + component("Config", "Database", ["Clock"], breaking),
    "b.ts": component("Config", "Settings") + component("Action", "SaveUser", ["Database"]),
  };
  await withFixture(files, async (directory) => {
    const error: Error = await Skeleto.start(directory).then(() => assert.fail("startup should have failed"), (reason: Error) => reason);
    assert.ok(error.message.startsWith(`Database: function makeDatabase (${join(directory, "a.ts")}) failed while creating it: no connection`), error.message);
    assert.ok(error.cause instanceof TypeError);
    assert.equal((error.cause as Error).message, "no connection");
    // Nothing after the broken component was created.
    assert.deepEqual(state.calls.map(([name]) => name), ["Clock", "Database"]);

    state.fail = false;
    await writeFile(join(directory, "c.ts"), component("Action", "FindUser", ["Database"]));
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()].sort(), ["Clock", "Database", "FindUser", "SaveUser", "Settings"]);
  });
});

test("a file that fails to import stops startup at once with an error naming component and function, and the next start scans again", async () => {
  const state = reset();
  const files = {
    "a.ts": component("Config", "Clock"),
    "b.ts": `throw new RangeError("module broke");\n` + component("Config", "Database"),
    "c.ts": component("Action", "SaveUser", ["Clock"]),
  };
  await withFixture(files, async (directory) => {
    const error: Error = await Skeleto.start(directory).then(() => assert.fail("startup should have failed"), (reason: Error) => reason);
    assert.ok(error.message.startsWith(`Database: function makeDatabase (${join(directory, "b.ts")}) failed while importing its file: module broke`), error.message);
    assert.ok(error.cause instanceof RangeError);
    assert.deepEqual(state.calls.map(([name]) => name), ["Clock"]);

    await rm(join(directory, "b.ts"));
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()], ["Clock", "SaveUser"]);
  });
});

test("a wrapper that throws while wrapping stops startup with an error naming the action, its function and the wrapper", async () => {
  const error = await failure({ "a.ts": component("Wrapper", "Audit", [], `() => { throw new Error("cannot wrap"); }`) + component("Action", "SaveUser") });
  assert.match(error.message, /^SaveUser: function makeSaveUser \(.*a\.ts\) failed while wrapping it with Audit: cannot wrap$/);
  assert.equal((error.cause as Error).message, "cannot wrap");
});

test("a thrown value that is not an Error is still reported and kept as the cause", async () => {
  const error = await failure({ "a.ts": component("Config", "Settings", [], `(() => { throw "plain text"; })()`) });
  assert.match(error.message, /^Settings: function makeSettings .* failed while creating it: plain text$/);
  assert.equal(error.cause, "plain text");
});

// ---- actions and wrappers must yield a function (4.7) ----

/** Starts the directory expecting a failure, then makes the fixture behave (the flag) and proves that the next start scans again by adding a file. */
async function failsThenScansAgain(files: Record<string, string>, check: (error: Error, directory: string, state: Shared) => void): Promise<void> {
  const state = reset();
  state.fail = true;
  await withFixture(files, async (directory) => {
    const error: Error = await Skeleto.start(directory).then(() => assert.fail("startup should have failed"), (reason: Error) => reason);
    check(error, directory, state);
    state.fail = false;
    await writeFile(join(directory, "later.ts"), component("Action", "AddedLater"));
    const container = (await Skeleto.start(directory)).getContainer();
    assert.ok(container.has("AddedLater"));
    for (const [name, entry] of container) if (entry.getMetadata().mainDecorator.name !== "Config") assert.equal(typeof entry.getInstance(), "function", name);
  });
}

const handlerSource = `async (ctx: any) => { ctx.data.trace.push("SaveUser"); return "SaveUser"; }`;

for (const [written, described] of [["undefined", "undefined"], ["null", "null"], [`{ run() {} }`, "object"], [`"text"`, "string"], ["Promise.resolve(() => 1)", "a promise"]] as const) {
  test(`an action function that returns ${written} stops startup with an error naming the action and its function, and the next start scans again`, async () => {
    const files = { "a.ts": component("Wrapper", "Audit") + component("Action", "SaveUser", [], `${S}.fail ? ${written} : ${handlerSource}`) + component("Action", "Report", ["SaveUser"]) };
    await failsThenScansAgain(files, (error, directory, state) => {
      assert.equal(error.message, `SaveUser: function makeSaveUser (${join(directory, "a.ts")}) returned ${described}; a @Action must return a function`);
      // No wrapper was handed the bad result, and nothing that needs the action was created.
      assert.deepEqual(state.seen, []);
      assert.deepEqual(state.calls.map(([name]) => name), ["Audit", "SaveUser"]);
    });
  });

  test(`a wrapper function that returns ${written} stops startup with an error naming the wrapper and its function, not an action, and the next start scans again`, async () => {
    const good = `(handler: any) => handler`;
    const files = { "a.ts": component("Wrapper", "Audit", [], `${S}.fail ? ${written} : ${good}`) + component("Action", "SaveUser") };
    await failsThenScansAgain(files, (error, directory, state) => {
      assert.equal(error.message, `Audit: function makeAudit (${join(directory, "a.ts")}) returned ${described}; a @Wrapper must return a function`);
      assert.ok(!error.message.includes("SaveUser"), error.message);
      assert.deepEqual(state.calls.map(([name]) => name), ["Audit"]);
    });
  });

  test(`a wrapper that returns ${written} for an action stops startup with an error naming the wrapper, its function and the action, and the next start scans again`, async () => {
    const wrap = `(handler: any) => (${S}.fail ? ${written} : handler)`;
    const files = { "w.ts": component("Wrapper", "Audit", [], wrap), "a.ts": component("Action", "SaveUser") + component("Action", "Report", ["SaveUser"]) };
    await failsThenScansAgain(files, (error, directory, state) => {
      assert.equal(error.message, `Audit: function makeAudit (${join(directory, "w.ts")}) returned ${described} when wrapping SaveUser; a wrapper must return a function for every action`);
      assert.deepEqual(state.calls.map(([name]) => name), ["Audit", "SaveUser"]);
    });
  });
}

test("a wrapper that returns the handler only for actions with a certain marker stops startup naming the wrapper and the action without it", async () => {
  const wrap = `(handler: any, metadata: any) => { ${S}.seen.push(["Transactional", metadata.name]); if (metadata.additionalDecorators.some((marker: any) => marker.name === "Transaction")) return handler; }`;
  const files = {
    "w.ts": component("Wrapper", "Transactional", [], wrap) + component("Wrapper", "Outer"),
    "a.ts": component("Action", "FindUser", [], undefined, "@Action\n * @Transaction") + component("Action", "SaveUser", ["FindUser"]),
  };
  const error = await failure(files);
  assert.match(error.message, /^Transactional: function makeTransactional \(.*w\.ts\) returned undefined when wrapping SaveUser; a wrapper must return a function for every action$/);
  // The marked action passed; the unmarked one stopped at the faulty wrapper, before the wrapper outside it.
  assert.deepEqual(shared.skeletoTest.seen.map(([name, metadata]) => [name, (metadata as any).name ?? metadata]), [["Transactional", "FindUser"], ["Outer", "FindUser"], ["Transactional", "SaveUser"]]);
});

test("a wrapper that returns the handler unchanged and one that returns a new function work together", async () => {
  reset();
  const files = { "a.ts": component("Wrapper", "Skip", [], "(handler: any) => handler") + component("Wrapper", "Audit") + component("Action", "SaveUser") };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["Audit", "SaveUser"]);
  });
});

// ---- asynchronous configs (4.3, 4.7) ----

test("an async config is waited for: what depends on it is created after it has finished, and receives the finished value under the plain name", async () => {
  const state = reset();
  const files = {
    "a.ts": component("Action", "SaveUser", ["Database"]) + component("Wrapper", "Audit", ["Database"]) + component("Config", "Pool", ["Database"]),
    "b.ts": asyncConfig("Database", ["Settings"]) + component("Config", "Settings"),
  };
  await withFixture(files, async (directory) => {
    const started = Skeleto.start(directory);
    // While the config is still on its way nothing that needs it exists yet.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const container = (await started).getContainer();
    assert.deepEqual(state.calls.map(([name]) => name), ["Settings", "Database", "Database ready", "Pool", "Audit", "SaveUser"]);
    const database = state.raw["Database"];
    assert.deepEqual(database, { id: "Database" });
    const callsByName = new Map(state.calls);
    assert.deepEqual(callsByName.get("Database"), ["Settings"]);
    for (const dependant of ["Pool", "Audit", "SaveUser"]) {
      const received = callsByName.get(dependant) ?? [];
      assert.equal(received.length, 1);
      assert.equal(received[0], database, `${dependant} did not receive the finished value`);
      assert.ok(!(received[0] instanceof Promise));
    }
  });
});

test("startup is still pending while an async config has not finished", async () => {
  const state = reset();
  await withFixture({ "a.ts": asyncConfig("Database", [], undefined, 60) + component("Action", "SaveUser", ["Database"]) }, async (directory) => {
    let done = false;
    const started = Skeleto.start(directory).then((skeleto) => ((done = true), skeleto));
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(done, false);
    assert.deepEqual(state.calls.map(([name]) => name), ["Database"]);
    await started;
    assert.deepEqual(state.calls.map(([name]) => name), ["Database", "Database ready", "SaveUser"]);
  });
});

test("an async config needed by other configs, a wrapper and several actions is called once, and all receive the very same instance, which the container lists under the plain name", async () => {
  const state = reset();
  const files = {
    "a.ts": asyncConfig("Database") + component("Config", "Users", ["Database"]) + asyncConfig("Cache", ["Database", "Users"], undefined, 5),
    "b.ts": component("Wrapper", "Audit", ["Database"]) + component("Action", "FindUser", ["Database", "Cache"]) + component("Action", "SaveUser", ["FindUser", "Database"]),
  };
  await withFixture(files, async (directory) => {
    const [first, second] = await Promise.all([Skeleto.start(directory), Skeleto.start(directory)]);
    assert.equal(first, second);
    const container = first.getContainer();
    assert.equal(state.calls.filter(([name]) => name === "Database").length, 1);
    assert.equal(state.calls.filter(([name]) => name === "Database ready").length, 1);
    assert.deepEqual(state.calls.map(([name]) => name), ["Database", "Database ready", "Users", "Cache", "Cache ready", "Audit", "FindUser", "SaveUser"]);

    const database = state.raw["Database"];
    const callsByName = new Map(state.calls);
    assert.equal(callsByName.get("Users")?.[0], database);
    assert.equal(callsByName.get("Cache")?.[0], database);
    assert.equal(callsByName.get("Audit")?.[0], database);
    assert.equal(callsByName.get("FindUser")?.[0], database);
    assert.equal(callsByName.get("SaveUser")?.[1], database);
    // An async config that itself needs an async config gets the finished value too, and is finished in its turn.
    assert.equal(callsByName.get("FindUser")?.[1], state.raw["Cache"]);
    assert.deepEqual(state.raw["Cache"], { id: "Cache" });

    assert.deepEqual([...container.keys()].sort(), ["Audit", "Cache", "Database", "FindUser", "SaveUser", "Users"]);
    assert.equal(container.get("Database")?.getInstance(), database);
    assert.ok(!(container.get("Database")?.getInstance() instanceof Promise));
    assert.equal(container.get("Cache")?.getInstance(), state.raw["Cache"]);
    assert.deepEqual(container.get("Database")?.getMetadata(), { name: "Database", dependencies: [], mainDecorator: { name: "Config", data: undefined }, additionalDecorators: [] });
    assert.deepEqual(container.get("FindUser")?.getMetadata().dependencies, ["Database", "Cache"]);
    assert.equal(container.get("Promise<Database>"), undefined);
  });
});

test("a config declared Promise<X> that returns a plain value, or is not written with async, gives that value", async () => {
  const state = reset();
  const plain = `/** @Config */\nexport function makeClock(): Promise<Clock> {\n  return "tick" as any;\n}\n`;
  const thenable = `/** @Config */\nexport function makeDatabase(): Promise<Database> {\n  return new Promise((resolve) => setTimeout(() => resolve("db" as any), 10));\n}\n`;
  await withFixture({ "a.ts": plain + thenable + component("Action", "SaveUser", ["Clock", "Database"]) }, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.equal(container.get("Clock")?.getInstance(), "tick");
    assert.equal(container.get("Database")?.getInstance(), "db");
    assert.deepEqual(new Map(state.calls).get("SaveUser"), ["tick", "db"]);
  });
});

test("only the written Promise<X> is waited for: a config declared with an alias of a promise keeps its name and its promise", async () => {
  reset();
  const alias = `export type Pending = Promise<string>;\n/** @Config */\nexport function makePending(): Pending {\n  return Promise.resolve("later");\n}\n`;
  await withFixture({ "a.ts": alias }, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()], ["Pending"]);
    const instance: unknown = container.get("Pending")?.getInstance();
    assert.ok(instance instanceof Promise);
    assert.equal(await instance, "later");
  });
});

test("an async config that fails stops startup with an error naming component and function and carrying the cause, creates nothing later, and the next start scans again", async () => {
  const state = reset();
  state.fail = true;
  const breaking = `(() => { if (${S}.fail) throw new TypeError("no connection"); return { id: "Database" }; })()`;
  const files = {
    "a.ts": component("Config", "Clock") + asyncConfig("Database", ["Clock"], breaking),
    "b.ts": component("Config", "Settings", ["Database"]) + component("Wrapper", "Audit") + component("Action", "SaveUser", ["Database"]),
  };
  await withFixture(files, async (directory) => {
    const error: Error = await Skeleto.start(directory).then(() => assert.fail("startup should have failed"), (reason: Error) => reason);
    assert.equal(error.message, `Database: function makeDatabase (${join(directory, "a.ts")}) failed while waiting for it: no connection`);
    assert.ok(error.cause instanceof TypeError);
    assert.equal((error.cause as Error).message, "no connection");
    // Nothing after the broken config was created: not the config that needs it, and no wrapper or action either.
    assert.deepEqual(state.calls.map(([name]) => name), ["Clock", "Database"]);

    // Still failing: the failure was not remembered, so the config is tried again.
    await assert.rejects(Skeleto.start(directory), /Database: function makeDatabase .* failed while waiting for it: no connection/);
    assert.deepEqual(state.calls.map(([name]) => name), ["Clock", "Database", "Clock", "Database"]);

    state.fail = false;
    await writeFile(join(directory, "c.ts"), component("Action", "FindUser", ["Database"]));
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual([...container.keys()].sort(), ["Audit", "Clock", "Database", "FindUser", "SaveUser", "Settings"]);
    assert.equal(container.get("Database")?.getInstance(), state.raw["Database"]);
  });
});

test("an async config that throws before its first await, or rejects with something that is not an Error, is reported the same way", async () => {
  const early = `/** @Config */\nexport async function makeEarly(): Promise<Early> {\n  throw new RangeError("at once");\n}\n`;
  const first = await failure({ "a.ts": early + component("Action", "SaveUser", ["Early"]) });
  assert.match(first.message, /^Early: function makeEarly \(.*a\.ts\) failed while waiting for it: at once$/);
  assert.ok(first.cause instanceof RangeError);
  assert.deepEqual(shared.skeletoTest.calls, []);

  const second = await failure({ "a.ts": `/** @Config */\nexport function makeOdd(): Promise<Odd> {\n  return Promise.reject("plain text");\n}\n` });
  assert.match(second.message, /^Odd: function makeOdd .* failed while waiting for it: plain text$/);
  assert.equal(second.cause, "plain text");

  // Not written async, so the throw happens in the call itself.
  const third = await failure({ "a.ts": `/** @Config */\nexport function makeSync(): Promise<Sync> {\n  throw new Error("in the call");\n}\n` });
  assert.match(third.message, /^Sync: function makeSync .* failed while creating it: in the call$/);
});

test("two configs, one returning X and one returning Promise<X>, stop startup as two functions returning the same type name", async () => {
  const error = await failure({ "a.ts": component("Config", "Database") + asyncConfig("Database").replace("makeDatabase", "connectDatabase") });
  const lines = problems(error);
  assert.equal(lines.length, 1, error.message);
  assert.match(lines[0] ?? "", /^- Database: returned by both makeDatabase \(a\.ts\) and connectDatabase \(a\.ts\)/);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

for (const kind of ["Wrapper", "Action"] as const) {
  test(`a @${kind} declared Promise<X> is a mistake naming the function, reported with the other mistakes and before any application file is imported`, async () => {
    const boom = `throw new Error("module was imported");\n`;
    const late = component(kind, "Late").replace("): Late {", "): Promise<Late> {").replace("export function", "export async function");
    const error = await failure({
      "a.ts": boom + late,
      // Whatever needs Late is not reported a second time as needing something unknown.
      "b.ts": boom + component("Action", "SaveUser", ["Late", "Nowhere"]) + `/** @Action */\nfunction makeHidden(): Hidden { return null as any; }\n`,
    });
    assert.doesNotMatch(error.message, /module was imported/);
    assert.equal(error.cause, undefined);
    assert.deepEqual(shared.skeletoTest.calls, []);
    const lines = problems(error);
    const lateLines = lines.filter((line) => line.includes("Late"));
    assert.equal(lateLines[0], `- makeLate (a.ts): is marked @${kind} but returns Promise<Late>; only a @Config may be asynchronous, a @${kind} must return Late itself`);
    assert.ok(lines.some((line) => /makeHidden \(b\.ts\): .*not exported/.test(line)), error.message);
    assert.ok(lines.some((line) => /SaveUser: dependency Nowhere is not a known component/.test(line)), error.message);
    assert.ok(!lines.some((line) => /Late is not a known component/.test(line)), error.message);
    // A wrapper may not be needed by an action, which is a mistake of its own; an action may.
    assert.equal(lines.length, kind === "Wrapper" ? 4 : 3, error.message);
    assert.equal(lateLines.length, kind === "Wrapper" ? 2 : 1, error.message);
  });
}

// ---- mistakes visible in the source and in the options, before any import (4.2, 4.5, 4.7) ----

for (const [entry, suggestion] of [["logging", "Logging"], ["@Logging", "Logging"]] as const) {
  test(`options.decorators entry ${JSON.stringify(entry)} is an option mistake naming the entry, reported with the others and before any import`, async () => {
    const boom = `throw new Error("module was imported");\n`;
    const error = await failure({ "a.ts": boom + component("Action", "SaveUser", ["Nowhere"]) }, { decorators: [entry, "Transaction"] });
    assert.doesNotMatch(error.message, /module was imported/);
    const lines = problems(error);
    assert.equal(lines.length, 2, error.message);
    assert.ok(lines[0]?.includes(`options.decorators entry ${JSON.stringify(entry)}`) && lines[0].includes(`write "${suggestion}"`), lines[0]);
    assert.match(lines[1] ?? "", /SaveUser: dependency Nowhere is not a known component/);
    assert.deepEqual(shared.skeletoTest.calls, []);
  });
}

test("a marked declare function, an export list, and a class method stop startup together, naming each, before any import", async () => {
  const boom = `throw new Error("module was imported");\n`;
  const files = {
    "a.ts": boom + `/** @Config */\nexport declare function makeAmbient(): Ambient;\n`,
    "b.ts": `/** @Config */\nfunction makeListed(): Listed { return null as any; }\nexport { makeListed };\n`,
    "c.ts": `export class Holder {\n  /** @Action */\n  static makeIt(): Item { return null as any; }\n}\n`,
  };
  const error = await failure({ ...files, "d.ts": component("Config", "Ok") }, { decorators: ["Logging"] });
  assert.doesNotMatch(error.message, /module was imported/);
  const lines = problems(error);
  assert.equal(lines.length, 3, error.message);
  assert.match(lines[0] ?? "", /makeAmbient \(a\.ts\): .*declare/);
  assert.match(lines[1] ?? "", /makeListed \(b\.ts\): .*export list.*"export function makeListed"/);
  assert.match(lines[2] ?? "", /Holder\.makeIt \(c\.ts\): .*@Action.*method/);
  assert.deepEqual(shared.skeletoTest.calls, []);
});

test("a this parameter is not passed: the arguments are the dependencies in order", async () => {
  const state = reset();
  const source = `/** @Config */\nexport function makeAlpha(): Alpha { return "alpha" as any; }\n/** @Config */\nexport function makeBeta(this: void, a: Alpha): Beta {\n  ${S}.calls.push(["Beta", [a]]);\n  return "beta" as any;\n}\n`;
  await withFixture({ "a.ts": source }, async (directory) => {
    await Skeleto.start(directory);
    assert.deepEqual(state.calls, [["Beta", ["alpha"]]]);
  });
});

test("wrapper layering compares paths with / as separator: a wrapper in a/ is inside one in a0.ts, as on every operating system", async () => {
  reset();
  const files = { "a0.ts": component("Wrapper", "Outer"), "a/b.ts": component("Wrapper", "Inner"), "z.ts": component("Action", "SaveUser") };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["Outer", "Inner", "SaveUser"]);
  });
});

test("two independent async configs are awaited one after the other, never at the same time", async () => {
  const state = reset();
  const files = { "a.ts": asyncConfig("Alpha", [], undefined, 40) + asyncConfig("Beta", [], undefined, 10) };
  await withFixture(files, async (directory) => {
    await Skeleto.start(directory);
    assert.deepEqual(state.calls.map(([name]) => name), ["Alpha", "Alpha ready", "Beta", "Beta ready"]);
  });
});
