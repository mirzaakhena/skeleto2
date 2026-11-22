import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_EXCLUDE } from "../src/index.js";
import { scanDirectory } from "../src/scanner.js";
import { withFixture } from "./fixture.js";

const repo = fileURLToPath(new URL("..", import.meta.url));
const readme = readFileSync(`${repo}README.md`, "utf8");

const checklist = readFileSync(`${repo}REVIEW_CHECKLIST.md`, "utf8");
const typeSource = readFileSync(`${repo}src/type.ts`, "utf8");

/** Every document of docs/, by path from the repository root; docs/ is the only rule set. */
const docs: Record<string, string> = {};
for (const folder of ["konsep", "proses", "teknis"]) for (const name of readdirSync(`${repo}docs/${folder}`)) docs[`docs/${folder}/${name}`] = readFileSync(`${repo}docs/${folder}/${name}`, "utf8");
docs["docs/README.md"] = readFileSync(`${repo}docs/README.md`, "utf8");

type Blocks = {
  /** Full example files, by the path each block names in its first line. */
  files: Record<string, string>;
  /** Pieces of example files, shown where the whole file would be too long; `// <path>.ts (excerpt)` is their first line. */
  excerpts: { path: string; body: string }[];
  commands: string[];
  outputs: string[];
};

/** Sorts every fenced block of a document by kind; a block of a kind that no test would check is refused. */
function readBlocks(document: string, text: string): Blocks {
  const blocks: Blocks = { files: {}, excerpts: [], commands: [], outputs: [] };
  const fence = /^```(\w*)\n([\s\S]*?)^```$/gm;
  // Markdown renders code in more forms than the one sorted below; outside the sorted blocks, any other form is refused rather than silently skipped:
  // a fence of backticks or tildes with an info string or indented (as inside a list), an indented code block, or raw HTML code.
  text
    .replace(fence, "")
    .split("\n")
    .forEach((line, index) => {
      const other = /^\s*(`{3,}|~{3,})/.test(line) || /^( {4}|\t)/.test(line) || /<(pre|code)[\s>]/i.test(line);
      assert.ok(!other, `${document} has code that no test checks, written in a form the test does not read (line ${index + 1} outside the checked blocks):\n${line}`);
    });
  for (const [, language, body] of text.matchAll(fence)) {
    const [, path, excerpt] = /^\/\/ (\S+\.ts)( \(excerpt\))?\n/.exec(body ?? "") ?? [];
    if (language === "ts" && path && excerpt) blocks.excerpts.push({ path, body: (body ?? "").replace(/^.*\n/, "") });
    else if (language === "ts" && path) {
      assert.ok(!(path in blocks.files), `two ${document} blocks are named ${path}`);
      blocks.files[path] = body ?? "";
    } else if (language === "sh") blocks.commands.push((body ?? "").trim());
    else if (language === "text") blocks.outputs.push(body ?? "");
    else assert.fail(`${document} has a code block that no test runs:\n${body}`);
  }
  return blocks;
}

/** An excerpt runs only as part of the file it names, so it must be a verbatim piece of an example file. */
function checkExcerpts(document: string, blocks: Blocks, files: Record<string, string>): void {
  for (const { path, body } of blocks.excerpts) assert.ok(files[path]?.includes(body), `${document} excerpt of ${path} is not part of that README example file:\n${body}`);
}

type Example = {
  /** Example files, by the path each block names in its first line. */
  files: Record<string, string>;
  /** Arguments of the documented `npx tsx ...` command. */
  command: string[];
  /** The output the README promises. */
  output: string;
  /** Files docs/ adds to the example at paths of their own, such as its tests; they are type-checked with it, and run when they are `*.test.ts`. */
  additions: Record<string, string>;
  /** Files REVIEW_CHECKLIST.md shows for applications to copy: the gap test. */
  checklist: Record<string, string>;
};

/** The README holds the one runnable example; every other code block of docs/ is an excerpt of it, a copy of Skeleto's own types, or a whole file at a path of its own. */
function readExample(readmeText: string, documents: Record<string, string>, checklistText: string): Example {
  const blocks = readBlocks("README", readmeText);
  const { files, commands, outputs } = blocks;
  checkExcerpts("README", blocks, files);
  assert.equal(commands.length, 1, "the README shows exactly one command");
  assert.equal(outputs.length, 1, "the README shows exactly one output");
  assert.match(commands[0] ?? "", /^npx tsx \S+$/);

  // docs/ runs nothing of its own: a command or an output there would be checked by no test. An excerpt of src/type.ts is a copy of Skeleto's own types.
  const additions: Record<string, string> = {};
  for (const [document, text] of Object.entries(documents)) {
    const shown = readBlocks(document, text);
    assert.deepEqual([...shown.commands, ...shown.outputs], [], `${document} may show code only, not commands or output`);
    checkExcerpts(document, shown, { ...files, "src/type.ts": typeSource });
    // A whole file there is added to the example at a path of its own; a README path would be a second, unchecked version of it.
    for (const [path, body] of Object.entries(shown.files)) {
      assert.ok(!(path in files), `${document} shows ${path} in full, which is a README example file; show an excerpt of it instead`);
      assert.ok(!(path in additions), `two documents of docs/ show ${path}`);
      additions[path] = body;
    }
  }

  // REVIEW_CHECKLIST.md shows whole files to copy, at paths of their own; a path already taken would be a second, unchecked version of that file.
  const review = readBlocks("REVIEW_CHECKLIST.md", checklistText);
  assert.deepEqual([...review.commands, ...review.outputs], [], "REVIEW_CHECKLIST.md may show code only, not commands or output");
  checkExcerpts("REVIEW_CHECKLIST.md", review, files);
  for (const path of Object.keys(review.files)) assert.ok(!(path in files) && !(path in additions), `REVIEW_CHECKLIST.md shows ${path}, which another document already shows`);
  return { files, command: (commands[0] ?? "").split(" ").slice(2), output: outputs[0] ?? "", additions, checklist: review.files };
}

/** What a consumer has installed: the package, here served straight from `src/`, and a compiler configuration. */
function installation(): Record<string, string> {
  return {
    "node_modules/skeleto/package.json": JSON.stringify({ name: "skeleto", type: "module", exports: { types: "./index.d.ts", default: "./index.js" } }),
    "node_modules/skeleto/index.js": `export * from ${JSON.stringify(pathToFileURL(`${repo}src/index.ts`).href)};\n`,
    "node_modules/skeleto/index.d.ts": `export * from ${JSON.stringify(`${repo}src/index.js`)};\n`,
    "tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", skipLibCheck: true, types: ["node"], typeRoots: [`${repo}node_modules/@types`] },
      include: ["**/*.ts"],
    }),
    "package.json": JSON.stringify({ type: "module" }),
  };
}

type Run = { code: number; stdout: string; stderr: string };

/** Runs a tool of this repo inside the example directory, as the reader would from their project root. */
function run(tool: string, args: string[], cwd: string): Promise<Run> {
  // This file itself runs under the test runner, which marks its children through NODE_TEST_CONTEXT; a test run inside the example must report as a run of its own.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  return new Promise((done) => {
    execFile(`${repo}node_modules/.bin/${tool}`, args, { cwd, env: { ...env, NO_COLOR: "1", FORCE_COLOR: "0" } }, (error, stdout, stderr) => {
      done({ code: error ? (typeof error.code === "number" ? error.code : 1) : 0, stdout, stderr });
    });
  });
}

const example = readExample(readme, docs, checklist);

test("the README covers the kinds, the start and the container", () => {
  const sources = Object.values(example.files).join("\n");
  for (const needed of ["@Config", "export function implAuditWrapper", "@UseCase", "@Gateway", "@Transaction", "Skeleto.start(", "decorators: MARKERS", "getContainer()", "getMetadata()"]) {
    assert.ok(sources.includes(needed), `no README example shows ${needed}`);
  }
  assert.ok(Object.keys(example.files).length >= 4);
});

test("the README example has an async config, and says that startup waits for it without a time limit of its own", () => {
  assert.match(example.files["src/config.ts"] ?? "", /@Config \*\/\nexport async function implConnection\(\): Promise<Connection> \{\n[^}]*await /);
  // Its dependant asks for the plain name.
  assert.match(example.files["src/wrappers.ts"] ?? "", /implTransactionWrapper\(connection: Connection,/);
  assert.match(readme, /^## Asynchronous configs$/m);
  assert.match(readme, /Startup sets no time limit/);
  assert.match(readme, /Give the config its own timeout/);
});

test("CLAUDE.md states that wrappers layer in written order", () => {
  const guide = readFileSync(`${repo}CLAUDE.md`, "utf8");
  assert.match(guide, /Urutan pembungkusan adalah urutan penulisan.*\*\*pertama\*\* menjadi lapisan \*\*terdalam\*\*.*urutan pemindaian/);
  assert.match(guide, /\| `@Config`, `@Wrapper` \| tidak ada \|/);
});

test("CLAUDE.md states the rule for async configs in sections 4.3 and 4.7", () => {
  const guide = readFileSync(`${repo}CLAUDE.md`, "utf8");
  const section = (number: string): string => new RegExp(`^### ${number.replace(".", "\\.")} [\\s\\S]*?(?=^###? )`, "m").exec(guide)?.[0] ?? "";
  assert.match(section("4.3"), /`Promise<X>`[\s\S]*nama komponennya `X`/);
  assert.match(section("4.3"), /`@Wrapper`, `@UseCase`, dan `@Gateway` selalu sinkron/);
  assert.match(section("4.7"), /\*\*ditunggu\*\*/);
  assert.match(section("4.7"), /tidak memasang batas waktu/);
});

test("the README examples type-check as written", async () => {
  await withFixture({ ...installation(), ...example.files }, async (directory) => {
    const result = await run("tsc", ["-p", "."], directory);
    assert.equal(result.code, 0, result.stdout + result.stderr);
  });
});

test("the README examples start and print exactly the output the README shows", async () => {
  await withFixture({ ...installation(), ...example.files }, async (directory) => {
    const result = await run("tsx", example.command, directory);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, example.output);

    const lines = result.stdout.split("\n");
    // The wrapper written last (audit) is outermost: it is entered before, and left after, the transaction wrapper written before it.
    // The effect queued after commit runs after it, and the use case answers with its own type, not with the entities.
    assert.deepEqual(lines.slice(0, 6), ["enter StockTransfer", "begin", "commit", "stock changed: north 7, south 3", "leave StockTransfer", "{ fromUnits: 7, toUnits: 3 }"]);
    // The failing transfer rolls back, queues nothing that runs, and its caller translates the kind of its business error.
    assert.deepEqual(lines.slice(6, 11), ["enter StockTransfer", "begin", "rollback", "leave StockTransfer", "refused: warehouse south holds 3 units, not 50"]);
    // The logging wrapper wraps use cases only: no gateway shows up in the log.
    assert.deepEqual(
      lines.filter((line) => /^(enter|leave) /.test(line)),
      ["enter StockTransfer", "leave StockTransfer", "enter StockTransfer", "leave StockTransfer"],
    );

    const metadata = (name: string): unknown => JSON.parse((lines.find((line) => line.startsWith(`${name}: `)) ?? "").replace(/^[^{]*/, ""));
    assert.deepEqual(metadata("StockTransfer"), {
      dependencies: ["LockWarehouses", "SaveWarehouses", "NotifyWarehouses"],
      additionalDecorators: [{ name: "Transaction" }, { name: "Audit", data: { level: "info" } }],
    });
    for (const gateway of ["LockWarehouses", "SaveWarehouses"]) assert.deepEqual(metadata(gateway), { dependencies: ["Database"], additionalDecorators: [] });
    assert.deepEqual(metadata("NotifyWarehouses"), { dependencies: ["Logger"], additionalDecorators: [] });
    // The async config is listed under the plain name, and the connection it delivered late is the one the transaction wrapper used.
    assert.ok(lines.includes('Connection: @Config {"dependencies":[],"additionalDecorators":[]}'));
    assert.deepEqual(metadata("TransactionWrapper"), { dependencies: ["Connection", "Logger"], additionalDecorators: [] });
    assert.ok(!result.stdout.includes("Promise"));
  });
});

test("the list of allowed markers in the README example is in force: a misspelled marker stops it", async () => {
  const path = Object.keys(example.files).find((name) => example.files[name]?.includes("@Transaction\n"));
  assert.ok(path, "no README example carries the @Transaction marker");
  const files = { ...example.files, [path]: (example.files[path] ?? "").replace("@Transaction\n", "@Transction\n") };
  await withFixture({ ...installation(), ...files }, async (directory) => {
    const result = await run("tsx", example.command, directory);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /implStockTransfer.*@Transction is not an allowed marker/);
    assert.equal(result.stdout, "");
  });
});

test("the README example keeps business rules in plain entity functions, and no use case depends on another use case", async () => {
  const entities = Object.keys(example.files).filter((path) => path.startsWith("src/entity/"));
  assert.ok(entities.length > 0, "the README example has no entity file");
  // An entity carries no marker at all, so it can never become a component.
  for (const path of entities) assert.doesNotMatch(example.files[path] ?? "", /^\s*(\/\*\*|\*)\s*@/m, `${path} carries a marker`);
  assert.match(example.files["src/entity/warehouse.ts"] ?? "", /^export function transfer\(from: Warehouse, to: Warehouse, units: number\)/m);
  assert.match(example.files["src/usecase/stock/stock_transfer.ts"] ?? "", /Warehouse\.transfer\(/);

  await withFixture({ ...installation(), ...example.files }, async (directory) => {
    const result = await run("tsx", example.command, directory);
    assert.equal(result.code, 0, result.stderr);
    type Component = { kind: string; dependencies: string[]; markers: string[] };
    const components = new Map<string, Component>();
    for (const line of result.stdout.split("\n")) {
      const match = /^(\w+): @(\w+) (\{.*\})$/.exec(line);
      if (!match) continue;
      const { dependencies, additionalDecorators } = JSON.parse(match[3] ?? "{}");
      components.set(match[1] ?? "", { kind: match[2] ?? "", dependencies, markers: additionalDecorators.map((marker: { name: string }) => marker.name) });
    }
    // Use cases and gateways are told apart by their main marker, never by their names or folders, and every component of the example is one of the four kinds.
    const useCases = [...components].filter(([, component]) => component.kind === "UseCase").map(([name]) => name);
    const gateways = [...components].filter(([, component]) => component.kind === "Gateway").map(([name]) => name);
    assert.deepEqual(useCases, ["StockTransfer"]);
    assert.deepEqual(gateways.sort(), ["LockWarehouses", "NotifyWarehouses", "SaveWarehouses"]);
    assert.ok(![...components.values()].some((component) => ["Config", "Wrapper", "UseCase", "Gateway"].includes(component.kind) === false), "the example has a component of an unknown kind");
    // Skeleto itself keeps a use case away from other use cases, so the example has to start; it is checked here too.
    for (const useCase of useCases) {
      assert.ok(components.get(useCase)?.markers.includes("Transaction"), `use case ${useCase} carries no @Transaction`);
      for (const dependency of components.get(useCase)?.dependencies ?? []) assert.ok(!useCases.includes(dependency), `use case ${useCase} depends on use case ${dependency}`);
    }
    for (const name of ["Warehouse", "BusinessError", "newWarehouse", "transfer"]) assert.ok(!components.has(name), `${name} became a component`);
  });
});

test("the README and CLAUDE.md name the exclude option, the constant and every default entry", () => {
  for (const text of [readme, readFileSync(`${repo}CLAUDE.md`, "utf8")]) {
    for (const needed of ["exclude", "DEFAULT_EXCLUDE", ...DEFAULT_EXCLUDE]) assert.ok(text.includes(`\`${needed}\``), `${needed} is not documented`);
  }
});

test("the README, the checklist and docs/ stay clear of what Skeleto dropped", () => {
  for (const banned of [/readTypeArguments/i, /@Controller/i, /@RequestPart/i, /payload/i, /tes arsitektur/i]) {
    for (const [document, text] of Object.entries({ ...docs, "REVIEW_CHECKLIST.md": checklist })) assert.doesNotMatch(text, banned, `${document} mentions what Skeleto dropped: ${banned}`);
  }
  assert.doesNotMatch(readme, /readTypeArguments|@Controller|@RequestPart|payload/i);
});

/**
 * Fails unless every component of the files is a function named `impl` followed by its component's name. It reads the files with the
 * scanner Skeleto itself uses, so a marked function written in any form Skeleto accepts is checked, and a scanner error fails it too.
 */
async function checkImplNames(files: Record<string, string>): Promise<void> {
  await withFixture(files, (directory) => {
    const { functions, errors } = scanDirectory(directory, MARKERS);
    assert.deepEqual(errors, [], `the scanner refuses the files:\n${errors.join("\n")}`);
    const wrong = functions.filter(({ functionName, metadata }) => functionName !== `impl${metadata.name}`);
    assert.deepEqual(wrong.map(({ functionName, metadata }) => `${functionName} is not impl + ${metadata.name}`), [], "component functions not named impl + their component's name");
    assert.deepEqual([...new Set(functions.map(({ metadata }) => metadata.mainDecorator.name))].sort(), ["Config", "Gateway", "UseCase", "Wrapper"]);
  });
}

// The markers of the example's own src/markers.ts, so that the scanner checks them as the example's startup does.
const MARKERS = JSON.parse(/^export const MARKERS = (\[.*\]);$/m.exec(example.files["src/markers.ts"] ?? "")?.[1] ?? "null") as string[];

test("every component function of the README example is named impl followed by its component's name", async () => {
  await checkImplNames(example.files);
});

test("the naming check fails, naming the function, for a wrong name in a form a text pattern would skip, and on any scanner error", async (t) => {
  const path = "src/gateway/memory/warehouse.ts";
  const original = "export function implSaveWarehouses(database: Database): SaveWarehouses {";
  assert.ok(example.files[path]?.includes(original), `${path} no longer declares implSaveWarehouses as this test expects`);
  const forms: Record<string, string> = {
    "a blank line between the JSDoc block and the function": "\nexport function storeWarehouses(database: Database): SaveWarehouses {",
    "a line comment between the JSDoc block and the function": "// Writes through the transaction.\nexport function storeWarehouses(database: Database): SaveWarehouses {",
    // The old text pattern read this form; it stays because it is the form the ticket for this check named.
    "parameters over several lines": "export function storeWarehouses(\n  database: Database,\n): SaveWarehouses {",
    "a type parameter": "export function storeWarehouses<T>(database: Database): SaveWarehouses {",
  };
  for (const [form, written] of Object.entries(forms)) {
    await t.test(form, async () => {
      const files = { ...example.files, [path]: (example.files[path] ?? "").replace(original, written) };
      await assert.rejects(checkImplNames(files), (error: Error) => /storeWarehouses is not impl \+ SaveWarehouses/.test(error.message));
    });
  }
  await t.test("a scanner error", async () => {
    const files = { ...example.files, [path]: (example.files[path] ?? "").replace(original, original.replace("export ", "")) };
    await assert.rejects(checkImplNames(files), (error: Error) => /implSaveWarehouses/.test(error.message) && /the scanner refuses the files/.test(error.message));
  });
});

test("the README example creates entities only through newWarehouse, and keeps its markers in one exported constant", () => {
  const entity = example.files["src/entity/warehouse.ts"] ?? "";
  assert.match(entity, /^export function newWarehouse\(/m);
  // The rule checks the invariants itself and returns copies; it does not go through the creating function.
  assert.doesNotMatch(entity.slice(entity.indexOf("export function transfer")), /newWarehouse\(/);
  for (const path of Object.keys(example.files).filter((name) => name.startsWith("src/gateway/") || name.startsWith("src/usecase/"))) {
    assert.doesNotMatch(example.files[path] ?? "", /newWarehouse/, `${path} calls newWarehouse`);
  }
  // A use case writes no entity literal, and a gateway reaches the store only through the context.
  assert.doesNotMatch(example.files["src/usecase/stock/stock_transfer.ts"] ?? "", /\{\s*id:/);
  for (const path of Object.keys(example.files).filter((name) => name.startsWith("src/gateway/"))) assert.doesNotMatch(example.files[path] ?? "", /Connection/, `${path} uses the connection`);
  assert.match(example.files["src/gateway/memory/warehouse.ts"] ?? "", /database\(ctx\)/);
  assert.match(example.files["src/markers.ts"] ?? "", /^export const MARKERS = \["Transaction", "Audit"\];$/m);
  assert.match(example.files["main.ts"] ?? "", /Skeleto\.start\("src", \{ decorators: MARKERS \}\)/);
  // Business errors are typed by kind, and nothing in the example speaks of the transport its caller uses.
  assert.match(example.files["src/entity/error.ts"] ?? "", /export type BusinessErrorKind = "validation" \| "not_found" \| "conflict" \| "tech_debt";/);
  for (const [path, source] of Object.entries(example.files)) assert.doesNotMatch(source, /\bhttp\b/i, `${path} mentions HTTP`);
});

// Two transfers that together exceed the stock, and a third that names the same warehouses the other way round.
// Without the lock both of the first two succeed; without the fixed order the first and the third wait on each other for ever.
const race = `import { Skeleto, newContext } from "skeleto";
import { MARKERS } from "./src/markers.js";
import type { StockTransfer } from "./src/usecase/stock/stock_transfer.js";

const container = (await Skeleto.start("src", { decorators: MARKERS })).getContainer();
const stockTransfer: StockTransfer = container.get("StockTransfer")!.getInstance();
const results = await Promise.allSettled([
  stockTransfer(newContext(), { from: "north", to: "south", units: 6 }),
  stockTransfer(newContext(), { from: "north", to: "south", units: 6 }),
  stockTransfer(newContext(), { from: "south", to: "north", units: 1 }),
]);
console.log(JSON.stringify(results.map((result) => (result.status === "fulfilled" ? result.value : { kind: result.reason.kind }))));
`;

test("the README example guards a transfer against a concurrent one: overlapping transfers beyond the stock give exactly one error", async () => {
  await withFixture({ ...installation(), ...example.files, "race.ts": race }, async (directory) => {
    const result = await run("tsx", ["race.ts"], directory);
    assert.equal(result.code, 0, result.stderr);
    const outcomes = JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "[]");
    assert.deepEqual(outcomes, [{ fromUnits: 4, toUnits: 6 }, { kind: "conflict" }, { fromUnits: 5, toUnits: 5 }]);
  });
});

// Drives the transaction wrapper of the example directly: one failing action, then an action that calls another inside its transaction.
const transactions = `import { Skeleto, newContext, type WrapperHandler } from "skeleto";
import { MARKERS } from "./src/markers.js";

const container = (await Skeleto.start("src", { decorators: MARKERS })).getContainer();
const wrap: WrapperHandler = container.get("TransactionWrapper")!.getInstance();
const metadata = container.get("StockTransfer")!.getMetadata();
const ran: string[] = [];

const failing = wrap(async (ctx) => {
  ctx.data.afterCommit.push(() => ran.push("dropped"));
  throw new Error("fails");
}, metadata);
const left = newContext();
await failing(left, {}).catch(() => ran.push("failed"));

const inner = wrap(async (ctx) => ctx.data.transaction, metadata);
const outer = wrap(async (ctx) => {
  ctx.data.afterCommit.push(() => ran.push("committed"));
  return (await inner(ctx, {})) === ctx.data.transaction;
}, metadata);
const joined = await outer(newContext(), {});
console.log(JSON.stringify({ joined, ran, cleared: !("transaction" in left.data) && !("afterCommit" in left.data) }));
`;

test("the README example's transaction wrapper joins an open transaction, runs queued effects after commit and drops them on failure", async () => {
  await withFixture({ ...installation(), ...example.files, "transactions.ts": transactions }, async (directory) => {
    const result = await run("tsx", ["transactions.ts"], directory);
    assert.equal(result.code, 0, result.stderr);
    // One begin for the two nested actions: the inner one joined the outer transaction.
    assert.deepEqual(result.stdout.trim().split("\n"), ["begin", "rollback", "begin", "commit", JSON.stringify({ joined: true, ran: ["failed", "committed"], cleared: true })]);
  });
});

// Runs the use case of the example with an observer in the context, as a tool outside the application would.
const observed = `import { Skeleto, newContext } from "skeleto";
import { MARKERS } from "./src/markers.js";

const container = (await Skeleto.start("src", { decorators: MARKERS })).getContainer();
const stockTransfer = container.get("StockTransfer")!.getInstance();
const calls: { gateway: string; input: unknown; proceeded: boolean }[] = [];
const ctx = newContext();
ctx.data.gatewayObserver = async (call: { gateway: string; input: unknown; proceed: () => Promise<unknown> }) => {
  const call2 = { gateway: call.gateway, input: call.input, proceeded: false };
  calls.push(call2);
  const result = await call.proceed();
  call2.proceeded = true;
  return result;
};
const result = await stockTransfer(ctx, { from: "north", to: "south", units: 3 });
console.log(JSON.stringify({ result, calls }));
`;

test("with an observer in the context, every gateway call of a use case run reaches it, and the result of the use case is unchanged", async () => {
  await withFixture({ ...installation(), ...example.files, "observed.ts": observed }, async (directory) => {
    const result = await run("tsx", ["observed.ts"], directory);
    assert.equal(result.code, 0, result.stderr);
    const lines = result.stdout.trim().split("\n");
    const moved = [{ id: "north", units: 7 }, { id: "south", units: 3 }];
    // The same answer as the README shows for this call, and every gateway call, in order, with its name and input, which the observer let through.
    assert.deepEqual(JSON.parse(lines[lines.length - 1] ?? ""), {
      result: { fromUnits: 7, toUnits: 3 },
      calls: [
        { gateway: "LockWarehouses", input: ["north", "south"], proceeded: true },
        { gateway: "SaveWarehouses", input: moved, proceeded: true },
        { gateway: "NotifyWarehouses", input: moved, proceeded: true },
      ],
    });
    // The transaction and the audit around the use case are unchanged by it.
    assert.deepEqual(lines.slice(0, 5), ["enter StockTransfer", "begin", "commit", "stock changed: north 7, south 3", "leave StockTransfer"]);
  });
});

/** The prefix of the rule numbers of each document of docs/ that holds rules, in the order the checklist lists them. */
const RULE_FILES: [string, string][] = [
  ["docs/konsep/entity.md", "ENT"],
  ["docs/konsep/use-case.md", "UC"],
  ["docs/konsep/gateway.md", "GW"],
  ["docs/konsep/controller.md", "CTL"],
  ["docs/teknis/komponen.md", "KOM"],
  ["docs/teknis/action.md", "ACT"],
  ["docs/teknis/wrapper.md", "WRP"],
  ["docs/teknis/config.md", "CFG"],
  ["docs/proses/pengembangan.md", "DEV"],
  ["docs/proses/utang-teknis.md", "UTG"],
];

type Rule = { number: string; text: string; level: "Wajib" | "Opsional" };

/** The rules of a document of docs/: every `### <PREFIX>-<n>. <text>` heading, which must sit under 'Aturan wajib' or 'Aturan opsional' and have a body. */
function docsRules(path: string, prefix: string): Rule[] {
  const rules: Rule[] = [];
  let level: Rule["level"] | undefined;
  const lines = (docs[path] ?? "").split("\n");
  lines.forEach((line, index) => {
    if (/^## /.test(line)) level = line === "## Aturan wajib" ? "Wajib" : line === "## Aturan opsional" ? "Opsional" : undefined;
    if (!/^###+ /.test(line)) return;
    const match = new RegExp(`^### (${prefix}-\\d+)\\. (\\S.*)$`).exec(line);
    assert.ok(match, `${path} has a heading that is not '### ${prefix}-<n>. <rule>': ${line}`);
    assert.ok(level, `${path}: ${match[1]} is under neither 'Aturan wajib' nor 'Aturan opsional'`);
    const next = lines.findIndex((text, at) => at > index && /^##+ /.test(text));
    const body = lines.slice(index + 1, next === -1 ? undefined : next);
    assert.ok(body.some((text) => text.trim() !== ""), `${path}: ${match[1]} has no body`);
    rules.push({ number: match[1] ?? "", text: match[2] ?? "", level });
  });
  return rules;
}

const allRules = RULE_FILES.flatMap(([path, prefix]) => docsRules(path, prefix));

test("every rule of docs/ is '### <PREFIX>-<n>. ...' under 'Aturan wajib' or 'Aturan opsional', with a body, and each number is used once", () => {
  assert.ok(allRules.length >= 80, "docs/ has fewer rules than expected");
  assert.deepEqual([...new Set(allRules.map(({ number }) => number))].length, allRules.length, "a rule number is used twice");
  for (const [path, prefix] of RULE_FILES) {
    const numbers = docsRules(path, prefix).map(({ number }) => Number(number.split("-")[1]));
    assert.ok(numbers.length > 0, `${path} has no rule`);
    assert.equal(new Set(numbers).size, numbers.length, `${path} repeats a number`);
  }
  // No other document holds a rule, and no deeper heading hides one from the numbering.
  for (const [path, text] of Object.entries(docs)) {
    if (!RULE_FILES.some(([ruleFile]) => ruleFile === path)) assert.doesNotMatch(text, /^### [A-Z]+-\d+\. /m, `${path} holds a rule but is not listed as a rule document`);
    assert.doesNotMatch(text, /^#{4,} /m, `${path} has a heading deeper than ###`);
  }
});

test("every rule number cited in docs/, the README, CLAUDE.md and the checklist points to a rule that exists", () => {
  const known = new Set(allRules.map(({ number }) => number));
  const citing = { ...docs, "README.md": readme, "CLAUDE.md": readFileSync(`${repo}CLAUDE.md`, "utf8"), "REVIEW_CHECKLIST.md": checklist };
  for (const [document, text] of Object.entries(citing)) {
    for (const [cited] of text.matchAll(/\b(?:ENT|UC|GW|CTL|KOM|ACT|WRP|CFG|DEV|UTG)-\d+\b/g)) assert.ok(known.has(cited), `${document} cites ${cited}, which does not exist`);
  }
});

test("every old rule number in the table of docs/README.md maps to rules that exist", () => {
  const known = new Set(allRules.map(({ number }) => number));
  const rows = [...(docs["docs/README.md"] ?? "").matchAll(/\| ([BTP]\d+) \| ([^|]+) \|/g)];
  assert.ok(rows.length >= 78, "the table of old numbers is incomplete");
  for (const [, old, replacement] of rows) for (const [number] of (replacement ?? "").matchAll(/[A-Z]+-\d+/g)) assert.ok(known.has(number), `${old} maps to ${number}, which does not exist`);
});

test("docs/ is the only rule set: the old documents are pointers, and nothing says they still apply", () => {
  for (const [file, prefix] of [["BEST_PRACTICES.md", "B"], ["TECHNICAL_PRACTICES.md", "T"], ["DEVELOPMENT_PROCESS.md", "P"]]) {
    const text = readFileSync(`${repo}${file}`, "utf8");
    const paragraphs = text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("# "));
    assert.equal(paragraphs.length, 1, `${file} is not a one-paragraph pointer`);
    assert.match(text, /\]\(docs\/README\.md\)/, `${file} does not point to docs/README.md`);
    assert.doesNotMatch(text, new RegExp(`^### ${prefix}\\d+\\.`, "m"), `${file} still holds rules`);
  }
  const guide = readFileSync(`${repo}CLAUDE.md`, "utf8");
  for (const [document, text] of Object.entries({ ...docs, "README.md": readme, "CLAUDE.md": guide, "REVIEW_CHECKLIST.md": checklist })) {
    assert.doesNotMatch(text, /masih berlaku|untuk sementara|rancangan pengganti|dokumen lama|Rencana, belum terealisasi|still apply|until the owner decides/i, `${document} suggests that the old documents still apply`);
  }
  assert.match(guide, /`docs\/`, satu-satunya rangkaian aturan/);
  assert.match(docs["docs/README.md"] ?? "", /satu-satunya rangkaian aturan/);
  const lines = readme.split("\n").filter((line) => line.includes("(docs/README.md)"));
  assert.equal(lines.length, 1, "the README links docs/README.md on exactly one line");
  assert.match(lines[0] ?? "", /only rule set/);
  assert.match(lines[0] ?? "", /Indonesian/);
  assert.match(lines[0] ?? "", /\(REVIEW_CHECKLIST\.md\)/);
  assert.doesNotMatch(readme, /BEST_PRACTICES|TECHNICAL_PRACTICES|DEVELOPMENT_PROCESS/);
});

test("docs/ names no product or framework, no application", () => {
  for (const [document, text] of Object.entries(docs)) {
    for (const product of [/\bSQL\b/, /postgres/i, /mysql/i, /sqlite/i, /oracle/i, /mongo/i, /redis/i, /kafka/i, /rabbit/i, /dynamo/i, /\bExpress\b/, /express\.?js/i, /fastify/i, /nestjs/i, /\bkoa\b/i, /\bhono\b/i, /FOR UPDATE/, /\bReact\b/, /\bVue\b/, /\bAngular\b/, /svelte/i, /next\.?js/i, /\bNuxt\b/, /\bRemix\b/, /\bastro\b/i, /jquery/i, /\bjest\b/i]) {
      assert.doesNotMatch(text, product, `${document} names a product or framework: ${product}`);
    }
  }
});

test("docs/ states the decisions of 2026-11-22: every use case carries @Transaction, WRP-5 is built and mandatory, wrappers whose order matters share a file", () => {
  const rule = (number: string): Rule => allRules.find((candidate) => candidate.number === number) ?? assert.fail(`${number} does not exist`);
  assert.match(rule("UC-16").text, /Setiap use case ditandai `@Transaction`, termasuk query/);
  assert.match(rule("UC-7").text, /^Query tidak pernah menulis: ia hanya bergantung pada gateway yang kontraknya membaca$/);
  for (const { number, text } of allRules) assert.doesNotMatch(text, /tanpa `@Transaction`/, `${number} says that a use case may go without @Transaction`);
  assert.equal(rule("WRP-5").level, "Wajib");
  assert.equal(rule("WRP-7").level, "Wajib");
  assert.match(rule("WRP-7").text, /urutannya penting ditulis di satu berkas/);
  const wrapper = docs["docs/teknis/wrapper.md"] ?? "";
  assert.match(wrapper, /memindah atau mengganti nama berkas wrapper (?:dapat|bisa) mengubah lapisan/);
  assert.match(wrapper.slice(wrapper.indexOf("### WRP-7.")), /mengganti nama sebuah berkas wrapper dapat diam-diam menukar lapisannya/);
  // One status for WRP-5 everywhere: built.
  assert.match(wrapper, /\| `@Wrapper`, urutan penulisan sebagai urutan lapisan \(WRP-5\), dan pembungkusan \| terealisasi \|/);
  assert.match(rule("WRP-1").text, /Satu wrapper per penanda yang dibacanya/);
  assert.match(wrapper, /`GatewayWrapper` membaca `Gateway`/);
  assert.equal(rule("DEV-2").level, "Wajib");
  assert.doesNotMatch(docs["docs/proses/pengembangan.md"] ?? "", /belum diputuskan pemilik\.\*\* Dirumuskan|perubahan tingkat ini belum diputuskan/);
  assert.match(rule("GW-12").text, /^Gateway hanya bergantung pada config$/);
});

test("every code block of docs/ is a verbatim excerpt of the README example or of src/type.ts, or a whole file that type-checks and passes with the example", async () => {
  const tests = Object.keys(example.additions).filter((path) => path.endsWith(".test.ts"));
  assert.deepEqual(tests.sort(), ["main.test.ts", "src/usecase/stock/stock_transfer.test.ts"]);
  await withFixture({ ...installation(), ...example.files, ...example.additions }, async (directory) => {
    const checked = await run("tsc", ["-p", "."], directory);
    assert.equal(checked.code, 0, checked.stdout + checked.stderr);
    const tested = await run("tsx", ["--test", ...tests], directory);
    assert.equal(tested.code, 0, tested.stdout + tested.stderr);
    assert.match(tested.stdout, /pass 3\b/);
    assert.match(tested.stdout, /fail 0\b/);
    // The added test files are left out of the scan: the example still prints exactly what the README shows.
    const started = await run("tsx", example.command, directory);
    assert.equal(started.code, 0, started.stderr);
    assert.equal(started.stdout, example.output);
  });
});

test("a block of docs/ that no test checks is refused, in any fence form, and an excerpt that is not part of its file is caught", () => {
  const checkable = (text: string): void => {
    const shown = readBlocks("a document", text);
    checkExcerpts("a document", shown, { ...example.files, "src/type.ts": typeSource });
  };
  checkable("```ts\n// src/type.ts (excerpt)\nexport type Context = {\n  data: Record<string, any>;\n  traceId: string;\n  date: Date;\n};\n```\n");
  assert.throws(() => checkable("```ts\n// src/type.ts (excerpt)\nexport type Context = { other: number };\n```\n"), /not part of that README example file/);
  assert.throws(() => checkable("```\nplain\n```\n"), /no test runs/);
  assert.throws(() => checkable("~~~ts\nplain\n~~~\n"), /no test checks/);
  assert.throws(() => checkable("1. item\n\n   ```ts\n   plain\n   ```\n"), /no test checks/);
  assert.throws(() => checkable("```ts extra\nplain\n```\n"), /no test checks/);
});

test("the tests the docs add catch a broken use case and an application that does not start", async () => {
  const useCase = "src/usecase/stock/stock_transfer.ts";
  const broken = {
    // The use case forgets to report what it changed.
    [useCase]: (example.files[useCase] ?? "").replace("    await notifyWarehouses(ctx, moved);\n", ""),
    // The marker list lacks a marker the example uses, so startup stops.
    "src/markers.ts": (example.files["src/markers.ts"] ?? "").replace(', "Audit"', ""),
  };
  assert.notEqual(broken[useCase], example.files[useCase]);
  assert.notEqual(broken["src/markers.ts"], example.files["src/markers.ts"]);
  await withFixture({ ...installation(), ...example.files, ...example.additions, ...broken }, async (directory) => {
    const tested = await run("tsx", ["--test", "main.test.ts", "src/usecase/stock/stock_transfer.test.ts"], directory);
    assert.notEqual(tested.code, 0);
    assert.match(tested.stdout, /fail 2\b/);
    assert.match(tested.stdout, /@Audit is not an allowed marker/);
  });
});

/** The rows of the checklist: `| <number> | <text> | <level> | <checker>[: <detail>] |`. */
function checklistRows(): { number: string; text: string; level: string; checker: string }[] {
  const rows = [...checklist.matchAll(/^\| ([A-Z]+-\d+) \| (.*) \| (Wajib|Opsional) \| (Mesin|Reviewer|Proses)\b[^|]* \|$/gm)].map((match) => ({
    number: match[1] ?? "",
    text: match[2] ?? "",
    level: match[3] ?? "",
    checker: match[4] ?? "",
  }));
  // Every table row of a rule is one of the rows read above, so no row escapes the check by a different form.
  assert.equal(rows.length, [...checklist.matchAll(/^\| [A-Z]+-\d+ \|/gm)].length, "a rule row of REVIEW_CHECKLIST.md is not '| <number> | <text> | Wajib|Opsional | Mesin|Reviewer|Proses |'");
  return rows;
}

test("REVIEW_CHECKLIST.md lists every rule of docs/ exactly once, with its heading word for word, its level and who checks it", () => {
  const rows = checklistRows();
  assert.deepEqual(rows.map(({ number }) => number), allRules.map(({ number }) => number), "REVIEW_CHECKLIST.md does not list every rule of docs/ exactly once, in the order of docs/");
  for (const { number, text, level } of rows) assert.deepEqual({ text, level }, { text: allRules.find((rule) => rule.number === number)?.text, level: allRules.find((rule) => rule.number === number)?.level }, `REVIEW_CHECKLIST.md states ${number} differently from docs/`);
  // One table for each rule document of docs/.
  for (const [path] of RULE_FILES) assert.ok(checklist.includes(`](${path})`), `REVIEW_CHECKLIST.md has no table for ${path}`);
  // A machine checks only what Skeleto at startup and the gap test check; everything else is left to the reviewer, or, for the process, to the owner.
  assert.deepEqual(rows.filter(({ checker }) => checker === "Mesin").map(({ number }) => number), ["UC-1", "UC-4", "GW-1", "GW-12", "WRP-5", "UTG-3"]);
  assert.deepEqual(rows.filter(({ checker }) => checker === "Proses").map(({ number }) => number).filter((number) => !number.startsWith("DEV-")), []);
  // The rule that a gateway depends on configs only is listed, and so are the rules of 2026-11-22.
  for (const number of ["GW-12", "UC-16", "WRP-7"]) assert.ok(rows.some((row) => row.number === number), `REVIEW_CHECKLIST.md lacks ${number}`);
});

test("REVIEW_CHECKLIST.md shows the form of a finding, and its example cites a real rule at the real line", () => {
  assert.match(checklist, /^> `<rule> <file>:<line>: <what breaks the rule>\. Fix: <the change asked for>\.`$/m);
  const [, rule, path, line] = /^> ([A-Z]+-\d+) (\S+\.ts):(\d+): .*\. Fix: \S.*\.$/m.exec(checklist) ?? [];
  assert.ok(rule && path && line, "REVIEW_CHECKLIST.md gives no example finding in the form it asks for");
  assert.ok(allRules.some((candidate) => candidate.number === rule), `the example finding cites ${rule}, which does not exist`);
  assert.match(example.files[path]?.split("\n")[Number(line) - 1] ?? "", /^export function implStockTransfer\(/, `${path}:${line} is not the line the example finding is about`);
});

test("REVIEW_CHECKLIST.md holds the gap test only: no architecture test and no startup guard", () => {
  assert.deepEqual(Object.keys(example.checklist).sort(), ["gaps.test.ts"]);
  assert.doesNotMatch(checklist, /startup guard|UseCaseWrapper|use_case_wrapper/);
  assert.doesNotMatch(checklist, /architecture test|architecture\.test/);
});

/** The README example with every file the other documents add, and the checklist's tests, as an application would hold them. */
function application(changes: Record<string, string> = {}): Record<string, string> {
  return { ...installation(), ...example.files, ...example.additions, ...example.checklist, ...changes };
}

// A second use case, for the copies that break the rules.
const stockCount = `import type { ActionHandler } from "skeleto";

export type StockCount = ActionHandler<string, number>;

/**
 * Counts the units a warehouse holds.
 *
 * @UseCase
 */
export function implStockCount(): StockCount {
  return async () => 0;
}
`;

/** A copy of the example's use case that asks for the given type among its dependencies, declared in `stock_count.ts`. */
function stockTransferOn(type: string): Record<string, string> {
  const path = "src/usecase/stock/stock_transfer.ts";
  const source = (example.files[path] ?? "")
    .replace('import type { ActionHandler } from "skeleto";\n', 'import type { ActionHandler } from "skeleto";\nimport type { StockCount } from "./stock_count.js";\n')
    .replace("notifyWarehouses: NotifyWarehouses): StockTransfer", `notifyWarehouses: NotifyWarehouses, stockCount: ${type}): StockTransfer`);
  assert.notEqual(source, example.files[path]);
  return { [path]: source };
}

test("the checklist's gap test type-checks with the example, and the example's behaviour is left alone", async () => {
  await withFixture(application(), async (directory) => {
    const checked = await run("tsc", ["-p", "."], directory);
    assert.equal(checked.code, 0, checked.stdout + checked.stderr);
    const started = await run("tsx", example.command, directory);
    assert.equal(started.code, 0, started.stderr);
    assert.deepEqual(started.stdout.split("\n"), example.output.split("\n"));
  });
});

test("Skeleto refuses, before the application's code runs, a use case that depends on another use case", async () => {
  await withFixture(application({ ...stockTransferOn("StockCount"), "src/usecase/stock/stock_count.ts": stockCount }), async (directory) => {
    const started = await run("tsx", example.command, directory);
    assert.notEqual(started.code, 0);
    assert.equal(started.stdout, "");
    assert.match(started.stderr, /StockTransfer: is a @UseCase and depends on StockCount, which is a @UseCase/);
  });
});

// A map and the markers of an application whose gaps are all closed: one by a marker, one by a decision.
const closedMap = JSON.stringify({ gaps: [{ id: "stock_transfer-1", question: "Who may move stock?" }, { id: "stock_transfer-2", question: "May stock go negative?", decision: "No, 2026-11-20" }] });

/** The example's use case, with markers on the line above the step they concern. */
function withMarkers(...markers: string[]): Record<string, string> {
  const path = "src/usecase/stock/stock_transfer.ts";
  const source = (example.files[path] ?? "").replace("    const moved = ", `${markers.map((marker) => `    // TechDebt ${marker}\n`).join("")}    const moved = `);
  assert.notEqual(source, example.files[path]);
  return { [path]: source };
}

test("the gap test passes when every gap has a marker or a decision and every marker names a gap, and leaves Planned and Shortcut markers alone", async () => {
  const changes = { "docs/scenarios/stock_transfer.json": closedMap, ...withMarkers("stock_transfer-1: nobody checks who moves", "Planned Notifications: a real notifier", "Shortcut: one lock at a time") };
  await withFixture(application(changes), async (directory) => {
    const checked = await run("tsc", ["-p", "."], directory);
    assert.equal(checked.code, 0, checked.stdout + checked.stderr);
    const tested = await run("tsx", ["--test", "gaps.test.ts"], directory);
    assert.equal(tested.code, 0, tested.stdout + tested.stderr);
    assert.match(tested.stdout, /pass 2\b/);
    assert.match(tested.stdout, /fail 0\b/);
  });
});

test("the gap test fails, naming it, for a gap without a marker or a decision, and for a marker that names an unknown id", async () => {
  const cases: [string, Record<string, string>, RegExp, RegExp][] = [
    ["a gap with neither marker nor decision", { "docs/scenarios/stock_transfer.json": closedMap }, /UTG-3: every gap has a marker or a recorded decision/, /stock_transfer-1/],
    ["a marker for an id on no map", { "docs/scenarios/stock_transfer.json": closedMap, ...withMarkers("stock_transfer-1: x", "stock_transfer-9: x") }, /UTG-3: every marker names a gap that is on a map/, /stock_transfer-9 in src\/usecase\/stock\/stock_transfer\.ts/],
    ["a marker with no map at all", withMarkers("stock_transfer-3: x"), /UTG-3: every marker names a gap that is on a map/, /stock_transfer-3/],
  ];
  for (const [name, changes, failing, offender] of cases) {
    await withFixture(application(changes), async (directory) => {
      const tested = await run("tsx", ["--test", "gaps.test.ts"], directory);
      assert.notEqual(tested.code, 0, `${name}: the gap test passed`);
      assert.match(tested.stdout, /fail 1\b/, name);
      assert.match(tested.stdout, new RegExp(`not ok \\d+ - ${failing.source}`), name);
      assert.match(tested.stdout, offender, name);
    });
  }
});
