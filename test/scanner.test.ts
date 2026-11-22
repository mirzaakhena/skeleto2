import assert from "node:assert/strict";
import { chmodSync, existsSync, readdirSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { scanDirectory } from "../src/scanner.js";
import type { ScanResult } from "../src/scanner.js";
import { DEFAULT_EXCLUDE } from "../src/type.js";
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
        awaited: false,
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

// ---- 4.3: a config declared Promise<X> ----

const PROMISED: [string, string][] = [
  ["Promise<Database>", "Database"],
  ["Promise< Database >", "Database"],
  ["Promise<\n  Database\n>", "Database"],
  ["Promise<winston.Logger>", "winston.Logger"],
  ["Promise<Repository<User>>", "Repository<User>"],
  // Opened once only: whoever asks for the inner name is asking for a promise by name.
  ["Promise<Promise<Database>>", "Promise<Database>"],
];

for (const [written, name] of PROMISED) {
  test(`a config declared ${JSON.stringify(written)} is the component ${name}, marked as one to wait for`, async () => {
    const result = await scan({ "a.ts": `/** @Config */\nexport async function connect(settings: Settings): ${written} { return null as any; }\n` });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions.map((found) => [found.metadata.name, found.awaited, found.metadata.dependencies]), [[name, true, ["Settings"]]]);
  });
}

test("a config declared Promise<X> without the async keyword is waited for all the same", async () => {
  const result = await scan({ "a.ts": `/** @Config */\nexport function connect(): Promise<Database> { return null as any; }\n` });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions.map((found) => [found.metadata.name, found.awaited]), [["Database", true]]);
});

for (const written of ["Database", "PromiseLike<Database>", "Promise<Database> | undefined", "Promise", "Promise<A, B>", "globalThis.Promise<Database>", "Pending", "Array<Promise<Database>>"]) {
  test(`a config declared ${written} keeps that name as written and is not waited for`, async () => {
    // Pending is an alias of a promise: its definition is never read, so it stays a name like any other.
    const result = await scan({ "a.ts": `type Pending = Promise<Database>;\n/** @Config */\nexport function connect(): ${written} { return null as any; }\n` });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions.map((found) => [found.metadata.name, found.awaited]), [[written, false]]);
  });
}

test("two configs, one returning X and one returning Promise<X>, are two functions returning the same type name", async () => {
  const result = await scan({
    "a.ts": `/** @Config */\nexport function implPlain(): Database { return null as any; }\n`,
    "b.ts": `/** @Config */\nexport async function implAsync(): Promise<Database> { return null as any; }\n`,
  });
  assertOneError(result, /^Database: returned by both/, /implPlain \(a\.ts\)/, /implAsync \(b\.ts\)/);
});

test("two configs both returning Promise<X> are two functions returning the same type name", async () => {
  const result = await scan({
    "a.ts": `/** @Config */\nexport async function one(): Promise<Database> { return null as any; }\n/** @Config */\nexport async function two(): Promise< Database > { return null as any; }\n`,
  });
  assertOneError(result, /^Database: returned by both/, /one \(a\.ts\)/, /two \(a\.ts\)/);
});

for (const marker of ["Wrapper", "Action", "UseCase", "Gateway"]) {
  test(`a @${marker} declared Promise<X> is a mistake naming the function, and is not marked as one to wait for`, async () => {
    const result = await scan({ "a.ts": `/** @${marker} */\nexport async function implLate(): Promise<Late> { return null as any; }\n` });
    assertOneError(result, /^implLate \(a\.ts\): /, new RegExp(`is marked @${marker} but returns Promise<Late>`), /only a @Config may be asynchronous/);
    // Still listed under the inner name, so that a component that needs Late is not reported a second time as needing something unknown.
    assert.deepEqual(result.functions.map((found) => [found.metadata.name, found.awaited]), [["Late", false]]);
  });

  test(`a @${marker} declared with another name that merely mentions a promise is no mistake`, async () => {
    const result = await scan({ "a.ts": `/** @${marker} */\nexport function implLate(): PromiseLike<Late> { return null as any; }\n` });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions.map((found) => found.metadata.name), ["PromiseLike<Late>"]);
  });
}

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

for (const marker of ["Config", "Action", "UseCase", "Gateway"]) {
  for (const data of [`{"readTypeArguments": true}`, `{}`, `some text`, `{"ordinal": 1}`]) {
    test(`@${marker} with data ${data} is a mistake naming the function`, async () => {
      const result = await scan({ "a.ts": `/** @${marker} ${data} */\nexport function implWithData(): WithData { return null as any; }\n` });
      assertOneError(result, /implWithData/, new RegExp(`@${marker} takes no data`));
    });
  }
}

test("@UseCase and @Gateway alone are main markers, and the scan keeps each name in the metadata", async () => {
  const result = await scan({ "a.ts": `/** @UseCase */\nexport function u(g: G): U { return null as any; }\n/** @Gateway */\nexport function g(): G { return null as any; }\n` });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions.map((found) => [found.metadata.name, found.metadata.mainDecorator.name, found.metadata.additionalDecorators]), [["U", "UseCase", []], ["G", "Gateway", []]]);
});

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

const REPORTED_WITH_LIST = ["a function with only an additional marker", "an arrow function", "a function inside a namespace"];
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
    assert.deepEqual(await scan({ "a.ts": source }), { functions: [], errors: [] });
    // With the list given, three of them are reported as misspelt or misplaced markers; those are tested at the end of this file.
    if (REPORTED_WITH_LIST.includes(label)) return;
    assert.deepEqual(await scan({ "a.ts": source }, ["Logging"]), { functions: [], errors: [] });
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
        `/** @Action */\nexport async function implLateAction(): Promise<LateAction> { return null as any; }`,
        `/** @Wrapper */\nexport async function implLateWrapper(): Promise<LateWrapper> { return null as any; }`,
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
    [/implLateAction/, /is marked @Action but returns Promise<LateAction>/],
    [/implLateWrapper/, /is marked @Wrapper but returns Promise<LateWrapper>/],
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

// ---- entries that are not readable files ----

const validA = `/** @Config */\nexport function a(): A { return null as any; }\n`;

test("a folder named like a .ts file is walked, not read as a file", async () => {
  await withFixture({ "models.ts/a.ts": validA, "models.ts/deep.ts/b.ts": `/** @Config */\nexport function b(): B { return null as any; }\n` }, (directory) => {
    const result = scanDirectory(directory);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A", "B"]);
    assert.deepEqual(result.functions.map((found) => found.filePath), [join(directory, "models.ts/a.ts"), join(directory, "models.ts/deep.ts/b.ts")]);
  });
});

test("an empty folder named like a .ts file is skipped", async () => {
  await withFixture({ "a.ts": validA, "empty.ts/keep.txt": "" }, (directory) => {
    const result = scanDirectory(directory);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A"]);
  });
});

test("a dangling link named like a .ts file is skipped and the other files are still scanned", async () => {
  await withFixture({ "a.ts": validA, "z.ts": `/** @Action */\nfunction implHidden(): Hidden { return null as any; }\n` }, (directory) => {
    symlinkSync(join(directory, "does-not-exist"), join(directory, "gone.ts"));
    symlinkSync("user@host.1234:5678", join(directory, ".#lock.ts"));
    const result = scanDirectory(directory);
    assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A", "Hidden"]);
    assertOneError(result, /implHidden/, /not exported/);
  });
});

test("a link to a .ts file is read, and a link to a folder is not followed", async () => {
  await withFixture({ "a.ts": validA }, async (directory) => {
    await withFixture({ "real.ts": `/** @Config */\nexport function b(): B { return null as any; }\n` }, (elsewhere) => {
      symlinkSync(join(elsewhere, "real.ts"), join(directory, "linked.ts"));
      symlinkSync(elsewhere, join(directory, "folder.ts"));
      const result = scanDirectory(directory);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.functions.map((found) => [found.metadata.name, found.filePath]), [["A", join(directory, "a.ts")], ["B", join(directory, "linked.ts")]]);
    });
  });
});

test("a link that points back to a parent folder does not make the scan loop", async () => {
  await withFixture({ "a.ts": validA, "sub/b.ts": `/** @Config */\nexport function b(): B { return null as any; }\n` }, (directory) => {
    symlinkSync(directory, join(directory, "sub/back"));
    symlinkSync("..", join(directory, "sub/up.ts"));
    const result = scanDirectory(directory);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A", "B"]);
  });
});

test("a folder that cannot be read is a mistake naming the folder, and the other files are still scanned", { skip: process.getuid?.() === 0 || process.platform === "win32" }, async () => {
  await withFixture({ "a.ts": validA, "locked/b.ts": validA }, (directory) => {
    chmodSync(join(directory, "locked"), 0o000);
    try {
      const result = scanDirectory(directory);
      assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A"]);
      assertOneError(result, /locked: directory cannot be read/);
    } finally {
      // Without this the fixture could not be removed.
      chmodSync(join(directory, "locked"), 0o700);
    }
  });
});

test("a file that cannot be read is a mistake naming the file, and the other files are still scanned", { skip: process.getuid?.() === 0 || process.platform === "win32" }, async () => {
  await withFixture({ "a.ts": validA, "locked.ts": validA, "z.ts": `/** @Action */\nfunction implHidden(): Hidden { return null as any; }\n` }, (directory) => {
    chmodSync(join(directory, "locked.ts"), 0o000);
    const result = scanDirectory(directory);
    assert.deepEqual(result.functions.map((found) => found.metadata.name), ["A", "Hidden"]);
    assert.equal(result.errors.length, 2, JSON.stringify(result.errors));
    assert.match(result.errors[0] ?? "", /^locked\.ts: file cannot be read/);
    assert.match(result.errors[1] ?? "", /implHidden/);
  });
});

test("a directory that does not exist is a mistake naming the directory, not a throw", async () => {
  await withFixture({}, (directory) => {
    const missing = join(directory, "no-such-folder");
    const result = scanDirectory(missing);
    assert.deepEqual(result.functions, []);
    assertOneError(result, /no-such-folder/, /directory cannot be read/);
  });
});

test("a directory without .ts files gives an empty result", async () => {
  const result = await scan({ "readme.md": "nothing here\n" });
  assert.deepEqual(result, { functions: [], errors: [] });
});

// ---- exclusions (4.2) ----

function marked(name: string): string {
  return `/** @Config */\nexport function make${name}(): ${name} { return null as any; }\n`;
}

// Each trap is a marked function without a body to import, or a second component of a name that the normal file already has.
const trapFiles: Record<string, string> = {
  "normal.ts": marked("Normal"),
  "types.d.ts": `/** @Config */\nexport declare function makeDeclared(): Declared;\n`,
  "normal.test.ts": marked("Normal"),
  "deep/normal.spec.ts": marked("Normal"),
  "node_modules/pkg/index.ts": marked("Normal"),
  "deep/node_modules/pkg/lib/index.ts": marked("Nested"),
};
const trapNames = ["Declared", "Nested", "Normal", "Normal", "Normal", "Normal"];

function names(result: ScanResult): string[] {
  return result.functions.map((found) => found.metadata.name);
}

for (const path of Object.keys(trapFiles).slice(1)) {
  test(`without a list, a marked function in ${path} is not a component and no mistake, and the file beside it is found`, async () => {
    const result = await scan({ "normal.ts": trapFiles["normal.ts"]!, [path]: trapFiles[path]! });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(names(result), ["Normal"]);
  });
}

test("without a list, all default exclusions hold together", async () => {
  const result = await scan(trapFiles);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(names(result), ["Normal"]);
});

test("the default list is the four documented entries and cannot be changed in place", () => {
  assert.deepEqual(DEFAULT_EXCLUDE, ["node_modules", "*.d.ts", "*.test.ts", "*.spec.ts"]);
  assert.throws(() => (DEFAULT_EXCLUDE as string[]).push("x"), TypeError);
});

test("an empty list scans everything, so the default exclusions do produce components", async () => {
  const result = await withFixture(trapFiles, (directory) => scanDirectory(directory, undefined, []));
  assert.deepEqual(names(result).sort(), trapNames);
  // The three extra functions returning Normal are now seen, which is the trap the default list avoids.
  assert.equal(result.errors.length, 3, JSON.stringify(result.errors));
  for (const error of result.errors) assert.match(error, /^Normal: returned by both/);
});

test("the default list plus one entry leaves out the defaults and that entry, as a folder or as a file at any depth", async () => {
  const files = { ...trapFiles, "generated/a.ts": marked("GeneratedA"), "deep/generated/b.ts": marked("GeneratedB"), "kept/generated.ts": marked("Kept") };
  const withFolder = await withFixture(files, (directory) => scanDirectory(directory, undefined, [...DEFAULT_EXCLUDE, "generated"]));
  assert.deepEqual(withFolder.errors, []);
  assert.deepEqual(names(withFolder), ["Kept", "Normal"]);
  const withFile = await withFixture(files, (directory) => scanDirectory(directory, undefined, [...DEFAULT_EXCLUDE, "generated.ts"]));
  assert.deepEqual(withFile.errors, []);
  assert.deepEqual(names(withFile), ["GeneratedB", "GeneratedA", "Normal"]);
});

test("a list without the defaults no longer leaves the defaults out", async () => {
  const result = await withFixture({ ...trapFiles, "generated/a.ts": marked("GeneratedA") }, (directory) => scanDirectory(directory, undefined, ["generated"]));
  assert.deepEqual(names(result).sort(), trapNames);
});

test("a wildcard entry matches file names by their ending only: not a folder, not the middle of a name", async () => {
  const files = { "a.gen.ts": marked("Ending"), "x.gen.ts/b.ts": marked("InFolder"), "a.gen.ts.ts": marked("Middle"), "gen.ts": marked("Bare"), "sub/c.gen.ts": marked("Deep") };
  const result = await withFixture(files, (directory) => scanDirectory(directory, undefined, ["*.gen.ts"]));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(names(result).sort(), ["Bare", "InFolder", "Middle"]);
});

test("an entry without a wildcard is the whole name, compared exactly", async () => {
  const files = { "node_modules_old/a.ts": marked("Longer"), "my-node_modules/c.ts": marked("Prefixed"), "node_modules/d.ts": marked("Exact") };
  const result = await scan(files);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(names(result).sort(), ["Longer", "Prefixed"]);
  // In a fixture of its own: a file system that ignores case would make this folder and node_modules one folder.
  assert.deepEqual(names(await scan({ "Node_Modules/b.ts": marked("OtherCase") })), ["OtherCase"]);
});

test("an excluded folder is not entered: a file in it that cannot be parsed and a link loop in it are never seen", async () => {
  await withFixture({ "a.ts": validA, "node_modules/pkg/b.ts": marked("B") }, (directory) => {
    symlinkSync(directory, join(directory, "node_modules/pkg/back"));
    symlinkSync(join(directory, "nowhere"), join(directory, "node_modules/pkg/dangling.ts"));
    const result = scanDirectory(directory);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(names(result), ["A"]);
  });
});

test("the directory given is scanned even when its own path contains an excluded name", async () => {
  await withFixture({ "node_modules/pkg/src/a.ts": validA, "node_modules/pkg/src/a.test.ts": validA, "node_modules/pkg/src/node_modules/b.ts": validA }, (directory) => {
    for (const given of ["node_modules/pkg/src", "node_modules/pkg", "node_modules"]) {
      const result = scanDirectory(join(directory, given));
      assert.deepEqual(result.errors, [], given);
      assert.deepEqual(result.functions.map((found) => found.filePath), [join(directory, "node_modules/pkg/src/a.ts")], given);
    }
    assert.deepEqual(scanDirectory(directory), { functions: [], errors: [] });
  });
});

test("a directory whose only .ts files are excluded gives the same empty result as one without .ts files", async () => {
  const result = await scan({ "a.test.ts": validA, "b.spec.ts": validA, "c.d.ts": validA, "node_modules/d.ts": validA });
  assert.deepEqual(result, { functions: [], errors: [] });
});

const badEntries = ["generated/models", "foo*", "*.test.*", "**/x", "*", "", "generated\\models", "/abs", "a*b"];

for (const entry of badEntries) {
  test(`the exclusion ${JSON.stringify(entry)} is a mistake naming the entry, and the scan still reports the other mistakes`, async () => {
    const files = { "a.ts": `/** @Config */\nfunction hidden(): Hidden { return null as any; }\n`, "b.test.ts": marked("Skipped") };
    const result = await withFixture(files, (directory) => scanDirectory(directory, undefined, ["*.test.ts", entry]));
    assert.equal(result.errors.length, 2, JSON.stringify(result.errors));
    assert.ok(result.errors[0]?.startsWith(`exclude entry ${JSON.stringify(entry)}: `), result.errors[0]);
    assert.match(result.errors[1] ?? "", /hidden \(a\.ts\).*not exported/);
    // The usable entries of the same list still hold, so a bad entry does not add mistakes from files that were meant to be left out.
    assert.deepEqual(names(result), ["Hidden"]);
  });
}

test("every bad exclusion of one list is reported, each once, and an entry that is not text is one of them", async () => {
  const result = await withFixture({ "a.ts": validA }, (directory) => scanDirectory(directory, undefined, ["a/b", "ok", "*", 7 as unknown as string]));
  assert.deepEqual(result.errors.map((error) => error.split(":")[0]), ['exclude entry "a/b"', 'exclude entry "*"', "exclude entry 7"]);
  assert.deepEqual(names(result), ["A"]);
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

// ---- 4.2, 4.5: misspelt and misplaced markers, reported only when the list of allowed markers is given ----

const LIST = ["Transaction", "Logging"];
const body = `: Thing { return null as any; }\n`;

/** Each case is one file that is a mistake with the list given: the name the message must mention, and what else it must say. */
const MISTAKES: [string, string, string, RegExp[]][] = [
  ["@Wraper on an exported function", `/** @Wraper */\nexport function makeAudit()${body}`, "makeAudit", [/@Wraper/, /no main marker/]],
  ["@Actions on an exported function", `/** @Actions */\nexport function makeSave()${body}`, "makeSave", [/@Actions/, /no main marker/]],
  ["only @Transaction on an exported function", `/** @Transaction */\nexport function makeSave()${body}`, "makeSave", [/@Transaction/, /no main marker/]],
  ["a marker outside the list and no main marker, not exported", `/**\n * Text.\n * @Cache {"ttl": 1}\n */\nfunction helper()${body}`, "helper", [/@Cache/, /no main marker/]],
  ["@transaction on an action", `/**\n * @Action\n * @transaction\n */\nexport function makeSave()${body}`, "makeSave", [/@transaction\b/, /write @Transaction/]],
  ["@action alone", `/** @action */\nexport function makeSave()${body}`, "makeSave", [/@action\b/, /write @Action/]],
  ["@wrapper alone", `/** @wrapper {"ordinal": 1} */\nexport function makeAudit()${body}`, "makeAudit", [/@wrapper\b/, /write @Wrapper/]],
  ["@config alone, not exported", `/** @config */\nfunction makeSettings()${body}`, "makeSettings", [/@config\b/, /write @Config/]],
  ["@lOGGING among ordinary tags", `/**\n * @param a x\n * @lOGGING\n * @returns y\n */\nexport function helper(a: string)${body}`, "helper", [/@lOGGING/, /write @Logging/]],
  ["a main marker on an exported constant", `/** @Action */\nexport const makeSave = (): Thing => null as any;\n`, "makeSave", [/@Action/, /exported constant/, /only top-level function declarations can be components/]],
  ["a main marker on an exported constant holding a function expression", `/** @Wrapper {"ordinal": 2} */\nexport const makeAudit = function ()${body}`, "makeAudit", [/@Wrapper/, /only top-level function declarations can be components/]],
  ["a main marker on a function inside a namespace", `export namespace users {\n  /** @Action */\n  export function makeSave()${body}}\n`, "makeSave", [/@Action/, /namespace users/, /only top-level function declarations can be components/]],
  ["a main marker on a function inside a nested namespace", `namespace a.b {\n  namespace c {\n    /** @Config */\n    function makeSettings()${body}  }\n}\n`, "makeSettings", [/@Config/, /namespace c/, /only top-level function declarations can be components/]],
];

for (const [title, source, name, patterns] of MISTAKES) {
  test(`with the list given, ${title} is a mistake naming ${name}, its file and the marker`, async () => {
    const result = await scan({ "sub/a.ts": source }, LIST);
    assertOneError(result, new RegExp(`^${name} \\(sub/a\\.ts\\): `), ...patterns);
  });

  test(`without the list, ${title} is silent as before`, async () => {
    const result = await scan({ "sub/a.ts": source });
    assert.deepEqual(result.errors, []);
    // The one case that is a component either way: the lowercase tag is dropped and the action has no additional marker.
    assert.deepEqual(result.functions.map((found) => [found.metadata.mainDecorator.name, found.metadata.additionalDecorators]), title === "@transaction on an action" ? [["Action", []]] : []);
  });
}

test("an empty list is a list: the mistakes are reported, and only main markers can be meant", async () => {
  const result = await scan({ "a.ts": `/** @Wraper */\nexport function one()${body}/** @wrapper */\nexport function two()${body}/** @transaction */\nexport function three()${body}` }, []);
  assert.equal(result.errors.length, 2, JSON.stringify(result.errors));
  assert.match(result.errors[0] ?? "", /^one \(a\.ts\): .*@Wraper/);
  assert.match(result.errors[1] ?? "", /^two \(a\.ts\): .*@wrapper/);
});

test("with the list given, functions without JSDoc or with ordinary tags only are still left alone", async () => {
  const sources = [
    `export function plain()${body}`,
    `/** Just text, mail owner@Action.dev or see @Wrapper in the docs. */\nexport function described()${body}`,
    `/**\n * @param a the thing\n * @returns it\n * @defaultValue 4\n * @deprecated\n * @internal\n */\nexport function tagged(a: string)${body}`,
    // Only the block right above counts, and constants or namespace functions without a main marker are nobody's business.
    `/** @Wraper */\n/** Text. */\nexport function twoBlocks()${body}`,
    `/** @Transaction */\nexport const value = 1;\n/** @action */\nexport const other = () => 1;\n/** @Action */\nconst local = () => 1;\n`,
    `namespace n {\n  /** @Transaction */\n  export function inner()${body}  /** @wrapper */\n  export function lower()${body}}\ndeclare module "bodyless";\n`,
  ];
  for (const source of sources) {
    const result = await scan({ "a.ts": source }, LIST);
    assert.deepEqual(result, { functions: [], errors: [] }, source);
  }
});

test("with the list given, a correct component next to ordinary lowercase tags is read as before", async () => {
  const result = await scan({ "a.ts": `/**\n * @Action\n * @Transaction\n * @param settings x\n * @returns y\n * @defaultValue z\n */\nexport function makeSave(settings: Settings): SaveUser { return null as any; }\n` }, LIST);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.functions[0]?.metadata.additionalDecorators, [{ name: "Transaction", data: undefined }]);
});

test("a component with a lowercase near-marker is still a component, and all its mistakes are reported together", async () => {
  const result = await scan({ "a.ts": `/**\n * @Action\n * @logging\n * @Cache\n * @action\n */\nfunction makeSave(): SaveUser { return null as any; }\n` }, LIST);
  assert.equal(result.functions.length, 1);
  assert.equal(result.errors.length, 4, JSON.stringify(result.errors));
  for (const pattern of [/@logging\b.*write @Logging/, /@action\b.*write @Action/, /@Cache is not an allowed marker/, /not exported/]) {
    assert.ok(result.errors.some((line) => line.startsWith("makeSave (a.ts): ") && pattern.test(line)), String(pattern));
  }
});
