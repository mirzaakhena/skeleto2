# Lessons

What earlier tickets learned about this project. Newest last; k2 keeps the last 60.

- TypeScript here is 7.x and ts-morph bundles its own older compiler; npm audit reports 3 moderate findings (minimatch via ts-morph) that have no non-breaking fix
- k2 test <id> -- <command> splits arguments, so a multi-step shell line must go in a script file, not sh -c '...'
- sortDependencies in src/dependency.ts returns { order, errors } and never throws; callers must check errors before using order, and must report duplicate names themselves
