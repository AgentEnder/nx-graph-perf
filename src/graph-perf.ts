/**
 * Nx graph construction perf extraction.
 *
 * Resets the daemon, swaps nx's perf-logging module for an instrumented copy
 * that records every performance measure of every Nx process (client, daemon,
 * plugin workers) as JSON lines, times a cold and several warm project-graph
 * constructions, collects the `nx report` data, the files each plugin's
 * createNodes glob matches, and the graph-relevant parts of nx.json, restores
 * the original module, and writes:
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
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import * as md from 'markdown-factory';
import { instrumentSource } from './instrument';

interface Options {
  runs: number;
  out: string;
  reset: boolean;
  instrument: boolean;
  instrumentFile: string | null;
}

interface ProcessRecord {
  kind: 'process';
  pid: number;
  ppid: number;
  argv: string[];
  execArgv: string[];
  cwd: string;
  node: string;
  timeOrigin: number;
}

type MeasureRecord = {
  kind: 'measure';
  pid: number;
  name: string;
  startTime: number;
  duration: number;
  detail: unknown;
  /** Which timed command was in flight when the measure started. */
  phase: Phase;
  run: number;
};

type Phase = 'cold' | 'warm';

interface Run {
  index: number;
  phase: Phase;
  startedAt: number;
  endedAt: number;
  wallMs: number;
}

type ProcessTrace = {
  pid: number;
  ppid: number;
  role: string;
  argv: string[];
  timeOrigin: number;
  measures: MeasureRecord[];
};

type PluginConfigFiles = {
  name: string;
  pattern: string;
  include: string[] | null;
  exclude: string[] | null;
  total: number;
  files: { file: string; count: number }[];
};

interface Failure {
  error: string;
}

type NxJsonSummary = { plugins: unknown; targetDefaults: unknown; namedInputs: unknown } | Failure;

type ReportData = Record<string, any>;

interface SystemInfo {
  platform: string;
  release: string;
  arch: string;
  cpus: number;
  cpuModel: string | null;
  memoryGb: number;
  node: string;
}

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
  startedAt: number;
  endedAt: number;
  wallMs: number;
}

/** Everything that depends on which workspace is being measured. */
interface Workspace {
  root: string;
  require: NodeJS.Require;
  env: NodeJS.ProcessEnv;
  nxBin: string | null;
  perfLogsRoot: string;
  session: string;
  sessionDir: string;
}

const ENV_OVERRIDES = {
  NX_PERF_LOGGING: 'true',
  DOTNET_ROLL_FORWARD_TO_PRERELEASE: '1',
  NX_TUI: 'false',
  NX_DAEMON: 'true',
};

function parseArgs(argv: string[]): Options {
  const opts: Options = { runs: 3, out: '.', reset: true, instrument: true, instrumentFile: null };
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

function openWorkspace(root: string): Workspace {
  const { CI: _ci, ...inheritedEnv } = process.env;
  // nx is also loaded into this process for the report and plugin data; its
  // daemon status must describe the same environment the measured runs had.
  // Perf logging stays off here so that load does not echo timing lines.
  delete process.env.CI;
  Object.assign(process.env, { NX_DAEMON: ENV_OVERRIDES.NX_DAEMON, NX_TUI: ENV_OVERRIDES.NX_TUI });
  const perfLogsRoot = path.join(root, '.nx', 'workspace-data', 'perf-logs');
  const session = String(process.pid);
  // Node's own resolver anchored at the workspace. The ambient `require` is
  // not enough: under jiti its resolve() ignores the `paths` option.
  const require = createRequire(path.join(root, 'package.json'));
  return {
    root,
    require,
    env: { ...inheritedEnv, ...ENV_OVERRIDES },
    // The workspace's own nx entry point, run with this node. `npx` would add
    // its own startup to every timing, and on Windows that is a second or more.
    nxBin: resolveFromWorkspace(require, 'nx/bin/nx.js'),
    perfLogsRoot,
    session,
    sessionDir: path.join(perfLogsRoot, session),
  };
}

function resolveFromWorkspace(require: NodeJS.Require, request: string): string | null {
  try {
    return require.resolve(request);
  } catch {
    return null;
  }
}

/** Resolves a module inside the installed nx, under whichever layout it ships. */
function resolveNxInternal(ws: Workspace, rel: string): string | null {
  return resolveFromWorkspace(ws.require, `nx/dist/src/${rel}`) ?? resolveFromWorkspace(ws.require, `nx/src/${rel}`);
}

/** Runs `nx <args>` and returns exit code, output and wall time. */
function nx(ws: Workspace, args: string[]): CommandResult {
  const startedAt = Date.now();
  const started = process.hrtime.bigint();
  const common = { cwd: ws.root, env: ws.env, encoding: 'utf8' as const, maxBuffer: 64 * 1024 * 1024 };
  const result = ws.nxBin
    ? spawnSync(process.execPath, [ws.nxBin, ...args], common)
    : spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['nx', ...args], {
        ...common,
        shell: process.platform === 'win32',
      });
  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    startedAt,
    endedAt: Date.now(),
    wallMs,
  };
}

function assertOk(label: string, result: CommandResult): void {
  if (result.status !== 0) {
    console.error(`${label} failed (exit ${result.status})`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function readNxJson(root: string): NxJsonSummary {
  const file = path.join(root, 'nx.json');
  if (!fs.existsSync(file)) return { error: 'nx.json not found' };
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      plugins: json.plugins ?? null,
      targetDefaults: json.targetDefaults ?? null,
      namedInputs: json.namedInputs ?? null,
    };
  } catch (e) {
    return { error: `nx.json unreadable: ${errorMessage(e)}` };
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * The data behind `nx report`, straight from the installed nx. Loading nx in
 * this process is fine here: recording is already withdrawn when it runs.
 */
async function readReportData(ws: Workspace): Promise<ReportData> {
  const module = resolveNxInternal(ws, 'command-line/report/report');
  if (!module) return { error: 'nx report module not found' };
  try {
    const { getReportData } = ws.require(module);
    const data = await getReportData();
    for (const key of ['nxKeyError', 'projectGraphError']) {
      if (data[key] instanceof Error) data[key] = data[key].message;
    }
    if (data.daemon && 'error' in data.daemon) data.daemon = { error: String(data.daemon.error) };
    return data;
  } catch (e) {
    return { error: `getReportData failed: ${errorMessage(e)}` };
  }
}

interface LoadedPlugin {
  name: string;
  createNodes?: [pattern: string, fn: unknown];
  include?: string[];
  exclude?: string[];
}

/**
 * Loads the workspace's plugins the way nx does and counts the files each
 * plugin's createNodes glob matches, grouped by basename. A config file can
 * yield more than one project, so this bounds what a plugin contributes rather
 * than counting its projects.
 */
async function readPluginConfigFiles(ws: Workspace): Promise<PluginConfigFiles[] | Failure> {
  const root = ws.root;
  const getPlugins = resolveNxInternal(ws, 'project-graph/plugins/get-plugins');
  const workspaceContext = resolveNxInternal(ws, 'utils/workspace-context');
  const nxJsonModule = resolveNxInternal(ws, 'config/nx-json');
  const configUtils = resolveNxInternal(ws, 'project-graph/utils/project-configuration-utils');
  if (!getPlugins || !workspaceContext || !nxJsonModule || !configUtils) {
    return { error: 'nx plugin loading internals not found in this nx version' };
  }
  try {
    const { getPlugins: loadPlugins, cleanupPlugins } = ws.require(getPlugins);
    const { globWithWorkspaceContextSync } = ws.require(workspaceContext);
    const { readNxJson } = ws.require(nxJsonModule);
    const { findMatchingConfigFiles } = ws.require(configUtils);
    const plugins: LoadedPlugin[] = await loadPlugins(readNxJson(root), root);
    const result: PluginConfigFiles[] = [];
    for (const plugin of plugins) {
      if (!plugin.createNodes) continue;
      const pattern = plugin.createNodes[0];
      const candidates: string[] = globWithWorkspaceContextSync(root, [pattern]);
      const matched: string[] = findMatchingConfigFiles(candidates, plugin.include, plugin.exclude);
      const counts = new Map<string, number>();
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
    return { error: `plugin inspection failed: ${errorMessage(e)}` };
  }
}

// ---------------------------------------------------------------------------
// Instrumentation: swap nx's perf-logging module for the recording copy.

interface Instrument {
  target: string;
  restore(): void;
}

function installInstrument(ws: Workspace, source: string): Instrument | null {
  const target = resolveNxInternal(ws, 'utils/perf-logging.js');
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

function announceSession(ws: Workspace): void {
  fs.mkdirSync(ws.sessionDir, { recursive: true });
  fs.writeFileSync(path.join(ws.perfLogsRoot, 'ACTIVE'), ws.session);
}

function withdrawSession(ws: Workspace): void {
  fs.rmSync(path.join(ws.perfLogsRoot, 'ACTIVE'), { force: true });
}

function readTraces(ws: Workspace, runs: Run[]): ProcessTrace[] {
  if (!fs.existsSync(ws.sessionDir)) return [];
  const traces: ProcessTrace[] = [];
  for (const file of fs.readdirSync(ws.sessionDir)) {
    if (!file.endsWith('.jsonl')) continue;
    let header: ProcessRecord | null = null;
    const raw: Omit<MeasureRecord, 'phase' | 'run'>[] = [];
    for (const line of fs.readFileSync(path.join(ws.sessionDir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.kind === 'process') header = record;
        else if (record.kind === 'measure') raw.push(record);
      } catch {
        // A line torn by a process dying mid-write is dropped, not fatal.
      }
    }
    if (!header) continue;
    const timeOrigin = header.timeOrigin;
    // A measure belongs to the timed command that had started most recently
    // when it began; process time origins and run timestamps share the epoch.
    const measures: MeasureRecord[] = raw.map((m) => {
      const at = timeOrigin + m.startTime;
      const run = runs.reduce((current, r) => (r.startedAt <= at ? r : current), runs[0]);
      return { ...m, phase: run.phase, run: run.index };
    });
    measures.sort((a, b) => a.startTime - b.startTime);
    traces.push({
      pid: header.pid,
      ppid: header.ppid,
      role: classify(ws.root, header),
      argv: header.argv,
      timeOrigin: header.timeOrigin,
      measures,
    });
  }
  traces.sort((a, b) => a.timeOrigin - b.timeOrigin);
  return traces;
}

function classify(root: string, header: ProcessRecord): string {
  const script = header.argv[1] ? path.basename(header.argv[1]) : '';
  switch (script) {
    case 'nx.js':
      return `client: nx ${header.argv.slice(2).join(' ')}`.trim();
    case 'start.js':
      return 'daemon';
    case 'plugin-worker.js': {
      // argv: plugin-worker.js <socket> <plugin module> <workspace root>
      const plugin = header.argv[3];
      return plugin ? `plugin worker: ${shortName(root, plugin)}` : 'plugin worker';
    }
    default:
      return script || 'unknown';
  }
}

const roleKind = (role: string) => role.split(':')[0];

/**
 * Sum of the measures that are not fully inside another measure of the same
 * process. Nested phases (a plugin's createNodes inside the daemon's graph
 * construction, say) are counted once, through the measure that contains them.
 */
function topLevelMs(measures: MeasureRecord[]): number {
  const ordered = [...measures].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
  let outerEnd = -Infinity;
  let sum = 0;
  for (const m of ordered) {
    const end = m.startTime + m.duration;
    if (end <= outerEnd) continue;
    outerEnd = end;
    sum += m.duration;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Report

const ms = (n: number) => `${n.toFixed(1)} ms`;

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const rootForms = new Map<string, string[]>();

/** The workspace root as given and as its realpath, since nx reports the latter. */
function rootPrefixes(root: string): string[] {
  let forms = rootForms.get(root);
  if (!forms) {
    forms = [root];
    try {
      const real = fs.realpathSync(root);
      if (real !== root) forms.push(real);
    } catch {
      // unresolvable root: the plain form is all there is
    }
    rootForms.set(root, forms);
  }
  return forms;
}

/** Shortens the workspace-rooted plugin paths nx puts in measure names. */
function shortName(root: string, name: string): string {
  let short = name;
  for (const prefix of rootPrefixes(root)) {
    for (const sep of [path.sep, '/']) {
      if (short.startsWith(prefix + sep)) short = short.slice(prefix.length + sep.length);
    }
  }
  return (
    short
      // pnpm: node_modules/.pnpm/<pkg>@<version>_<hash>/node_modules/<pkg>
      .replace(/node_modules[\\/]\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/]/g, 'node_modules/')
      // a package resolved from above the workspace keeps its absolute prefix;
      // the path token runs from the start or a label separator to node_modules
      .replace(/(^|[\s:])(?:(?:[A-Za-z]:)?[^\s:]*[\\/])?node_modules[\\/]/, '$1node_modules/')
      .replace(/node_modules[\\/]nx[\\/]dist[\\/]src[\\/]plugins[\\/]/g, 'nx:')
      .replace(/node_modules[\\/]/g, '')
  );
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

interface Collected {
  collectedAt: string;
  workspaceRoot: string;
  system: SystemInfo;
  projectCount: number;
  coldGraphMs: number;
  warmMs: number[];
  warmMedianMs: number | null;
  runs: Run[];
  records: string | null;
  traces: ProcessTrace[];
  report: ReportData;
  pluginConfigFiles: PluginConfigFiles[] | Failure;
  nxJson: NxJsonSummary;
}

function renderMarkdown(r: Collected): string {
  const sys = r.system;
  const summary = md.ul(
    `Platform: ${sys.platform} ${sys.release} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB, node ${sys.node}`,
    `Projects: ${r.projectCount}`,
    `Cold ${md.code('nx show projects')} after ${md.code('nx reset')}: ${r.coldGraphMs} ms`,
    `Warm runs: ${r.warmMs.join(', ') || 'none'}${r.warmMs.length ? ` ms (median ${Math.round(median(r.warmMs))} ms)` : ''}`,
  );

  const sections: string[] = [];
  if (r.traces.length === 0) {
    sections.push('No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.');
  } else {
    const warmRuns = r.runs.filter((run) => run.phase === 'warm').length;
    sections.push(
      md.h2(
        'Processes',
        renderProcesses(r.traces, warmRuns),
        `Sums count nested measures once, through the outermost one. Warm is per run over ${warmRuns} warm run${warmRuns === 1 ? '' : 's'}. Every measure is in graph-perf.json.`,
      ),
    );
    sections.push(
      md.h2(
        'Key phases',
        'A phase that stays slow warm costs every command, not just the first.',
        renderKeyPhases(r.workspaceRoot, r.traces),
      ),
    );
  }

  sections.push(md.h2('Plugin config files', ...renderPluginConfigFiles(r.pluginConfigFiles)));
  sections.push(md.h2('nx report', ...renderReport(r.report)));

  const nxJsonKeys = ['plugins', 'targetDefaults'] as const;
  sections.push(
    md.h2(
      'nx.json',
      ...nxJsonKeys.map((key) =>
        md.h3(
          key,
          md.codeBlock(JSON.stringify('error' in r.nxJson ? r.nxJson.error : (r.nxJson[key] ?? null), null, 2), 'json'),
        ),
      ),
    ),
  );

  return md.h1('Nx graph construction', summary, ...sections) + '\n';
}

function renderProcesses(traces: ProcessTrace[], warmRuns: number): string {
  const earliest = Math.min(...traces.map((t) => t.timeOrigin));
  const phaseSum = (t: ProcessTrace, phase: Phase) => {
    const subset = t.measures.filter((m) => m.phase === phase);
    if (!subset.length) return '-';
    const sum = topLevelMs(subset);
    return ms(phase === 'warm' && warmRuns ? sum / warmRuns : sum);
  };
  return md.table(traces, [
    { label: 'pid', field: 'pid' },
    { label: 'role', mapFn: (t) => cell(t.role) },
    { label: 'started at', mapFn: (t) => `+${ms(t.timeOrigin - earliest)}` },
    { label: 'cold', mapFn: (t) => phaseSum(t, 'cold') },
    { label: 'warm / run', mapFn: (t) => phaseSum(t, 'warm') },
  ]);
}

function renderKeyPhases(root: string, traces: ProcessTrace[]): string {
  type Row = { phase: string; process: string; cold: number[]; warm: number[] };
  const byPhase = new Map<string, Row>();
  for (const t of traces) {
    for (const m of t.measures) {
      if (!KEY_PHASES.some((p) => p.test(m.name))) continue;
      const phase = shortName(root, m.name).replace(/^plugin worker \d+ code loading$/, 'plugin worker code loading');
      const key = `${phase} ${roleKind(t.role)}`;
      const entry = byPhase.get(key) ?? { phase, process: roleKind(t.role), cold: [], warm: [] };
      entry[m.phase].push(m.duration);
      byPhase.set(key, entry);
    }
  }
  const worst = (row: Row) => Math.max(...row.cold, ...row.warm);
  const rows = [...byPhase.values()].sort((a, b) => worst(b) - worst(a));
  const stat = (values: number[], pick: (v: number[]) => number) => (values.length ? ms(pick(values)) : '-');
  return md.table(rows, [
    { label: 'phase', mapFn: (p) => cell(p.phase) },
    { label: 'process', field: 'process' },
    { label: 'cold', mapFn: (p) => stat(p.cold, (v) => Math.max(...v)) },
    { label: 'warm median', mapFn: (p) => stat(p.warm, median) },
    { label: 'warm max', mapFn: (p) => stat(p.warm, (v) => Math.max(...v)) },
  ]);
}

function renderPluginConfigFiles(plugins: PluginConfigFiles[] | Failure): string[] {
  if ('error' in plugins) return [plugins.error];
  const intro =
    "Files matched by each loaded plugin's createNodes glob, by basename. A config file can produce more than one project, so this bounds a plugin's share rather than counting its projects.";
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

function renderReport(report: ReportData): string[] {
  if ('error' in report) return [String(report.error)];
  const parts: string[] = [];
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
  const versions: { package: string; version: string }[] = report.packageVersionsWeCareAbout;
  parts.push(
    md.table(versions, [
      { label: 'package', mapFn: (p) => md.code(p.package) },
      { label: 'version', field: 'version' },
    ]),
  );
  if (report.outOfSyncPackageGroup) {
    const g = report.outOfSyncPackageGroup;
    const misaligned: { name: string; version: string }[] = g.misalignedPackages;
    parts.push(
      md.h3(
        `Out of sync with ${g.basePackage}`,
        md.table(misaligned, [
          { label: 'package', field: 'name' },
          { label: 'version', field: 'version' },
        ]),
        `Run ${md.code(`nx migrate ${g.migrateTarget}`)} to align them.`,
      ),
    );
  }
  if (report.mismatchedNxVersions?.length) {
    const mismatched: { version: string; chain: string[] }[] = report.mismatchedNxVersions;
    parts.push(
      md.h3(
        'Mismatched nx versions',
        md.table(mismatched, [
          { label: 'version', field: 'version' },
          { label: 'chain', mapFn: (m) => m.chain.join(' > ') },
        ]),
      ),
    );
  }
  return parts;
}

// ---------------------------------------------------------------------------

/** Collects and writes the report for the workspace at `workspaceRoot`. */
export async function run(argv: string[], workspaceRoot: string): Promise<void> {
  const opts = parseArgs(argv);
  const ws = openWorkspace(workspaceRoot);
  const startedAt = new Date().toISOString();
  const outDir = path.resolve(ws.root, opts.out);
  fs.mkdirSync(outDir, { recursive: true });

  if (opts.reset) {
    console.log('nx reset');
    assertOk('nx reset', nx(ws, ['reset']));
  }

  let instrument: Instrument | null = null;
  if (opts.instrument) {
    const source = opts.instrumentFile
      ? fs.readFileSync(path.resolve(opts.instrumentFile), 'utf8')
      : instrumentSource();
    console.log(`instrumenting nx perf-logging${opts.instrumentFile ? ` from ${opts.instrumentFile}` : ''}`);
    instrument = installInstrument(ws, source);
    announceSession(ws);
  }

  try {
    // First run after a reset starts the daemon and builds the graph from nothing.
    console.log('cold graph construction: nx show projects --json');
    const cold = nx(ws, ['show', 'projects', '--json']);
    assertOk('nx show projects', cold);
    let projects: string[] = [];
    try {
      projects = JSON.parse(cold.stdout);
    } catch {
      console.error('could not parse `nx show projects --json` output');
      console.error(cold.stdout.slice(0, 500));
      process.exit(1);
    }

    // Subsequent runs hit the daemon's cached graph; their wall time is the
    // client round trip, which is what a developer feels on every command.
    const runs: Run[] = [
      { index: 0, phase: 'cold', startedAt: cold.startedAt, endedAt: cold.endedAt, wallMs: cold.wallMs },
    ];
    for (let i = 1; i < opts.runs; i++) {
      console.log(`warm run ${i} of ${opts.runs - 1}`);
      const warm = nx(ws, ['show', 'projects', '--json']);
      assertOk('nx show projects (warm)', warm);
      runs.push({ index: i, phase: 'warm', startedAt: warm.startedAt, endedAt: warm.endedAt, wallMs: warm.wallMs });
    }
    const warmMs = runs.filter((run) => run.phase === 'warm').map((run) => run.wallMs);

    // Stop recording before anything that is not graph construction runs.
    withdrawSession(ws);
    const traces = instrument ? readTraces(ws, runs) : [];

    console.log('nx report data');
    const report = await readReportData(ws);
    console.log('plugin config files');
    const pluginConfigFiles = await readPluginConfigFiles(ws);

    const result: Collected = {
      collectedAt: startedAt,
      workspaceRoot: ws.root,
      system: {
        platform: process.platform,
        release: os.release(),
        arch: process.arch,
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model ?? null,
        memoryGb: Math.round(os.totalmem() / 1024 ** 3),
        node: process.version,
      },
      projectCount: projects.length,
      coldGraphMs: Math.round(cold.wallMs),
      warmMs: warmMs.map(Math.round),
      warmMedianMs: warmMs.length ? Math.round(median(warmMs)) : null,
      runs,
      records: instrument ? path.relative(ws.root, ws.sessionDir) : null,
      traces,
      report,
      pluginConfigFiles,
      nxJson: readNxJson(ws.root),
    };

    fs.writeFileSync(path.join(outDir, 'graph-perf.md'), renderMarkdown(result));
    fs.writeFileSync(path.join(outDir, 'graph-perf.json'), JSON.stringify(result, null, 2) + '\n');

    console.log(`wrote ${path.join(outDir, 'graph-perf.md')} and graph-perf.json`);
    console.log(
      `projects ${projects.length}, cold ${result.coldGraphMs}ms, warm median ${result.warmMedianMs ?? 'n/a'}ms, recorded processes ${traces.length}, measures ${traces.reduce((n, t) => n + t.measures.length, 0)}`,
    );
  } finally {
    withdrawSession(ws);
    instrument?.restore();
  }
}
