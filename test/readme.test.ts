import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  const commands: string[] = [];
  const outputs: string[] = [];
  for (const [, language, body] of text.matchAll(/^```(\w*)\n([\s\S]*?)^```$/gm)) {
    const path = /^\/\/ (\S+\.ts)\n/.exec(body ?? "")?.[1];
    if (language === "ts" && path) {
      assert.ok(!(path in files), `two README blocks are named ${path}`);
      files[path] = body ?? "";
    } else if (language === "sh") commands.push((body ?? "").trim());
    else if (language === "text") outputs.push(body ?? "");
    else assert.fail(`README has a code block that no test runs:\n${body}`);
  }
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
    assert.deepEqual(lines.slice(0, 2), ["enter GreetAll", "begin"]);
    assert.deepEqual(lines.slice(6, 8), ["commit", "leave GreetAll"]);
    // The injected action is the wrapped one, and the wrapper that returned the handler added no layer to it.
    assert.deepEqual(lines.slice(2, 6), ["enter Greet", "leave Greet", "enter Greet", "leave Greet"]);

    const metadata = (name: string): unknown => JSON.parse((lines.find((line) => line.startsWith(`${name}: `)) ?? "").replace(/^[^{]*/, ""));
    assert.deepEqual(metadata("GreetAll"), { dependencies: ["Greet"], additionalDecorators: [{ name: "Transaction" }, { name: "Audit", data: { level: "info" } }] });
    assert.deepEqual(metadata("Greet"), { dependencies: ["Settings"], additionalDecorators: [] });
  });
});

test("the list of allowed markers in the README example is in force: a misspelled marker stops it", async () => {
  const path = Object.keys(example.files).find((name) => example.files[name]?.includes("@Transaction\n"));
  assert.ok(path, "no README example carries the @Transaction marker");
  const files = { ...example.files, [path]: (example.files[path] ?? "").replace("@Transaction\n", "@Transction\n") };
  await withFixture({ ...installation(), ...files }, async (directory) => {
    const result = await run("tsx", example.command, directory);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /makeGreetAll.*@Transction is not an allowed marker/);
    assert.equal(result.stdout, "");
  });
});

test("the README stays clear of what Skeleto dropped", () => {
  for (const banned of [/readTypeArguments/i, /@Controller/i, /@RequestPart/i, /payload/i, /\brequest\b/i, /\bresponse\b/i]) {
    assert.doesNotMatch(readme, banned);
  }
});
