import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { inspect } from "node:util";
import { sortDependencies } from "./dependency.js";
import { scanDirectory } from "./scanner.js";
import type { ScannedFunction } from "./scanner.js";
import { FuncInstanceMetadata } from "./type.js";
import type { SkeletoOptions, WrapperHandler } from "./type.js";

type Container = Map<string, FuncInstanceMetadata>;

// Creation order of the kinds, and for each kind the kinds it may depend on. The structure is one straight line, use case -> gateway -> config:
// a use case reaches gateways only, a gateway configs only, and neither reaches a plain action, which would bridge two use cases; a plain action is free.
const ALLOWED_DEPENDENCIES: Record<string, string[]> = {
  Config: ["Config"],
  Wrapper: ["Config"],
  Gateway: ["Config"],
  UseCase: ["Gateway"],
  Action: ["Config", "Gateway", "UseCase", "Action"],
};

export class Skeleto {
  private static readonly started = new Map<string, Promise<Skeleto>>();

  private constructor(private readonly container: Container) {}

  /** Options count on the first start of a directory only; a later start returns the instance that already exists. */
  static start(directory: string = "src", options?: SkeletoOptions): Promise<Skeleto> {
    const root = resolve(directory);
    const existing = Skeleto.started.get(root);
    if (existing) return existing;
    // The promise is remembered before anything runs, so concurrent calls share one startup.
    const starting = build(root, options).then((container) => new Skeleto(container));
    Skeleto.started.set(root, starting);
    // A failed startup is forgotten, so that the next call scans again.
    starting.catch(() => Skeleto.started.delete(root));
    return starting;
  }

  getContainer(): Map<string, FuncInstanceMetadata> {
    return this.container;
  }
}

/**
 * A caller without type checking can pass anything. A text would even half work, since a text can be searched like a list, and accept
 * every marker whose name it contains. A bad option is reported and then treated as left out, so that the scan still finds the rest.
 */
function listOption(options: SkeletoOptions | undefined, name: "decorators" | "exclude", errors: string[]): string[] | undefined {
  const value: unknown = options?.[name];
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  errors.push(`options.${name}: must be a list of texts, received ${inspect(value, { depth: 1, breakLength: Infinity })}`);
  return undefined;
}

/** A marker is written with an uppercase first letter and no "@", so an entry written otherwise could never match one; it is reported and dropped. */
function checkMarkerNames(names: string[] | undefined, errors: string[]): string[] | undefined {
  return names?.filter((entry) => {
    if (/^[A-Z][A-Za-z0-9_]*$/.test(entry)) return true;
    const suggestion = entry.replace(/^@+/, "");
    errors.push(`options.decorators entry ${JSON.stringify(entry)}: a marker name starts with an uppercase letter and is written without "@"; write ${JSON.stringify(suggestion.charAt(0).toUpperCase() + suggestion.slice(1))}`);
    return false;
  });
}

async function build(root: string, options: SkeletoOptions | undefined): Promise<Container> {
  const optionErrors: string[] = [];
  const scanned = scanDirectory(root, checkMarkerNames(listOption(options, "decorators", optionErrors), optionErrors), listOption(options, "exclude", optionErrors));
  const { functions } = scanned;
  const errors = [...optionErrors, ...scanned.errors];
  const byName = new Map<string, ScannedFunction>();
  // The first of two components with the same name wins, as in the sorter; the scanner has reported the duplicate.
  for (const found of functions) if (!byName.has(found.metadata.name)) byName.set(found.metadata.name, found);

  // The scanner returns nothing for a directory without .ts files, and a directory without any component has nothing to bind either.
  if (functions.length === 0 && scanned.errors.length === 0) errors.push(`${root}: no .ts file with a @Config, @Wrapper, @Action, @UseCase or @Gateway function was found`);
  for (const { metadata } of functions) {
    const kind = metadata.mainDecorator.name;
    for (const dependency of metadata.dependencies) {
      const dependencyKind = byName.get(dependency)?.metadata.mainDecorator.name;
      // An unknown dependency is reported by the sorter below.
      if (dependencyKind === undefined || ALLOWED_DEPENDENCIES[kind]?.includes(dependencyKind)) continue;
      const names = ALLOWED_DEPENDENCIES[kind]?.map((name) => `@${name}`) ?? [];
      const allowed = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join();
      errors.push(`${metadata.name}: is a @${kind} and depends on ${dependency}, which is a @${dependencyKind}; a @${kind} may depend on ${allowed} only`);
    }
  }
  const sorted = sortDependencies(functions.map((found) => found.metadata));
  errors.push(...sorted.errors);
  // Everything is reported at once, and before the first import: an application file may have side effects.
  if (errors.length > 0) throw new Error(`Skeleto cannot start ${root}, ${errors.length} problem(s):\n${errors.map((line) => `- ${line}`).join("\n")}`);

  const container: Container = new Map();
  const scanIndex = new Map(functions.map((found, index) => [found.metadata.name, index]));
  const wrappers: { name: string; at: string; wrap: WrapperHandler }[] = [];
  // A kind depends on earlier kinds or on itself only, so filtering the one sorted order by kind keeps dependencies first.
  for (const kind of Object.keys(ALLOWED_DEPENDENCIES)) {
    for (const name of sorted.order) {
      const { metadata, filePath, functionName, awaited } = byName.get(name)!;
      if (metadata.mainDecorator.name !== kind) continue;
      const at = `${name}: function ${functionName} (${filePath})`;
      let step = "importing its file";
      let instance: any;
      // A result that is not a function would be stored and injected as it is, and fail far from here: on the first request.
      let notFunction: string | undefined;
      try {
        const create = (await import(pathToFileURL(filePath).href))[functionName];
        step = "creating it";
        instance = create(...metadata.dependencies.map((dependency) => container.get(dependency)!.getInstance()));
        if (awaited) {
          // Without a time limit: how long a resource may take to answer is knowledge about the resource, so the config sets its own.
          step = "waiting for it";
          instance = await instance;
        }
        if (kind !== "Config" && typeof instance !== "function") notFunction = `${at} returned ${describe(instance)}; a @${kind} must return a function`;
        // Applied from the innermost to the outermost: the wrapper applied last is the one a caller enters first.
        for (const wrapper of isWrapped(kind) && !notFunction ? wrappers : []) {
          step = `wrapping it with ${wrapper.name}`;
          instance = wrapper.wrap(instance, metadata);
          if (typeof instance === "function") continue;
          // The wrapper is at fault here, not the action, so the message leads with the wrapper.
          notFunction = `${wrapper.at} returned ${describe(instance)} when wrapping ${name}; a wrapper must return a function for every action`;
          break;
        }
      } catch (cause) {
        // Not collected like the checks: later components need this one, so going on would only produce follow-up failures.
        const reason = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`${at} failed while ${step}: ${reason}`, { cause });
      }
      if (notFunction) throw new Error(notFunction);
      container.set(name, new FuncInstanceMetadata(instance, metadata));
      if (kind === "Wrapper") wrappers.push({ name, at, wrap: instance });
    }
    // Layering follows the scan order (files in sorted path order, functions as written), not the creation order: the first written is the innermost.
    if (kind === "Wrapper") wrappers.sort((a, b) => scanIndex.get(a.name)! - scanIndex.get(b.name)!);
  }
  return container;
}

/** Every kind of action is wrapped, and the injected one is the wrapped one. */
function isWrapped(kind: string): boolean {
  return kind !== "Config" && kind !== "Wrapper";
}

function describe(value: unknown): string {
  return value === null ? "null" : value instanceof Promise ? "a promise" : typeof value;
}
