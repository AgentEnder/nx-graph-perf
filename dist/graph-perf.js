#!/usr/bin/env node
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let node_child_process = require("node:child_process");
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let node_module = require("node:module");
let node_os = require("node:os");
node_os = __toESM(node_os);
let node_path = require("node:path");
node_path = __toESM(node_path);

//#region node_modules/markdown-factory/markdown-B0RRKDfk.mjs
/**
* @license Apache-2.0
* @module markdown-factory
*
* @description A simple library to generate markdown strings.
*/
/**
* Function to create an arbitrary heading
* @param level The level of the heading. Must be between 1 and 6.
* @param title The title of the heading.
* @param contents The contents of the section.
* @returns The markdown heading, with the contents section below it.
*
* @example
* ```typescript
* console.log(h(1, 'Heading 1', 'This is the contents of the section.'));
* // Prints:
* //
* // # Heading 1
* //
* // This is the contents of the section.
* ```
*/
function h(level, title, ...contents) {
	assert(level >= 1, "Heading level must be >= 1.");
	assert(level <= 6, "Most markdown engines only support heading levels 1-6.");
	return lines(`${"#".repeat(level)} ${title}`, contents);
}
/**
* Function to create a level 1 heading.
* @param title The title of the heading.
* @param contents The contents of the section.
* @returns The markdown heading, with the contents section below it.
*
* @example
* ```typescript
* console.log(h1('Heading 1', 'This is the contents of the section.'));
* // Prints:
* //
* // # Heading 1
* //
* // This is the contents of the section.
* ```
*/
function h1(title, ...contents) {
	return h(1, title, ...contents);
}
/**
* Function to create a level 2 heading.
* @param title The title of the heading.
* @param contents The contents of the section.
* @returns The markdown heading, with the contents section below it.
*
* @example
* ```typescript
* console.log(h2('Heading 2', 'This is the contents of the section.'));
* // Prints:
* //
* // ## Heading 2
* //
* // This is the contents of the section.
* ```
*/
function h2(title, ...contents) {
	return h(2, title, ...contents);
}
/**
* Function to create a level 3 heading.
* @param title The title of the heading.
* @param contents The contents of the section.
* @returns The markdown heading, with the contents section below it.
*
* @example
* ```typescript
* console.log(h3('Heading 3', 'This is the contents of the section.'));
* // Prints:
* //
* // ### Heading 3
* //
* // This is the contents of the section.
* ```
*/
function h3(title, ...contents) {
	return h(3, title, ...contents);
}
/**
* Function to create inline code.
* @param contents The code to inline.
* @returns Markdown inline code.
*/
function code(contents) {
	return `\`${contents}\``;
}
/**
* Function to create a code block.
* @param contents The code to include in the block.
* @param language The language the code is written in.
* @param attributes Optional key-value attributes to include in the code fence (e.g. `{ title: "app.ts" }` renders as ` ```ts title="app.ts" `).
* @returns Markdown code block.
*/
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
/**
* Function to create a table from an array of objects.
* @param items The array of objects to create the table from.
* @param fields The fields to include in the table. See {@link TableField}.
* @typeParam T The type of the objects in the array. Should be inferred from the `items` parameter.
* @returns Markdown table.
* @example
* ```typescript
* const items = [{name: 'Alice', age: 30}, {name: 'Bob', age: 40}];
* console.log(table(items, ['name', 'age']));
* // Prints:
* //
* // | name  | age |
* // | ----  | --- |
* // | Alice | 30  |
* // | Bob   | 40  |
* ```
*/
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
/**
* Function to create a blockquote.
* @param lines Lines to be blockquoted.
* @returns The blockquoted markdown.
*/
function blockQuote(...lines) {
	return lines.map((f) => f.split("\n").map((line) => `> ${line}`).join("\n")).join("\n>\n").trim();
}
/**
* Creates an unordered list.
*
* @returns The unordered list markdown.
* @example
* ```typescript
* console.log(unorderedList('item1', 'item2', 'item3'));
* // Prints:
* //
* // - item1
* //
* // - item2
* //
* // - item3
* ```
**/
function unorderedList(...itemOrOptions) {
	const [first, ...rest] = itemOrOptions;
	const items = typeof first === "object" ? Array.isArray(first) ? first : rest.flat() : first ? [first, ...rest.flat()] : [];
	const level = ((typeof first === "object" && !Array.isArray(first) ? first : {})?.level ?? 1) - 1;
	return lines(items.map((i) => `${"	".repeat(level)}- ${i}`));
}
/**
* See {@link unorderedList}.
**/
const ul = unorderedList;
/**
* Utility function to create new lines within markdown. Joins all strings with two new lines, as single new lines are ignored in markdown.
* @param ls Each line in the markdown.
* @returns Combined markdown.
*/
function lines(...ls) {
	return ls.flat().join("\n\n");
}
function getSafeEnv() {
	try {
		if (typeof process !== "undefined" && process.env) return process.env;
		else if (typeof {} !== "undefined" && typeof {}.env !== "undefined") return {}.env;
	} catch {}
	return {};
}
function assert(check, message, allowByPass = true) {
	const env = getSafeEnv();
	const bypassChecks = allowByPass && (env["MARKDOWN_FACTORY_NO_CHECKS"] === "true" || env["NODE_ENV"] === "production");
	if (!check && !bypassChecks) {
		const lines = [message, "If you are targetting an environment where this is known to be supported, please open an issue."];
		if (allowByPass) lines.push("As a temporary bypass, you can set MARKDOWN_FACTORY_NO_CHECKS=true to disable checks.");
		throw new Error(lines.join("\n"));
	}
}

//#endregion
//#region src/instrument.ts
function instrumentSource() {
	return "\"use strict\";\n// Drop-in replacement for nx/dist/src/utils/perf-logging.js, installed by\n// graph-perf.js for the duration of a measurement and restored afterwards.\n//\n// It keeps the original behaviour (perf lines when NX_PERF_LOGGING=true,\n// analytics for tracked measures) and additionally appends every measure as one\n// JSON line to <workspace-data>/perf-logs/<session>/<pid>.jsonl, where the\n// session name is read from <workspace-data>/perf-logs/ACTIVE. Without that\n// marker the module behaves exactly like the original, so leaving it installed\n// by accident costs nothing.\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst perf_hooks_1 = require(\"perf_hooks\");\nconst fs = require(\"fs\");\nconst path = require(\"path\");\n\nfunction isTrackedDetail(detail) {\n  return typeof detail === \"object\" && detail !== null && detail.track === true;\n}\n\n/** @type {{ file: string | null } | null} */\nlet recorder = null;\nfunction getRecorder() {\n  if (recorder) return recorder;\n  recorder = { file: null };\n  try {\n    const { workspaceDataDirectory } = require(\"./cache-directory\");\n    const root = path.join(workspaceDataDirectory, \"perf-logs\");\n    const marker = path.join(root, \"ACTIVE\");\n    if (fs.existsSync(marker)) {\n      const session = fs.readFileSync(marker, \"utf8\").trim();\n      if (session) {\n        const dir = path.join(root, session);\n        fs.mkdirSync(dir, { recursive: true });\n        recorder.file = path.join(dir, `${process.pid}.jsonl`);\n        // Header line, so the file says which process it belongs to.\n        fs.appendFileSync(\n          recorder.file,\n          JSON.stringify({\n            kind: \"process\",\n            pid: process.pid,\n            ppid: process.ppid,\n            argv: process.argv,\n            execArgv: process.execArgv,\n            cwd: process.cwd(),\n            node: process.version,\n            timeOrigin: perf_hooks_1.performance.timeOrigin,\n          }) + \"\\n\",\n        );\n      }\n    }\n  } catch {\n    recorder.file = null;\n  }\n  return recorder;\n}\n\nfunction safeDetail(detail) {\n  if (detail === undefined || detail === null) return null;\n  try {\n    return JSON.parse(JSON.stringify(detail));\n  } catch {\n    return String(detail);\n  }\n}\n\nnew perf_hooks_1.PerformanceObserver((list) => {\n  // observer is configured for 'measure' entries only (see .observe call below)\n  const entries = list.getEntries();\n  const rec = getRecorder();\n  if (rec.file) {\n    let lines = \"\";\n    for (const entry of entries) {\n      lines +=\n        JSON.stringify({\n          kind: \"measure\",\n          pid: process.pid,\n          name: entry.name,\n          startTime: entry.startTime,\n          duration: entry.duration,\n          detail: safeDetail(entry.detail),\n        }) + \"\\n\";\n    }\n    try {\n      fs.appendFileSync(rec.file, lines);\n    } catch {\n      // Recording is best effort; never break the process being measured.\n    }\n  }\n  const logEnabled = process.env.NX_PERF_LOGGING === \"true\";\n  const tracked = entries.filter((e) => isTrackedDetail(e.detail));\n  // Short-circuit before loading analytics / daemon logger (~60ms of native\n  // binding + module init) when there's nothing to do.\n  if (!logEnabled && tracked.length === 0) return;\n  if (logEnabled) {\n    const { isOnDaemon } = require(\"../daemon/is-on-daemon\");\n    const { serverLogger } = require(\"../daemon/logger\");\n    const { logger } = require(\"./logger\");\n    const log = isOnDaemon() ? (msg) => serverLogger.log(msg) : (msg) => logger.warn(msg);\n    for (const entry of entries) {\n      log(`Time taken for '${entry.name}' ${entry.duration}ms`);\n    }\n  }\n  if (tracked.length === 0) return;\n  const { customDimensions, reportEvent } = require(\"../analytics\");\n  if (!customDimensions) return;\n  const dimensionValues = new Set(Object.values(customDimensions));\n  for (const entry of tracked) {\n    const { track, ...rest } = entry.detail;\n    const params = {\n      [customDimensions.duration]: entry.duration,\n    };\n    for (const [key, value] of Object.entries(rest)) {\n      if (dimensionValues.has(key)) params[key] = value;\n    }\n    reportEvent(entry.name, params);\n  }\n}).observe({ entryTypes: [\"measure\"] });\n";
}

//#endregion
//#region src/graph-perf.ts
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
const ENV_OVERRIDES = {
	NX_PERF_LOGGING: "true",
	DOTNET_ROLL_FORWARD_TO_PRERELEASE: "1",
	NX_TUI: "false",
	NX_DAEMON: "true"
};
function parseArgs(argv) {
	const opts = {
		runs: 3,
		out: ".",
		reset: true,
		instrument: true,
		instrumentFile: null
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--runs") opts.runs = Math.max(1, Number(argv[++i]));
		else if (arg === "--out") opts.out = argv[++i];
		else if (arg === "--no-reset") opts.reset = false;
		else if (arg === "--no-instrument") opts.instrument = false;
		else if (arg === "--instrument") opts.instrumentFile = argv[++i];
		else if (arg === "--help" || arg === "-h") {
			console.log("usage: node graph-perf.js [--runs N] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE]");
			process.exit(0);
		} else {
			console.error(`unknown argument: ${arg}`);
			process.exit(2);
		}
	}
	return opts;
}
function openWorkspace(root) {
	const { CI: _ci, ...inheritedEnv } = process.env;
	delete process.env.CI;
	Object.assign(process.env, {
		NX_DAEMON: ENV_OVERRIDES.NX_DAEMON,
		NX_TUI: ENV_OVERRIDES.NX_TUI
	});
	const perfLogsRoot = node_path.default.join(root, ".nx", "workspace-data", "perf-logs");
	const session = String(process.pid);
	const require$1 = (0, node_module.createRequire)(node_path.default.join(root, "package.json"));
	return {
		root,
		require: require$1,
		env: {
			...inheritedEnv,
			...ENV_OVERRIDES
		},
		nxBin: resolveFromWorkspace(require$1, "nx/bin/nx.js"),
		perfLogsRoot,
		session,
		sessionDir: node_path.default.join(perfLogsRoot, session)
	};
}
function resolveFromWorkspace(require$2, request) {
	try {
		return require$2.resolve(request);
	} catch {
		return null;
	}
}
/** Resolves a module inside the installed nx, under whichever layout it ships. */
function resolveNxInternal(ws, rel) {
	return resolveFromWorkspace(ws.require, `nx/dist/src/${rel}`) ?? resolveFromWorkspace(ws.require, `nx/src/${rel}`);
}
/** Runs `nx <args>` and returns exit code, output and wall time. */
function nx(ws, args) {
	const startedAt = Date.now();
	const started = process.hrtime.bigint();
	const common = {
		cwd: ws.root,
		env: ws.env,
		encoding: "utf8",
		maxBuffer: 67108864
	};
	const result = ws.nxBin ? (0, node_child_process.spawnSync)(process.execPath, [ws.nxBin, ...args], common) : (0, node_child_process.spawnSync)(process.platform === "win32" ? "npx.cmd" : "npx", ["nx", ...args], {
		...common,
		shell: process.platform === "win32"
	});
	const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
	if (result.error) throw result.error;
	return {
		status: result.status ?? -1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		startedAt,
		endedAt: Date.now(),
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
function readNxJson(root) {
	const file = node_path.default.join(root, "nx.json");
	if (!node_fs.default.existsSync(file)) return { error: "nx.json not found" };
	try {
		const json = JSON.parse(node_fs.default.readFileSync(file, "utf8"));
		return {
			plugins: json.plugins ?? null,
			targetDefaults: json.targetDefaults ?? null,
			namedInputs: json.namedInputs ?? null
		};
	} catch (e) {
		return { error: `nx.json unreadable: ${errorMessage(e)}` };
	}
}
function errorMessage(e) {
	return e instanceof Error ? e.message : String(e);
}
/**
* The data behind `nx report`, straight from the installed nx. Loading nx in
* this process is fine here: recording is already withdrawn when it runs.
*/
async function readReportData(ws) {
	const module = resolveNxInternal(ws, "command-line/report/report");
	if (!module) return { error: "nx report module not found" };
	try {
		const { getReportData } = ws.require(module);
		const data = await getReportData();
		for (const key of ["nxKeyError", "projectGraphError"]) if (data[key] instanceof Error) data[key] = data[key].message;
		if (data.daemon && "error" in data.daemon) data.daemon = { error: String(data.daemon.error) };
		return data;
	} catch (e) {
		return { error: `getReportData failed: ${errorMessage(e)}` };
	}
}
/**
* Loads the workspace's plugins the way nx does and counts the files each
* plugin's createNodes glob matches, grouped by basename. A config file can
* yield more than one project, so this bounds what a plugin contributes rather
* than counting its projects.
*/
async function readPluginConfigFiles(ws) {
	const root = ws.root;
	const getPlugins = resolveNxInternal(ws, "project-graph/plugins/get-plugins");
	const workspaceContext = resolveNxInternal(ws, "utils/workspace-context");
	const nxJsonModule = resolveNxInternal(ws, "config/nx-json");
	const configUtils = resolveNxInternal(ws, "project-graph/utils/project-configuration-utils");
	if (!getPlugins || !workspaceContext || !nxJsonModule || !configUtils) return { error: "nx plugin loading internals not found in this nx version" };
	try {
		const { getPlugins: loadPlugins, cleanupPlugins } = ws.require(getPlugins);
		const { globWithWorkspaceContextSync } = ws.require(workspaceContext);
		const { readNxJson } = ws.require(nxJsonModule);
		const { findMatchingConfigFiles } = ws.require(configUtils);
		const plugins = await loadPlugins(readNxJson(root), root);
		const result = [];
		for (const plugin of plugins) {
			if (!plugin.createNodes) continue;
			const pattern = plugin.createNodes[0];
			const matched = findMatchingConfigFiles(globWithWorkspaceContextSync(root, [pattern]), plugin.include, plugin.exclude);
			const counts = /* @__PURE__ */ new Map();
			for (const file of matched) {
				const base = node_path.default.basename(file);
				counts.set(base, (counts.get(base) ?? 0) + 1);
			}
			result.push({
				name: plugin.name,
				pattern,
				include: plugin.include ?? null,
				exclude: plugin.exclude ?? null,
				total: matched.length,
				files: [...counts.entries()].map(([file, count]) => ({
					file,
					count
				})).sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
			});
		}
		cleanupPlugins?.();
		return result;
	} catch (e) {
		return { error: `plugin inspection failed: ${errorMessage(e)}` };
	}
}
function installInstrument(ws, source) {
	const target = resolveNxInternal(ws, "utils/perf-logging.js");
	if (!target) {
		console.warn("could not locate nx perf-logging module; running without instrumentation");
		return null;
	}
	const backup = `${target}.graph-perf-backup`;
	if (!node_fs.default.existsSync(backup)) node_fs.default.copyFileSync(target, backup);
	node_fs.default.writeFileSync(target, source);
	let restored = false;
	const restore = () => {
		if (restored) return;
		restored = true;
		node_fs.default.copyFileSync(backup, target);
		node_fs.default.rmSync(backup, { force: true });
	};
	process.on("exit", restore);
	return {
		restore,
		target
	};
}
function announceSession(ws) {
	node_fs.default.mkdirSync(ws.sessionDir, { recursive: true });
	node_fs.default.writeFileSync(node_path.default.join(ws.perfLogsRoot, "ACTIVE"), ws.session);
}
function withdrawSession(ws) {
	node_fs.default.rmSync(node_path.default.join(ws.perfLogsRoot, "ACTIVE"), { force: true });
}
function readTraces(ws, runs) {
	if (!node_fs.default.existsSync(ws.sessionDir)) return [];
	const traces = [];
	for (const file of node_fs.default.readdirSync(ws.sessionDir)) {
		if (!file.endsWith(".jsonl")) continue;
		let header = null;
		const raw = [];
		for (const line of node_fs.default.readFileSync(node_path.default.join(ws.sessionDir, file), "utf8").split("\n")) {
			if (!line.trim()) continue;
			try {
				const record = JSON.parse(line);
				if (record.kind === "process") header = record;
				else if (record.kind === "measure") raw.push(record);
			} catch {}
		}
		if (!header) continue;
		const timeOrigin = header.timeOrigin;
		const measures = raw.map((m) => {
			const at = timeOrigin + m.startTime;
			const run = runs.reduce((current, r) => r.startedAt <= at ? r : current, runs[0]);
			return {
				...m,
				phase: run.phase,
				run: run.index
			};
		});
		measures.sort((a, b) => a.startTime - b.startTime);
		traces.push({
			pid: header.pid,
			ppid: header.ppid,
			role: classify(ws.root, header),
			argv: header.argv,
			timeOrigin: header.timeOrigin,
			measures
		});
	}
	traces.sort((a, b) => a.timeOrigin - b.timeOrigin);
	return traces;
}
function classify(root, header) {
	const script = header.argv[1] ? node_path.default.basename(header.argv[1]) : "";
	switch (script) {
		case "nx.js": return `client: nx ${header.argv.slice(2).join(" ")}`.trim();
		case "start.js": return "daemon";
		case "plugin-worker.js": {
			const plugin = header.argv[3];
			return plugin ? `plugin worker: ${shortName(root, plugin)}` : "plugin worker";
		}
		default: return script || "unknown";
	}
}
const roleKind = (role) => role.split(":")[0];
/**
* Sum of the measures that are not fully inside another measure of the same
* process. Nested phases (a plugin's createNodes inside the daemon's graph
* construction, say) are counted once, through the measure that contains them.
*/
function topLevelMs(measures) {
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
const ms = (n) => `${n.toFixed(1)} ms`;
const cell = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const rootForms = /* @__PURE__ */ new Map();
/** The workspace root as given and as its realpath, since nx reports the latter. */
function rootPrefixes(root) {
	let forms = rootForms.get(root);
	if (!forms) {
		forms = [root];
		try {
			const real = node_fs.default.realpathSync(root);
			if (real !== root) forms.push(real);
		} catch {}
		rootForms.set(root, forms);
	}
	return forms;
}
/** Shortens the workspace-rooted plugin paths nx puts in measure names. */
function shortName(root, name) {
	let short = name;
	for (const prefix of rootPrefixes(root)) for (const sep of [node_path.default.sep, "/"]) if (short.startsWith(prefix + sep)) short = short.slice(prefix.length + sep.length);
	return short.replace(/node_modules[\\/]\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/]/g, "node_modules/").replace(/(^|[\s:])(?:\S*[\\/])?node_modules[\\/]/, "$1node_modules/").replace(/node_modules[\\/]nx[\\/]dist[\\/]src[\\/]plugins[\\/]/g, "nx:").replace(/node_modules[\\/]/g, "");
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
	/^REQUEST_PROJECT_GRAPH round trip$/
];
function renderMarkdown(r) {
	const sys = r.system;
	const summary = ul(`Platform: ${sys.platform} ${sys.release} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB, node ${sys.node}`, `Projects: ${r.projectCount}`, `Cold graph (first ${code("nx show projects")} after ${code("nx reset")}, daemon start included): ${r.coldGraphMs} ms`, `Warm client round trips: ${r.warmMs.join(", ") || "none"}${r.warmMs.length ? ` (median ${Math.round(median(r.warmMs))} ms)` : ""}`);
	const sections = [];
	if (r.traces.length === 0) sections.push("No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.");
	else {
		const warmRuns = r.runs.filter((run) => run.phase === "warm").length;
		sections.push(h2("Processes", renderProcesses(r.traces, warmRuns), `Sums add up the measures of a process that are not fully inside another of its measures, so nested phases count once; for a plugin worker that is roughly what the plugin cost. A measure is cold or warm by which timed command was in flight when it started. Warm is per run, over ${warmRuns} warm run${warmRuns === 1 ? "" : "s"}.`));
		sections.push(h2("Key phases", "Cold is the occurrence during the first graph construction; warm covers every later run. A phase that is slow warm costs every command, not just the first.", renderKeyPhases(r.workspaceRoot, r.traces)));
		sections.push(h2("Timelines", "Offsets are from each process start. Every recorded measure, in start order.", ...r.traces.map((t) => h3(`${t.role}, pid ${t.pid}`, table(t.measures, [
			{
				label: "start",
				mapFn: (m) => `+${ms(m.startTime)}`
			},
			{
				label: "duration",
				mapFn: (m) => ms(m.duration)
			},
			{
				label: "run",
				mapFn: (m) => m.phase === "cold" ? "cold" : `warm ${m.run}`
			},
			{
				label: "measure",
				mapFn: (m) => cell(shortName(r.workspaceRoot, m.name))
			}
		])))));
	}
	sections.push(h2("Plugin config files", ...renderPluginConfigFiles(r.pluginConfigFiles)));
	sections.push(h2("nx report", ...renderReport(r.report)));
	sections.push(h2("nx.json", ...[
		"plugins",
		"targetDefaults",
		"namedInputs"
	].map((key) => h3(key, codeBlock(JSON.stringify("error" in r.nxJson ? r.nxJson.error : r.nxJson[key] ?? null, null, 2), "json")))));
	return h1("Nx graph construction", summary, ...sections) + "\n";
}
function renderProcesses(traces, warmRuns) {
	const earliest = Math.min(...traces.map((t) => t.timeOrigin));
	const phaseSum = (t, phase) => {
		const subset = t.measures.filter((m) => m.phase === phase);
		if (!subset.length) return "-";
		const sum = topLevelMs(subset);
		return ms(phase === "warm" && warmRuns ? sum / warmRuns : sum);
	};
	return table(traces, [
		{
			label: "pid",
			field: "pid"
		},
		{
			label: "role",
			mapFn: (t) => cell(t.role)
		},
		{
			label: "parent",
			field: "ppid"
		},
		{
			label: "started at",
			mapFn: (t) => `+${ms(t.timeOrigin - earliest)}`
		},
		{
			label: "measures",
			mapFn: (t) => t.measures.length
		},
		{
			label: "cold sum",
			mapFn: (t) => phaseSum(t, "cold")
		},
		{
			label: "warm sum / run",
			mapFn: (t) => phaseSum(t, "warm")
		},
		{
			label: "last measure ends",
			mapFn: (t) => `+${ms(t.timeOrigin - earliest + t.measures.reduce((max, m) => Math.max(max, m.startTime + m.duration), 0))}`
		}
	]);
}
function renderKeyPhases(root, traces) {
	const byPhase = /* @__PURE__ */ new Map();
	for (const t of traces) for (const m of t.measures) {
		if (!KEY_PHASES.some((p) => p.test(m.name))) continue;
		const phase = shortName(root, m.name);
		const key = `${phase} ${roleKind(t.role)}`;
		const entry = byPhase.get(key) ?? {
			phase,
			process: roleKind(t.role),
			cold: [],
			warm: []
		};
		entry[m.phase].push(m.duration);
		byPhase.set(key, entry);
	}
	const worst = (row) => Math.max(...row.cold, ...row.warm);
	const rows = [...byPhase.values()].sort((a, b) => worst(b) - worst(a));
	const stat = (values, pick) => values.length ? ms(pick(values)) : "-";
	return table(rows, [
		{
			label: "phase",
			mapFn: (p) => cell(p.phase)
		},
		{
			label: "process",
			field: "process"
		},
		{
			label: "cold",
			mapFn: (p) => stat(p.cold, (v) => Math.max(...v))
		},
		{
			label: "warm median",
			mapFn: (p) => stat(p.warm, median)
		},
		{
			label: "warm max",
			mapFn: (p) => stat(p.warm, (v) => Math.max(...v))
		},
		{
			label: "warm runs",
			mapFn: (p) => p.warm.length
		}
	]);
}
function renderPluginConfigFiles(plugins) {
	if ("error" in plugins) return [plugins.error];
	return ["Files matched by each loaded plugin's createNodes glob, by basename. One config file can produce more than one project, so this bounds what a plugin contributes rather than counting its projects.", ...plugins.map((p) => {
		const scope = [`Pattern: ${code(p.pattern)}`];
		if (p.include?.length) scope.push(`Include: ${p.include.map(code).join(", ")}`);
		if (p.exclude?.length) scope.push(`Exclude: ${p.exclude.map(code).join(", ")}`);
		return h3(p.name, scope.join(" "), p.files.length ? table(p.files, [{
			label: "file",
			mapFn: (f) => code(f.file)
		}, {
			label: "count",
			field: "count"
		}]) : "No matching files.");
	})];
}
function renderReport(report) {
	if ("error" in report) return [String(report.error)];
	const parts = [];
	const daemon = "error" in report.daemon ? `error: ${report.daemon.error}` : report.daemon.disabled ? "disabled" : report.daemon.available ? "running" : "not running";
	parts.push(ul(`Package manager: ${report.pm} ${report.pmVersion}`, `Daemon: ${daemon}`, `Native binding: ${report.nativeTarget ?? "not available"}`, `Cache: ${report.cache ? `${(report.cache.used / 1024 ** 2).toFixed(0)} MB used of ${(report.cache.max / 1024 ** 2).toFixed(0)} MB` : "db cache off"}`, `Nx key: ${report.nxKey ? report.nxKey.licenseType ?? "present" : report.nxKeyError ? `error: ${report.nxKeyError}` : "none"}`));
	if (report.projectGraphError) parts.push(blockQuote(`Project graph error: ${report.projectGraphError}`));
	const versions = report.packageVersionsWeCareAbout;
	parts.push(table(versions, [{
		label: "package",
		mapFn: (p) => code(p.package)
	}, {
		label: "version",
		field: "version"
	}]));
	const named = (kind) => (name) => ({
		kind,
		name
	});
	const versioned = (kind) => (p) => ({
		kind,
		name: `${p.name} ${p.version}`
	});
	const plugins = [
		...report.registeredPlugins.map(named("registered")),
		...report.localPlugins.map(named("local")),
		...report.communityPlugins.map(versioned("community")),
		...report.powerpackPlugins.map(versioned("powerpack"))
	];
	if (plugins.length) parts.push(h3("Plugins", table(plugins, [{
		label: "kind",
		field: "kind"
	}, {
		label: "plugin",
		mapFn: (p) => code(p.name)
	}])));
	if (report.outOfSyncPackageGroup) {
		const g = report.outOfSyncPackageGroup;
		const misaligned = g.misalignedPackages;
		parts.push(h3(`Out of sync with ${g.basePackage}`, table(misaligned, [{
			label: "package",
			field: "name"
		}, {
			label: "version",
			field: "version"
		}]), `Run ${code(`nx migrate ${g.migrateTarget}`)} to align them.`));
	}
	if (report.mismatchedNxVersions?.length) {
		const mismatched = report.mismatchedNxVersions;
		parts.push(h3("Mismatched nx versions", table(mismatched, [{
			label: "version",
			field: "version"
		}, {
			label: "chain",
			mapFn: (m) => m.chain.join(" > ")
		}])));
	}
	return parts;
}
/** Collects and writes the report for the workspace at `workspaceRoot`. */
async function run(argv, workspaceRoot) {
	const opts = parseArgs(argv);
	const ws = openWorkspace(workspaceRoot);
	const startedAt = (/* @__PURE__ */ new Date()).toISOString();
	const outDir = node_path.default.resolve(ws.root, opts.out);
	node_fs.default.mkdirSync(outDir, { recursive: true });
	if (opts.reset) {
		console.log("nx reset");
		assertOk("nx reset", nx(ws, ["reset"]));
	}
	let instrument = null;
	if (opts.instrument) {
		const source = opts.instrumentFile ? node_fs.default.readFileSync(node_path.default.resolve(opts.instrumentFile), "utf8") : instrumentSource();
		console.log(`instrumenting nx perf-logging${opts.instrumentFile ? ` from ${opts.instrumentFile}` : ""}`);
		instrument = installInstrument(ws, source);
		announceSession(ws);
	}
	try {
		console.log("cold graph construction: nx show projects --json");
		const cold = nx(ws, [
			"show",
			"projects",
			"--json"
		]);
		assertOk("nx show projects", cold);
		let projects = [];
		try {
			projects = JSON.parse(cold.stdout);
		} catch {
			console.error("could not parse `nx show projects --json` output");
			console.error(cold.stdout.slice(0, 500));
			process.exit(1);
		}
		const runs = [{
			index: 0,
			phase: "cold",
			startedAt: cold.startedAt,
			endedAt: cold.endedAt,
			wallMs: cold.wallMs
		}];
		for (let i = 1; i < opts.runs; i++) {
			console.log(`warm run ${i} of ${opts.runs - 1}`);
			const warm = nx(ws, [
				"show",
				"projects",
				"--json"
			]);
			assertOk("nx show projects (warm)", warm);
			runs.push({
				index: i,
				phase: "warm",
				startedAt: warm.startedAt,
				endedAt: warm.endedAt,
				wallMs: warm.wallMs
			});
		}
		const warmMs = runs.filter((run) => run.phase === "warm").map((run) => run.wallMs);
		withdrawSession(ws);
		const traces = instrument ? readTraces(ws, runs) : [];
		console.log("nx report data");
		const report = await readReportData(ws);
		console.log("plugin config files");
		const pluginConfigFiles = await readPluginConfigFiles(ws);
		const result = {
			collectedAt: startedAt,
			workspaceRoot: ws.root,
			system: {
				platform: process.platform,
				release: node_os.default.release(),
				arch: process.arch,
				cpus: node_os.default.cpus().length,
				cpuModel: node_os.default.cpus()[0]?.model ?? null,
				memoryGb: Math.round(node_os.default.totalmem() / 1024 ** 3),
				node: process.version
			},
			projectCount: projects.length,
			coldGraphMs: Math.round(cold.wallMs),
			warmMs: warmMs.map(Math.round),
			warmMedianMs: warmMs.length ? Math.round(median(warmMs)) : null,
			runs,
			records: instrument ? node_path.default.relative(ws.root, ws.sessionDir) : null,
			traces,
			report,
			pluginConfigFiles,
			nxJson: readNxJson(ws.root)
		};
		node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.md"), renderMarkdown(result));
		node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.json"), JSON.stringify(result, null, 2) + "\n");
		console.log(`wrote ${node_path.default.join(outDir, "graph-perf.md")} and graph-perf.json`);
		console.log(`projects ${projects.length}, cold ${result.coldGraphMs}ms, warm median ${result.warmMedianMs ?? "n/a"}ms, recorded processes ${traces.length}, measures ${traces.reduce((n, t) => n + t.measures.length, 0)}`);
	} finally {
		withdrawSession(ws);
		instrument?.restore();
	}
}

//#endregion
//#region src/main.ts
run(process.argv.slice(2), process.cwd()).then(() => process.exit(0), (e) => {
	console.error(e instanceof Error ? e.stack ?? e.message : String(e));
	process.exit(1);
});

//#endregion