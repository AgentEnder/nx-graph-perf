// @ts-check
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Serves `require('./file.js?text')` as the file's source, so the bundle can
 * write the instrumented module out at runtime. */
const textPlugin = {
  name: "text",
  /** @param {import('esbuild').PluginBuild} b */
  setup(b) {
    b.onResolve({ filter: /\?text$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?text$/, "")),
      namespace: "text",
    }));
    b.onLoad({ filter: /.*/, namespace: "text" }, async (args) => ({
      contents: await readFile(args.path, "utf8"),
      loader: "text",
    }));
  },
};

await build({
  entryPoints: ["src/graph-perf.js"],
  outfile: "dist/graph-perf.js",
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  banner: { js: "#!/usr/bin/env node" },
  plugins: [textPlugin],
  legalComments: "none",
});
console.log("built dist/graph-perf.js");
