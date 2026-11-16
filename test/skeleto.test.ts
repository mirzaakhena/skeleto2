import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";
import { DEFAULT_EXCLUDE, FuncInstanceMetadata, Skeleto, newContext } from "../src/index.js";
import type { SkeletoOptions } from "../src/index.js";
import { withFixture } from "./fixture.js";

type Kind = "Config" | "Wrapper" | "Action";
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
    Wrapper: `(handler: any, metadata: any) => { ${S}.seen.push(["${name}", metadata]); return async (ctx: any, request: any) => { ctx.data.trace.push("${name}"); return handler(ctx, request); }; }`,
  };
  const call = `${S}.calls.push(["${name}", [${dependencies.map((_, index) => `p${index}`).join(", ")}]]);`;
  return `/** ${marker} */\nexport function make${name.replace(/\W/g, "")}(${parameters}): ${name} {\n  ${call}\n  const made: any = ${result ?? defaults[kind]};\n  ${S}.raw["${name}"] = made;\n  return made;\n}\n`;
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
  ["Action", "Wrapper", "@Config and @Action only"],
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

test("with an empty options.exclude a marked declaration in a .d.ts file is a component again, which then has nothing to call", async () => {
  const error = await failure({ "types.d.ts": declared }, { exclude: [] });
  assert.match(error.message, /Declared: function makeDeclared .* failed while/);
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
  assert.match(excluded.message, /: no \.ts file with a @Config, @Wrapper or @Action function was found/);
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

test("a larger ordinal is further outside; among equal ordinals the name that sorts later in code-unit order is further outside", async () => {
  reset();
  const wrapper = (name: string, ordinal?: number): string => component("Wrapper", name, [], undefined, ordinal === undefined ? "@Wrapper" : `@Wrapper {"ordinal": ${ordinal}}`);
  const files = {
    // "Zebra" < "apple" in code units, while a locale comparison would put "apple" first.
    "a.ts": wrapper("Middle", 0) + wrapper("Outer", 10) + wrapper("apple") + wrapper("Inner", -5) + wrapper("Zebra") + wrapper("Second", 2),
    "b.ts": component("Action", "SaveUser"),
  };
  await withFixture(files, async (directory) => {
    const container = (await Skeleto.start(directory)).getContainer();
    assert.deepEqual(await trace(container.get("SaveUser")?.getInstance()), ["Outer", "Second", "apple", "Zebra", "Middle", "Inner", "SaveUser"]);
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

test("the container holds every component of all three kinds under its name, with instance and metadata", async () => {
  const state = reset();
  const files = {
    "config/log.ts": component("Config", "winston.Logger"),
    "wrap.ts": component("Wrapper", "Audit", ["winston.Logger"], "(handler: any) => handler", `@Wrapper {"ordinal": 3}`),
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
    assert.deepEqual(container.get("Audit")?.getMetadata(), { name: "Audit", dependencies: ["winston.Logger"], mainDecorator: { name: "Wrapper", data: { ordinal: 3 } }, additionalDecorators: [] });
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
