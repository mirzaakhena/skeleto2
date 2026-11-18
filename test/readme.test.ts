import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_EXCLUDE } from "../src/index.js";
import { withFixture } from "./fixture.js";

const repo = fileURLToPath(new URL("..", import.meta.url));
const readme = readFileSync(`${repo}README.md`, "utf8");

const bestPractices = readFileSync(`${repo}BEST_PRACTICES.md`, "utf8");

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
};

/** The README holds the one runnable example; every other code block of the README and of BEST_PRACTICES.md is an excerpt of it. */
function readExample(readmeText: string, bestPracticesText: string): Example {
  const blocks = readBlocks("README", readmeText);
  const { files, commands, outputs } = blocks;
  checkExcerpts("README", blocks, files);
  assert.equal(commands.length, 1, "the README shows exactly one command");
  assert.equal(outputs.length, 1, "the README shows exactly one output");
  assert.match(commands[0] ?? "", /^npx tsx \S+$/);

  // BEST_PRACTICES.md runs nothing of its own: a full file, a command or an output there would be checked by no test.
  const practices = readBlocks("BEST_PRACTICES.md", bestPracticesText);
  assert.deepEqual(Object.keys(practices.files), [], "BEST_PRACTICES.md may show excerpts of the README example only, not whole files");
  assert.deepEqual([...practices.commands, ...practices.outputs], [], "BEST_PRACTICES.md may show excerpts of the README example only, not commands or output");
  checkExcerpts("BEST_PRACTICES.md", practices, files);
  return { files, command: (commands[0] ?? "").split(" ").slice(2), output: outputs[0] ?? "" };
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
  return new Promise((done) => {
    execFile(`${repo}node_modules/.bin/${tool}`, args, { cwd, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" } }, (error, stdout, stderr) => {
      done({ code: error ? (typeof error.code === "number" ? error.code : 1) : 0, stdout, stderr });
    });
  });
}

const example = readExample(readme, bestPractices);

test("the README covers the three kinds, the start and the container", () => {
  const sources = Object.values(example.files).join("\n");
  for (const needed of ["@Config", "@Action", '@Wrapper {"ordinal": 10}', "@UseCase", "@Gateway", "@Transaction", "Skeleto.start(", "decorators: MARKERS", "getContainer()", "getMetadata()"]) {
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

test("CLAUDE.md states the rule for async configs in sections 4.3 and 4.7", () => {
  const guide = readFileSync(`${repo}CLAUDE.md`, "utf8");
  const section = (number: string): string => new RegExp(`^### ${number.replace(".", "\\.")} [\\s\\S]*?(?=^###? )`, "m").exec(guide)?.[0] ?? "";
  assert.match(section("4.3"), /`Promise<X>`[\s\S]*nama komponennya `X`/);
  assert.match(section("4.3"), /`@Wrapper` dan `@Action` selalu sinkron/);
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
    // Larger ordinal outside: the ordinal 10 wrapper is entered before, and left after, the wrapper without an ordinal.
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
      additionalDecorators: [{ name: "UseCase" }, { name: "Transaction" }, { name: "Audit", data: { level: "info" } }],
    });
    for (const gateway of ["LockWarehouses", "SaveWarehouses"]) assert.deepEqual(metadata(gateway), { dependencies: ["Database"], additionalDecorators: [{ name: "Gateway" }] });
    assert.deepEqual(metadata("NotifyWarehouses"), { dependencies: ["Logger"], additionalDecorators: [{ name: "Gateway" }] });
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
    // Use cases and gateways are told apart by their markers, never by their names or folders; every action is one of the two.
    const actions = [...components].filter(([, component]) => component.kind === "Action");
    const useCases = actions.filter(([, component]) => component.markers.includes("UseCase")).map(([name]) => name);
    const gateways = actions.filter(([, component]) => component.markers.includes("Gateway")).map(([name]) => name);
    assert.deepEqual(useCases, ["StockTransfer"]);
    assert.deepEqual(gateways.sort(), ["LockWarehouses", "NotifyWarehouses", "SaveWarehouses"]);
    for (const [name, component] of actions) assert.equal(component.markers.filter((marker) => marker === "UseCase" || marker === "Gateway").length, 1, `${name} is not exactly one of use case and gateway`);
    for (const useCase of useCases) {
      assert.ok(components.get(useCase)?.markers.includes("Transaction"), `use case ${useCase} carries no @Transaction`);
      for (const dependency of components.get(useCase)?.dependencies ?? []) assert.ok(!useCases.includes(dependency), `use case ${useCase} depends on use case ${dependency}`);
    }
    for (const name of ["Warehouse", "BusinessError", "newWarehouse", "transfer"]) assert.ok(!components.has(name), `${name} became a component`);
  });
});

test("BEST_PRACTICES.md holds both recommendations, says Skeleto does not check them, and shows the rule and the use case", () => {
  assert.match(bestPractices, /^## One use case per file$/m);
  assert.match(bestPractices, /^## Entities hold the rules, use cases orchestrate$/m);
  assert.match(bestPractices, /Skeleto does not check them/);
  assert.match(bestPractices, /```ts\n\/\/ src\/entity\/warehouse\.ts \(excerpt\)\nexport function transfer/);
  assert.match(bestPractices, /```ts\n\/\/ src\/usecase\/stock\/stock_transfer\.ts \(excerpt\)\n/);
  assert.match(bestPractices, /still lets an action depend on another action/);
  for (const reason of [/already a plain object/, /leaves the old state intact/, /inputs and outputs alone/, /`import \* as Warehouse from /]) assert.match(bestPractices, reason);
});

test("BEST_PRACTICES.md opens with the two levels and maps every architectural concept to what expresses it and what Skeleto checks", () => {
  const opening = bestPractices.slice(0, bestPractices.indexOf("## One use case per file"));
  assert.match(opening, /^## Two levels$/m);
  assert.match(opening, /\*\*The technical level\*\* is what Skeleto recognises and enforces: the markers `@Config`, `@Wrapper` and `@Action`/);
  assert.match(opening, /\*\*The architectural level\*\*[^\n]*entities, use cases, gateways\. Skeleto does not know about any of them/);
  assert.match(opening, /mechanism versus policy/);
  const rows = new Map(
    [...opening.matchAll(/^\| ([^|]+?) \| ([^|]+?) \| ([^|]+?) \|$/gm)].slice(2).map((match) => [match[1] ?? "", { expressed: match[2] ?? "", checked: match[3] ?? "" }]),
  );
  assert.deepEqual([...rows.keys()], ["Entity", "Use case", "Gateway", "Resource, such as a database or settings", "Cross-cutting concern, such as logging or transactions"]);
  assert.match(rows.get("Entity")?.expressed ?? "", /no marker, not a component/);
  assert.equal(rows.get("Entity")?.checked, "nothing");
  for (const role of ["use case", "gateway"]) {
    const row = rows.get(role[0]?.toUpperCase() + role.slice(1));
    assert.equal(row?.expressed, "`@Action`");
    assert.match(row?.checked ?? "", new RegExp(`the rules of an action; not that it is a ${role}`));
  }
  assert.equal(rows.get("Resource, such as a database or settings")?.expressed, "`@Config`");
  assert.match(rows.get("Cross-cutting concern, such as logging or transactions")?.expressed ?? "", /^`@Wrapper`, chosen per action by additional markers/);
  // The opening comes first: before the two recommendations.
  assert.ok(bestPractices.indexOf("## Two levels") < bestPractices.indexOf("## One use case per file"));
  assert.ok(bestPractices.indexOf("## One use case per file") < bestPractices.indexOf("## Entities hold the rules"));
});

test("the README leaves the recommendations to BEST_PRACTICES.md and links to it on one line", () => {
  assert.doesNotMatch(readme, /^## One use case per file$/m);
  assert.doesNotMatch(readme, /^## Entities hold the rules/m);
  assert.doesNotMatch(readme, /Skeleto does not check (it|them)/);
  assert.equal(readme.split("\n").filter((line) => line.includes("(BEST_PRACTICES.md")).length, 1);
});

test("the README and CLAUDE.md name the exclude option, the constant and every default entry", () => {
  for (const text of [readme, readFileSync(`${repo}CLAUDE.md`, "utf8")]) {
    for (const needed of ["exclude", "DEFAULT_EXCLUDE", ...DEFAULT_EXCLUDE]) assert.ok(text.includes(`\`${needed}\``), `${needed} is not documented`);
  }
});

test("the README and BEST_PRACTICES.md stay clear of what Skeleto dropped", () => {
  for (const banned of [/readTypeArguments/i, /@Controller/i, /@RequestPart/i, /payload/i]) {
    assert.doesNotMatch(readme, banned);
    assert.doesNotMatch(bestPractices, banned);
  }
});

test("every component function of the README example is named impl followed by its component's name", () => {
  const kinds = new Set<string>();
  for (const [path, source] of Object.entries(example.files)) {
    for (const [, comment, name, returned] of source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\nexport (?:async )?function (\w+)\([^)]*\): ([\w.<>]+)/g)) {
      const kind = /^\s*\*?\s*@(Config|Wrapper|Action)\b/m.exec(comment ?? "")?.[1];
      if (!kind) continue;
      kinds.add(kind);
      assert.equal(name, `impl${(returned ?? "").replace(/^Promise<(.*)>$/, "$1")}`, `${path}: ${name} is not impl + its component's name`);
    }
  }
  assert.deepEqual([...kinds].sort(), ["Action", "Config", "Wrapper"]);
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
  assert.match(example.files["src/markers.ts"] ?? "", /^export const MARKERS = \["UseCase", "Gateway", "Transaction", "Audit"\];$/m);
  assert.match(example.files["main.ts"] ?? "", /Skeleto\.start\("src", \{ decorators: MARKERS \}\)/);
  // Business errors are typed by kind, and nothing in the example speaks of the transport its caller uses.
  assert.match(example.files["src/entity/error.ts"] ?? "", /export type BusinessErrorKind = "validation" \| "not_found" \| "conflict";/);
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
