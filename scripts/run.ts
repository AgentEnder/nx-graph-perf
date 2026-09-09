// Runs the collector from this clone against another workspace, straight from
// the TypeScript source. Invoked through jiti: `npm run collect -- <workspace>`.
// The report goes to reports/<workspace name>/ here unless --out is given.

import fs from 'node:fs';
import path from 'node:path';
import { run } from '../src/graph-perf';

const [target, ...flags] = process.argv.slice(2);
if (!target || target === '--help' || target === '-h') {
  console.error('usage: npm run collect -- <workspace> [graph-perf flags]');
  process.exit(2);
}

const workspace = path.resolve(target);
if (!fs.existsSync(path.join(workspace, 'nx.json'))) {
  console.error(`${workspace} has no nx.json; pass the workspace root`);
  process.exit(2);
}

if (!flags.includes('--out')) {
  flags.push('--out', path.join(__dirname, '..', 'reports', path.basename(workspace)));
}

// nx derives its workspace root from the cwd when it is loaded in-process.
process.chdir(workspace);
run(flags, workspace).then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    process.exit(1);
  },
);
