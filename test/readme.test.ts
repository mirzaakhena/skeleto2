import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_EXCLUDE } from "../src/index.js";
import { withFixture } from "./fixture.js";

const repo = fileURLToPath(new URL("..", import.meta.url));
const readme = readFileSync(`${repo}README.md`, "utf8");

type Example = {
  /** Example files, by the path each block names in its first line. */
  files: Record<string, string>;
  /** Arguments of the documented `npx tsx ...` command. */
  command: string[];
  /** The output the README promises. */
  output: string;
};

/** Sorts every fenced block of the README into the example; a block of a kind that no test would run is refused. */
function readExample(text: string): Example {
  const files: Record<string, string> = {};
  const excerpts: { path: string; body: string }[] = [];
  const commands: string[] = [];
  const outputs: string[] = [];
  for (const [, language, body] of text.matchAll(/^```(\w*)\n([\s\S]*?)^```$/gm)) {
    const [, path, excerpt] = /^\/\/ (\S+\.ts)( \(excerpt\))?\n/.exec(body ?? "") ?? [];
    if (language === "ts" && path && excerpt) excerpts.push({ path, body: (body ?? "").replace(/^.*\n/, "") });
    else if (language === "ts" && path) {
      assert.ok(!(path in files), `two README blocks are named ${path}`);
      files[path] = body ?? "";
    } else if (language === "sh") commands.push((body ?? "").trim());
    else if (language === "text") outputs.push(body ?? "");
    else assert.fail(`README has a code block that no test runs:\n${body}`);
  }
  // An excerpt runs only as part of the file it names, so it must be a verbatim piece of that file.
  for (const { path, body } of excerpts) assert.ok(files[path]?.includes(body), `README excerpt of ${path} is not part of that example file:\n${body}`);
  assert.equal(commands.length, 1, "the README shows exactly one command");
  assert.equal(outputs.length, 1, "the README shows exactly one output");
  assert.match(commands[0] ?? "", /^npx tsx \S+$/);
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

const example = readExample(readme);

test("the README covers the three kinds, the start and the container", () => {
  const sources = Object.values(example.files).join("\n");
  for (const needed of ["@Config", "@Action", '@Wrapper {"ordinal": 10}', "@Transaction", "Skeleto.start(", "decorators:", "getContainer()", "getMetadata()"]) {
    assert.ok(sources.includes(needed), `no README example shows ${needed}`);
  }
  assert.ok(Object.keys(example.files).length >= 4);
});

test("the README example has an async config, and says that startup waits for it without a time limit of its own", () => {
  assert.match(example.files["src/config.ts"] ?? "", /@Config \*\/\nexport async function connectDatabase\(\): Promise<Database> \{\n[^}]*await /);
  // Its dependant asks for the plain name.
  assert.match(example.files["src/gateway/database.ts"] ?? "", /makeFindWarehouse\(database: Database\)/);
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
    assert.deepEqual(lines.slice(0, 2), ["enter StockTransfer", "begin"]);
    assert.deepEqual(lines.slice(8, 10), ["commit", "leave StockTransfer"]);
    // The injected actions are the wrapped ones, and the wrapper that returned the handler added no layer to them.
    assert.deepEqual(lines.slice(2, 8), ["enter FindWarehouse", "leave FindWarehouse", "enter FindWarehouse", "leave FindWarehouse", "enter SaveWarehouses", "leave SaveWarehouses"]);

    const metadata = (name: string): unknown => JSON.parse((lines.find((line) => line.startsWith(`${name}: `)) ?? "").replace(/^[^{]*/, ""));
    assert.deepEqual(metadata("StockTransfer"), {
      dependencies: ["FindWarehouse", "SaveWarehouses"],
      additionalDecorators: [{ name: "Transaction" }, { name: "Audit", data: { level: "info" } }],
    });
    assert.deepEqual(metadata("FindWarehouse"), { dependencies: ["Database"], additionalDecorators: [] });
    // The async config is listed under the plain name, and the database it delivered late is the one the gateways used.
    assert.ok(lines.includes('Database: @Config {"dependencies":[],"additionalDecorators":[]}'));
    assert.ok(!result.stdout.includes("Promise"));
    assert.ok(lines.includes("[ { id: 'north', units: 7 }, { id: 'south', units: 3 } ]"));
  });
});

test("the list of allowed markers in the README example is in force: a misspelled marker stops it", async () => {
  const path = Object.keys(example.files).find((name) => example.files[name]?.includes("@Transaction\n"));
  assert.ok(path, "no README example carries the @Transaction marker");
  const files = { ...example.files, [path]: (example.files[path] ?? "").replace("@Transaction\n", "@Transction\n") };
  await withFixture({ ...installation(), ...files }, async (directory) => {
    const result = await run("tsx", example.command, directory);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /makeStockTransfer.*@Transction is not an allowed marker/);
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
    const components = new Map<string, string[]>();
    for (const line of result.stdout.split("\n")) {
      const match = /^(\w+): @\w+ (\{.*\})$/.exec(line);
      if (match) components.set(match[1] ?? "", JSON.parse(match[2] ?? "{}").dependencies);
    }
    // Use cases are the actions declared below src/usecase/; the entity's functions are not in the container.
    const useCases = Object.keys(example.files)
      .filter((path) => path.startsWith("src/usecase/"))
      .flatMap((path) => [...(example.files[path] ?? "").matchAll(/^export type (\w+) = ActionHandler</gm)].map((match) => match[1] ?? ""));
    assert.ok(useCases.length > 0);
    for (const useCase of useCases) {
      const dependencies = components.get(useCase);
      assert.ok(dependencies, `${useCase} is not in the container`);
      for (const dependency of dependencies) assert.ok(!useCases.includes(dependency), `use case ${useCase} depends on use case ${dependency}`);
    }
    for (const name of ["Warehouse", "create", "transfer"]) assert.ok(!components.has(name), `${name} became a component`);
  });
});

test("the README recommends entities that hold the rules and use cases that only orchestrate, as a recommendation", () => {
  const section = /^## Entities hold the rules, use cases orchestrate$[\s\S]*?(?=^## )/m.exec(readme)?.[0] ?? "";
  assert.match(section, /Skeleto does not check it/);
  assert.match(section, /```ts\n\/\/ src\/entity\/warehouse\.ts \(excerpt\)\nexport function transfer/);
  assert.match(section, /```ts\n\/\/ src\/usecase\/stock\/stock_transfer\.ts \(excerpt\)\n/);
  assert.match(section, /still lets an action depend on another action/);
});

test("the README and CLAUDE.md name the exclude option, the constant and every default entry", () => {
  for (const text of [readme, readFileSync(`${repo}CLAUDE.md`, "utf8")]) {
    for (const needed of ["exclude", "DEFAULT_EXCLUDE", ...DEFAULT_EXCLUDE]) assert.ok(text.includes(`\`${needed}\``), `${needed} is not documented`);
  }
});

test("the README stays clear of what Skeleto dropped", () => {
  for (const banned of [/readTypeArguments/i, /@Controller/i, /@RequestPart/i, /payload/i, /\brequest\b/i, /\bresponse\b/i]) {
    assert.doesNotMatch(readme, banned);
  }
});
