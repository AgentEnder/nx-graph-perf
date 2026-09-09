import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'rolldown';

const instrumentModule = path.resolve('src/instrument.ts');

// Replaces src/instrument.ts with the drop-in module's source inlined, so the
// bundle stays a single file.
function inlineInstrument(): Plugin {
  return {
    name: 'inline-instrument',
    load(id) {
      if (id !== instrumentModule) return null;
      const source = fs.readFileSync(path.resolve('src/perf-logging.js'), 'utf8');
      return `export function instrumentSource() { return ${JSON.stringify(source)}; }`;
    },
  };
}

export default defineConfig({
  input: 'src/main.ts',
  platform: 'node',
  output: {
    file: 'dist/graph-perf.js',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    minify: false,
  },
  plugins: [inlineInstrument()],
});
