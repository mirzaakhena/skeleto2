import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_EXCLUDE } from "../src/index.js";
import { scanDirectory } from "../src/scanner.js";
import { withFixture } from "./fixture.js";

const repo = fileURLToPath(new URL("..", import.meta.url));
const readme = readFileSync(`${repo}README.md`, "utf8");

const bestPractices = readFileSync(`${repo}BEST_PRACTICES.md`, "utf8");
const technicalPractices = readFileSync(`${repo}TECHNICAL_PRACTICES.md`, "utf8");
const checklist = readFileSync(`${repo}REVIEW_CHECKLIST.md`, "utf8");
const developmentProcess = readFileSync(`${repo}DEVELOPMENT_PROCESS.md`, "utf8");

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
  /** Files another document adds to the example at paths of their own, such as its tests; they are type-checked with it, and run when they are `*.test.ts`. */
  additions: Record<string, string>;
  /** Files REVIEW_CHECKLIST.md shows for applications to copy: the architecture test and the startup guard. */
  checklist: Record<string, string>;
};

/** The README holds the one runnable example; every other code block of the README and of BEST_PRACTICES.md is an excerpt of it. */
function readExample(readmeText: string, bestPracticesText: string, technicalText: string, checklistText: string): Example {
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

  // TECHNICAL_PRACTICES.md shows excerpts of the README example, and whole files at new paths that join it; a README path there would be a second, unchecked version of it.
  const technical = readBlocks("TECHNICAL_PRACTICES.md", technicalText);
  assert.deepEqual([...technical.commands, ...technical.outputs], [], "TECHNICAL_PRACTICES.md may show code only, not commands or output");
  checkExcerpts("TECHNICAL_PRACTICES.md", technical, files);
  for (const path of Object.keys(technical.files)) assert.ok(!(path in files), `TECHNICAL_PRACTICES.md shows ${path} in full, which is a README example file; show an excerpt of it instead`);

  // REVIEW_CHECKLIST.md shows whole files to copy, at paths of their own; a path already taken would be a second, unchecked version of that file.
  const review = readBlocks("REVIEW_CHECKLIST.md", checklistText);
  assert.deepEqual([...review.commands, ...review.outputs], [], "REVIEW_CHECKLIST.md may show code only, not commands or output");
  checkExcerpts("REVIEW_CHECKLIST.md", review, files);
  for (const path of Object.keys(review.files)) assert.ok(!(path in files) && !(path in technical.files), `REVIEW_CHECKLIST.md shows ${path}, which another document already shows`);
  return { files, command: (commands[0] ?? "").split(" ").slice(2), output: outputs[0] ?? "", additions: technical.files, checklist: review.files };
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

const example = readExample(readme, bestPractices, technicalPractices, checklist);

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

/** The rules of BEST_PRACTICES.md: every `### ` heading, with the text up to the next heading. */
function practiceRules(text: string): { heading: string; body: string }[] {
  return [...text.matchAll(/^### (.*)\n([\s\S]*?)(?=^##+ |(?![\s\S]))/gm)].map((match) => ({ heading: match[1] ?? "", body: match[2] ?? "" }));
}

test("every rule of BEST_PRACTICES.md is numbered in order, has a level, and gives its reason first", () => {
  const rules = practiceRules(bestPractices);
  assert.ok(rules.length >= 16, "BEST_PRACTICES.md has too few rules");
  rules.forEach(({ heading, body }, index) => {
    assert.match(heading, new RegExp(`^B${index + 1}\\. \\S.* \\((Mandatory|Optional)\\)$`), `rule heading ${index + 1} is not '### B${index + 1}. <rule> (Mandatory|Optional)':\n${heading}`);
    assert.match(body, /^\nWhy: \S/, `${heading} is not followed by a 'Why:' paragraph`);
  });
  // A rule is cited by its number; after a renumbering, a citation of a number that no longer exists is caught here.
  for (const [, cited] of bestPractices.matchAll(/\bB(\d+)\b/g)) assert.ok(Number(cited) >= 1 && Number(cited) <= rules.length, `BEST_PRACTICES.md cites B${cited}, which does not exist`);
});

test("BEST_PRACTICES.md has a rule for every agreed topic", () => {
  const headings = practiceRules(bestPractices).map(({ heading }) => heading);
  const topics: [string, RegExp][] = [
    ["use cases and gateways told apart by markers", /`@UseCase`.*`@Gateway`/],
    ["one use case per file", /one use case|use case in a file of its own/i],
    ["entities are plain types and pure functions", /plain type with pure functions that return new copies/],
    ["an entity comes into being only by new<Entity>", /brought into being only by `new<Entity>`.*\(Mandatory\)/],
    ["an entity changes only through entity functions", /changed only by entity functions.*invariants.*\(Mandatory\)/],
    ["a use case writes no entity literal", /never writes an entity literal \(Mandatory\)/],
    ["validate on write, not on read", /validate on write, not on read \(Mandatory\)/],
    ["storage constraints are optional", /store enforce.*invariants.*\(Optional\)/],
    ["a use case only orchestrates", /only orchestrates/],
    ["no use case depends on another", /never depends on another use case/],
    ["entities import nothing outside entities", /Entities import nothing outside entities/],
    ["use cases know only gateway contracts", /knows gateways only by their contract types/],
    ["contracts apart from implementations", /contract apart from its implementation/],
    ["standard shapes", /insert, save, find one and find many/],
    ["gateways are not only stores", /outside the process.*gateway/],
    ["determinism", /unpredictable value comes from a gateway.*once, at the start/],
    ["the context is passed on, never read", /passes the context on and never reads it/],
    ["two levels of validation", /shape of the input in the caller and the business rules in the entities/],
    ["typed business errors", /typed by kind: validation, not found, conflict/],
    ["the caller translates; no transport", /caller translates.*never mention a transport/],
    ["own Request and Response", /own Request and Response/],
    ["the boundary with callers", /caller makes the context and calls use cases only, never a gateway/],
    ["a query never writes", /query never writes.*without `@Transaction`/],
    ["concurrency", /reads, decides and then writes is protected.*\(Mandatory\)/],
    ["the mechanism belongs to the gateway", /mechanism.*belongs to the gateway.*contract/],
    ["locked once, by one gateway, in a fixed order", /locked once, by one gateway.*fixed order/],
    ["uniqueness guarded by the store", /Uniqueness is guarded by the store, not by checking first/],
    ["atomic updates need a reason", /atomic update.*written reason \(Optional\)/],
    ["no effect before commit", /No effect outside the transaction's store happens before the commit \(Mandatory\)/],
    ["after commit or outbox, per effect", /after commit.*outbox/],
  ];
  for (const [topic, pattern] of topics) assert.ok(headings.some((heading) => pattern.test(heading)), `no rule of BEST_PRACTICES.md covers: ${topic}`);
  // Relocking is forbidden for every store, with the reason for a lock that is re-entrant and for one that is not.
  const lockedOnce = practiceRules(bestPractices).find(({ heading }) => /locked once, by one gateway/.test(heading))?.body ?? "";
  assert.match(lockedOnce, /Locking again what the same transaction already holds is not allowed, whatever the store/);
  assert.match(lockedOnce, /not re-entrant.*waits for itself/);
  assert.match(lockedOnce, /re-entrant.*hides a second fetch/);
  assert.match(bestPractices, /\| Who \| Uses the context to \|/, "BEST_PRACTICES.md has no table of who may use the context");
});

test("BEST_PRACTICES.md explains with two timelines why a transaction alone does not protect a decision, and stays generic", () => {
  const section = bestPractices.slice(bestPractices.indexOf("## Concurrency"), bestPractices.indexOf("## Technical rules"));
  assert.match(section, /A transaction alone does not give this protection/);
  for (const shape of ["Check-then-insert", "Read-change-save"]) {
    assert.ok(section.includes(`**${shape}.**`), `no ${shape} timeline`);
    // Its own part only: up to the next bold paragraph or heading, so that one shape's table cannot stand in for the other's.
    const timeline = section.slice(section.indexOf(`**${shape}.**`) + 1).split(/^\*\*|^###/m)[0] ?? "";
    // A step-by-step table: the steps of two requests side by side.
    assert.match(timeline, /^\| Step \| [^|]+ \| [^|]+ \|$(\n^\| .*\|$){7,}/m, `the ${shape} timeline is not a table of steps`);
  }
  // The outbox is told as numbered steps, and stores other than a database are named.
  assert.match(section, /^1\. .*same store, in the same transaction[\s\S]*^4\. /m);
  for (const store of ["A third-party service", "A cache", "A queue"]) assert.match(section, new RegExp(`^\\| ${store} \\|`, "m"));
  // Conceptual and portable: no database product, query language or web framework is named.
  for (const product of [/\bSQL\b/, /postgres/i, /mysql/i, /sqlite/i, /oracle/i, /mongo/i, /redis/i, /kafka/i, /rabbit/i, /dynamo/i, /\bExpress\b/, /express\.?js/i, /fastify/i, /nestjs/i, /\bkoa\b/i, /\bhono\b/i, /FOR UPDATE/, /\bReact\b/, /\bVue\b/, /\bAngular\b/, /svelte/i, /next\.?js/i, /\bNuxt\b/, /solid\.?js/i, /\bRemix\b/, /\bastro\b/i, /jquery/i]) {
    assert.doesNotMatch(bestPractices, product);
  }
});

test("BEST_PRACTICES.md resolves how an entity comes into being apart from how stored data is read", () => {
  assert.doesNotMatch(bestPractices, /made only through its creating function/);
  assert.match(bestPractices, /Reading a warehouse that is already stored does not bring it into being, and does not go through `newWarehouse`/);
  assert.match(bestPractices, /```ts\n\/\/ src\/entity\/warehouse\.ts \(excerpt\)\nexport function transfer/);
  assert.match(bestPractices, /```ts\n\/\/ src\/gateway\/memory\/warehouse\.ts \(excerpt\)\n(?:(?!\n```\n)[\s\S])*Stored data is mapped to the type and nothing more/);
});

test("BEST_PRACTICES.md says Skeleto does not check it and leaves the technical rules to TECHNICAL_PRACTICES.md", () => {
  assert.match(bestPractices, /Skeleto does not check them/);
  assert.match(bestPractices, /still lets an action depend on another action/);
  assert.ok(bestPractices.split("](TECHNICAL_PRACTICES.md)").length > 2, "BEST_PRACTICES.md does not point to TECHNICAL_PRACTICES.md");
  for (const reason of [/already a plain object/, /leaves the old state intact/, /inputs and outputs alone/, /`import \* as Warehouse from /]) assert.match(bestPractices, reason);
});

test("BEST_PRACTICES.md opens with the two levels and maps every architectural concept to what expresses it and what Skeleto checks", () => {
  const opening = bestPractices.slice(0, bestPractices.indexOf("### B1."));
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
  // The opening comes first, before any rule.
  assert.ok(bestPractices.indexOf("## Two levels") >= 0 && bestPractices.indexOf("## Two levels") < bestPractices.indexOf("### B1."));
});

test("BEST_PRACTICES.md states the principle of building from use cases before any rule, with the iceberg and the parallel work it allows", () => {
  const start = bestPractices.indexOf("## Built from use cases");
  assert.ok(start > bestPractices.indexOf("## Two levels") && start < bestPractices.indexOf("### B1."));
  const section = bestPractices.slice(start, bestPractices.indexOf("## Use cases and gateways"));
  assert.match(section, /tip of an iceberg/);
  assert.match(section, /where the complexity lies, not about what matters/);
  assert.match(section, /The frontend is as important as the rest/);
  for (const part of ["business rules", "validation", "concurrent", "fail halfway", "commit", "unpredictable"]) assert.match(section, new RegExp(part, "i"));
  assert.match(section, /the frontend and the backend can be built at the same time/);
  const levels = [...section.matchAll(/^### (B\d+)\. .* \((Mandatory|Optional)\)$/gm)].map((match) => `${match[1]} ${match[2]}`);
  assert.deepEqual(levels, ["B1 Optional", "B2 Mandatory", "B3 Mandatory", "B4 Optional"]);
  assert.equal([...section.matchAll(/^Why: /gm)].length, 4);
});

test("every B citation in the repository points to a rule that exists, and rules are numbered in reading order", () => {
  const numbers = [...bestPractices.matchAll(/^### B(\d+)\. /gm)].map((match) => Number(match[1]));
  assert.deepEqual(numbers, numbers.map((_, index) => index + 1));
  for (const text of [bestPractices, technicalPractices, checklist, readme]) {
    for (const match of text.matchAll(/\bB(\d+)\b/g)) assert.ok(Number(match[1]) >= 1 && Number(match[1]) <= numbers.length, `B${match[1]} does not exist`);
  }
});

test("the README leaves the recommendations to BEST_PRACTICES.md and links to it on one line", () => {
  assert.doesNotMatch(readme, /^## One use case per file$/m);
  assert.doesNotMatch(readme, /^## Entities hold the rules/m);
  assert.doesNotMatch(readme, /Skeleto does not check (it|them)/);
  assert.equal(readme.split("\n").filter((line) => line.includes("(BEST_PRACTICES.md")).length, 1);
});

test("the README points to TECHNICAL_PRACTICES.md on the line that points to BEST_PRACTICES.md", () => {
  const lines = readme.split("\n").filter((line) => line.includes("(TECHNICAL_PRACTICES.md"));
  assert.equal(lines.length, 1);
  assert.ok(lines[0]?.includes("(BEST_PRACTICES.md"));
});

test("the README and CLAUDE.md name the exclude option, the constant and every default entry", () => {
  for (const text of [readme, readFileSync(`${repo}CLAUDE.md`, "utf8")]) {
    for (const needed of ["exclude", "DEFAULT_EXCLUDE", ...DEFAULT_EXCLUDE]) assert.ok(text.includes(`\`${needed}\``), `${needed} is not documented`);
  }
});

test("the README and the practice files stay clear of what Skeleto dropped", () => {
  for (const banned of [/readTypeArguments/i, /@Controller/i, /@RequestPart/i, /payload/i]) {
    assert.doesNotMatch(readme, banned);
    assert.doesNotMatch(bestPractices, banned);
    assert.doesNotMatch(technicalPractices, banned);
    assert.doesNotMatch(checklist, banned);
  }
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
    assert.deepEqual([...new Set(functions.map(({ metadata }) => metadata.mainDecorator.name))].sort(), ["Action", "Config", "Wrapper"]);
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
  assert.match(example.files["src/markers.ts"] ?? "", /^export const MARKERS = \["UseCase", "Gateway", "Transaction", "Audit"\];$/m);
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

test("every rule of TECHNICAL_PRACTICES.md is a numbered heading with a level, followed by its reason", () => {
  const sections = technicalPractices.split(/^(?=#{1,3} )/m).filter((section) => section.startsWith("### "));
  assert.ok(sections.length >= 13, "TECHNICAL_PRACTICES.md has fewer rules than topics");
  sections.forEach((section, index) => {
    const heading = section.slice(0, section.indexOf("\n"));
    assert.match(heading, new RegExp(`^### T${index + 1}\\. \\S.* \\((Mandatory|Optional)\\)$`), `rule ${index + 1} is not numbered T${index + 1} with a level: ${heading}`);
    assert.match(section, /^Why: \S/m, `${heading} gives no Why: paragraph`);
  });
  // No deeper heading hides a rule from the numbering.
  assert.doesNotMatch(technicalPractices, /^#{4,} /m);
});

test("TECHNICAL_PRACTICES.md covers every agreed topic, and names no product or framework", () => {
  const rule = (pattern: RegExp): string => {
    const section = technicalPractices.split(/^(?=#{1,3} )/m).find((part) => part.startsWith("### T") && pattern.test(part.slice(0, part.indexOf("\n"))));
    assert.ok(section, `no rule heading matches ${pattern}`);
    return section;
  };
  rule(/takes its dependencies and returns/);
  assert.match(rule(/named `impl` followed by/), /implConnection/);
  rule(/named type alias/);
  rule(/never an inline or generic type/);
  rule(/parameter is named after its type/);
  rule(/path follows from the name/);
  assert.match(rule(/description first/), /README\.md#rules-worth-knowing/);
  assert.match(rule(/allowed markers are kept in one exported constant/), /`UseCase`, `Gateway` and `Transaction`/);
  rule(/One wrapper per marker/);
  rule(/opens the transaction and keeps it in the context/);
  assert.match(rule(/only through a function of the context \(Mandatory\)/), /implDatabase/);
  assert.match(rule(/joined, never doubled \(Mandatory\)/), /ctx\.data\.transaction/);
  const afterCommit = rule(/only after commit \(Mandatory\)/);
  assert.match(afterCommit, /ctx\.data\.afterCommit\.push/);
  assert.match(afterCommit, /for \(const effect of afterCommit\) await effect\(\);/);
  assert.match(afterCommit, /\*\*This form can lose the effect\.\*\* If the process stops after the commit/);
  assert.match(afterCommit, /outbox[^\n]*\(BEST_PRACTICES\.md\)/);
  assert.match(rule(/sets its own timeout/), /README\.md#asynchronous-configs/);
  rule(/taken from the container once, at startup/);
  rule(/hand-written fakes typed by the gateway contracts, without starting Skeleto and without a mock library/);
  rule(/fix every unpredictable value/);
  rule(/compares whole objects/);
  rule(/One integration test starts Skeleto/);
  assert.match(rule(/generated files are left out of the scan/), /README\.md#files-the-scan-leaves-out/);
  for (const banned of [/\bSQL\b/, /postgres/i, /mysql/i, /sqlite/i, /mongo/i, /redis/i, /kafka/i, /express/i, /fastify/i, /\bnest/i, /\bkoa\b/i, /\bhono\b/i, /next\.js/i, /\bhttp\b/i]) {
    assert.doesNotMatch(technicalPractices, banned);
  }
});

test("the files TECHNICAL_PRACTICES.md adds type-check with the README example, and its tests pass", async () => {
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

test("the tests TECHNICAL_PRACTICES.md adds catch a broken use case and an application that does not start", async () => {
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

/** The numbered rules of a practice file, by number, with their text and level. */
function numberedRules(text: string): Map<string, { text: string; level: string }> {
  return new Map([...text.matchAll(/^### ([BTP]\d+)\. (.*) \((Mandatory|Optional)\)$/gm)].map((match) => [match[1] ?? "", { text: match[2] ?? "", level: match[3] ?? "" }]));
}

function checkerOf(number: string): string {
  return new RegExp(`^\\| ${number} \\| .* \\| (Machine|Reviewer|Process)\\b`, "m").exec(checklist)?.[1] ?? "";
}

test("REVIEW_CHECKLIST.md lists every rule of the three practice files exactly once, with its text, its level and who checks it", () => {
  const rules = new Map([...numberedRules(bestPractices), ...numberedRules(technicalPractices), ...numberedRules(developmentProcess)]);
  assert.ok(rules.size >= 50, "the practice files have fewer rules than expected");
  const rows = [...checklist.matchAll(/^\| ([BTP]\d+) \| (.*) \| (Mandatory|Optional) \| (Machine|Reviewer|Process)\b[^|]* \|$/gm)].map((match) => ({
    number: match[1] ?? "",
    text: match[2] ?? "",
    level: match[3] ?? "",
    checker: match[4] ?? "",
  }));
  // Every table row of a rule is one of the rows read above, so no row escapes the check by a different form.
  assert.equal(rows.length, [...checklist.matchAll(/^\| [BTP]\d+ \|/gm)].length, "a rule row of REVIEW_CHECKLIST.md is not '| <number> | <text> | <level> | Machine|Reviewer|Process |'");
  assert.deepEqual(
    rows.map(({ number }) => number),
    [...rules.keys()],
    "REVIEW_CHECKLIST.md does not list every rule exactly once, in order",
  );
  for (const { number, text, level } of rows) assert.deepEqual({ text, level }, rules.get(number), `REVIEW_CHECKLIST.md states ${number} differently from its practice file`);
  // A machine checks only what the architecture test checks; everything else is left to the reviewer.
  assert.deepEqual(rows.filter(({ checker }) => checker === "Machine").map(({ number }) => number), ["B5", "B8"]);
  // Of the process rules, only those that leave a file in the repository can be read by a reviewer; the rest are checked with the owner.
  assert.deepEqual(rows.filter(({ number }) => number.startsWith("P") && checkerOf(number) === "Reviewer").map(({ number }) => number), ["P4", "P5", "P9", "P10"]);
  assert.deepEqual(rows.filter(({ number }) => !number.startsWith("P")).filter(({ checker }) => checker === "Process"), []);
});

test("the README links to REVIEW_CHECKLIST.md on the line that links to the two practice files", () => {
  const lines = readme.split("\n").filter((line) => line.includes("(REVIEW_CHECKLIST.md)"));
  assert.equal(lines.length, 1);
  assert.ok(lines[0]?.includes("(BEST_PRACTICES.md)") && lines[0]?.includes("(TECHNICAL_PRACTICES.md)"));
});

test("REVIEW_CHECKLIST.md shows the form of a finding, and its example cites a real rule at the real line", () => {
  assert.match(checklist, /^> `<rule> <file>:<line>: <what breaks the rule>\. Fix: <the change asked for>\.`$/m);
  const [, rule, path, line] = /^> ([BTP]\d+) (\S+\.ts):(\d+): .*\. Fix: \S.*\.$/m.exec(checklist) ?? [];
  assert.ok(rule && path && line, "REVIEW_CHECKLIST.md gives no example finding in the form it asks for");
  assert.ok(new Map([...numberedRules(bestPractices), ...numberedRules(technicalPractices), ...numberedRules(developmentProcess)]).has(rule), `the example finding cites ${rule}, which does not exist`);
  assert.match(example.files[path]?.split("\n")[Number(line) - 1] ?? "", /^export function implStockTransfer\(/, `${path}:${line} is not the line the example finding is about`);
});

test("REVIEW_CHECKLIST.md marks the startup guard Optional and states the ordering it relies on", () => {
  assert.deepEqual(Object.keys(example.checklist).sort(), ["architecture.test.ts", "src/use_case_wrapper.ts"]);
  const section = checklist.slice(checklist.indexOf("## Optional: the startup guard"));
  assert.ok(checklist.includes("## Optional: the startup guard"));
  assert.match(section, /It is \*\*Optional\*\*/);
  assert.match(section, /an action's dependencies are created before the action, and every action is offered to every wrapper as soon as it is created/);
  assert.match(example.checklist["src/use_case_wrapper.ts"] ?? "", /^ \* Optional\./m);
});

/** The README example with every file the other documents add, and the checklist's architecture test and guard, as an application would hold them. */
function application(changes: Record<string, string> = {}, guard = true): Record<string, string> {
  const { "src/use_case_wrapper.ts": guardFile, ...copied } = example.checklist;
  return { ...installation(), ...example.files, ...example.additions, ...copied, ...(guard ? { "src/use_case_wrapper.ts": guardFile ?? "" } : {}), ...changes };
}

// A second use case, for the copies that break the rules.
const stockCount = `import type { ActionHandler } from "skeleto";

export type StockCount = ActionHandler<string, number>;

/**
 * Counts the units a warehouse holds.
 *
 * @Action
 * @UseCase
 */
export function implStockCount(): StockCount {
  return async () => 0;
}
`;

/** A copy of the example's use case that asks for a use case among its dependencies. */
function useCaseOnUseCase(): Record<string, string> {
  const path = "src/usecase/stock/stock_transfer.ts";
  const source = (example.files[path] ?? "")
    .replace('import type { ActionHandler } from "skeleto";\n', 'import type { ActionHandler } from "skeleto";\nimport type { StockCount } from "./stock_count.js";\n')
    .replace("notifyWarehouses: NotifyWarehouses): StockTransfer", "notifyWarehouses: NotifyWarehouses, stockCount: StockCount): StockTransfer");
  assert.notEqual(source, example.files[path]);
  return { "src/usecase/stock/stock_count.ts": stockCount, [path]: source };
}

test("the checklist's architecture test and guard type-check with the example, pass on it, and leave its behaviour alone", async () => {
  await withFixture(application(), async (directory) => {
    const checked = await run("tsc", ["-p", "."], directory);
    assert.equal(checked.code, 0, checked.stdout + checked.stderr);
    const tested = await run("tsx", ["--test", "architecture.test.ts"], directory);
    assert.equal(tested.code, 0, tested.stdout + tested.stderr);
    assert.match(tested.stdout, /pass 3\b/);
    assert.match(tested.stdout, /fail 0\b/);
    // The guard prints nothing and wraps nothing: the example prints what the README shows, with the guard listed in the container as one more wrapper.
    const started = await run("tsx", example.command, directory);
    assert.equal(started.code, 0, started.stderr);
    const lines = started.stdout.split("\n");
    assert.ok(lines.includes('UseCaseWrapper: @Wrapper {"dependencies":[],"additionalDecorators":[]}'));
    assert.deepEqual(lines.filter((line) => !line.startsWith("UseCaseWrapper: ")), example.output.split("\n"));
  });
});

test("both the architecture test and the startup guard catch a use case that depends on another use case", async () => {
  // Without the guard the application starts, and the architecture test names the dependency.
  await withFixture(application(useCaseOnUseCase(), false), async (directory) => {
    const tested = await run("tsx", ["--test", "architecture.test.ts"], directory);
    assert.notEqual(tested.code, 0);
    assert.match(tested.stdout, /fail 1\b/);
    assert.match(tested.stdout, /not ok \d+ - B8: no use case depends on another use case/);
    assert.match(tested.stdout, /StockTransfer -> StockCount/);
  });
  // With the guard the application does not start at all.
  await withFixture(application(useCaseOnUseCase()), async (directory) => {
    const started = await run("tsx", example.command, directory);
    assert.notEqual(started.code, 0);
    assert.equal(started.stdout, "");
    assert.match(started.stderr, /implStockTransfer .* failed while wrapping it with UseCaseWrapper: use case StockTransfer depends on use case StockCount, which B8 forbids/);
  });
});

test("the architecture test fails when an action carries neither marker, and when a gateway depends on a use case", async () => {
  const gatewayFile = "src/gateway/memory/warehouse.ts";
  const unmarked = (example.files[gatewayFile] ?? "").replace(" * @Gateway\n */\nexport function implSaveWarehouses", " */\nexport function implSaveWarehouses");
  const logFile = "src/gateway/log/warehouse.ts";
  const onUseCase = (example.files[logFile] ?? "")
    .replace('import type { NotifyWarehouses } from "../warehouse.js";\n', 'import type { NotifyWarehouses } from "../warehouse.js";\nimport type { StockCount } from "../../usecase/stock/stock_count.js";\n')
    .replace("implNotifyWarehouses(logger: Logger)", "implNotifyWarehouses(logger: Logger, stockCount: StockCount)");
  const cases: [string, Record<string, string>, RegExp, RegExp][] = [
    ["an action with neither marker", { [gatewayFile]: unmarked }, /B5: every action is marked exactly one of @UseCase and @Gateway/, /SaveWarehouses: neither/],
    ["a gateway on a use case", { [logFile]: onUseCase, "src/usecase/stock/stock_count.ts": stockCount }, /B8: no gateway depends on a use case/, /NotifyWarehouses -> StockCount/],
  ];
  for (const [name, changes, failing, offender] of cases) {
    for (const [path, source] of Object.entries(changes)) assert.notEqual(source, example.files[path], `${name}: ${path} is unchanged`);
    await withFixture(application(changes, false), async (directory) => {
      const tested = await run("tsx", ["--test", "architecture.test.ts"], directory);
      assert.notEqual(tested.code, 0, `${name}: the architecture test passed`);
      assert.match(tested.stdout, /fail 1\b/, name);
      assert.match(tested.stdout, new RegExp(`not ok \\d+ - ${failing.source}`), name);
      assert.match(tested.stdout, offender, name);
    });
  }
});

test("every rule of DEVELOPMENT_PROCESS.md is a numbered heading with a level, followed by its reason, and the steps come in order", () => {
  const sections = developmentProcess.split(/^(?=#{1,3} )/m).filter((section) => section.startsWith("### "));
  assert.equal(sections.length, 10);
  sections.forEach((section, index) => {
    const heading = section.slice(0, section.indexOf("\n"));
    assert.match(heading, new RegExp(`^### P${index + 1}\\. \\S.* \\((Mandatory|Optional)\\)$`), `rule ${index + 1} is not numbered P${index + 1} with a level: ${heading}`);
    assert.match(section, /^Why: \S/m, `${heading} gives no Why: paragraph`);
  });
  assert.doesNotMatch(developmentProcess, /^#{4,} /m);
  // The samples of the two files are tables in the text; a code block would be checked by no test.
  assert.doesNotMatch(developmentProcess, /^\s*(`{3,}|~{3,})/m);
  const rule = (number: string): string => sections.find((section) => section.startsWith(`### ${number}.`)) ?? "";
  assert.match(rule("P1"), /interview/);
  assert.match(rule("P2"), /business area[\s\S]*never a use case/);
  assert.ok(rule("P2").indexOf("**Core**") < rule("P2").indexOf("**Supporting**") && rule("P2").indexOf("**Supporting**") < rule("P2").indexOf("**Generic**"));
  assert.match(rule("P3"), /owner decides[\s\S]*only proposes/);
  assert.match(rule("P4"), /`docs\/AREAS\.md`[\s\S]*\| Area \| Class \| Reason \| Decision \|/);
  assert.match(rule("P5"), /`docs\/GLOSSARY\.md`[\s\S]*\| Term \| Meaning \|[\s\S]*Every entity name and every business-area name appears in the glossary/);
  for (const way of ["Stub", "Assumed to exist", "Simplified"]) assert.match(rule("P7"), new RegExp(`\\| \\*\\*${way}\\*\\* \\|.*\\|.*\\|`));
  assert.match(rule("P8"), /Core first/);
  assert.match(rule("P9"), /`docs\/CORE\.md`[\s\S]*use cases[\s\S]*basic entities[\s\S]*gateways[\s\S]*owner's decisions[\s\S]*stub, assumption and simplification/);
  assert.match(rule("P10"), /`docs\/scenarios\/<process>\.json`[\s\S]*states[\s\S]*choices[\s\S]*time limits[\s\S]*`gaps`[\s\S]*`<process>-<n>`[\s\S]*never reused/);
});

test("DEVELOPMENT_PROCESS.md states its scope, relates to BEST_PRACTICES.md, and names no application, product or tool", () => {
  assert.match(developmentProcess, /new application, or a large new part of one/);
  assert.match(developmentProcess, /^## How it relates to BEST_PRACTICES\.md$/m);
  assert.match(developmentProcess, /\(BEST_PRACTICES\.md#built-from-use-cases\)/);
  assert.ok(bestPractices.includes("](DEVELOPMENT_PROCESS.md)"), "BEST_PRACTICES.md does not point to DEVELOPMENT_PROCESS.md");
  assert.ok(readme.includes("](DEVELOPMENT_PROCESS.md)"), "the README does not point to DEVELOPMENT_PROCESS.md");
  for (const banned of [/kerjaan/i, /\bk2\b/i, /\bticket/i, /\bboard\b/i, /\bSQL\b/, /postgres/i, /mongo/i, /redis/i, /\bReact\b/]) assert.doesNotMatch(developmentProcess, banned);
});
