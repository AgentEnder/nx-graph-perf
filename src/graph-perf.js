// @ts-check

/**
 * Nx graph construction perf extraction.
 *
 * Resets the daemon, swaps nx's perf-logging module for an instrumented copy
 * that records every performance measure of every Nx process (client, daemon,
 * plugin workers) as JSON lines, times a cold and several warm project-graph
 * constructions, collects the `nx report` data and the graph-relevant parts of
 * nx.json, restores the original module, and writes:
 *
 *   graph-perf.md   the report, built from the recorded measures
 *   graph-perf.json everything above, machine readable
 *
 * Node 18+. Run the bundle (dist/graph-perf.js) from the workspace root:
 *
 *   node graph-perf.js [--runs N] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE]
 *
 * Source and build: https://github.com/AgentEnder/nx-graph-perf
 *
 * Records land in .nx/workspace-data/perf-logs/<pid of this script>/<pid>.jsonl
 * and are announced to the Nx processes through a marker file, so nothing has to
 * survive the daemon's environment filtering.
 *
 * Nx starts its daemon with NX_PERF_LOGGING=true on its own; the variable is set
 * here as well so the client side of the cold run also reports its phases.
 * NX_DAEMON=true is forced because Nx turns the daemon off under CI and inside
 * Docker, and a daemonless run measures something else.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as md from 'markdown-factory';
import INSTRUMENT_SOURCE from './perf-logging.js?text';

/** @typedef {{ kind: 'process', pid: number, ppid: number, argv: string[], execArgv: string[], cwd: string, node: string, timeOrigin: number }} ProcessRecord */
/** @typedef {{ kind: 'measure', pid: number, name: string, startTime: number, duration: number, detail: unknown }} MeasureRecord */
/** @typedef {{ pid: number, ppid: number, role: string, argv: string[], timeOrigin: number, measures: MeasureRecord[] }} ProcessTrace */

/** @param {string[]} argv */
function parseArgs(argv) {
  const opts = {
    runs: 3,
    out: '.',
    reset: true,
    instrument: true,
    instrumentFile: /** @type {string | null} */ (null),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--runs') opts.runs = Math.max(1, Number(argv[++i]));
    else if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--no-reset') opts.reset = false;
    else if (arg === '--no-instrument') opts.instrument = false;
    else if (arg === '--instrument') opts.instrumentFile = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'usage: node graph-perf.js [--runs N] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE]',
      );
      process.exit(0);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

const workspaceRoot = process.cwd();
const overrides = {
  NX_PERF_LOGGING: 'true',
  DOTNET_ROLL_FORWARD_TO_PRERELEASE: '1',
  NX_TUI: 'false',
  NX_DAEMON: 'true',
};
const { CI: _ci, ...inheritedEnv } = process.env;
const env = { ...inheritedEnv, ...overrides };
// nx is also loaded into this process for the report and plugin data; its
// daemon status must describe the same environment the measured runs had.
// Perf logging stays off here so that load does not echo timing lines.
delete process.env.CI;
Object.assign(process.env, { NX_DAEMON: overrides.NX_DAEMON, NX_TUI: overrides.NX_TUI });

/** @param {string} request */
function resolveFromWorkspace(request) {
  try {
    return require.resolve(request, { paths: [workspaceRoot] });
  } catch {
    return null;
  }
}

// The workspace's own nx entry point, run with this node. `npx` would add its
// own startup to every timing, and on Windows that is a second or more.
const nxBin = resolveFromWorkspace('nx/bin/nx.js');

/**
 * Runs `nx <args>` and returns exit code, output and wall time.
 * @param {string[]} args
 */
function nx(args) {
  const started = process.hrtime.bigint();
  const result = nxBin
    ? spawnSync(process.execPath, [nxBin, ...args], {
        cwd: workspaceRoot,
        env,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    : spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['nx', ...args], {
        cwd: workspaceRoot,
        env,
        encoding: 'utf8',
        shell: process.platform === 'win32',
        maxBuffer: 64 * 1024 * 1024,
      });
  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    wallMs,
  };
}

/** @param {string} label @param {ReturnType<typeof nx>} result */
function assertOk(label, result) {
  if (result.status !== 0) {
    console.error(`${label} failed (exit ${result.status})`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}

/** @param {number[]} values */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function readNxJson() {
  const file = path.join(workspaceRoot, 'nx.json');
  if (!fs.existsSync(file)) return { error: 'nx.json not found' };
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      plugins: json.plugins ?? null,
      targetDefaults: json.targetDefaults ?? null,
      namedInputs: json.namedInputs ?? null,
    };
  } catch (e) {
    return { error: `nx.json unreadable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Resolves a module inside the installed nx, under whichever layout it ships.
 * @param {string} rel path below nx's src directory
 */
function resolveNxInternal(rel) {
  return resolveFromWorkspace(`nx/dist/src/${rel}`) ?? resolveFromWorkspace(`nx/src/${rel}`);
}

/**
 * The data behind `nx report`, straight from the installed nx. Loading nx in
 * this process is fine here: recording is already withdrawn when it runs.
 * @returns {Promise<Record<string, any>>}
 */
async function readReportData() {
  const module = resolveNxInternal('command-line/report/report');
  if (!module) return { error: 'nx report module not found' };
  try {
    const { getReportData } = require(module);
    const data = await getReportData();
    for (const key of ['nxKeyError', 'projectGraphError']) {
      if (data[key] instanceof Error) data[key] = data[key].message;
    }
    if (data.daemon && 'error' in data.daemon) data.daemon = { error: String(data.daemon.error) };
    return data;
  } catch (e) {
    return { error: `getReportData failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** @typedef {{ name: string, pattern: string, include: string[] | null, exclude: string[] | null, total: number, files: { file: string, count: number }[] }} PluginConfigFiles */

/**
 * Loads the workspace's plugins the way nx does and counts the files each
 * plugin's createNodes glob matches, grouped by basename. A config file can
 * yield more than one project, so this bounds what a plugin contributes rather
 * than counting its projects.
 * @returns {Promise<PluginConfigFiles[] | { error: string }>}
 */
async function readPluginConfigFiles() {
  const getPlugins = resolveNxInternal('project-graph/plugins/get-plugins');
  const workspaceContext = resolveNxInternal('utils/workspace-context');
  const nxJsonModule = resolveNxInternal('config/nx-json');
  const configUtils = resolveNxInternal('project-graph/utils/project-configuration-utils');
  if (!getPlugins || !workspaceContext || !nxJsonModule || !configUtils) {
    return { error: 'nx plugin loading internals not found in this nx version' };
  }
  try {
    const { getPlugins: loadPlugins, cleanupPlugins } = require(getPlugins);
    const { globWithWorkspaceContextSync } = require(workspaceContext);
    const { readNxJson } = require(nxJsonModule);
    const { findMatchingConfigFiles } = require(configUtils);
    /** @type {{ name: string, createNodes?: [string, unknown], include?: string[], exclude?: string[] }[]} */
    const plugins = await loadPlugins(readNxJson(workspaceRoot), workspaceRoot);
    /** @type {PluginConfigFiles[]} */
    const result = [];
    for (const plugin of plugins) {
      if (!plugin.createNodes) continue;
      const pattern = plugin.createNodes[0];
      /** @type {string[]} */
      const candidates = globWithWorkspaceContextSync(workspaceRoot, [pattern]);
      /** @type {string[]} */
      const matched = findMatchingConfigFiles(candidates, plugin.include, plugin.exclude);
      /** @type {Map<string, number>} */
      const counts = new Map();
      for (const file of matched) {
        const base = path.basename(file);
        counts.set(base, (counts.get(base) ?? 0) + 1);
      }
      result.push({
        name: plugin.name,
        pattern,
        include: plugin.include ?? null,
        exclude: plugin.exclude ?? null,
        total: matched.length,
        files: [...counts.entries()]
          .map(([file, count]) => ({ file, count }))
          .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file)),
      });
    }
    cleanupPlugins?.();
    return result;
  } catch (e) {
    return { error: `plugin inspection failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ---------------------------------------------------------------------------
// Instrumentation: swap nx's perf-logging module for the recording copy.

/**
 * @param {string} source
 * @returns {{ restore: () => void, target: string } | null}
 */
function installInstrument(source) {
  const target = resolveNxInternal('utils/perf-logging.js');
  if (!target) {
    console.warn('could not locate nx perf-logging module; running without instrumentation');
    return null;
  }
  const backup = `${target}.graph-perf-backup`;
  // A backup left by an interrupted run is the real original; keep it.
  if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
  fs.writeFileSync(target, source);
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    fs.copyFileSync(backup, target);
    fs.rmSync(backup, { force: true });
  };
  process.on('exit', restore);
  return { restore, target };
}

const perfLogsRoot = path.join(workspaceRoot, '.nx', 'workspace-data', 'perf-logs');
const session = String(process.pid);
const sessionDir = path.join(perfLogsRoot, session);

function announceSession() {
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(path.join(perfLogsRoot, 'ACTIVE'), session);
}

function withdrawSession() {
  fs.rmSync(path.join(perfLogsRoot, 'ACTIVE'), { force: true });
}

/** @returns {ProcessTrace[]} */
function readTraces() {
  if (!fs.existsSync(sessionDir)) return [];
  /** @type {ProcessTrace[]} */
  const traces = [];
  for (const file of fs.readdirSync(sessionDir)) {
    if (!file.endsWith('.jsonl')) continue;
    /** @type {ProcessRecord | null} */
    let header = null;
    /** @type {MeasureRecord[]} */
    const measures = [];
    for (const line of fs.readFileSync(path.join(sessionDir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.kind === 'process') header = record;
        else if (record.kind === 'measure') measures.push(record);
      } catch {
        // A line torn by a process dying mid-write is dropped, not fatal.
      }
    }
    if (!header) continue;
    measures.sort((a, b) => a.startTime - b.startTime);
    traces.push({
      pid: header.pid,
      ppid: header.ppid,
      role: classify(header),
      argv: header.argv,
      timeOrigin: header.timeOrigin,
      measures,
    });
  }
  traces.sort((a, b) => a.timeOrigin - b.timeOrigin);
  return traces;
}

/** @param {ProcessRecord} header */
function classify(header) {
  const script = header.argv[1] ? path.basename(header.argv[1]) : '';
  switch (script) {
    case 'nx.js':
      return `client: nx ${header.argv.slice(2).join(' ')}`.trim();
    case 'start.js':
      return 'daemon';
    case 'plugin-worker.js':
      return 'plugin worker';
    default:
      return script || 'unknown';
  }
}

/** @param {string} role */
const roleKind = (role) => role.split(':')[0];

// ---------------------------------------------------------------------------
// Report

/** @param {number} n */
const ms = (n) => `${n.toFixed(1)} ms`;

/** @param {string} s */
const cell = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/**
 * Shortens the workspace-rooted plugin paths nx puts in measure names.
 * @param {string} name
 */
function shortName(name) {
  return name
    .split(workspaceRoot + path.sep)
    .join('')
    .split(workspaceRoot + '/')
    .join('')
    .replace(/node_modules[\\/]nx[\\/]dist[\\/]src[\\/]plugins[\\/]/g, 'nx:')
    .replace(/node_modules[\\/]/g, '');
}

const KEY_PHASES = [
  /^total for creating and serializing project graph$/,
  /^total execution time for createProjectGraph\(\)$/,
  /^build-project-configs$/,
  /:createNodes$/,
  /^createNodes:merge$/,
  /^createDependencies$/,
  /:createDependencies$/,
  /^Load Nx Plugin: /,
  /^loadSpecifiedNxPlugins$/,
  /^loadDefaultNxPlugins$/,
  /^plugin worker \d+ code loading$/,
  /^start-plugin-worker:/,
  /^createProjectGraphAsync$/,
  /^REQUEST_PROJECT_GRAPH round trip$/,
];

/**
 * @param {object} r
 * @param {Record<string, unknown>} r.system
 * @param {number} r.projectCount
 * @param {number} r.coldGraphMs
 * @param {number[]} r.warmMs
 * @param {ProcessTrace[]} r.traces
 * @param {Record<string, any>} r.report
 * @param {PluginConfigFiles[] | { error: string }} r.pluginConfigFiles
 * @param {ReturnType<typeof readNxJson>} r.nxJson
 */
function renderMarkdown(r) {
  const sys = r.system;
  const summary = md.ul(
    `Platform: ${sys.platform} ${sys.release} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB, node ${sys.node}`,
    `Projects: ${r.projectCount}`,
    `Cold graph (first ${md.code('nx show projects')} after ${md.code('nx reset')}, daemon start included): ${r.coldGraphMs} ms`,
    `Warm client round trips: ${r.warmMs.join(', ') || 'none'}${r.warmMs.length ? ` (median ${Math.round(median(r.warmMs))} ms)` : ''}`,
  );

  /** @type {string[]} */
  const sections = [];
  if (r.traces.length === 0) {
    sections.push('No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.');
  } else {
    const earliest = Math.min(...r.traces.map((t) => t.timeOrigin));
    sections.push(
      md.h2(
        'Processes',
        md.table(r.traces, [
          { label: 'pid', field: 'pid' },
          { label: 'role', mapFn: (t) => cell(t.role) },
          { label: 'parent', field: 'ppid' },
          { label: 'started at', mapFn: (t) => `+${ms(t.timeOrigin - earliest)}` },
          { label: 'measures', mapFn: (t) => t.measures.length },
          {
            label: 'last measure ends',
            mapFn: (t) =>
              `+${ms(t.timeOrigin - earliest + t.measures.reduce((max, m) => Math.max(max, m.startTime + m.duration), 0))}`,
          },
        ]),
      ),
    );

    /** @type {Map<string, { phase: string, process: string, durations: number[] }>} */
    const byPhase = new Map();
    for (const t of r.traces) {
      for (const m of t.measures) {
        if (!KEY_PHASES.some((p) => p.test(m.name))) continue;
        const phase = shortName(m.name);
        const key = `${phase} ${roleKind(t.role)}`;
        const entry = byPhase.get(key) ?? { phase, process: roleKind(t.role), durations: [] };
        entry.durations.push(m.duration);
        byPhase.set(key, entry);
      }
    }
    const phases = [...byPhase.values()].sort((a, b) => Math.max(...b.durations) - Math.max(...a.durations));
    sections.push(
      md.h2(
        'Key phases',
        'Every occurrence across all processes, so cold and warm runs both show.',
        md.table(phases, [
          { label: 'phase', mapFn: (p) => cell(p.phase) },
          { label: 'process', field: 'process' },
          { label: 'occurrences', mapFn: (p) => p.durations.length },
          { label: 'first', mapFn: (p) => ms(p.durations[0]) },
          { label: 'median', mapFn: (p) => ms(median(p.durations)) },
          { label: 'max', mapFn: (p) => ms(Math.max(...p.durations)) },
        ]),
      ),
    );

    sections.push(
      md.h2(
        'Timelines',
        'Offsets are from each process start. Every recorded measure, in start order.',
        ...r.traces.map((t) =>
          md.h3(
            `${t.role}, pid ${t.pid}`,
            md.table(t.measures, [
              { label: 'start', mapFn: (m) => `+${ms(m.startTime)}` },
              { label: 'duration', mapFn: (m) => ms(m.duration) },
              { label: 'measure', mapFn: (m) => cell(shortName(m.name)) },
            ]),
          ),
        ),
      ),
    );
  }

  sections.push(md.h2('Plugin config files', ...renderPluginConfigFiles(r.pluginConfigFiles)));
  sections.push(md.h2('nx report', ...renderReport(r.report)));

  sections.push(
    md.h2(
      'nx.json',
      .../** @type {const} */ (['plugins', 'targetDefaults', 'namedInputs']).map((key) =>
        md.h3(
          key,
          md.codeBlock(JSON.stringify('error' in r.nxJson ? r.nxJson.error : (r.nxJson[key] ?? null), null, 2), 'json'),
        ),
      ),
    ),
  );

  return md.h1('Nx graph construction', summary, ...sections) + '\n';
}

/** @param {PluginConfigFiles[] | { error: string }} plugins */
function renderPluginConfigFiles(plugins) {
  if ('error' in plugins) return [plugins.error];
  const intro =
    "Files matched by each loaded plugin's createNodes glob, by basename. One config file can produce more than one project, so this bounds what a plugin contributes rather than counting its projects.";
  return [
    intro,
    ...plugins.map((p) => {
      const scope = [`Pattern: ${md.code(p.pattern)}`];
      if (p.include?.length) scope.push(`Include: ${p.include.map(md.code).join(', ')}`);
      if (p.exclude?.length) scope.push(`Exclude: ${p.exclude.map(md.code).join(', ')}`);
      return md.h3(
        p.name,
        scope.join(' '),
        p.files.length
          ? md.table(p.files, [
              { label: 'file', mapFn: (f) => md.code(f.file) },
              { label: 'count', field: 'count' },
            ])
          : 'No matching files.',
      );
    }),
  ];
}

/** @param {Record<string, any>} report */
function renderReport(report) {
  if ('error' in report) return [String(report.error)];
  /** @type {string[]} */
  const parts = [];
  const daemon =
    'error' in report.daemon
      ? `error: ${report.daemon.error}`
      : report.daemon.disabled
        ? 'disabled'
        : report.daemon.available
          ? 'running'
          : 'not running';
  parts.push(
    md.ul(
      `Package manager: ${report.pm} ${report.pmVersion}`,
      `Daemon: ${daemon}`,
      `Native binding: ${report.nativeTarget ?? 'not available'}`,
      `Cache: ${report.cache ? `${(report.cache.used / 1024 ** 2).toFixed(0)} MB used of ${(report.cache.max / 1024 ** 2).toFixed(0)} MB` : 'db cache off'}`,
      `Nx key: ${report.nxKey ? (report.nxKey.licenseType ?? 'present') : report.nxKeyError ? `error: ${report.nxKeyError}` : 'none'}`,
    ),
  );
  if (report.projectGraphError) parts.push(md.blockQuote(`Project graph error: ${report.projectGraphError}`));
  parts.push(
    md.table(report.packageVersionsWeCareAbout, [
      { label: 'package', mapFn: (p) => md.code(String(p.package)) },
      { label: 'version', field: 'version' },
    ]),
  );
  /** @type {{ kind: string, name: string }[]} */
  const plugins = [
    ...report.registeredPlugins.map((/** @type {string} */ name) => ({ kind: 'registered', name })),
    ...report.localPlugins.map((/** @type {string} */ name) => ({ kind: 'local', name })),
    ...report.communityPlugins.map((/** @type {{ name: string, version: string }} */ p) => ({
      kind: 'community',
      name: `${p.name} ${p.version}`,
    })),
    ...report.powerpackPlugins.map((/** @type {{ name: string, version: string }} */ p) => ({
      kind: 'powerpack',
      name: `${p.name} ${p.version}`,
    })),
  ];
  if (plugins.length) {
    parts.push(
      md.h3(
        'Plugins',
        md.table(plugins, [
          { label: 'kind', field: 'kind' },
          { label: 'plugin', mapFn: (p) => md.code(p.name) },
        ]),
      ),
    );
  }
  if (report.outOfSyncPackageGroup) {
    const g = report.outOfSyncPackageGroup;
    parts.push(
      md.h3(
        `Out of sync with ${g.basePackage}`,
        md.table(g.misalignedPackages, [
          { label: 'package', field: 'name' },
          { label: 'version', field: 'version' },
        ]),
        `Run ${md.code(`nx migrate ${g.migrateTarget}`)} to align them.`,
      ),
    );
  }
  if (report.mismatchedNxVersions?.length) {
    parts.push(
      md.h3(
        'Mismatched nx versions',
        md.table(/** @type {{ version: string, chain: string[] }[]} */ (report.mismatchedNxVersions), [
          { label: 'version', field: 'version' },
          { label: 'chain', mapFn: (m) => m.chain.join(' > ') },
        ]),
      ),
    );
  }
  return parts;
}

// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  fs.mkdirSync(opts.out, { recursive: true });

  if (opts.reset) {
    console.log('nx reset');
    assertOk('nx reset', nx(['reset']));
  }

  /** @type {ReturnType<typeof installInstrument>} */
  let instrument = null;
  if (opts.instrument) {
    const source = opts.instrumentFile ? fs.readFileSync(path.resolve(opts.instrumentFile), 'utf8') : INSTRUMENT_SOURCE;
    console.log(`instrumenting nx perf-logging${opts.instrumentFile ? ` from ${opts.instrumentFile}` : ''}`);
    instrument = installInstrument(source);
    announceSession();
  }

  try {
    // First run after a reset starts the daemon and builds the graph from nothing.
    console.log('cold graph construction: nx show projects --json');
    const cold = nx(['show', 'projects', '--json']);
    assertOk('nx show projects', cold);
    /** @type {string[]} */
    let projects = [];
    try {
      projects = JSON.parse(cold.stdout);
    } catch {
      console.error('could not parse `nx show projects --json` output');
      console.error(cold.stdout.slice(0, 500));
      process.exit(1);
    }

    // Subsequent runs hit the daemon's cached graph; their wall time is the
    // client round trip, which is what a developer feels on every command.
    /** @type {number[]} */
    const warmMs = [];
    for (let i = 1; i < opts.runs; i++) {
      console.log(`warm run ${i} of ${opts.runs - 1}`);
      const warm = nx(['show', 'projects', '--json']);
      assertOk('nx show projects (warm)', warm);
      warmMs.push(warm.wallMs);
    }

    // Stop recording before anything that is not graph construction runs.
    withdrawSession();
    const traces = instrument ? readTraces() : [];

    console.log('nx report data');
    const report = await readReportData();
    console.log('plugin config files');
    const pluginConfigFiles = await readPluginConfigFiles();

    const system = {
      platform: process.platform,
      release: os.release(),
      arch: process.arch,
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model ?? null,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      node: process.version,
    };
    const nxJson = readNxJson();
    const result = {
      collectedAt: startedAt,
      workspaceRoot,
      system,
      projectCount: projects.length,
      coldGraphMs: Math.round(cold.wallMs),
      warmMs: warmMs.map(Math.round),
      warmMedianMs: warmMs.length ? Math.round(median(warmMs)) : null,
      records: instrument ? path.relative(workspaceRoot, sessionDir) : null,
      traces,
      report,
      pluginConfigFiles,
      nxJson,
    };

    fs.writeFileSync(
      path.join(opts.out, 'graph-perf.md'),
      renderMarkdown({
        system,
        projectCount: projects.length,
        coldGraphMs: result.coldGraphMs,
        warmMs: result.warmMs,
        traces,
        report,
        pluginConfigFiles,
        nxJson,
      }),
    );
    fs.writeFileSync(path.join(opts.out, 'graph-perf.json'), JSON.stringify(result, null, 2) + '\n');

    console.log(`wrote ${path.join(opts.out, 'graph-perf.md')} and graph-perf.json`);
    console.log(
      `projects ${projects.length}, cold ${result.coldGraphMs}ms, warm median ${result.warmMedianMs ?? 'n/a'}ms, recorded processes ${traces.length}, measures ${traces.reduce((n, t) => n + t.measures.length, 0)}`,
    );
  } finally {
    withdrawSession();
    instrument?.restore();
  }
}

main().then(
  // nx loaded in-process may hold a daemon socket open; do not wait on it.
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    process.exit(1);
  },
);
