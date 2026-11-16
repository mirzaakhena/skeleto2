import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { readDecorators } from "../src/decorator.js";

function block(...lines: string[]): string {
  return ["/**", ...lines.map((line) => ` * ${line}`), " */"].join("\n");
}

test("a marker without data has undefined data", () => {
  assert.deepEqual(readDecorators(block("@Action")), { decorators: [{ name: "Action", data: undefined }], problems: [] });
  assert.deepEqual(readDecorators("/** @Config */").decorators, [{ name: "Config", data: undefined }]);
  assert.deepEqual(readDecorators(block("@Config   ", "", "  ")).decorators, [{ name: "Config", data: undefined }]);
});

test("text data is trimmed", () => {
  assert.deepEqual(readDecorators(block("@Logging    verbose mode   ")).decorators, [{ name: "Logging", data: "verbose mode" }]);
  assert.deepEqual(readDecorators("/** @Logging  verbose  */").decorators, [{ name: "Logging", data: "verbose" }]);
});

test("text data may continue on the following lines", () => {
  assert.deepEqual(readDecorators(block("@Logging first", "  second  ")).decorators, [{ name: "Logging", data: "first\nsecond" }]);
  assert.deepEqual(readDecorators(block("@Logging", "  only below  ")).decorators, [{ name: "Logging", data: "only below" }]);
});

test("JSON data on the marker's own line is parsed", () => {
  assert.deepEqual(readDecorators(block('@Wrapper {"ordinal": 2}')).decorators, [{ name: "Wrapper", data: { ordinal: 2 } }]);
  assert.deepEqual(readDecorators('/** @Wrapper {"ordinal": -1} */').decorators, [{ name: "Wrapper", data: { ordinal: -1 } }]);
});

test("JSON data that starts on the following line is parsed", () => {
  assert.deepEqual(readDecorators(block("@Wrapper", '{"ordinal": 3}')).decorators, [{ name: "Wrapper", data: { ordinal: 3 } }]);
});

test("JSON data spread over several lines is parsed", () => {
  const reading = readDecorators(block("@Cache {", '  "ttl": 60,', '  "tags": ["a", "b"],', '  "nested": { "on": true }', "}"));
  assert.deepEqual(reading, { decorators: [{ name: "Cache", data: { ttl: 60, tags: ["a", "b"], nested: { on: true } } }], problems: [] });
});

test("an @ in the middle of a sentence is not a marker", () => {
  const reading = readDecorators(block("Runs the @Action of the day, see @Config too.", "@Action"));
  assert.deepEqual(reading, { decorators: [{ name: "Action", data: undefined }], problems: [] });
});

test("an @ inside an e-mail address is not a marker", () => {
  assert.deepEqual(readDecorators(block("Ask owner@Example.com or", "team@Action.dev about it.")), { decorators: [], problems: [] });
  assert.deepEqual(readDecorators(block("@Logging mail owner@Example.com")).decorators, [{ name: "Logging", data: "mail owner@Example.com" }]);
});

test("a marker line may be preceded by spaces and asterisks", () => {
  for (const text of ["@Action", "   @Action", "*@Action", " * @Action", "\t *   @Action", " ** @Action", "/**\n@Action\n*/", "/**\n     *     @Action\n */"]) {
    assert.deepEqual(readDecorators(text).decorators, [{ name: "Action", data: undefined }], JSON.stringify(text));
  }
});

test("well-known lowercase tags are not markers", () => {
  for (const tag of ["param", "returns", "deprecated", "example", "see", "throws", "todo", "internal"]) {
    assert.deepEqual(readDecorators(block(`@${tag} some text`)), { decorators: [], problems: [] }, tag);
  }
});

test("a lowercase tag that is on no list is not a marker", () => {
  assert.deepEqual(readDecorators(block("@defaultValue 42", "@transaction", '@somethingNew {"a": 1}')), { decorators: [], problems: [] });
});

test("a lowercase tag between two markers is skipped and its text does not leak into the marker before it", () => {
  for (const tag of ["param ctx the context", "returns the saved user", "defaultValue 42", "example", "deprecated"]) {
    const reading = readDecorators(block("@Action", `@${tag}`, "more text of the tag", "@Transaction"));
    assert.deepEqual(reading, { decorators: [{ name: "Action", data: undefined }, { name: "Transaction", data: undefined }] , problems: [] }, tag);
  }
});

test("a lowercase tag ends the text and JSON data of the marker before it", () => {
  const reading = readDecorators(block("@Logging verbose", "@param name the name", "continued", '@Wrapper {"ordinal": 1}', "@defaultValue {broken", "@Cache", "{", '"ttl": 1', "}", "@returns {string} x"));
  assert.deepEqual(reading, {
    decorators: [{ name: "Logging", data: "verbose" }, { name: "Wrapper", data: { ordinal: 1 } }, { name: "Cache", data: { ttl: 1 } }],
    problems: [],
  });
});

test("invalid JSON is a problem that names the marker, and the other markers are still returned", () => {
  const reading = readDecorators(block("@Action", '@Wrapper {"ordinal": }', "@Transaction", "@Logging text"));
  assert.equal(reading.problems.length, 1);
  assert.match(reading.problems[0] ?? "", /@Wrapper/);
  assert.match(reading.problems[0] ?? "", /invalid JSON/);
  assert.deepEqual(reading.decorators, [
    { name: "Action", data: undefined },
    { name: "Wrapper", data: undefined },
    { name: "Transaction", data: undefined },
    { name: "Logging", data: "text" },
  ]);
});

test("every invalid JSON data is reported, one problem per marker", () => {
  const reading = readDecorators(block("@Wrapper {ordinal: 1}", "@Cache {", '"ttl": 1', "@Retry {}"));
  assert.equal(reading.problems.length, 2);
  assert.match(reading.problems[0] ?? "", /@Wrapper/);
  assert.match(reading.problems[1] ?? "", /@Cache/);
  assert.deepEqual(reading.decorators.map((decorator) => decorator.name), ["Wrapper", "Cache", "Retry"]);
  assert.deepEqual(reading.decorators[2]?.data, {});
});

test("several markers come back in the order written", () => {
  const reading = readDecorators(block("Saves a user.", "", "@Transaction", "@Action", '@Logging {"level": "debug"}', "@Audit who did it", "@Transaction again"));
  assert.deepEqual(reading.decorators, [
    { name: "Transaction", data: undefined },
    { name: "Action", data: undefined },
    { name: "Logging", data: { level: "debug" } },
    { name: "Audit", data: "who did it" },
    { name: "Transaction", data: "again" },
  ]);
});

test("a block without markers and an empty text give nothing", () => {
  assert.deepEqual(readDecorators(block("Just a description.")), { decorators: [], problems: [] });
  assert.deepEqual(readDecorators(""), { decorators: [], problems: [] });
  assert.deepEqual(readDecorators("/** */"), { decorators: [], problems: [] });
});

test("Windows line endings are read like any other", () => {
  assert.deepEqual(readDecorators('/**\r\n * @Action\r\n * @Wrapper {\r\n *   "ordinal": 1\r\n * }\r\n */').decorators, [
    { name: "Action", data: undefined },
    { name: "Wrapper", data: { ordinal: 1 } },
  ]);
});

test("the reader does not depend on ts-morph", () => {
  const source = readFileSync(new URL("../src/decorator.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /ts-morph/);
  assert.deepEqual(source.match(/^import .*$/gm), ['import type { Decorator } from "./type.js";']);
});
