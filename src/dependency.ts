export type DependencyNode = { name: string; dependencies: string[] };

export type DependencyOrder = {
  /** Names with every dependency before what needs it. Only meaningful when `errors` is empty. */
  order: string[];
  /** One message per missing dependency and per cycle. */
  errors: string[];
};

/**
 * Orders components so that each one comes after everything it depends on.
 *
 * Problems are returned instead of thrown, so that startup can merge them with its other findings into one error.
 * Unrelated components keep their input order, which makes the result depend on the input alone.
 */
export function sortDependencies(nodes: DependencyNode[]): DependencyOrder {
  const byName = new Map<string, DependencyNode>();
  // The first of two components with the same name wins here; reporting the duplicate is the scanner's job.
  for (const node of nodes) if (!byName.has(node.name)) byName.set(node.name, node);

  const order: string[] = [];
  const errors: string[] = [];
  const done = new Set<string>();
  const path: string[] = [];

  function visit(node: DependencyNode): void {
    path.push(node.name);
    for (const dependencyName of node.dependencies) {
      const dependency = byName.get(dependencyName);
      if (!dependency) {
        errors.push(`${node.name}: dependency ${dependencyName} is not a known component`);
      } else if (path.includes(dependencyName)) {
        errors.push(`circular dependency: ${[...path.slice(path.indexOf(dependencyName)), dependencyName].join(" -> ")}`);
      } else if (!done.has(dependencyName)) {
        visit(dependency);
      }
    }
    path.pop();
    done.add(node.name);
    order.push(node.name);
  }

  for (const node of byName.values()) if (!done.has(node.name)) visit(node);
  return { order, errors };
}
