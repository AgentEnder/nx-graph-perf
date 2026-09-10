import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'rolldown';

const read = (file: string) => fs.readFileSync(path.resolve(file), 'utf8');

/**
 * Replaces an accessor module with its assets inlined, so the bundle stays a
 * single file. The modules read the same files off disk, which is what keeps
 * the TypeScript source runnable through jiti.
 */
function inlineModule(module: string, generate: () => string): Plugin {
  const id = path.resolve(module);
  return {
    name: `inline-${path.basename(module, '.ts')}`,
    load(loaded) {
      return loaded === id ? generate() : null;
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
  plugins: [
    inlineModule(
      'src/instrument.ts',
      () => `export function instrumentSource() { return ${JSON.stringify(read('src/perf-logging.js'))}; }`,
    ),
    inlineModule('src/viewer-assets.ts', () => {
      const assets = {
        html: read('src/viewer/viewer.html'),
        css: read('src/viewer/viewer.css'),
        js: read('src/viewer/viewer.js'),
      };
      return `export function viewerAssets() { return ${JSON.stringify(assets)}; }`;
    }),
  ],
});
