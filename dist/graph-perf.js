#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/graph-perf.js
var import_node_child_process = require("node:child_process");
var import_node_fs = __toESM(require("node:fs"));
var import_node_os = __toESM(require("node:os"));
var import_node_path = __toESM(require("node:path"));

// node_modules/markdown-factory/markdown-B0RRKDfk.mjs
var import_meta = {};
function h(level, title, ...contents) {
  assert(level >= 1, "Heading level must be >= 1.");
  assert(level <= 6, "Most markdown engines only support heading levels 1-6.");
  return lines(`${"#".repeat(level)} ${title}`, contents);
}
function h1(title, ...contents) {
  return h(1, title, ...contents);
}
function h2(title, ...contents) {
  return h(2, title, ...contents);
}
function h3(title, ...contents) {
  return h(3, title, ...contents);
}
function code(contents) {
  return `\`${contents}\``;
}
function codeBlock(contents, language, attributes) {
  const attrs = attributes ? " " + Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(" ") : "";
  return `\`\`\`${language ?? ""}${attrs}
${contents}
\`\`\``;
}
function normalizeTableField(f) {
  return {
    label: typeof f === "object" ? f.label : f.toString(),
    mapFn: typeof f === "object" && "mapFn" in f ? (e) => f.mapFn(e).toString() : (e) => e[typeof f === "object" ? f.field : f].toString()
  };
}
function table(items, fields) {
  const paddingMap = /* @__PURE__ */ new Map();
  const normalizedFields = fields.map(normalizeTableField);
  for (const field of normalizedFields) {
    const maxLength = Math.max(...items.map((i) => field.mapFn(i).length), field.label.length);
    paddingMap.set(field.label, maxLength);
  }
  return [
    `| ${normalizedFields.map((x) => x.label.padEnd(paddingMap.get(x.label) ?? 0)).join(" | ")} |`,
    `| ${normalizedFields.map((x) => "-".repeat(paddingMap.get(x.label) ?? 0)).join(" | ")} |`,
    ...items.map((item) => `| ${normalizedFields.map((x) => x.mapFn(item).padEnd(paddingMap.get(x.label) ?? 0)).join(" | ")} |`)
  ].join("\n");
}
function blockQuote(...lines2) {
  return lines2.map((f) => f.split("\n").map((line) => `> ${line}`).join("\n")).join("\n>\n").trim();
}
function unorderedList(...itemOrOptions) {
  const [first, ...rest] = itemOrOptions;
  const items = typeof first === "object" ? Array.isArray(first) ? first : rest.flat() : first ? [first, ...rest.flat()] : [];
  const level = ((typeof first === "object" && !Array.isArray(first) ? first : {})?.level ?? 1) - 1;
  return lines(items.map((i) => `${"	".repeat(level)}- ${i}`));
}
var ul = unorderedList;
function lines(...ls) {
  return ls.flat().join("\n\n");
}
function getSafeEnv() {
  try {
    if (typeof process !== "undefined" && process.env) return process.env;
    else if (typeof import_meta !== "undefined" && typeof import_meta.env !== "undefined") return import_meta.env;
  } catch {
  }
  return {};
}
function assert(check, message, allowByPass = true) {
  const env2 = getSafeEnv();
  const bypassChecks = allowByPass && (env2["MARKDOWN_FACTORY_NO_CHECKS"] === "true" || env2["NODE_ENV"] === "production");
  if (!check && !bypassChecks) {
    const lines2 = [message, "If you are targetting an environment where this is known to be supported, please open an issue."];
    if (allowByPass) lines2.push("As a temporary bypass, you can set MARKDOWN_FACTORY_NO_CHECKS=true to disable checks.");
    throw new Error(lines2.join("\n"));
  }
}

// text:/Users/agentender/repos/nx-graph-perf/src/perf-logging.js
var perf_logging_default = '"use strict";\n// Drop-in replacement for nx/dist/src/utils/perf-logging.js, installed by\n// graph-perf.js for the duration of a measurement and restored afterwards.\n//\n// It keeps the original behaviour (perf lines when NX_PERF_LOGGING=true,\n// analytics for tracked measures) and additionally appends every measure as one\n// JSON line to <workspace-data>/perf-logs/<session>/<pid>.jsonl, where the\n// session name is read from <workspace-data>/perf-logs/ACTIVE. Without that\n// marker the module behaves exactly like the original, so leaving it installed\n// by accident costs nothing.\nObject.defineProperty(exports, "__esModule", { value: true });\nconst perf_hooks_1 = require("perf_hooks");\nconst fs = require("fs");\nconst path = require("path");\n\nfunction isTrackedDetail(detail) {\n  return typeof detail === "object" && detail !== null && detail.track === true;\n}\n\n/** @type {{ file: string | null } | null} */\nlet recorder = null;\nfunction getRecorder() {\n  if (recorder) return recorder;\n  recorder = { file: null };\n  try {\n    const { workspaceDataDirectory } = require("./cache-directory");\n    const root = path.join(workspaceDataDirectory, "perf-logs");\n    const marker = path.join(root, "ACTIVE");\n    if (fs.existsSync(marker)) {\n      const session = fs.readFileSync(marker, "utf8").trim();\n      if (session) {\n        const dir = path.join(root, session);\n        fs.mkdirSync(dir, { recursive: true });\n        recorder.file = path.join(dir, `${process.pid}.jsonl`);\n        // Header line, so the file says which process it belongs to.\n        fs.appendFileSync(\n          recorder.file,\n          JSON.stringify({\n            kind: "process",\n            pid: process.pid,\n            ppid: process.ppid,\n            argv: process.argv,\n            execArgv: process.execArgv,\n            cwd: process.cwd(),\n            node: process.version,\n            timeOrigin: perf_hooks_1.performance.timeOrigin,\n          }) + "\\n",\n        );\n      }\n    }\n  } catch {\n    recorder.file = null;\n  }\n  return recorder;\n}\n\nfunction safeDetail(detail) {\n  if (detail === undefined || detail === null) return null;\n  try {\n    return JSON.parse(JSON.stringify(detail));\n  } catch {\n    return String(detail);\n  }\n}\n\nnew perf_hooks_1.PerformanceObserver((list) => {\n  // observer is configured for \'measure\' entries only (see .observe call below)\n  const entries = list.getEntries();\n  const rec = getRecorder();\n  if (rec.file) {\n    let lines = "";\n    for (const entry of entries) {\n      lines +=\n        JSON.stringify({\n          kind: "measure",\n          pid: process.pid,\n          name: entry.name,\n          startTime: entry.startTime,\n          duration: entry.duration,\n          detail: safeDetail(entry.detail),\n        }) + "\\n";\n    }\n    try {\n      fs.appendFileSync(rec.file, lines);\n    } catch {\n      // Recording is best effort; never break the process being measured.\n    }\n  }\n  const logEnabled = process.env.NX_PERF_LOGGING === "true";\n  const tracked = entries.filter((e) => isTrackedDetail(e.detail));\n  // Short-circuit before loading analytics / daemon logger (~60ms of native\n  // binding + module init) when there\'s nothing to do.\n  if (!logEnabled && tracked.length === 0) return;\n  if (logEnabled) {\n    const { isOnDaemon } = require("../daemon/is-on-daemon");\n    const { serverLogger } = require("../daemon/logger");\n    const { logger } = require("./logger");\n    const log = isOnDaemon() ? (msg) => serverLogger.log(msg) : (msg) => logger.warn(msg);\n    for (const entry of entries) {\n      log(`Time taken for \'${entry.name}\' ${entry.duration}ms`);\n    }\n  }\n  if (tracked.length === 0) return;\n  const { customDimensions, reportEvent } = require("../analytics");\n  if (!customDimensions) return;\n  const dimensionValues = new Set(Object.values(customDimensions));\n  for (const entry of tracked) {\n    const { track, ...rest } = entry.detail;\n    const params = {\n      [customDimensions.duration]: entry.duration,\n    };\n    for (const [key, value] of Object.entries(rest)) {\n      if (dimensionValues.has(key)) params[key] = value;\n    }\n    reportEvent(entry.name, params);\n  }\n}).observe({ entryTypes: ["measure"] });\n';

// src/graph-perf.js
function parseArgs(argv) {
  const opts = {
    runs: 3,
    out: ".",
    reset: true,
    instrument: true,
    instrumentFile: (
      /** @type {string | null} */
      null
    )
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--runs") opts.runs = Math.max(1, Number(argv[++i]));
    else if (arg === "--out") opts.out = argv[++i];
    else if (arg === "--no-reset") opts.reset = false;
    else if (arg === "--no-instrument") opts.instrument = false;
    else if (arg === "--instrument") opts.instrumentFile = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "usage: node graph-perf.js [--runs N] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE]"
      );
      process.exit(0);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}
var workspaceRoot = process.cwd();
var overrides = {
  NX_PERF_LOGGING: "true",
  DOTNET_ROLL_FORWARD_TO_PRERELEASE: "1",
  NX_TUI: "false",
  NX_DAEMON: "true"
};
var { CI: _ci, ...inheritedEnv } = process.env;
var env = { ...inheritedEnv, ...overrides };
delete process.env.CI;
Object.assign(process.env, { NX_DAEMON: overrides.NX_DAEMON, NX_TUI: overrides.NX_TUI });
function resolveFromWorkspace(request) {
  try {
    return require.resolve(request, { paths: [workspaceRoot] });
  } catch {
    return null;
  }
}
var nxBin = resolveFromWorkspace("nx/bin/nx.js");
function nx(args) {
  const started = process.hrtime.bigint();
  const result = nxBin ? (0, import_node_child_process.spawnSync)(process.execPath, [nxBin, ...args], {
    cwd: workspaceRoot,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  }) : (0, import_node_child_process.spawnSync)(process.platform === "win32" ? "npx.cmd" : "npx", ["nx", ...args], {
    cwd: workspaceRoot,
    env,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024
  });
  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    wallMs
  };
}
function assertOk(label, result) {
  if (result.status !== 0) {
    console.error(`${label} failed (exit ${result.status})`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function readNxJson() {
  const file = import_node_path.default.join(workspaceRoot, "nx.json");
  if (!import_node_fs.default.existsSync(file)) return { error: "nx.json not found" };
  try {
    const json = JSON.parse(import_node_fs.default.readFileSync(file, "utf8"));
    return {
      plugins: json.plugins ?? null,
      targetDefaults: json.targetDefaults ?? null,
      namedInputs: json.namedInputs ?? null
    };
  } catch (e) {
    return { error: `nx.json unreadable: ${e instanceof Error ? e.message : String(e)}` };
  }
}
function resolveNxInternal(rel) {
  return resolveFromWorkspace(`nx/dist/src/${rel}`) ?? resolveFromWorkspace(`nx/src/${rel}`);
}
async function readReportData() {
  const module2 = resolveNxInternal("command-line/report/report");
  if (!module2) return { error: "nx report module not found" };
  try {
    const { getReportData } = require(module2);
    const data = await getReportData();
    for (const key of ["nxKeyError", "projectGraphError"]) {
      if (data[key] instanceof Error) data[key] = data[key].message;
    }
    if (data.daemon && "error" in data.daemon) data.daemon = { error: String(data.daemon.error) };
    return data;
  } catch (e) {
    return { error: `getReportData failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
async function readPluginConfigFiles() {
  const getPlugins = resolveNxInternal("project-graph/plugins/get-plugins");
  const workspaceContext = resolveNxInternal("utils/workspace-context");
  const nxJsonModule = resolveNxInternal("config/nx-json");
  const configUtils = resolveNxInternal("project-graph/utils/project-configuration-utils");
  if (!getPlugins || !workspaceContext || !nxJsonModule || !configUtils) {
    return { error: "nx plugin loading internals not found in this nx version" };
  }
  try {
    const { getPlugins: loadPlugins, cleanupPlugins } = require(getPlugins);
    const { globWithWorkspaceContextSync } = require(workspaceContext);
    const { readNxJson: readNxJson2 } = require(nxJsonModule);
    const { findMatchingConfigFiles } = require(configUtils);
    const plugins = await loadPlugins(readNxJson2(workspaceRoot), workspaceRoot);
    const result = [];
    for (const plugin of plugins) {
      if (!plugin.createNodes) continue;
      const pattern = plugin.createNodes[0];
      const candidates = globWithWorkspaceContextSync(workspaceRoot, [pattern]);
      const matched = findMatchingConfigFiles(candidates, plugin.include, plugin.exclude);
      const counts = /* @__PURE__ */ new Map();
      for (const file of matched) {
        const base = import_node_path.default.basename(file);
        counts.set(base, (counts.get(base) ?? 0) + 1);
      }
      result.push({
        name: plugin.name,
        pattern,
        include: plugin.include ?? null,
        exclude: plugin.exclude ?? null,
        total: matched.length,
        files: [...counts.entries()].map(([file, count]) => ({ file, count })).sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
      });
    }
    cleanupPlugins?.();
    return result;
  } catch (e) {
    return { error: `plugin inspection failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
function installInstrument(source) {
  const target = resolveNxInternal("utils/perf-logging.js");
  if (!target) {
    console.warn("could not locate nx perf-logging module; running without instrumentation");
    return null;
  }
  const backup = `${target}.graph-perf-backup`;
  if (!import_node_fs.default.existsSync(backup)) import_node_fs.default.copyFileSync(target, backup);
  import_node_fs.default.writeFileSync(target, source);
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    import_node_fs.default.copyFileSync(backup, target);
    import_node_fs.default.rmSync(backup, { force: true });
  };
  process.on("exit", restore);
  return { restore, target };
}
var perfLogsRoot = import_node_path.default.join(workspaceRoot, ".nx", "workspace-data", "perf-logs");
var session = String(process.pid);
var sessionDir = import_node_path.default.join(perfLogsRoot, session);
function announceSession() {
  import_node_fs.default.mkdirSync(sessionDir, { recursive: true });
  import_node_fs.default.writeFileSync(import_node_path.default.join(perfLogsRoot, "ACTIVE"), session);
}
function withdrawSession() {
  import_node_fs.default.rmSync(import_node_path.default.join(perfLogsRoot, "ACTIVE"), { force: true });
}
function readTraces() {
  if (!import_node_fs.default.existsSync(sessionDir)) return [];
  const traces = [];
  for (const file of import_node_fs.default.readdirSync(sessionDir)) {
    if (!file.endsWith(".jsonl")) continue;
    let header = null;
    const measures = [];
    for (const line of import_node_fs.default.readFileSync(import_node_path.default.join(sessionDir, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.kind === "process") header = record;
        else if (record.kind === "measure") measures.push(record);
      } catch {
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
      measures
    });
  }
  traces.sort((a, b) => a.timeOrigin - b.timeOrigin);
  return traces;
}
function classify(header) {
  const script = header.argv[1] ? import_node_path.default.basename(header.argv[1]) : "";
  switch (script) {
    case "nx.js":
      return `client: nx ${header.argv.slice(2).join(" ")}`.trim();
    case "start.js":
      return "daemon";
    case "plugin-worker.js":
      return "plugin worker";
    default:
      return script || "unknown";
  }
}
var roleKind = (role) => role.split(":")[0];
var ms = (n) => `${n.toFixed(1)} ms`;
var cell = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
function shortName(name) {
  return name.split(workspaceRoot + import_node_path.default.sep).join("").split(workspaceRoot + "/").join("").replace(/node_modules[\\/]nx[\\/]dist[\\/]src[\\/]plugins[\\/]/g, "nx:").replace(/node_modules[\\/]/g, "");
}
var KEY_PHASES = [
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
  /^REQUEST_PROJECT_GRAPH round trip$/
];
function renderMarkdown(r) {
  const sys = r.system;
  const summary = ul(
    `Platform: ${sys.platform} ${sys.release} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB, node ${sys.node}`,
    `Projects: ${r.projectCount}`,
    `Cold graph (first ${code("nx show projects")} after ${code("nx reset")}, daemon start included): ${r.coldGraphMs} ms`,
    `Warm client round trips: ${r.warmMs.join(", ") || "none"}${r.warmMs.length ? ` (median ${Math.round(median(r.warmMs))} ms)` : ""}`
  );
  const sections = [];
  if (r.traces.length === 0) {
    sections.push("No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.");
  } else {
    const earliest = Math.min(...r.traces.map((t) => t.timeOrigin));
    sections.push(
      h2(
        "Processes",
        table(r.traces, [
          { label: "pid", field: "pid" },
          { label: "role", mapFn: (t) => cell(t.role) },
          { label: "parent", field: "ppid" },
          { label: "started at", mapFn: (t) => `+${ms(t.timeOrigin - earliest)}` },
          { label: "measures", mapFn: (t) => t.measures.length },
          {
            label: "last measure ends",
            mapFn: (t) => `+${ms(t.timeOrigin - earliest + t.measures.reduce((max, m) => Math.max(max, m.startTime + m.duration), 0))}`
          }
        ])
      )
    );
    const byPhase = /* @__PURE__ */ new Map();
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
      h2(
        "Key phases",
        "Every occurrence across all processes, so cold and warm runs both show.",
        table(phases, [
          { label: "phase", mapFn: (p) => cell(p.phase) },
          { label: "process", field: "process" },
          { label: "occurrences", mapFn: (p) => p.durations.length },
          { label: "first", mapFn: (p) => ms(p.durations[0]) },
          { label: "median", mapFn: (p) => ms(median(p.durations)) },
          { label: "max", mapFn: (p) => ms(Math.max(...p.durations)) }
        ])
      )
    );
    sections.push(
      h2(
        "Timelines",
        "Offsets are from each process start. Every recorded measure, in start order.",
        ...r.traces.map(
          (t) => h3(
            `${t.role}, pid ${t.pid}`,
            table(t.measures, [
              { label: "start", mapFn: (m) => `+${ms(m.startTime)}` },
              { label: "duration", mapFn: (m) => ms(m.duration) },
              { label: "measure", mapFn: (m) => cell(shortName(m.name)) }
            ])
          )
        )
      )
    );
  }
  sections.push(h2("Plugin config files", ...renderPluginConfigFiles(r.pluginConfigFiles)));
  sections.push(h2("nx report", ...renderReport(r.report)));
  sections.push(
    h2(
      "nx.json",
      .../** @type {const} */
      ["plugins", "targetDefaults", "namedInputs"].map(
        (key) => h3(
          key,
          codeBlock(JSON.stringify("error" in r.nxJson ? r.nxJson.error : r.nxJson[key] ?? null, null, 2), "json")
        )
      )
    )
  );
  return h1("Nx graph construction", summary, ...sections) + "\n";
}
function renderPluginConfigFiles(plugins) {
  if ("error" in plugins) return [plugins.error];
  const intro = "Files matched by each loaded plugin's createNodes glob, by basename. One config file can produce more than one project, so this bounds what a plugin contributes rather than counting its projects.";
  return [
    intro,
    ...plugins.map((p) => {
      const scope = [`Pattern: ${code(p.pattern)}`];
      if (p.include?.length) scope.push(`Include: ${p.include.map(code).join(", ")}`);
      if (p.exclude?.length) scope.push(`Exclude: ${p.exclude.map(code).join(", ")}`);
      return h3(
        p.name,
        scope.join(" "),
        p.files.length ? table(p.files, [
          { label: "file", mapFn: (f) => code(f.file) },
          { label: "count", field: "count" }
        ]) : "No matching files."
      );
    })
  ];
}
function renderReport(report) {
  if ("error" in report) return [String(report.error)];
  const parts = [];
  const daemon = "error" in report.daemon ? `error: ${report.daemon.error}` : report.daemon.disabled ? "disabled" : report.daemon.available ? "running" : "not running";
  parts.push(
    ul(
      `Package manager: ${report.pm} ${report.pmVersion}`,
      `Daemon: ${daemon}`,
      `Native binding: ${report.nativeTarget ?? "not available"}`,
      `Cache: ${report.cache ? `${(report.cache.used / 1024 ** 2).toFixed(0)} MB used of ${(report.cache.max / 1024 ** 2).toFixed(0)} MB` : "db cache off"}`,
      `Nx key: ${report.nxKey ? report.nxKey.licenseType ?? "present" : report.nxKeyError ? `error: ${report.nxKeyError}` : "none"}`
    )
  );
  if (report.projectGraphError) parts.push(blockQuote(`Project graph error: ${report.projectGraphError}`));
  parts.push(
    table(report.packageVersionsWeCareAbout, [
      { label: "package", mapFn: (p) => code(String(p.package)) },
      { label: "version", field: "version" }
    ])
  );
  const plugins = [
    ...report.registeredPlugins.map((name) => ({ kind: "registered", name })),
    ...report.localPlugins.map((name) => ({ kind: "local", name })),
    ...report.communityPlugins.map((p) => ({
      kind: "community",
      name: `${p.name} ${p.version}`
    })),
    ...report.powerpackPlugins.map((p) => ({
      kind: "powerpack",
      name: `${p.name} ${p.version}`
    }))
  ];
  if (plugins.length) {
    parts.push(
      h3(
        "Plugins",
        table(plugins, [
          { label: "kind", field: "kind" },
          { label: "plugin", mapFn: (p) => code(p.name) }
        ])
      )
    );
  }
  if (report.outOfSyncPackageGroup) {
    const g = report.outOfSyncPackageGroup;
    parts.push(
      h3(
        `Out of sync with ${g.basePackage}`,
        table(g.misalignedPackages, [
          { label: "package", field: "name" },
          { label: "version", field: "version" }
        ]),
        `Run ${code(`nx migrate ${g.migrateTarget}`)} to align them.`
      )
    );
  }
  if (report.mismatchedNxVersions?.length) {
    parts.push(
      h3(
        "Mismatched nx versions",
        table(
          /** @type {{ version: string, chain: string[] }[]} */
          report.mismatchedNxVersions,
          [
            { label: "version", field: "version" },
            { label: "chain", mapFn: (m) => m.chain.join(" > ") }
          ]
        )
      )
    );
  }
  return parts;
}
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  import_node_fs.default.mkdirSync(opts.out, { recursive: true });
  if (opts.reset) {
    console.log("nx reset");
    assertOk("nx reset", nx(["reset"]));
  }
  let instrument = null;
  if (opts.instrument) {
    const source = opts.instrumentFile ? import_node_fs.default.readFileSync(import_node_path.default.resolve(opts.instrumentFile), "utf8") : perf_logging_default;
    console.log(`instrumenting nx perf-logging${opts.instrumentFile ? ` from ${opts.instrumentFile}` : ""}`);
    instrument = installInstrument(source);
    announceSession();
  }
  try {
    console.log("cold graph construction: nx show projects --json");
    const cold = nx(["show", "projects", "--json"]);
    assertOk("nx show projects", cold);
    let projects = [];
    try {
      projects = JSON.parse(cold.stdout);
    } catch {
      console.error("could not parse `nx show projects --json` output");
      console.error(cold.stdout.slice(0, 500));
      process.exit(1);
    }
    const warmMs = [];
    for (let i = 1; i < opts.runs; i++) {
      console.log(`warm run ${i} of ${opts.runs - 1}`);
      const warm = nx(["show", "projects", "--json"]);
      assertOk("nx show projects (warm)", warm);
      warmMs.push(warm.wallMs);
    }
    withdrawSession();
    const traces = instrument ? readTraces() : [];
    console.log("nx report data");
    const report = await readReportData();
    console.log("plugin config files");
    const pluginConfigFiles = await readPluginConfigFiles();
    const system = {
      platform: process.platform,
      release: import_node_os.default.release(),
      arch: process.arch,
      cpus: import_node_os.default.cpus().length,
      cpuModel: import_node_os.default.cpus()[0]?.model ?? null,
      memoryGb: Math.round(import_node_os.default.totalmem() / 1024 ** 3),
      node: process.version
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
      records: instrument ? import_node_path.default.relative(workspaceRoot, sessionDir) : null,
      traces,
      report,
      pluginConfigFiles,
      nxJson
    };
    import_node_fs.default.writeFileSync(
      import_node_path.default.join(opts.out, "graph-perf.md"),
      renderMarkdown({
        system,
        projectCount: projects.length,
        coldGraphMs: result.coldGraphMs,
        warmMs: result.warmMs,
        traces,
        report,
        pluginConfigFiles,
        nxJson
      })
    );
    import_node_fs.default.writeFileSync(import_node_path.default.join(opts.out, "graph-perf.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(`wrote ${import_node_path.default.join(opts.out, "graph-perf.md")} and graph-perf.json`);
    console.log(
      `projects ${projects.length}, cold ${result.coldGraphMs}ms, warm median ${result.warmMedianMs ?? "n/a"}ms, recorded processes ${traces.length}, measures ${traces.reduce((n, t) => n + t.measures.length, 0)}`
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
    console.error(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exit(1);
  }
);
