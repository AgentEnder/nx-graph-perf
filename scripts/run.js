#!/usr/bin/env node
// @ts-check
'use strict';

// Runs the bundled collector against another workspace from this clone.
// usage: node scripts/run.js <workspace> [graph-perf flags]
// The report goes to reports/<workspace name>/ here unless --out is given.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [target, ...flags] = process.argv.slice(2);
if (!target || target === '--help' || target === '-h') {
  console.error('usage: node scripts/run.js <workspace> [graph-perf flags]');
  process.exit(2);
}

const workspace = path.resolve(target);
if (!fs.existsSync(path.join(workspace, 'nx.json'))) {
  console.error(`${workspace} has no nx.json; pass the workspace root`);
  process.exit(2);
}

const bundle = path.join(__dirname, '..', 'dist', 'graph-perf.js');
if (!fs.existsSync(bundle)) {
  console.error('dist/graph-perf.js is missing; run `npm run build`');
  process.exit(2);
}

if (!flags.includes('--out')) {
  flags.push('--out', path.join(__dirname, '..', 'reports', path.basename(workspace)));
}

const result = spawnSync(process.execPath, [bundle, ...flags], { cwd: workspace, stdio: 'inherit' });
process.exit(result.status ?? 1);
