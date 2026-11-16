import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Project } from "ts-morph";
import type { FunctionDeclaration } from "ts-morph";
import { readDecorators } from "./decorator.js";
import { DEFAULT_EXCLUDE } from "./type.js";
import type { Decorator, FuncMetadata } from "./type.js";

export type ScannedFunction = {
  metadata: FuncMetadata;
  /** Absolute path of the file that declares the function. */
  filePath: string;
  /** Name under which the file exports the function. */
  functionName: string;
};

export type ScanResult = {
  /** Every component found, files in sorted path order and functions in source order. Only meaningful when `errors` is empty. */
  functions: ScannedFunction[];
  /** One message per mistake; each names the function or the type at fault. */
  errors: string[];
};

const MAIN_DECORATORS = ["Config", "Wrapper", "Action"];

/**
 * Reads every `.ts` file under the directory that is not excluded, as text, and returns its components. No file is imported or run, and
 * no type is resolved: only the written text of return and parameter type annotations is used. Mistakes are collected, never thrown.
 */
export function scanDirectory(directory: string, allowedDecorators?: string[], exclude: readonly string[] = DEFAULT_EXCLUDE): ScanResult {
  const root = resolve(directory);
  const errors: string[] = [];
  // An entry is one name, or `*` and the ending of a file name. Anything else would match nothing, and so quietly scan what it meant to leave out.
  const usable = exclude.filter((entry) => typeof entry === "string" && /^\*?[^*/\\]+$/.test(entry));
  for (const entry of exclude) {
    if (!usable.includes(entry)) errors.push(`exclude entry ${JSON.stringify(entry)}: must be a folder or file name, or "*" followed by the ending of file names`);
  }
  // Sorted, so that messages and the creation order of components do not depend on the file system.
  const paths = listFiles(root, "", usable, errors).sort();
  // Without these two switches ts-morph would follow imports and a tsconfig, and so read files outside the directory.
  const project = new Project({ skipAddingFilesFromTsConfig: true, skipFileDependencyResolution: true });

  const functions: ScannedFunction[] = [];
  const firstByName = new Map<string, string>();

  for (const path of paths) {
    const filePath = join(root, path);
    let declarations: FunctionDeclaration[];
    try {
      // getFunctions() yields the top-level declarations only, so nested functions, arrow functions and methods never get here.
      declarations = project.addSourceFileAtPath(filePath).getFunctions();
    } catch (error) {
      // One unreadable file must not hide the mistakes of all the others.
      errors.push(`${path}: file cannot be read: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const declaration of declarations) {
      const functionName = declaration.getName() ?? "(anonymous)";
      const where = `${functionName} (${relative(root, filePath)})`;
      const metadata = readFunction(declaration, allowedDecorators, (message) => errors.push(`${where}: ${message}`));
      if (!metadata) continue;
      const first = firstByName.get(metadata.name);
      if (first) errors.push(`${metadata.name}: returned by both ${first} and ${where}; a type name can have one component only`);
      else if (metadata.name !== "") firstByName.set(metadata.name, where);
      functions.push({ metadata, filePath, functionName });
    }
  }
  return { functions, errors };
}

/**
 * Lists the `.ts` files below the folder, as paths relative to the root. The walk is done here because the recursive listing of
 * node follows links to folders, and so never ends on a link that points back to a parent folder. Only names below the root are
 * compared with the exclusions, and an excluded folder is not entered at all.
 */
function listFiles(root: string, folder: string, exclude: readonly string[], errors: string[]): string[] {
  const found: string[] = [];
  try {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (exclude.some((name) => (name.startsWith("*") ? !entry.isDirectory() && entry.name.endsWith(name.slice(1)) : name === entry.name))) continue;
      // A folder may be named like a .ts file, so the kind of the entry decides, never its name.
      if (entry.isDirectory()) found.push(...listFiles(root, path, exclude, errors));
      // A link is read when it leads to a file; one that leads to a folder or to nothing (an editor's lock file, say) is skipped.
      else if (path.endsWith(".ts") && (entry.isFile() || statSync(join(root, path), { throwIfNoEntry: false })?.isFile())) found.push(path);
    }
  } catch (error) {
    errors.push(`${join(root, folder)}: directory cannot be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  return found;
}

/** Returns undefined for a function that is not a component. A component with mistakes is still returned, so that all its mistakes are found. */
function readFunction(declaration: FunctionDeclaration, allowedDecorators: string[] | undefined, report: (message: string) => void): FuncMetadata | undefined {
  // Only the block right above the function counts; an earlier one (a file header, say) is not about this function.
  const jsDoc = declaration.getJsDocs().at(-1);
  if (!jsDoc) return undefined;
  const { decorators, problems } = readDecorators(jsDoc.getText());
  const [mainDecorator, ...otherMains] = decorators.filter((decorator) => MAIN_DECORATORS.includes(decorator.name));
  if (!mainDecorator) return undefined;

  problems.forEach(report);
  if (otherMains.length > 0) {
    report(`has more than one main marker (${[mainDecorator, ...otherMains].map((decorator) => `@${decorator.name}`).join(", ")}); exactly one is allowed`);
  }
  const dataProblem = checkMainData(mainDecorator);
  if (dataProblem) report(dataProblem);

  const additionalDecorators = decorators.filter((decorator) => !MAIN_DECORATORS.includes(decorator.name));
  for (const decorator of additionalDecorators) {
    if (allowedDecorators && !allowedDecorators.includes(decorator.name)) {
      report(`@${decorator.name} is not an allowed marker (allowed: ${allowedDecorators.map((name) => `@${name}`).join(", ") || "none"})`);
    }
  }

  // A default export has no name to import it by, so only the plain `export function` form counts.
  if (!declaration.hasExportKeyword() || declaration.hasDefaultKeyword()) report(`is marked @${mainDecorator.name} but is not exported by name`);
  const name = declaration.getReturnTypeNode()?.getText() ?? "";
  if (name === "") report(`is marked @${mainDecorator.name} but has no return type annotation`);

  const dependencies: string[] = [];
  for (const parameter of declaration.getParameters()) {
    const type = parameter.getTypeNode()?.getText();
    if (type === undefined) report(`parameter ${parameter.getName()} has no type annotation`);
    else dependencies.push(type);
  }
  return { name, dependencies, mainDecorator, additionalDecorators };
}

function checkMainData(decorator: Decorator): string | undefined {
  const data: unknown = decorator.data;
  if (data === undefined) return undefined;
  const written = typeof data === "string" ? data : JSON.stringify(data);
  if (decorator.name !== "Wrapper") return `@${decorator.name} takes no data, but has ${written}`;
  const isObject = typeof data === "object" && data !== null && !Array.isArray(data);
  const isOrdinalOnly = isObject && Object.keys(data).join() === "ordinal" && Number.isInteger((data as { ordinal: unknown }).ordinal);
  return isOrdinalOnly ? undefined : `@Wrapper takes no data or {"ordinal": <integer>}, but has ${written}`;
}
