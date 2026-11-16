import type { Decorator } from "./type.js";

export type DecoratorReading = {
  /** Every marker of the block, in the order written. The caller tells main markers from additional ones. */
  decorators: Decorator[];
  /** One message per unreadable marker; each names the marker. */
  problems: string[];
};

// A tag counts only at the start of a line, so an "@" inside a sentence or an e-mail address is never one.
const TAG_LINE = /^@([A-Za-z][A-Za-z0-9_]*)(.*)$/;

/**
 * Reads the markers of one JSDoc block, given as plain text (with or without its comment delimiters).
 * A tag starting with an uppercase letter is a marker. A tag starting with a lowercase letter is a standard JSDoc tag:
 * it is never returned, but it ends the data of the marker before it, so its own text cannot leak into that data.
 */
export function readDecorators(jsDoc: string): DecoratorReading {
  const decorators: Decorator[] = [];
  const problems: string[] = [];
  let open: { name: string; lines: string[] } | undefined;

  function close(): void {
    if (!open) return;
    const text = open.lines.join("\n").trim();
    let data: unknown = text === "" ? undefined : text;
    if (text.startsWith("{")) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        // The marker is still returned, so the caller keeps seeing the function as a component and reports its other problems too.
        data = undefined;
        problems.push(`@${open.name} has invalid JSON data: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    decorators.push({ name: open.name, data });
    open = undefined;
  }

  const body = jsDoc.replace(/^\s*\/\*+/, "").replace(/\*+\/\s*$/, "");
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s*]*/, "");
    const tag = TAG_LINE.exec(line);
    if (!tag) {
      open?.lines.push(line);
      continue;
    }
    close();
    const name = tag[1] ?? "";
    if (name[0] === name[0]?.toUpperCase()) open = { name, lines: [tag[2] ?? ""] };
  }
  close();
  return { decorators, problems };
}
