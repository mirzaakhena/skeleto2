import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const skill = `${repo}skills/skeleto/`;
const text = readFileSync(`${skill}SKILL.md`, "utf8");

/** Every relative link target of SKILL.md, in the order written. */
const links = [...text.matchAll(/\]\(([^)#]+)\)/g)].map(([, target]) => target ?? "");

test("the skill reaches the rules through links to this repository, not through copies", () => {
  // A copy would drift from docs/; a link always shows the current rules.
  for (const name of ["docs", "REVIEW_CHECKLIST.md", "README.md"]) {
    assert.equal(realpathSync(`${skill}${name}`), realpathSync(`${repo}${name}`), `skills/skeleto/${name} must link to ${name} at the repository root`);
  }
});

test("every link of SKILL.md leads to a file", () => {
  for (const target of links) assert.ok(existsSync(`${skill}${target}`), `SKILL.md links to ${target}, which does not exist`);
});

test("SKILL.md points to every document of docs/", () => {
  // The reading map is how an agent finds the rules for its scope; a document missing from it is a rule set nobody is sent to.
  for (const folder of ["konsep", "proses", "teknis"]) {
    for (const name of readdirSync(`${repo}docs/${folder}`)) {
      assert.ok(links.includes(`docs/${folder}/${name}`), `SKILL.md does not point to docs/${folder}/${name}`);
    }
  }
});

test("SKILL.md names the skill and says when to use it", () => {
  const front = /^---\nname: skeleto\ndescription: (.+)\n---\n/.exec(text);
  assert.ok(front, "SKILL.md must start with front matter holding name: skeleto and a description");
  assert.ok((front[1] ?? "").length > 0);
});
