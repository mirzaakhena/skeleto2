import assert from "node:assert/strict";
import { test } from "node:test";
import { Skeleto } from "../src/index.js";

// Placeholder behaviour only; the startup ticket replaces this file.
test("Skeleto.start rejects with 'not implemented' until startup is built", async () => {
  await assert.rejects(Skeleto.start(), /not implemented/);
  await assert.rejects(Skeleto.start("app", { decorators: ["Logging"] }), /"app".*not implemented/);
});
