// Re-renders graph-perf.html and graph-perf.trace.json from a graph-perf.json
// that was already collected, so the viewer can be worked on without running
// against a workspace again. Invoked through jiti: `npm run render -- <dir>`.

import fs from 'node:fs';
import path from 'node:path';
import { renderHtml, renderTrace } from '../src/graph-perf';

const [target] = process.argv.slice(2);
if (!target || target === '--help' || target === '-h') {
  console.error('usage: npm run render -- <directory holding graph-perf.json>');
  process.exit(2);
}

const dir = path.resolve(target);
const source = path.join(dir, 'graph-perf.json');
if (!fs.existsSync(source)) {
  console.error(`${source} does not exist`);
  process.exit(2);
}

const collected = JSON.parse(fs.readFileSync(source, 'utf8'));
fs.writeFileSync(path.join(dir, 'graph-perf.html'), renderHtml(collected));
fs.writeFileSync(path.join(dir, 'graph-perf.trace.json'), renderTrace(collected));
console.log(`wrote ${path.join(dir, 'graph-perf.html')} and graph-perf.trace.json`);
