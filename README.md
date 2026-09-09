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

If you would rather read the code before running it, clone the repo and point the runner at your workspace. Nothing needs installing: `dist/graph-perf.js` is committed and the runner uses only Node built-ins.

```sh
git clone https://github.com/AgentEnder/nx-graph-perf.git
cd nx-graph-perf
node scripts/run.js /path/to/your/workspace
```

`npm run collect -- /path/to/your/workspace` does the same. Any further arguments are passed through, for example `node scripts/run.js ../my-workspace --runs 5`.

The report lands in `reports/<workspace name>/` inside the clone, so the workspace itself is left as it was apart from the daemon reset. Pass `--out` to put it elsewhere.

The source is in `src/`. `dist/graph-perf.js` is the same code bundled with its one dependency, [markdown-factory](https://github.com/AgentEnder/markdown-factory); `npm install && npm run build` reproduces it.

## What it does

1. Runs `nx reset` so the daemon starts fresh.
2. Replaces `node_modules/nx/dist/src/utils/perf-logging.js` with an instrumented copy that also appends each measure to `.nx/workspace-data/perf-logs/<pid>/<process pid>.jsonl`. The original is backed up and put back when the script exits, including on failure.
3. Runs `nx show projects --json` once cold (daemon start and full graph construction) and then two more times warm (daemon round trip only).
4. Reads the recorded measures, the data behind `nx report`, and the `plugins`, `targetDefaults` and `namedInputs` blocks of `nx.json`.
5. Loads the workspace's plugins the way nx does and counts the files each plugin's `createNodes` glob matches.
6. Writes the report.

The daemon is forced on (`NX_DAEMON=true`) because Nx disables it under CI and inside Docker, and a daemonless run measures something else.

## Options

| Flag                | Default | Meaning                                                               |
| ------------------- | ------- | --------------------------------------------------------------------- |
| `--runs N`          | `3`     | Total runs. The first is cold, the rest are warm.                     |
| `--out DIR`         | `.`     | Where to write the report.                                            |
| `--no-reset`        |         | Skip `nx reset`. The cold run is then whatever the daemon has cached. |
| `--no-instrument`   |         | Only time the commands. No module swap, no per-process measures.      |
| `--instrument FILE` |         | Use a local instrumented module instead of the bundled one.           |

## What the report contains

- Platform, project count, cold and warm wall times.
- A table of every Nx process that ran, with its role and when it started.
- Key phases across all processes: plugin loading, worker startup, `createNodes`, `createDependencies`, graph serialization, and the client round trip.
- A full timeline per process.
- Per plugin, the files its `createNodes` glob matches, counted by basename. A config file can produce more than one project, so this bounds what a plugin contributes rather than counting its projects.
- The `nx report` data as tables.
- The graph-relevant parts of `nx.json`.

The raw measures stay in `.nx/workspace-data/perf-logs/` until the next `nx reset`.

## Building from source

```sh
npm install
npm run check   # typecheck with tsc
npm run build   # bundle src/ into dist/graph-perf.js
```

`dist/graph-perf.js` is committed so the curl commands above work without a build step. Rebuild and commit it with any change to `src/`.

`npm run fixture -- <dir> [projects] [nxVersion]` generates a throwaway workspace for trying the script, and `npm run collect -- <dir>` runs the bundle against it.
