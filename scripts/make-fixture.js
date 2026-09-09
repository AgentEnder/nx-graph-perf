#!/usr/bin/env node
// @ts-check
'use strict';

// Validation fixture only: a workspace of N project.json libraries with a
// chained implicit dependency, enough for the daemon to have a graph to build.
// usage: node make-fixture.js <dir> [count] [nxVersion]

const fs = require('node:fs');
const path = require('node:path');

const [dir, countArg = '60', nxVersion = 'latest'] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node make-fixture.js <dir> [count] [nxVersion]');
  process.exit(2);
}
const count = Number(countArg);

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, 'package.json'),
  JSON.stringify({ name: 'graph-perf-fixture', private: true, devDependencies: { nx: nxVersion } }, null, 2),
);
fs.writeFileSync(
  path.join(dir, 'nx.json'),
  JSON.stringify(
    {
      namedInputs: {
        default: ['{projectRoot}/**/*'],
        production: ['default', '!{projectRoot}/**/*.spec.ts'],
      },
      targetDefaults: {
        build: { cache: true, dependsOn: ['^build'], inputs: ['production', '^production'] },
      },
      plugins: [],
    },
    null,
    2,
  ),
);
fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules\n.nx\n');
for (let i = 1; i <= count; i++) {
  const root = path.join(dir, 'libs', `lib${i}`);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'project.json'),
    JSON.stringify(
      {
        name: `lib${i}`,
        sourceRoot: `libs/lib${i}/src`,
        implicitDependencies: i > 1 ? [`lib${i - 1}`] : [],
        targets: { build: { command: `echo build lib${i}`, outputs: [`{projectRoot}/dist`] } },
      },
      null,
      2,
    ),
  );
  for (let f = 1; f <= 5; f++) {
    fs.writeFileSync(path.join(root, 'src', `file${f}.ts`), `export const v${i}_${f} = ${f};\n`);
  }
}
console.log(`fixture with ${count} projects at ${dir}`);
