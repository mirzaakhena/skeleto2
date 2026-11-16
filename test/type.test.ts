import assert from "node:assert/strict";
import { test } from "node:test";
import { FuncInstanceMetadata, newContext, type FuncMetadata } from "../src/index.js";

test("newContext returns empty data, an empty trace id and the current date", () => {
  const before = Date.now();
  const ctx = newContext();
  const after = Date.now();

  assert.deepEqual(ctx.data, {});
  assert.equal(ctx.traceId, "");
  assert.ok(ctx.date instanceof Date);
  assert.ok(ctx.date.getTime() >= before && ctx.date.getTime() <= after);
  assert.deepEqual(Object.keys(ctx).sort(), ["data", "date", "traceId"]);
});

test("two new contexts do not share their data object or their date", () => {
  const first = newContext();
  const second = newContext();

  first.data.userId = 1;

  assert.notEqual(first.data, second.data);
  assert.deepEqual(second.data, {});
  assert.notEqual(first.date, second.date);
});

test("FuncInstanceMetadata returns the instance and the metadata it was given", () => {
  const instance = async () => "saved";
  const metadata: FuncMetadata = {
    name: "SaveUser",
    dependencies: ["Database"],
    mainDecorator: { name: "Action", data: undefined },
    additionalDecorators: [{ name: "Transaction", data: undefined }],
  };

  const holder = new FuncInstanceMetadata(instance, metadata);

  assert.equal(holder.getInstance(), instance);
  assert.equal(holder.getMetadata(), metadata);
});
