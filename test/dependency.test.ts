import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { sortDependencies, type DependencyNode } from "../src/dependency.js";

function node(name: string, ...dependencies: string[]): DependencyNode {
  return { name, dependencies };
}

function assertDependenciesFirst(nodes: DependencyNode[], order: string[]): void {
  assert.deepEqual([...order].sort(), nodes.map((item) => item.name).sort());
  for (const item of nodes) {
    for (const dependency of item.dependencies) {
      assert.ok(order.indexOf(dependency) < order.indexOf(item.name), `${dependency} must come before ${item.name}`);
    }
  }
}

test("an empty list gives an empty order", () => {
  assert.deepEqual(sortDependencies([]), { order: [], errors: [] });
});

test("components without dependencies keep their input order", () => {
  assert.deepEqual(sortDependencies([node("C"), node("A"), node("B")]), { order: ["C", "A", "B"], errors: [] });
});

test("a straight chain is ordered from the deepest dependency up", () => {
  const nodes = [node("A", "B"), node("B", "C"), node("C")];
  assert.deepEqual(sortDependencies(nodes), { order: ["C", "B", "A"], errors: [] });
  assert.deepEqual(sortDependencies([...nodes].reverse()), { order: ["C", "B", "A"], errors: [] });
});

test("a component needed by several others appears once, before all of them", () => {
  const nodes = [node("SaveUser", "Database", "Logger"), node("FindUser", "Database"), node("Database", "Logger"), node("Logger"), node("Report", "FindUser", "SaveUser")];
  const result = sortDependencies(nodes);
  assert.deepEqual(result.errors, []);
  assert.equal(result.order.filter((name) => name === "Database").length, 1);
  assert.equal(result.order.filter((name) => name === "Logger").length, 1);
  assertDependenciesFirst(nodes, result.order);
});

test("a component that lists the same dependency twice is still ordered once", () => {
  assert.deepEqual(sortDependencies([node("A", "B", "B"), node("B")]), { order: ["B", "A"], errors: [] });
});

test("a missing dependency listed twice by one component is reported once, and once more for each other component that misses it", () => {
  const result = sortDependencies([node("A", "Gone", "B", "Gone"), node("B"), node("C", "Gone")]);
  assert.deepEqual(result.errors, ["A: dependency Gone is not a known component", "C: dependency Gone is not a known component"]);
});

test("a component that lists itself twice is one cycle", () => {
  assert.deepEqual(sortDependencies([node("Self", "Self", "Self")]).errors, ["circular dependency: Self -> Self"]);
});

test("a missing dependency names the component and the missing dependency", () => {
  const result = sortDependencies([node("SaveUser", "Database"), node("Logger")]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0]!, /SaveUser/);
  assert.match(result.errors[0]!, /Database/);
  assert.doesNotMatch(result.errors[0]!, /Logger/);
});

test("a cycle of two is reported with its path", () => {
  assert.deepEqual(sortDependencies([node("A", "B"), node("B", "A")]).errors, ["circular dependency: A -> B -> A"]);
});

test("a cycle of three is reported with its path", () => {
  assert.deepEqual(sortDependencies([node("A", "B"), node("B", "C"), node("C", "A")]).errors, ["circular dependency: A -> B -> C -> A"]);
});

test("a component that depends on itself is reported as A -> A", () => {
  assert.deepEqual(sortDependencies([node("A", "A")]).errors, ["circular dependency: A -> A"]);
});

test("a cycle reached through a component outside it shows only the cycle", () => {
  assert.deepEqual(sortDependencies([node("Entry", "A"), node("A", "B"), node("B", "A")]).errors, ["circular dependency: A -> B -> A"]);
});

test("two missing dependencies are both reported", () => {
  const { errors } = sortDependencies([node("SaveUser", "Database"), node("FindUser", "Cache")]);
  assert.equal(errors.length, 2);
  assert.match(errors[0]!, /SaveUser.*Database/);
  assert.match(errors[1]!, /FindUser.*Cache/);
});

test("two missing dependencies of one component are both reported", () => {
  const { errors } = sortDependencies([node("SaveUser", "Database", "Cache")]);
  assert.equal(errors.length, 2);
  assert.match(errors[0]!, /SaveUser.*Database/);
  assert.match(errors[1]!, /SaveUser.*Cache/);
});

test("a missing dependency and a cycle are both reported", () => {
  const { errors } = sortDependencies([node("A", "B"), node("B", "A", "Missing"), node("C", "Gone")]);
  assert.equal(errors.length, 3);
  assert.ok(errors.includes("circular dependency: A -> B -> A"));
  assert.ok(errors.some((message) => /B.*Missing/.test(message)));
  assert.ok(errors.some((message) => /C.*Gone/.test(message)));
});

test("two separate cycles are both reported", () => {
  const { errors } = sortDependencies([node("A", "B"), node("B", "A"), node("X", "Y"), node("Y", "X")]);
  assert.deepEqual(errors, ["circular dependency: A -> B -> A", "circular dependency: X -> Y -> X"]);
});

test("a known input gives a known order", () => {
  const nodes = [node("Report", "FindUser", "SaveUser"), node("Clock"), node("SaveUser", "Database", "Logger"), node("FindUser", "Database"), node("Database", "Logger"), node("Logger")];
  assert.deepEqual(sortDependencies(nodes), { order: ["Logger", "Database", "FindUser", "SaveUser", "Report", "Clock"], errors: [] });
});

test("the same input gives the same result every time and is left untouched", () => {
  const nodes = [node("Report", "FindUser", "SaveUser"), node("SaveUser", "Database", "Missing"), node("FindUser", "Database"), node("Database", "Report")];
  const snapshot = structuredClone(nodes);
  const first = sortDependencies(nodes);
  for (let run = 0; run < 50; run++) assert.deepEqual(sortDependencies(structuredClone(snapshot)), first);
  assert.deepEqual(nodes, snapshot);
});

test("the sorter imports nothing", async () => {
  const source = await readFile(new URL("../src/dependency.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bimport\b/);
});
