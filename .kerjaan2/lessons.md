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
- ScannedFunction (src/scanner.ts) has a fourth field, awaited; a test that deepEquals scan results must include it, and only a config declared exactly Promise<X> has it true
- src/ is 414 lines against the CLAUDE.md target of under 400 (it was 403 before 261116113702); a later ticket adding to src/ should look for lines to remove
- Option mistakes are collected in build() in src/skeleto.ts (listOption) and come before the scanner's lines in the startup error; src/ is at 420 lines, above the 400 target of CLAUDE.md section 2
- readDecorators (src/decorator.ts) returns { decorators, tags, problems }; a test that deepEquals a whole reading must include tags (lowercase tag names, in order)
- With options.decorators the scanner reports markers lacking a main marker, lowercase near-markers, and main markers on exported constants or namespace functions; scan a 'left alone' fixture without the list
- README code blocks may be '// path.ts (excerpt)': test/readme.test.ts requires the body to be a verbatim part of the example file of that path; editing the full block can break an excerpt elsewhere
- BEST_PRACTICES.md code blocks must be '// path.ts (excerpt)' blocks that appear verbatim in a README example file; test/readme.test.ts refuses anything else there
- A guarantee that a document holds no unchecked code block must recognise every CommonMark fence form (info strings after the language, ~~~ fences, indented fences in lists), not only ^```lang$
- README example output is asserted line by line in test/readme.test.ts (slices 0-6 and 6-11); any change to what main.ts prints needs those assertions updated
- A tsx --test started from inside a node:test run inherits NODE_TEST_CONTEXT, prints nothing and exits 0; drop that variable from the child's env
- BEST_PRACTICES.md rules are '### B<n>. ... (Mandatory|Optional)' then a 'Why:' paragraph; test/readme.test.ts checks them and bans database product and framework names
- REVIEW_CHECKLIST.md rows must match the practice rule headings word for word, and its example finding cites stock_transfer.ts:18; edit them together
- TECHNICAL_PRACTICES.md T1 excerpts implSaveWarehouses whole and verbatim from README; changing that function means changing the excerpt too
- The README impl-name check scans the example with scanDirectory; its proving test expects implSaveWarehouses in src/gateway/memory/warehouse.ts
- A new rule goes where the owner's placement answer puts it, also when that answer is recorded on a sibling ticket the assumption cites; change the numbering test to fit, never the placement to fit the test.
