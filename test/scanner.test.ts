import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { scanDirectory } from "../src/scanner.js";
import type { ScanResult } from "../src/scanner.js";
import { withFixture } from "./fixture.js";

function scan(files: Record<string, string>, allowedDecorators?: string[]): Promise<ScanResult> {
  return withFixture(files, (directory) => scanDirectory(directory, allowedDecorators));
}

/** Asserts that exactly one mistake was found and that it matches every pattern. */
function assertOneError(result: ScanResult, ...patterns: RegExp[]): void {
  assert.equal(result.errors.length, 1, `expected one error, got: ${JSON.stringify(result.errors)}`);
  for (const pattern of patterns) assert.match(result.errors[0] ?? "", pattern);
}

// ---- valid cases (4.2, 4.3, 4.5) ----

test("a component is named after its return type exactly as written, and knows where it lives", async () => {
  await withFixture({ "user.ts": `/** @Action */\nexport function implSaveUser(): SaveUser { return null as any; }\n` }, (directory) => {
    const result = scanDirectory(directory);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions, [
      {
        metadata: { name: "SaveUser", dependencies: [], mainDecorator: { name: "Action", data: undefined }, additionalDecorators: [] },
        filePath: join(directory, "user.ts"),
        functionName: "implSaveUser",
      },
    ]);
  });
});

test("a dotted or generic return type is kept as written", async () => {
  const result = await scan({
    "a.ts": `/** @Config */\nexport function implLogger(): winston.Logger { return null as any; }\n/** @Config */\nexport function implRepo(): Repository<User> { return null as any; }\n`,
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions.map((found) => found.metadata.name), ["winston.Logger", "Repository<User>"]);
});

test("dependencies are the parameter types in parameter order", async () => {
  const result = await scan({
    "a.ts": `/** @Action */\nexport function implSaveUser(logger: winston.Logger, db: Database, find: FindUser): SaveUser { return null as any; }\n`,
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions[0]?.metadata.dependencies, ["winston.Logger", "Database", "FindUser"]);
});

test("additional markers are kept with their data in the order written", async () => {
  const result = await scan({
    "a.ts": `/**\n * Saves a user.\n * @Action\n * @Transaction\n * @Logging {"level": "debug"}\n * @Role admin only\n * @param db the database\n */\nexport function implSaveUser(db: Database): SaveUser { return null as any; }\n`,
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions[0]?.metadata.mainDecorator, { name: "Action", data: undefined });
  assert.deepEqual(result.functions[0]?.metadata.additionalDecorators, [
    { name: "Transaction", data: undefined },
    { name: "Logging", data: { level: "debug" } },
    { name: "Role", data: "admin only" },
  ]);
});

test("files in nested folders are found, in sorted path order, and non-.ts files are ignored", async () => {
  await withFixture(
    {
      "z.ts": `/** @Config */\nexport function implZ(): Z { return null as any; }\n`,
      "app/usecase/deep/b.ts": `/** @Action */\nexport function implB(): B { return null as any; }\n`,
      "app/a.ts": `/** @Wrapper */\nexport function implA(): A { return null as any; }\n`,
      "notes.txt": `/** @Config */\nexport function implNote(): Note {}\n`,
      "script.js": `/** @Config */\nexport function implScript() {}\n`,
    },
    (directory) => {
      const result = scanDirectory(directory);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A", "B", "Z"]);
      assert.deepEqual(result.functions.map((found) => found.filePath), [join(directory, "app/a.ts"), join(directory, "app/usecase/deep/b.ts"), join(directory, "z.ts")]);
    },
  );
});

test("all three main markers make a component", async () => {
  const result = await scan({
    "a.ts": `/** @Config */\nexport function c(): C { return null as any; }\n/** @Wrapper */\nexport function w(): W { return null as any; }\n/** @Action */\nexport function a(): A { return null as any; }\n`,
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions.map((found) => found.metadata.mainDecorator.name), ["Config", "Wrapper", "Action"]);
});

test("only names are read: a type that is defined nowhere is not a mistake", async () => {
  const result = await scan({ "a.ts": `import { Missing } from "./does-not-exist.js";\n/** @Action */\nexport function a(m: Missing, n: NowhereDefined): AlsoNowhere { return null as any; }\n` });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions[0]?.metadata, { name: "AlsoNowhere", dependencies: ["Missing", "NowhereDefined"], mainDecorator: { name: "Action", data: undefined }, additionalDecorators: [] });
});

// ---- mistakes of 4.2 ----

test("a marked function that is not exported is a mistake naming the function", async () => {
  const result = await scan({ "a.ts": `/** @Action */\nfunction implHidden(): Hidden { return null as any; }\n` });
  assertOneError(result, /implHidden/, /not exported/);
});

test("a marked function exported as default is a mistake naming the function", async () => {
  const result = await scan({ "a.ts": `/** @Action */\nexport default function implDefault(): D { return null as any; }\n` });
  assertOneError(result, /implDefault/, /not exported by name/);
});

test("a marked function without a return type is a mistake naming the function", async () => {
  const result = await scan({ "a.ts": `/** @Config */\nexport function implNoReturn() { return 1; }\n` });
  assertOneError(result, /implNoReturn/, /no return type/);
});

test("more than one main marker is a mistake naming the function", async () => {
  const result = await scan({ "a.ts": `/**\n * @Action\n * @Config\n */\nexport function implBoth(): Both { return null as any; }\n` });
  assertOneError(result, /implBoth/, /more than one main marker/, /@Action, @Config/);
});

test("the same main marker written twice is more than one main marker", async () => {
  const result = await scan({ "a.ts": `/**\n * @Action\n * @Action\n */\nexport function implTwice(): Twice { return null as any; }\n` });
  assertOneError(result, /implTwice/, /more than one main marker/);
});

test("a parameter without a type is a mistake naming the function and the parameter", async () => {
  const result = await scan({ "a.ts": `/** @Action */\nexport function implLoose(db: Database, untyped, other: Other): Loose { return null as any; }\n` });
  assertOneError(result, /implLoose/, /parameter untyped/, /no type annotation/);
  assert.deepEqual(result.functions[0]?.metadata.dependencies, ["Database", "Other"]);
});

test("two functions returning the same type name is a mistake naming the type and both functions", async () => {
  const result = await scan({
    "a.ts": `/** @Action */\nexport function implFirst(): SaveUser { return null as any; }\n`,
    "sub/b.ts": `/** @Config */\nexport function implSecond(): SaveUser { return null as any; }\n`,
  });
  assertOneError(result, /^SaveUser:/, /implFirst/, /implSecond/);
});

test("three functions returning the same type name give one mistake per extra function", async () => {
  const result = await scan({
    "a.ts": `/** @Config */\nexport function one(): Same { return null as any; }\n/** @Config */\nexport function two(): Same { return null as any; }\n/** @Config */\nexport function three(): Same { return null as any; }\n`,
  });
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0] ?? "", /Same.*one.*two/);
  assert.match(result.errors[1] ?? "", /Same.*one.*three/);
});

// ---- 4.4: data of the main marker ----

for (const marker of ["Config", "Action"]) {
  for (const data of [`{"readTypeArguments": true}`, `{}`, `some text`, `{"ordinal": 1}`]) {
    test(`@${marker} with data ${data} is a mistake naming the function`, async () => {
      const result = await scan({ "a.ts": `/** @${marker} ${data} */\nexport function implWithData(): WithData { return null as any; }\n` });
      assertOneError(result, /implWithData/, new RegExp(`@${marker} takes no data`));
    });
  }
}

test("@Action followed by another marker on the same line is a mistake, because that marker became its data", async () => {
  const result = await scan({ "a.ts": `/** @Action @Transaction */\nexport function implInline(): Inline { return null as any; }\n` });
  assertOneError(result, /implInline/, /@Action takes no data/, /@Transaction/);
});

for (const [data, expected] of [["", undefined], [`{"ordinal": 5}`, { ordinal: 5 }], [`{"ordinal": 0}`, { ordinal: 0 }], [`{"ordinal": -3}`, { ordinal: -3 }]] as const) {
  test(`@Wrapper accepts ${data === "" ? "no data" : data}`, async () => {
    const result = await scan({ "a.ts": `/** @Wrapper ${data} */\nexport function implWrap(): Wrap { return null as any; }\n` });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions[0]?.metadata.mainDecorator, { name: "Wrapper", data: expected });
  });
}

const badWrapperData = [
  `{"ordinal": 1.5}`,
  `{"ordinal": "1"}`,
  `{"ordinal": null}`,
  `{"ordinal": true}`,
  `{"order": 1}`,
  `{"ordinal": 1, "extra": 2}`,
  `{"readTypeArguments": true}`,
  `{}`,
  `outermost`,
  `1`,
];
for (const data of badWrapperData) {
  test(`@Wrapper with data ${data} is a mistake naming the function`, async () => {
    const result = await scan({ "a.ts": `/** @Wrapper ${data} */\nexport function implWrap(): Wrap { return null as any; }\n` });
    assertOneError(result, /implWrap/, /@Wrapper takes no data or \{"ordinal": <integer>\}/);
  });
}

// ---- 4.5: additional markers and the allowed list; invalid JSON ----

const withTypo = { "a.ts": `/**\n * @Action\n * @Logging\n * @Transction\n */\nexport function implSaveUser(): SaveUser { return null as any; }\n` };

test("with a list of allowed names, an additional marker outside it is a mistake naming the marker and the function", async () => {
  const result = await scan(withTypo, ["Logging", "Transaction"]);
  assertOneError(result, /implSaveUser/, /@Transction/, /not an allowed marker/);
});

test("with a list of allowed names, markers inside it and standard tags are accepted", async () => {
  const result = await scan({ "a.ts": `/**\n * @Action\n * @Logging\n * @Transaction\n * @param db x\n * @returns y\n */\nexport function a(db: Db): A { return null as any; }\n` }, ["Logging", "Transaction"]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions[0]?.metadata.additionalDecorators.map((decorator) => decorator.name), ["Logging", "Transaction"]);
});

test("with an empty list of allowed names, every additional marker is a mistake", async () => {
  const result = await scan(withTypo, []);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0] ?? "", /implSaveUser.*@Logging/);
  assert.match(result.errors[1] ?? "", /implSaveUser.*@Transction/);
});

test("without a list, every additional marker is accepted", async () => {
  const result = await scan(withTypo);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions[0]?.metadata.additionalDecorators, [
    { name: "Logging", data: undefined },
    { name: "Transction", data: undefined },
  ]);
});

for (const [label, allowed] of [["without a list", undefined], ["with a list", ["Logging"]]] as const) {
  test(`invalid JSON in an additional marker is a mistake naming the marker and the function, ${label}`, async () => {
    const result = await scan({ "a.ts": `/**\n * @Action\n * @Logging {"level": }\n */\nexport function implBadJson(): BadJson { return null as any; }\n` }, allowed ? [...allowed] : undefined);
    assertOneError(result, /implBadJson/, /@Logging/, /invalid JSON/);
  });

  test(`invalid JSON in a main marker is a mistake naming the marker and the function, ${label}`, async () => {
    const result = await scan({ "a.ts": `/** @Wrapper {"ordinal": } */\nexport function implBadMain(): BadMain { return null as any; }\n` }, allowed ? [...allowed] : undefined);
    assertOneError(result, /implBadMain/, /@Wrapper/, /invalid JSON/);
  });
}

// ---- functions that are not components ----

const notComponents: Record<string, string> = {
  "a function without JSDoc": `export function plain(): Plain { return null as any; }\n`,
  "a function whose JSDoc has no marker at all": `/** Just a description, mail me@Action.example. */\nexport function described(x): Described { return null as any; }\n`,
  "a function with only an additional marker": `/** @Transaction {"broken": } */\nfunction onlyAdditional(x) { return x; }\n`,
  "a function with only standard tags": `/**\n * @param x a thing\n * @returns the thing\n */\nfunction standard(x) { return x; }\n`,
  "a marker in a plain comment instead of JSDoc": `// @Action\n/* @Action */\nfunction commented(x) { return x; }\n`,
  "a nested function": `export function outer(): Outer {\n  /** @Action */\n  function inner(x) { return x; }\n  return inner as any;\n}\n`,
  "an arrow function": `/** @Action */\nexport const arrow = (x) => x;\n`,
  "a function expression": `/** @Config */\nconst expression = function named(x) { return x; };\n`,
  "a class method": `export class Service {\n  /** @Action */\n  run(x) { return x; }\n  /** @Config */\n  static make(x) { return x; }\n}\n`,
  "a function inside a namespace": `namespace Inner {\n  /** @Action */\n  function hidden(x) { return x; }\n}\n`,
  "an object method": `export const holder = {\n  /** @Wrapper {"bad": 1} */\n  wrap(x) { return x; },\n};\n`,
};
for (const [label, source] of Object.entries(notComponents)) {
  test(`${label} is left alone without a mistake`, async () => {
    const result = await scan({ "a.ts": source }, ["Logging"]);
    assert.deepEqual(result, { functions: [], errors: [] });
  });
}

test("a JSDoc block that is not right above the function does not mark it", async () => {
  const result = await scan({ "a.ts": `/** @Action */\n\n/** Only a description. */\nfunction notMarked(x) { return x; }\n` });
  assert.deepEqual(result, { functions: [], errors: [] });
});

// ---- all mistakes at once ----

test("one scan returns every mistake of a fixture with several different ones", async () => {
  const result = await scan(
    {
      "a.ts": [
        `/** @Action */\nfunction implHidden(): Hidden { return null as any; }`,
        `/** @Config */\nexport function implNoReturn() { return 1; }`,
        `/**\n * @Action\n * @Wrapper\n */\nexport function implBoth(): Both { return null as any; }`,
        `/** @Action */\nexport function implLoose(untyped): Loose { return null as any; }`,
        `/** @Action {"readTypeArguments": true} */\nexport function implLegacy(): Legacy { return null as any; }`,
        `/** @Wrapper {"ordinal": 1.5} */\nexport function implWrap(): Wrap { return null as any; }`,
        `/**\n * @Action\n * @Transction\n */\nexport function implTypo(): Typo { return null as any; }`,
        `/**\n * @Action\n * @Logging {"level": }\n */\nexport function implBadJson(): BadJson { return null as any; }`,
        `/** @Config */\nexport function implDup(): Dup { return null as any; }`,
        // Everything wrong at once on one function: each of its mistakes is still reported.
        `/**\n * @Config oops\n * @Nope\n */\nfunction implWorst(a, b) { return 1; }`,
      ].join("\n\n"),
      "b/c.ts": `/** @Config */\nexport function implDupAgain(): Dup { return null as any; }\n`,
    },
    ["Logging", "Transaction"],
  );
  const expected = [
    [/implHidden/, /not exported/],
    [/implNoReturn/, /no return type/],
    [/implBoth/, /more than one main marker/],
    [/implLoose/, /parameter untyped/],
    [/implLegacy/, /@Action takes no data/],
    [/implWrap/, /@Wrapper takes no data or/],
    [/implTypo/, /@Transction is not an allowed marker/],
    [/implBadJson/, /@Logging has invalid JSON/],
    [/implWorst/, /@Config takes no data/],
    [/implWorst/, /@Nope is not an allowed marker/],
    [/implWorst/, /not exported/],
    [/implWorst/, /no return type/],
    [/implWorst/, /parameter a /],
    [/implWorst/, /parameter b /],
    [/^Dup:/, /implDup .*implDupAgain/],
  ];
  for (const patterns of expected) {
    const hits = result.errors.filter((error) => patterns.every((pattern) => pattern.test(error)));
    assert.equal(hits.length, 1, `expected exactly one error matching ${patterns.join(" and ")} in ${JSON.stringify(result.errors, null, 2)}`);
  }
  assert.equal(result.errors.length, expected.length, JSON.stringify(result.errors, null, 2));
});

// ---- never runs application code ----

test("a file that throws at module level is scanned without that throw happening", async () => {
  const flag = "__skeletoScannerFixtureRan";
  const result = await scan({
    "boom.ts": `(globalThis as any).${flag} = true;\nthrow new Error("module-level throw");\n/** @Config */\nexport function implDb(): Database { return null as any; }\n`,
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions.map((found) => found.metadata.name), ["Database"]);
  assert.equal((globalThis as Record<string, unknown>)[flag], undefined);
});

test("a file with a syntax error or a broken import does not make the scan throw", async () => {
  const result = await scan({
    "broken.ts": `import { nothing } from "no-such-package";\nconst = ;\n/** @Config */\nexport function implDb(): Database { return null as any; }\n`,
  });
  assert.deepEqual(result.functions.map((found) => found.metadata.name), ["Database"]);
});

// ---- structure ----

test("ts-morph is imported by the scanner only", () => {
  const sourceDirectory = join(import.meta.dirname, "../src");
  const importers = readdirSync(sourceDirectory, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts") && /from\s+"ts-morph"|import\(\s*"ts-morph"|require\(\s*"ts-morph"/.test(readFileSync(join(sourceDirectory, path), "utf8")));
  assert.deepEqual(importers, ["scanner.ts"]);
});

test("the fixture directory is removed afterwards, also when the callback throws", async () => {
  let seen = "";
  await withFixture({ "sub/a.ts": "export {};\n" }, (directory) => {
    seen = directory;
    assert.ok(existsSync(join(directory, "sub/a.ts")));
  });
  assert.notEqual(seen, "");
  assert.ok(!existsSync(seen));

  let seenOnThrow = "";
  await assert.rejects(
    withFixture({ "a.ts": "export {};\n" }, (directory) => {
      seenOnThrow = directory;
      throw new Error("callback failed");
    }),
    /callback failed/,
  );
  assert.notEqual(seenOnThrow, "");
  assert.ok(!existsSync(seenOnThrow));
});
