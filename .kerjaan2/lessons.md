# Lessons

What earlier tickets learned about this project. Newest last; k2 keeps the last 60.

- TypeScript here is 7.x and ts-morph bundles its own older compiler; npm audit reports 3 moderate findings (minimatch via ts-morph) that have no non-breaking fix
- k2 test <id> -- <command> splits arguments, so a multi-step shell line must go in a script file, not sh -c '...'
- sortDependencies in src/dependency.ts returns { order, errors } and never throws; callers must check errors before using order, and must report duplicate names themselves
- scanDirectory (src/scanner.ts) returns { functions, errors } and never throws; an empty directory gives an empty result, so startup must report it; tests reuse withFixture from test/fixture.ts
- A scanner that lists paths by name must filter to regular files before reading them: a folder whose name ends in .ts must be walked, not opened as a file
- readdirSync with recursive: true follows links to folders and hangs on a link back to a parent folder (node 22); src/scanner.ts walks the tree itself for that reason
- Skeleto.start imports the scanned .ts files and node caches modules by URL: a test that restarts a directory must change behaviour through a global flag or a new file, not by rewriting an imported file
- README.md code blocks are run by test/readme.test.ts: a ts block needs '// path.ts' as its first line, and the text block must equal the real output of 'npx tsx main.ts'
- Test fixtures run on a file system that may ignore case (macOS): two folders that differ only in case become one folder, so put them in separate fixtures
