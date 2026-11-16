import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Project } from "ts-morph";
import type { FunctionDeclaration } from "ts-morph";
import { readDecorators } from "./decorator.js";
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
 * Reads every `.ts` file under the directory as text and returns its components. No file is imported or run, and no type is resolved:
 * only the written text of return and parameter type annotations is used. Mistakes are collected, never thrown.
 */
export function scanDirectory(directory: string, allowedDecorators?: string[]): ScanResult {
  const root = resolve(directory);
  // Sorted, so that messages and the creation order of components do not depend on the file system.
  const paths = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".ts")).sort();
  // Without these two switches ts-morph would follow imports and a tsconfig, and so read files outside the directory.
  const project = new Project({ skipAddingFilesFromTsConfig: true, skipFileDependencyResolution: true });

  const functions: ScannedFunction[] = [];
  const errors: string[] = [];
  const firstByName = new Map<string, string>();

  for (const path of paths) {
    const filePath = join(root, path);
    // getFunctions() yields the top-level declarations only, so nested functions, arrow functions and methods never get here.
    for (const declaration of project.addSourceFileAtPath(filePath).getFunctions()) {
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
  const isOrdinalOnly = typeof data === "object" && data !== null && !Array.isArray(data) && Object.keys(data).join() === "ordinal" && Number.isInteger((data as { ordinal: unknown }).ordinal);
  return isOrdinalOnly ? undefined : `@Wrapper takes no data or {"ordinal": <integer>}, but has ${written}`;
}
