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
  edit: boolean;
  sourceEdits: number;
  editFile: string | null;
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

/** cold: first build after reset. warm: nothing changed. semi-warm: a file in a project was just edited. */
type Phase = 'cold' | 'warm' | 'semi-warm';

type Run = {
  index: number;
  phase: Phase;
  startedAt: number;
  endedAt: number;
  wallMs: number;
  /** Semi-warm runs: the file edited first, and the plugin whose glob matches it. */
  file?: string;
  plugin?: string | null;
};

interface EditPlan {
  file: string;
  plugin: string | null;
}

interface Edit extends EditPlan {
  touch(): void;
  restore(): void;
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

// Applied to the measured commands. NX_PERF_LOGGING is left alone; the daemon
// sets it for itself and the instrumented module records without it.
const ENV_OVERRIDES = {
  DOTNET_ROLL_FORWARD_TO_PRERELEASE: '1',
  NX_TUI: 'false',
  NX_DAEMON: 'true',
};

const INJECTED_BY_NX = new Set(['NX_ANALYTICS_SESSION_ID', 'NX_USE_V8_SERIALIZER']);

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    runs: 3,
    edit: true,
    sourceEdits: 1,
    editFile: null,
    out: '.',
    reset: true,
    instrument: true,
    instrumentFile: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--runs') opts.runs = Math.max(1, Number(argv[++i]));
    else if (arg === '--source-edits') opts.sourceEdits = Math.max(0, Number(argv[++i]));
    else if (arg === '--edit-file') opts.editFile = argv[++i];
    else if (arg === '--no-edit') opts.edit = false;
    else if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--no-reset') opts.reset = false;
    else if (arg === '--no-instrument') opts.instrument = false;
    else if (arg === '--instrument') opts.instrumentFile = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'usage: node graph-perf.js [--runs N] [--source-edits N] [--edit-file FILE] [--no-edit] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE]',
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
  // Drop what a wrapping nx or CI invocation stamped on this process. The
  // daemon rebuilds the graph when a client's env differs from the last one,
  // and these change on every `nx run` of the collector itself.
  for (const key of Object.keys(process.env)) {
    if (key === 'CI' || /^NX_TASK_/.test(key) || INJECTED_BY_NX.has(key)) delete process.env[key];
  }
  const inheritedEnv = { ...process.env };
  // nx is also loaded into this process, after the timed runs, for the report
  // and plugin data. It must not talk to the daemon: a request from here
  // carries an environment no CLI client has, and the daemon answers such a
  // change by rebuilding the graph, once now and once for the next client.
  Object.assign(process.env, ENV_OVERRIDES, { NX_DAEMON: 'false' });
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
interface PluginInspection {
  summary: PluginConfigFiles[];
  /** Plugin name to every file its glob matched, for choosing edits. */
  matched: Map<string, string[]>;
}

async function readPluginConfigFiles(ws: Workspace): Promise<PluginInspection | Failure> {
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
    const matchedByPlugin = new Map<string, string[]>();
    for (const plugin of plugins) {
      if (!plugin.createNodes) continue;
      const pattern = plugin.createNodes[0];
      const candidates: string[] = globWithWorkspaceContextSync(root, [pattern]);
      const matched: string[] = findMatchingConfigFiles(candidates, plugin.include, plugin.exclude);
      matchedByPlugin.set(plugin.name, [...(matchedByPlugin.get(plugin.name) ?? []), ...matched]);
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
    return { summary: result, matched: matchedByPlugin };
  } catch (e) {
    return { error: `plugin inspection failed: ${errorMessage(e)}` };
  }
}

// ---------------------------------------------------------------------------
// Semi-warm runs: edit a file in a project, then ask for the graph again.

const LOCK_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']);

/**
 * Files an edit must not touch: the daemon restarts itself when a lock file's
 * hash changes, and the root package.json and nx.json describe the workspace
 * rather than a project. A plugin whose glob matches only these gets no run.
 */
const neverEdit = (file: string) =>
  LOCK_FILES.has(path.basename(file)) || file === 'package.json' || file === 'nx.json';

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** File to project, from the file map the daemon wrote during the cold run. */
function readProjectOfFile(ws: Workspace): Map<string, string> {
  const owner = new Map<string, string>();
  const fileMap = path.join(ws.root, '.nx', 'workspace-data', 'file-map.json');
  if (!fs.existsSync(fileMap)) return owner;
  try {
    const projectFileMap: Record<string, { file: string }[]> = JSON.parse(fs.readFileSync(fileMap, 'utf8')).fileMap
      .projectFileMap;
    for (const [project, files] of Object.entries(projectFileMap)) {
      for (const f of files) owner.set(f.file, project);
    }
  } catch {
    // no file map, every file counts as its own project below
  }
  return owner;
}

/**
 * One edit per plugin that matched config files, then `sourceEdits` edits of
 * ordinary source files. Each edit lands in a project no earlier edit used,
 * as long as there are enough projects, so the runs exercise different parts
 * of the graph rather than one hot spot.
 */
function planEdits(ws: Workspace, matched: Map<string, string[]>, sourceEdits: number): EditPlan[] {
  const owner = readProjectOfFile(ws);
  const projectOf = (file: string) => owner.get(file) ?? file;
  const usedProjects = new Set<string>();
  const usedFiles = new Set<string>();
  const plan: EditPlan[] = [];
  const take = (files: string[], plugin: string | null) => {
    const fresh = files.filter((f) => !usedFiles.has(f) && !neverEdit(f));
    if (!fresh.length) return;
    const unusedProject = fresh.filter((f) => !usedProjects.has(projectOf(f)));
    const file = pick(unusedProject.length ? unusedProject : fresh);
    usedFiles.add(file);
    usedProjects.add(projectOf(file));
    plan.push({ file, plugin });
  };
  for (const [plugin, files] of matched) take(files, plugin);
  const configFiles = new Set([...matched.values()].flat());
  const sourceFiles = [...owner.keys()].filter((f) => !configFiles.has(f) && !neverEdit(f));
  for (let i = 0; i < sourceEdits; i++) take(sourceFiles, null);
  return plan;
}

/** Appends a newline per touch and puts the original bytes back on restore. */
function installEdit(ws: Workspace, plan: EditPlan): Edit | null {
  const absolute = path.join(ws.root, plan.file);
  if (!fs.existsSync(absolute)) {
    console.warn(`edit target ${plan.file} does not exist; skipping it`);
    return null;
  }
  const original = fs.readFileSync(absolute);
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    fs.writeFileSync(absolute, original);
    // Trust nothing in a checkout other processes may be touching: read it
    // back, and say so if the bytes still differ.
    if (!fs.readFileSync(absolute).equals(original)) {
      fs.writeFileSync(absolute, original);
      if (!fs.readFileSync(absolute).equals(original)) console.warn(`could not restore ${plan.file}; check it by hand`);
    }
  };
  process.on('exit', restore);
  return { ...plan, touch: () => fs.appendFileSync(absolute, '\n'), restore };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    // A measure is cold only if it began before the cold command returned;
    // anything later, including a worker spawned between commands, had the
    // on-disk cache. Process time origins and run timestamps share the epoch.
    const cold = runs[0];
    const measures: MeasureRecord[] = raw.map((m) => {
      const at = timeOrigin + m.startTime;
      if (at <= cold.endedAt) return { ...m, phase: 'cold', run: cold.index };
      const run = runs.reduce((current, r) => (r.startedAt <= at ? r : current), runs[1] ?? cold);
      return { ...m, phase: run.phase === 'cold' ? 'warm' : run.phase, run: run.index };
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
function topLevel(measures: MeasureRecord[]): MeasureRecord[] {
  const ordered = [...measures].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
  let outerEnd = -Infinity;
  const outer: MeasureRecord[] = [];
  for (const m of ordered) {
    const end = m.startTime + m.duration;
    if (end <= outerEnd) continue;
    outerEnd = end;
    outer.push(m);
  }
  return outer;
}

function topLevelMs(measures: MeasureRecord[]): number {
  return topLevel(measures).reduce((sum, m) => sum + m.duration, 0);
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

// Phases worth a row, each limited to the process kind where the name means
// what it says: `createProjectGraphAsync` inside the daemon is a sync
// generator reading the in-memory graph, not a graph construction.
const KEY_PHASES: { pattern: RegExp; role?: string }[] = [
  { pattern: /^total for creating and serializing project graph$/, role: 'daemon' },
  { pattern: /^total execution time for createProjectGraph\(\)$/, role: 'daemon' },
  { pattern: /^build-project-configs$/, role: 'daemon' },
  { pattern: /:createNodes$/ },
  { pattern: /^createNodes:merge$/, role: 'daemon' },
  { pattern: /^createDependencies$/, role: 'daemon' },
  { pattern: /:createDependencies$/ },
  { pattern: /^Load Nx Plugin: / },
  { pattern: /^loadSpecifiedNxPlugins$/ },
  { pattern: /^loadDefaultNxPlugins$/ },
  { pattern: /^plugin worker \d+ code loading$/, role: 'plugin worker' },
  { pattern: /^start-plugin-worker:/ },
  { pattern: /^createProjectGraphAsync$/, role: 'client' },
  { pattern: /^REQUEST_PROJECT_GRAPH round trip$/, role: 'client' },
];

interface Collected {
  collectedAt: string;
  workspaceRoot: string;
  system: SystemInfo;
  projectCount: number;
  coldGraphMs: number;
  warmMs: number[];
  warmMedianMs: number | null;
  semiWarmMs: number[];
  edits: EditPlan[];
  reset: boolean;
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
    ...(r.edits.length
      ? [`Semi-warm runs, each after appending a line to one file: ${r.semiWarmMs.join(', ')} ms`]
      : []),
    ...(r.reset ? [] : ['Daemon was not reset, so the cold run is only cold if no daemon was running.']),
  );

  const sections: string[] = [];
  if (r.traces.length === 0) {
    sections.push('No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.');
  } else {
    const warmRuns = r.runs.filter((run) => run.phase === 'warm').length;
    const semiWarmRuns = r.runs.filter((run) => run.phase === 'semi-warm').length;
    const plural = (n: number) => (n === 1 ? '' : 's');
    sections.push(
      md.h2(
        'Processes',
        renderProcesses(r.traces, warmRuns, semiWarmRuns),
        `Sums count nested measures once, through the outermost one, and are per run: ${warmRuns} warm run${plural(warmRuns)}, ${semiWarmRuns} semi-warm run${plural(semiWarmRuns)} after a file edit. Every measure is in graph-perf.json.`,
      ),
    );
    if (r.edits.length) {
      sections.push(
        md.h2(
          'Semi-warm runs',
          'One run per plugin whose glob matched a file, editing one of those files, then source-file edits. Daemon is the sum of its top-level measures inside that run.',
          renderSemiWarmRuns(r),
        ),
      );
    }
    sections.push(
      md.h2(
        'Key phases',
        'A phase that stays slow warm costs every command; one that is slow semi-warm costs every edit.',
        renderKeyPhases(r.workspaceRoot, r.traces),
      ),
    );
  }

  sections.push(md.h2('Plugin config files', ...renderPluginConfigFiles(r.pluginConfigFiles)));
  if (r.traces.length) sections.push(md.h2('Timelines', ...renderTimelines(r)));
  sections.push(md.h2('nx report', ...renderReport(r.report, r.traces, r.records !== null)));

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

function renderSemiWarmRuns(r: Collected): string {
  const daemon = r.traces.find((t) => t.role === 'daemon');
  const rows = r.runs.filter((run) => run.phase === 'semi-warm');
  return md.table(rows, [
    { label: 'run', mapFn: (run) => run.index },
    { label: 'edited file', mapFn: (run) => md.code(run.file ?? '?') },
    { label: 'matched by', mapFn: (run) => (run.plugin ? cell(run.plugin) : 'no plugin (source file)') },
    { label: 'client', mapFn: (run) => ms(run.wallMs) },
    {
      label: 'daemon',
      mapFn: (run) => (daemon ? ms(topLevelMs(daemon.measures.filter((m) => m.run === run.index))) : '-'),
    },
  ]);
}

function renderProcesses(traces: ProcessTrace[], warmRuns: number, semiWarmRuns: number): string {
  const earliest = Math.min(...traces.map((t) => t.timeOrigin));
  const perRun: Record<Phase, number> = { cold: 1, warm: warmRuns || 1, 'semi-warm': semiWarmRuns || 1 };
  const phaseSum = (t: ProcessTrace, phase: Phase) => {
    const subset = t.measures.filter((m) => m.phase === phase);
    return subset.length ? ms(topLevelMs(subset) / perRun[phase]) : '-';
  };
  return md.table(traces, [
    { label: 'pid', field: 'pid' },
    { label: 'role', mapFn: (t) => cell(t.role) },
    { label: 'started at', mapFn: (t) => `+${ms(t.timeOrigin - earliest)}` },
    { label: 'cold', mapFn: (t) => phaseSum(t, 'cold') },
    { label: 'warm / run', mapFn: (t) => phaseSum(t, 'warm') },
    { label: 'semi-warm / run', mapFn: (t) => phaseSum(t, 'semi-warm') },
  ]);
}

function renderKeyPhases(root: string, traces: ProcessTrace[]): string {
  type Row = { phase: string; process: string; cold: number[]; warm: number[]; 'semi-warm': number[] };
  const byPhase = new Map<string, Row>();
  for (const t of traces) {
    for (const m of t.measures) {
      const kind = roleKind(t.role);
      if (!KEY_PHASES.some((p) => p.pattern.test(m.name) && (!p.role || p.role === kind))) continue;
      const phase = shortName(root, m.name).replace(/^plugin worker \d+ code loading$/, 'plugin worker code loading');
      const key = `${phase} ${roleKind(t.role)}`;
      const entry = byPhase.get(key) ?? { phase, process: kind, cold: [], warm: [], 'semi-warm': [] };
      entry[m.phase].push(m.duration);
      byPhase.set(key, entry);
    }
  }
  const worst = (row: Row) => Math.max(...row.cold, ...row.warm, ...row['semi-warm']);
  const rows = [...byPhase.values()].sort((a, b) => worst(b) - worst(a));
  const stat = (values: number[], pick: (v: number[]) => number) => (values.length ? ms(pick(values)) : '-');
  return md.table(rows, [
    { label: 'phase', mapFn: (p) => cell(p.phase) },
    { label: 'process', field: 'process' },
    { label: 'cold', mapFn: (p) => stat(p.cold, (v) => Math.max(...v)) },
    { label: 'warm median', mapFn: (p) => stat(p.warm, median) },
    { label: 'warm max', mapFn: (p) => stat(p.warm, (v) => Math.max(...v)) },
    { label: 'semi-warm median', mapFn: (p) => stat(p['semi-warm'], median) },
  ]);
}

const isKeyPhase = (name: string, kind: string) =>
  KEY_PHASES.some((p) => p.pattern.test(name) && (!p.role || p.role === kind));

/** Mermaid text is split on colons and semicolons; keep labels to safe characters. */
const mermaidLabel = (text: string) => text.replace(/[:;#]/g, '-');

/**
 * One Gantt chart per phase: every process that did work in that phase is a
 * section, and its top-level measures plus the key phases are the bars.
 * Times count from the phase's first run window.
 */
function renderTimelines(r: Collected): string[] {
  const parts: string[] = [
    'Cold and warm only. Bars are top-level measures and key phases; time counts from the start of the first run of that kind.',
  ];
  // Semi-warm runs restart every worker per edit, which draws as a wall of
  // bars; the per-run table carries that phase instead.
  for (const phase of ['cold', 'warm'] as Phase[]) {
    const windows = r.runs.filter((run) => run.phase === phase);
    if (!windows.length) continue;
    const t0 = windows[0].startedAt;
    const lines = ['gantt', `  title ${phase}`, '  dateFormat x', '  axisFormat %S.%Ls', '  todayMarker off'];
    let bars = 0;
    for (const t of r.traces) {
      const kind = roleKind(t.role);
      const inPhase = t.measures.filter((m) => m.phase === phase);
      if (!inPhase.length) continue;
      const outer = new Set(topLevel(inPhase));
      const shown = inPhase.filter((m) => outer.has(m) || isKeyPhase(m.name, kind));
      if (!shown.length) continue;
      lines.push(`  section ${mermaidLabel(t.role)} ${t.pid}`);
      for (const m of shown) {
        const start = Math.round(t.timeOrigin + m.startTime - t0);
        const end = start + Math.max(1, Math.round(m.duration));
        lines.push(`  ${mermaidLabel(shortName(r.workspaceRoot, m.name))} :${start}, ${end}`);
        bars++;
      }
    }
    if (bars) parts.push(md.h3(phase, md.codeBlock(lines.join('\n'), 'mermaid')));
  }
  return parts;
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

function renderReport(report: ReportData, traces: ProcessTrace[], instrumented: boolean): string[] {
  if ('error' in report) return [String(report.error)];
  const parts: string[] = [];
  const daemonTrace = traces.find((t) => t.role === 'daemon');
  const daemon = daemonTrace
    ? `recorded (pid ${daemonTrace.pid})`
    : instrumented
      ? 'not recorded: either none ran, or one started before this run and still has the original module'
      : 'unknown, instrumentation was off';
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
  const edits: Edit[] = [];
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

    // Plugin loading here spawns its own workers; pause recording so they are
    // not mistaken for the daemon's.
    withdrawSession(ws);
    console.log('plugin config files');
    const inspection = await readPluginConfigFiles(ws);
    if (instrument) announceSession(ws);

    // An edited file makes the daemon rehash and rebuild what depends on it.
    // Each run's window opens at its edit so that work is tagged semi-warm
    // whether the daemon does it before or during the request.
    if (opts.edit) {
      const plan = opts.editFile
        ? [{ file: opts.editFile, plugin: null }]
        : planEdits(ws, 'error' in inspection ? new Map() : inspection.matched, opts.sourceEdits);
      if (!plan.length) console.warn('nothing to edit; skipping semi-warm runs');
      for (const item of plan) {
        const edit = installEdit(ws, item);
        if (edit) edits.push(edit);
      }
    }
    for (const [i, edit] of edits.entries()) {
      console.log(
        `semi-warm run ${i + 1} of ${edits.length}: editing ${edit.file}${edit.plugin ? ` (${edit.plugin})` : ''}`,
      );
      const editedAt = Date.now();
      edit.touch();
      await sleep(500);
      const semiWarm = nx(ws, ['show', 'projects', '--json']);
      assertOk('nx show projects (semi-warm)', semiWarm);
      runs.push({
        index: runs.length,
        phase: 'semi-warm',
        startedAt: editedAt,
        endedAt: semiWarm.endedAt,
        wallMs: semiWarm.wallMs,
        file: edit.file,
        plugin: edit.plugin,
      });
    }
    const semiWarmMs = runs.filter((run) => run.phase === 'semi-warm').map((run) => run.wallMs);

    // Stop recording before anything that is not graph construction runs.
    withdrawSession(ws);
    const traces = instrument ? readTraces(ws, runs) : [];

    console.log('nx report data');
    const report = await readReportData(ws);
    const pluginConfigFiles = 'error' in inspection ? inspection : inspection.summary;

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
      semiWarmMs: semiWarmMs.map(Math.round),
      edits: edits.map(({ file, plugin }) => ({ file, plugin })),
      reset: opts.reset,
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
      `projects ${projects.length}, cold ${result.coldGraphMs}ms, warm median ${result.warmMedianMs ?? 'n/a'}ms, semi-warm ${semiWarmMs.length ? `${semiWarmMs.map(Math.round).join('/')}ms` : 'n/a'}, recorded processes ${traces.length}, measures ${traces.reduce((n, t) => n + t.measures.length, 0)}`,
    );
  } finally {
    for (const edit of edits) edit.restore();
    withdrawSession(ws);
    instrument?.restore();
  }
}
