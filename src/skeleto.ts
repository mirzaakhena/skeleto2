import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sortDependencies } from "./dependency.js";
import { scanDirectory } from "./scanner.js";
import type { ScannedFunction } from "./scanner.js";
import { FuncInstanceMetadata } from "./type.js";
import type { SkeletoOptions, WrapperHandler } from "./type.js";

type Container = Map<string, FuncInstanceMetadata>;

// Creation order of the kinds, and for each kind the kinds it may depend on.
const ALLOWED_DEPENDENCIES: Record<string, string[]> = { Config: ["Config"], Wrapper: ["Config"], Action: ["Config", "Action"] };

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

async function build(root: string, options: SkeletoOptions | undefined): Promise<Container> {
  const { functions, errors } = scanDirectory(root, options?.decorators, options?.exclude);
  const byName = new Map<string, ScannedFunction>();
  // The first of two components with the same name wins, as in the sorter; the scanner has reported the duplicate.
  for (const found of functions) if (!byName.has(found.metadata.name)) byName.set(found.metadata.name, found);

  // The scanner returns nothing for a directory without .ts files, and a directory without any component has nothing to bind either.
  if (functions.length === 0 && errors.length === 0) errors.push(`${root}: no .ts file with a @Config, @Wrapper or @Action function was found`);
  for (const { metadata } of functions) {
    const kind = metadata.mainDecorator.name;
    for (const dependency of metadata.dependencies) {
      const dependencyKind = byName.get(dependency)?.metadata.mainDecorator.name;
      // An unknown dependency is reported by the sorter below.
      if (dependencyKind === undefined || ALLOWED_DEPENDENCIES[kind]?.includes(dependencyKind)) continue;
      const allowed = ALLOWED_DEPENDENCIES[kind]?.map((name) => `@${name}`).join(" and ");
      errors.push(`${metadata.name}: is a @${kind} and depends on ${dependency}, which is a @${dependencyKind}; a @${kind} may depend on ${allowed} only`);
    }
  }
  const sorted = sortDependencies(functions.map((found) => found.metadata));
  errors.push(...sorted.errors);
  // Everything is reported at once, and before the first import: an application file may have side effects.
  if (errors.length > 0) throw new Error(`Skeleto cannot start ${root}, ${errors.length} problem(s):\n${errors.map((line) => `- ${line}`).join("\n")}`);

  const container: Container = new Map();
  const wrappers: { name: string; at: string; ordinal: number; wrap: WrapperHandler }[] = [];
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
        for (const wrapper of kind === "Action" && !notFunction ? wrappers : []) {
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
      if (kind === "Wrapper") wrappers.push({ name, at, ordinal: metadata.mainDecorator.data?.ordinal ?? 0, wrap: instance });
    }
    // Plain code-unit comparison of names, so the layering does not depend on the locale of the machine.
    if (kind === "Wrapper") wrappers.sort((a, b) => a.ordinal - b.ordinal || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }
  return container;
}

function describe(value: unknown): string {
  return value === null ? "null" : value instanceof Promise ? "a promise" : typeof value;
}
