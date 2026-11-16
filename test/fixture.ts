import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Writes the given files (relative path -> content) into a fresh temporary directory, runs the callback with that directory,
 * and removes the directory afterwards, also when the callback throws.
 */
export async function withFixture<T>(files: Record<string, string>, run: (directory: string) => T | Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "skeleto-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      const filePath = join(directory, path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
    }
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
