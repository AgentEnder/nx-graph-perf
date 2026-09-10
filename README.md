# nx-graph-perf

A single-file script that measures how long Nx takes to build the project graph in your workspace and writes a markdown report you can attach to an issue or send to the Nx team.

It records every performance measure from every Nx process involved (the CLI client, the daemon, and each plugin worker), so the report shows which plugin or phase the time goes to, not just the total.

## Run it

Requires Node 18 or newer and works with Nx 20 and later. Run from the workspace root, where `nx.json` lives.

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

The script writes `graph-perf.md`, `graph-perf.json`, `graph-perf.html` and `graph-perf.trace.json` next to where it ran. Send the markdown and the JSON; the other two are rebuilt from the JSON. Delete `graph-perf.js` afterwards, or add all five files to `.gitignore`.

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

1. Replaces nx's `perf-logging.js` module with a copy that loads the original and also appends each measure to a JSON lines file per process under `nx-graph-perf/` in the OS temp directory. On versions where the daemon or the client does not load that module (the daemon before Nx 22, the client on Nx 22), one `require` line is added to that entry point. Every touched file is backed up and put back when the script exits, on failure and on Ctrl-C alike.
2. Runs `--runs` cycles (three by default). Each cycle is `nx reset`, a cold `nx show projects --json` (daemon start and full graph construction), a warm one (daemon round trip only), and a semi-warm one after a batch of file edits.
3. The edit batch is planned once, in the first cycle, and reused in every cycle so the cycles compare. It holds one file per loaded plugin whose `createNodes` glob matched anything, chosen so the batch touches as few projects as possible (random among equally good choices), plus `--source-edits` files that no plugin matches, from those same projects where possible. Before the semi-warm run every file in the batch gets a newline appended, the script waits half a second for the watcher, then runs `nx show projects --json` once. Plugin workers restart with their on-disk caches and the daemon rebuilds what the edits touched. Lock files are never edited, since the daemon restarts itself when their hash changes, and neither are the root `package.json` and `nx.json`. Every edited file gets its original bytes back when the script exits, including on failure.
4. Reads the recorded measures and deletes them, then reads the data behind `nx report` and the `plugins`, `targetDefaults` and `namedInputs` blocks of `nx.json`.
5. Writes the report, the timeline and the trace file.

The daemon is forced on (`NX_DAEMON=true`) because Nx disables it under CI and inside Docker, and a daemonless run measures something else. Pass `--no-daemon` to measure that path on purpose.

## Options

| Flag                       | Default | Meaning                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--runs N`                 | `3`     | Cycles of reset, cold, warm and the semi-warm edits.                                                                                                                                                                                                                                                                                                                                                    |
| `--source-edits N`         | `1`     | Plain source files in the edit batch, on top of the one-per-plugin config files.                                                                                                                                                                                                                                                                                                                        |
| `--edit-file FILE`         |         | Edit this file (relative to the workspace) instead of a random one.                                                                                                                                                                                                                                                                                                                                     |
| `--no-edit`                |         | Skip the semi-warm runs.                                                                                                                                                                                                                                                                                                                                                                                |
| `--out DIR`                | `.`     | Where to write the report.                                                                                                                                                                                                                                                                                                                                                                              |
| `--no-reset`               |         | Skip `nx reset` in every cycle. A cold run is then whatever the daemon has cached, and a daemon that predates the run cannot be instrumented, so it will not appear in the report.                                                                                                                                                                                                                      |
| `--no-instrument`          |         | Only time the commands. No module swap, no per-process measures.                                                                                                                                                                                                                                                                                                                                        |
| `--instrument FILE`        |         | Use a local instrumented module instead of the bundled one.                                                                                                                                                                                                                                                                                                                                             |
| `--no-daemon`              |         | Run every command with `NX_DAEMON=false`. Cold, warm and semi-warm then all build the graph in the client, which is what CI does.                                                                                                                                                                                                                                                                       |
| `--concurrent-processes N` | `1`     | Start N clients at once for every measured command. A run's wall time is when the last one exits, and the report adds a per-client spread. Use it to see what happens when several `nx` commands build the graph in the same checkout at the same time, with or without the daemon. Pair it with `--affected`, otherwise daemonless clients queue on the graph lock and only one of them does any work. |
| `--affected`               |         | Measure `nx show projects --affected --json` instead. After the graph request the client runs the touched-project locators, and the plugin-glob locator loads every plugin in the client process, so each client spawns its own workers and walks the workspace itself. The project count still comes from the full graph.                                                                              |

## What the report contains

- Platform, project count, and the cold, warm and semi-warm wall times of every cycle with their medians.
- One row per kind of Nx process (client, daemon, each plugin worker labelled with its plugin) across all cycles, with the sum of its top-level measures per cold, warm and semi-warm run. Nested measures count once, so a plugin worker's row is roughly what that plugin cost. A plugin registered more than once in `nx.json` gets a row per entry, labelled with the entry's position; nx starts workers in that order and numbers their sockets, which is how the rows are told apart.
- The edit batch: each file, its project, and the plugin whose glob matched it.
- Key phases with the cold, warm and semi-warm medians and the warm max: plugin loading, worker startup, `createNodes`, `createDependencies`, graph serialization, and the client round trip. A phase that stays slow warm costs every command; one that is slow semi-warm costs every edit.
- Per plugin, the files its `createNodes` glob matches, counted by basename. A config file can produce more than one project, so this bounds a plugin's share rather than counting its projects.
- The `nx report` data as tables, and the `plugins` and `targetDefaults` blocks of `nx.json`.

`graph-perf.json` has everything above plus every recorded measure, tagged with the run it happened in, and the `namedInputs` block.

The raw measures are removed after the report is written; `graph-perf.json` carries all of them.

## The timeline

`graph-perf.html` is one file with no network access, so opening it in a browser is enough. Pick a run and every Nx process gets a lane, with one bar per measure. A measure nested inside another sits below it, and concurrent work sits beside it. Hover or tab to a bar for its duration and start offset. Ctrl-scroll or pinch zooms the time axis. Drag the plot, swipe sideways, or use the scrollbar under the axis to pan; both the axis and the scrollbar stay pinned as the page scrolls. The table view lists every measure of that run, longest first. `Open in Perfetto` hands the trace to [ui.perfetto.dev](https://ui.perfetto.dev) in a new tab, over `postMessage`, so the measures stay in the browser.

`graph-perf.trace.json` is the same measures in Chrome Trace Event Format, for [speedscope](https://speedscope.app) or any flamegraph viewer that reads it. Every cycle sits on one timeline, with one trace process per Nx process and one thread per stack of nested measures. The HTML carries its own copy of this trace, which is most of its size.

From a clone, `npx nx render nx-graph-perf reports/<name>` rebuilds both from a `graph-perf.json` that was already collected.

## Reading the trace in Perfetto

Perfetto opens with every process collapsed, and hovering a collapsed row shows its internal track id rather than a name. Press the expand-all button above the track list, or the chevron on one process, to get named tracks and named slices. Click a slice for its duration and the run it came from. The search box finds every slice with a given name, which is the fastest way to compare one measure across processes.

Each track under a process is one stack of nested measures. A process gets a second track when two of its measures overlap without either containing the other, which is what parallel plugin loading looks like. Nesting is inferred from the timings, because Nx's performance marks carry no parent. One plugin's load sitting inside another's means the two overlapped, not that one caused the other.

For reading the numbers, `graph-perf.html` is the better tool: it names every lane, labels the bars, and sorts the table by duration. Perfetto earns its place when you want SQL over the measures or to zoom past what the chart shows.

## What the measures mean

Every row comes from a `performance.measure` call in Nx itself. The ones worth knowing:

| Measure                                                        | Process | Covers                                                            |
| -------------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `code-loading`                                                 | client  | The CLI importing its own code, before any of your work starts    |
| `createProjectGraphAsync`                                      | client  | The whole graph request as the client sees it                     |
| `REQUEST_PROJECT_GRAPH round trip`                             | client  | Waiting on the daemon to answer that request                      |
| `total for creating and serializing project graph`             | daemon  | Connection accepted through to a serialized graph on the wire     |
| `loadDefaultNxPlugins`, `loadSpecifiedNxPlugins`               | daemon  | Resolving and importing plugins, Nx's own and the ones in nx.json |
| `Load Nx Plugin: NAME`                                         | daemon  | Importing one plugin                                              |
| `start-plugin-worker:NAME`                                     | daemon  | Spawning that plugin's worker process                             |
| `plugin worker PID code loading`                               | worker  | The worker importing the plugin's code                            |
| `build-project-configs`                                        | daemon  | Every `createNodes` call plus assembling the project configs      |
| `NAME:createNodes`                                             | worker  | One plugin turning the files its glob matched into projects       |
| `createNodes:merge`                                            | daemon  | Merging every plugin's nodes into one set of projects             |
| `native-file-deps`, `get-workspace-files`                      | daemon  | The native walk of the workspace                                  |
| `total execution time for createProjectGraph()`                | daemon  | Nodes through to a finished graph                                 |
| `createDependencies`, `NAME:createDependencies`                | daemon  | Dependency discovery, all plugins together and each one           |
| `build typescript dependencies`                                | worker  | `@nx/js` resolving TypeScript imports                             |
| `serialize graph`, `write cache`, `read cache`                 | daemon  | Moving the graph to and from disk and the socket                  |
| `GLOB`, `HASH_MULTI_GLOB`, `GET_FILES_IN_DIRECTORY` round trip | worker  | A worker asking the daemon for file lists or hashes               |

A measure nested inside another is part of it, so a plugin's `createNodes` is inside the daemon's `build-project-configs`. Adding them up double counts; the Processes table in the report sums only the outermost ones.

## Building from source

```sh
npm install
npx nx typecheck   # tsc over src/, scripts/, the viewer and the rolldown config
npx nx build       # bundle src/ into dist/graph-perf.js with rolldown
```

Both targets are cached. `dist/graph-perf.js` is committed so the curl commands above work without a build step, and it is listed in `.nxignore` so the committed bundle does not count as an input. Rebuild and commit it with any change to `src/`.

`npx nx run nx-graph-perf:fixture <dir> [projects] [nxVersion]` generates a throwaway workspace for trying the script, and `npx nx run nx-graph-perf <dir>` runs the source against it.
