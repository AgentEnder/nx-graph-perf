# nx-graph-perf

A single-file script that measures how long Nx takes to build the project graph in your workspace and writes a markdown report you can attach to an issue or send to the Nx team.

It records every performance measure from every Nx process involved (the CLI client, the daemon, and each plugin worker), so the report shows which plugin or phase the time goes to, not just the total.

## Run it

Requires Node 18 or newer. Run from the workspace root, where `nx.json` lives.

macOS and Linux, with curl:

```sh
curl -fsSL https://raw.githubusercontent.com/AgentEnder/nx-graph-perf/main/dist/graph-perf.js -o graph-perf.js && node graph-perf.js
```

macOS and Linux, with wget:

```sh
wget -qO graph-perf.js https://raw.githubusercontent.com/AgentEnder/nx-graph-perf/main/dist/graph-perf.js && node graph-perf.js
```

Windows, PowerShell:

```powershell
iwr https://raw.githubusercontent.com/AgentEnder/nx-graph-perf/main/dist/graph-perf.js -OutFile graph-perf.js; node graph-perf.js
```

Windows, cmd:

```bat
curl -fsSL https://raw.githubusercontent.com/AgentEnder/nx-graph-perf/main/dist/graph-perf.js -o graph-perf.js && node graph-perf.js
```

The script writes `graph-perf.md` and `graph-perf.json` next to where it ran. Send both. Delete `graph-perf.js` afterwards, or add all three files to `.gitignore`.

## Run it from a clone

If you would rather read the code before running it, clone the repo and run the TypeScript source directly. The runner executes through [jiti](https://github.com/unjs/jiti), so there is no build step.

```sh
git clone https://github.com/AgentEnder/nx-graph-perf.git
cd nx-graph-perf
npm install
npx nx run nx-graph-perf /path/to/your/workspace
```

The clone is itself an Nx workspace with one project, and `run` is one of its targets. Any further arguments are passed through, for example `npx nx run nx-graph-perf ../my-workspace --runs 5`. `npm run run -- ../my-workspace` is the same thing without Nx in the middle.

The report lands in `reports/<workspace name>/` inside the clone, so the workspace itself is left as it was apart from the daemon reset. Pass `--out` to put it elsewhere.

The source is in `src/`. `dist/graph-perf.js` is the same code bundled with its one dependency, [markdown-factory](https://github.com/AgentEnder/markdown-factory); `npm run build` reproduces it.

## What it does

1. Replaces `node_modules/nx/dist/src/utils/perf-logging.js` with an instrumented copy that also appends each measure to a JSON lines file per process under `nx-graph-perf/` in the OS temp directory. The original is backed up and put back when the script exits, including on failure.
2. Runs `--runs` cycles (three by default). Each cycle is `nx reset`, a cold `nx show projects --json` (daemon start and full graph construction), a warm one (daemon round trip only), and the semi-warm edits.
3. The semi-warm edits are planned once, in the first cycle, and repeated in every cycle so the cycles compare. For each loaded plugin whose `createNodes` glob matched files, one of those files is edited; then `--source-edits` files that no plugin matches. Each edit goes to a project no earlier edit used, appends a newline, waits half a second for the watcher, and runs `nx show projects --json`. Plugin workers restart with their on-disk caches and the daemon rebuilds what the edit touched. Lock files are never edited, since the daemon restarts itself when their hash changes, and neither are the root `package.json` and `nx.json`. Every edited file gets its original bytes back when the script exits, including on failure.
4. Reads the recorded measures and deletes them, then reads the data behind `nx report` and the `plugins`, `targetDefaults` and `namedInputs` blocks of `nx.json`.
5. Writes the report.

The daemon is forced on (`NX_DAEMON=true`) because Nx disables it under CI and inside Docker, and a daemonless run measures something else.

## Options

| Flag                | Default | Meaning                                                                                                                                                                            |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--runs N`          | `3`     | Cycles of reset, cold, warm and the semi-warm edits.                                                                                                                               |
| `--source-edits N`  | `1`     | Source-file edits per cycle, after the one-per-plugin config edits.                                                                                                                |
| `--edit-file FILE`  |         | Edit this file (relative to the workspace) instead of a random one.                                                                                                                |
| `--no-edit`         |         | Skip the semi-warm runs.                                                                                                                                                           |
| `--out DIR`         | `.`     | Where to write the report.                                                                                                                                                         |
| `--no-reset`        |         | Skip `nx reset` in every cycle. A cold run is then whatever the daemon has cached, and a daemon that predates the run cannot be instrumented, so it will not appear in the report. |
| `--no-instrument`   |         | Only time the commands. No module swap, no per-process measures.                                                                                                                   |
| `--instrument FILE` |         | Use a local instrumented module instead of the bundled one.                                                                                                                        |

## What the report contains

- Platform, project count, and the cold, warm and semi-warm wall times of every cycle with their medians.
- One row per kind of Nx process (client, daemon, each plugin worker labelled with its plugin) across all cycles, with the sum of its top-level measures per cold, warm and semi-warm run. Nested measures count once, so a plugin worker's row is roughly what that plugin cost. A plugin registered more than once in `nx.json` gets a row per entry, labelled with the entry's position; nx starts workers in that order and numbers their sockets, which is how the rows are told apart.
- One row per semi-warm edit: the file, the plugin whose glob matched it, how many times it ran, and the median client and daemon time.
- Key phases with the cold, warm and semi-warm medians and the warm max: plugin loading, worker startup, `createNodes`, `createDependencies`, graph serialization, and the client round trip. A phase that stays slow warm costs every command; one that is slow semi-warm costs every edit.
- Per plugin, the files its `createNodes` glob matches, counted by basename. A config file can produce more than one project, so this bounds a plugin's share rather than counting its projects.
- The `nx report` data as tables, and the `plugins` and `targetDefaults` blocks of `nx.json`.
- A Gantt chart for the first cycle's cold and warm runs (Mermaid, rendered by GitHub) with one section per process and a bar per top-level measure or key phase.

`graph-perf.json` has everything above plus every recorded measure, tagged with the run it happened in, and the `namedInputs` block.

The raw measures are removed after the report is written; `graph-perf.json` carries all of them.

## Building from source

```sh
npm install
npx nx typecheck   # tsc over src/, scripts/ and the rolldown config
npx nx build       # bundle src/ into dist/graph-perf.js with rolldown
```

Both targets are cached. `dist/graph-perf.js` is committed so the curl commands above work without a build step, and it is listed in `.nxignore` so the committed bundle does not count as an input. Rebuild and commit it with any change to `src/`.

`npx nx run nx-graph-perf:fixture <dir> [projects] [nxVersion]` generates a throwaway workspace for trying the script, and `npx nx run nx-graph-perf <dir>` runs the source against it.
