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
	return "\"use strict\";\n// Drop-in replacement for nx/dist/src/utils/perf-logging.js, installed by\n// graph-perf.js for the duration of a measurement and restored afterwards.\n//\n// It keeps the original behaviour (perf lines when NX_PERF_LOGGING=true,\n// analytics for tracked measures) and additionally appends every measure as one\n// JSON line to <session dir>/<pid>.jsonl, where the session directory is read\n// from a marker file beside this module. Without that marker the module\n// behaves exactly like the original, so leaving it installed by accident costs\n// nothing.\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst perf_hooks_1 = require(\"perf_hooks\");\nconst fs = require(\"fs\");\nconst path = require(\"path\");\n\nfunction isTrackedDetail(detail) {\n  return typeof detail === \"object\" && detail !== null && detail.track === true;\n}\n\nlet recorder = { session: null, file: null };\n// Written by graph-perf.js next to this module; holds the session directory.\nconst marker = path.join(__dirname, 'perf-logging.js.graph-perf-session');\n\n// Re-reads the marker on every batch: a long-lived daemon outlives the session\n// that started it, and its measures must land with whichever session is active\n// now, or nowhere when none is.\nfunction getRecorder() {\n    try {\n        const session = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : '';\n        if (!session) {\n            recorder = { session: null, file: null };\n            return recorder;\n        }\n        if (recorder.session === session) return recorder;\n        const dir = session;\n        fs.mkdirSync(dir, { recursive: true });\n        const file = path.join(dir, `${process.pid}.jsonl`);\n        // Header line, so the file says which process it belongs to.\n        fs.appendFileSync(file, JSON.stringify({\n            kind: 'process',\n            pid: process.pid,\n            ppid: process.ppid,\n            argv: process.argv,\n            execArgv: process.execArgv,\n            cwd: process.cwd(),\n            node: process.version,\n            timeOrigin: perf_hooks_1.performance.timeOrigin,\n        }) + '\\n');\n        recorder = { session, file };\n    } catch {\n        recorder = { session: null, file: null };\n    }\n    return recorder;\n}\n\nfunction safeDetail(detail) {\n  if (detail === undefined || detail === null) return null;\n  try {\n    return JSON.parse(JSON.stringify(detail));\n  } catch {\n    return String(detail);\n  }\n}\n\nnew perf_hooks_1.PerformanceObserver((list) => {\n  // observer is configured for 'measure' entries only (see .observe call below)\n  const entries = list.getEntries();\n  const rec = getRecorder();\n  if (rec.file) {\n    let lines = \"\";\n    for (const entry of entries) {\n      lines +=\n        JSON.stringify({\n          kind: \"measure\",\n          pid: process.pid,\n          name: entry.name,\n          startTime: entry.startTime,\n          duration: entry.duration,\n          detail: safeDetail(entry.detail),\n        }) + \"\\n\";\n    }\n    try {\n      fs.appendFileSync(rec.file, lines);\n    } catch {\n      // Recording is best effort; never break the process being measured.\n    }\n  }\n  const logEnabled = process.env.NX_PERF_LOGGING === \"true\";\n  const tracked = entries.filter((e) => isTrackedDetail(e.detail));\n  // Short-circuit before loading analytics / daemon logger (~60ms of native\n  // binding + module init) when there's nothing to do.\n  if (!logEnabled && tracked.length === 0) return;\n  if (logEnabled) {\n    const { isOnDaemon } = require(\"../daemon/is-on-daemon\");\n    const { serverLogger } = require(\"../daemon/logger\");\n    const { logger } = require(\"./logger\");\n    const log = isOnDaemon() ? (msg) => serverLogger.log(msg) : (msg) => logger.warn(msg);\n    for (const entry of entries) {\n      log(`Time taken for '${entry.name}' ${entry.duration}ms`);\n    }\n  }\n  if (tracked.length === 0) return;\n  const { customDimensions, reportEvent } = require(\"../analytics\");\n  if (!customDimensions) return;\n  const dimensionValues = new Set(Object.values(customDimensions));\n  for (const entry of tracked) {\n    const { track, ...rest } = entry.detail;\n    const params = {\n      [customDimensions.duration]: entry.duration,\n    };\n    for (const [key, value] of Object.entries(rest)) {\n      if (dimensionValues.has(key)) params[key] = value;\n    }\n    reportEvent(entry.name, params);\n  }\n}).observe({ entryTypes: [\"measure\"] });\n";
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
* Records land in <tmpdir>/nx-graph-perf/<pid of this script>/<pid>.jsonl and
* are announced to the Nx processes through a marker file beside the swapped
* module, so nothing has to survive the daemon's environment filtering. They
* are removed once read; graph-perf.json keeps every measure.
*
* NX_DAEMON=true is forced because Nx turns the daemon off under CI and inside
* Docker, and a daemonless run measures something else.
*/
const ENV_OVERRIDES = {
	DOTNET_ROLL_FORWARD_TO_PRERELEASE: "1",
	NX_TUI: "false",
	NX_DAEMON: "true"
};
const INJECTED_BY_NX = /* @__PURE__ */ new Set(["NX_ANALYTICS_SESSION_ID", "NX_USE_V8_SERIALIZER"]);
function parseArgs(argv) {
	const opts = {
		runs: 3,
		edit: true,
		sourceEdits: 1,
		editFile: null,
		out: ".",
		reset: true,
		instrument: true,
		instrumentFile: null
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--runs") opts.runs = Math.max(1, Number(argv[++i]));
		else if (arg === "--source-edits") opts.sourceEdits = Math.max(0, Number(argv[++i]));
		else if (arg === "--edit-file") opts.editFile = argv[++i];
		else if (arg === "--no-edit") opts.edit = false;
		else if (arg === "--out") opts.out = argv[++i];
		else if (arg === "--no-reset") opts.reset = false;
		else if (arg === "--no-instrument") opts.instrument = false;
		else if (arg === "--instrument") opts.instrumentFile = argv[++i];
		else if (arg === "--help" || arg === "-h") {
			console.log("usage: node graph-perf.js [--runs CYCLES] [--source-edits N] [--edit-file FILE] [--no-edit] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE]");
			process.exit(0);
		} else {
			console.error(`unknown argument: ${arg}`);
			process.exit(2);
		}
	}
	return opts;
}
function openWorkspace(root) {
	for (const key of Object.keys(process.env)) if (key === "CI" || /^NX_TASK_/.test(key) || INJECTED_BY_NX.has(key)) delete process.env[key];
	const inheritedEnv = { ...process.env };
	Object.assign(process.env, ENV_OVERRIDES, { NX_DAEMON: "false" });
	const require$1 = (0, node_module.createRequire)(node_path.default.join(root, "package.json"));
	return {
		root,
		require: require$1,
		env: {
			...inheritedEnv,
			...ENV_OVERRIDES
		},
		nxBin: resolveFromWorkspace(require$1, "nx/bin/nx.js"),
		perfLogging: resolveFromWorkspace(require$1, "nx/dist/src/utils/perf-logging.js") ?? resolveFromWorkspace(require$1, "nx/src/utils/perf-logging.js"),
		sessionDir: node_path.default.join(node_os.default.tmpdir(), "nx-graph-perf", String(process.pid))
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
		const matchedByPlugin = /* @__PURE__ */ new Map();
		for (const plugin of plugins) {
			if (!plugin.createNodes) continue;
			const pattern = plugin.createNodes[0];
			const matched = findMatchingConfigFiles(globWithWorkspaceContextSync(root, [pattern]), plugin.include, plugin.exclude);
			matchedByPlugin.set(plugin.name, [...matchedByPlugin.get(plugin.name) ?? [], ...matched]);
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
		return {
			summary: result,
			matched: matchedByPlugin
		};
	} catch (e) {
		return { error: `plugin inspection failed: ${errorMessage(e)}` };
	}
}
const LOCK_FILES = /* @__PURE__ */ new Set([
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"bun.lock",
	"bun.lockb"
]);
/**
* Files an edit must not touch: the daemon restarts itself when a lock file's
* hash changes, and the root package.json and nx.json describe the workspace
* rather than a project. A plugin whose glob matches only these gets no run.
*/
const neverEdit = (file) => LOCK_FILES.has(node_path.default.basename(file)) || file === "package.json" || file === "nx.json";
const pick = (items) => items[Math.floor(Math.random() * items.length)];
/** File to project, from the file map the daemon wrote during the cold run. */
function readProjectOfFile(ws) {
	const owner = /* @__PURE__ */ new Map();
	const fileMap = node_path.default.join(ws.root, ".nx", "workspace-data", "file-map.json");
	if (!node_fs.default.existsSync(fileMap)) return owner;
	try {
		const projectFileMap = JSON.parse(node_fs.default.readFileSync(fileMap, "utf8")).fileMap.projectFileMap;
		for (const [project, files] of Object.entries(projectFileMap)) for (const f of files) owner.set(f.file, project);
	} catch {}
	return owner;
}
/**
* One edit per plugin that matched config files, then `sourceEdits` edits of
* ordinary source files. Each edit lands in a project no earlier edit used,
* as long as there are enough projects, so the runs exercise different parts
* of the graph rather than one hot spot.
*/
function planEdits(ws, matched, sourceEdits) {
	const owner = readProjectOfFile(ws);
	const projectOf = (file) => owner.get(file) ?? file;
	const usedProjects = /* @__PURE__ */ new Set();
	const usedFiles = /* @__PURE__ */ new Set();
	const plan = [];
	const take = (files, plugin) => {
		const fresh = files.filter((f) => !usedFiles.has(f) && !neverEdit(f));
		if (!fresh.length) return;
		const unusedProject = fresh.filter((f) => !usedProjects.has(projectOf(f)));
		const file = pick(unusedProject.length ? unusedProject : fresh);
		usedFiles.add(file);
		usedProjects.add(projectOf(file));
		plan.push({
			file,
			plugin
		});
	};
	for (const [plugin, files] of matched) take(files, plugin);
	const configFiles = new Set([...matched.values()].flat());
	const sourceFiles = [...owner.keys()].filter((f) => !configFiles.has(f) && !neverEdit(f));
	for (let i = 0; i < sourceEdits; i++) take(sourceFiles, null);
	return plan;
}
/** Appends a newline per touch and puts the original bytes back on restore. */
function installEdit(ws, plan) {
	const absolute = node_path.default.join(ws.root, plan.file);
	if (!node_fs.default.existsSync(absolute)) {
		console.warn(`edit target ${plan.file} does not exist; skipping it`);
		return null;
	}
	const original = node_fs.default.readFileSync(absolute);
	let restored = false;
	const restore = () => {
		if (restored) return;
		restored = true;
		node_fs.default.writeFileSync(absolute, original);
		if (!node_fs.default.readFileSync(absolute).equals(original)) {
			node_fs.default.writeFileSync(absolute, original);
			if (!node_fs.default.readFileSync(absolute).equals(original)) console.warn(`could not restore ${plan.file}; check it by hand`);
		}
	};
	process.on("exit", restore);
	return {
		...plan,
		touch: () => node_fs.default.appendFileSync(absolute, "\n"),
		restore
	};
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function installInstrument(ws, source) {
	const target = ws.perfLogging;
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
const markerFor = (ws) => ws.perfLogging ? `${ws.perfLogging}.graph-perf-session` : null;
function announceSession(ws) {
	const marker = markerFor(ws);
	if (!marker) return;
	node_fs.default.mkdirSync(ws.sessionDir, { recursive: true });
	node_fs.default.writeFileSync(marker, ws.sessionDir);
}
function withdrawSession(ws) {
	const marker = markerFor(ws);
	if (marker) node_fs.default.rmSync(marker, { force: true });
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
			const phase = run.phase === "cold" && at > run.endedAt ? "warm" : run.phase;
			return {
				...m,
				phase,
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
function topLevel(measures) {
	const ordered = [...measures].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
	let outerEnd = -Infinity;
	const outer = [];
	for (const m of ordered) {
		const end = m.startTime + m.duration;
		if (end <= outerEnd) continue;
		outerEnd = end;
		outer.push(m);
	}
	return outer;
}
function topLevelMs(measures) {
	return topLevel(measures).reduce((sum, m) => sum + m.duration, 0);
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
	return short.replace(/node_modules[\\/]\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/]/g, "node_modules/").replace(/(^|[\s:])(?:(?:[A-Za-z]:)?[^\s:]*[\\/])?node_modules[\\/]/, "$1node_modules/").replace(/node_modules[\\/]nx[\\/]dist[\\/]src[\\/]plugins[\\/]/g, "nx:").replace(/node_modules[\\/]/g, "");
}
const KEY_PHASES = [
	{
		pattern: /^total for creating and serializing project graph$/,
		role: "daemon"
	},
	{
		pattern: /^total execution time for createProjectGraph\(\)$/,
		role: "daemon"
	},
	{
		pattern: /^build-project-configs$/,
		role: "daemon"
	},
	{ pattern: /:createNodes$/ },
	{
		pattern: /^createNodes:merge$/,
		role: "daemon"
	},
	{
		pattern: /^createDependencies$/,
		role: "daemon"
	},
	{ pattern: /:createDependencies$/ },
	{ pattern: /^Load Nx Plugin: / },
	{ pattern: /^loadSpecifiedNxPlugins$/ },
	{ pattern: /^loadDefaultNxPlugins$/ },
	{
		pattern: /^plugin worker \d+ code loading$/,
		role: "plugin worker"
	},
	{ pattern: /^start-plugin-worker:/ },
	{
		pattern: /^createProjectGraphAsync$/,
		role: "client"
	},
	{
		pattern: /^REQUEST_PROJECT_GRAPH round trip$/,
		role: "client"
	}
];
const series = (values) => values.length ? `${values.join(", ")} ms${values.length > 1 ? ` (median ${Math.round(median(values))} ms)` : ""}` : "none";
const countBy = (runs, phase) => runs.filter((run) => run.phase === phase).length;
function renderMarkdown(r) {
	const sys = r.system;
	const summary = ul(`Platform: ${sys.platform} ${sys.release} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB, node ${sys.node}`, `Projects: ${r.projectCount}`, `Cycles: ${r.cycles}, each ${r.reset ? `${code("nx reset")}, ` : ""}cold ${code("nx show projects")}, warm, then ${r.edits.length} semi-warm edit${r.edits.length === 1 ? "" : "s"}`, `Cold: ${series(r.coldMs)}`, `Warm: ${series(r.warmMs)}`, ...r.edits.length ? [`Semi-warm: ${series(r.semiWarmMs)}`] : [], ...r.reset ? [] : ["Daemon was not reset, so a cold run is only cold if no daemon was running."]);
	const sections = [];
	if (r.traces.length === 0) sections.push("No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.");
	else {
		sections.push(h2("Processes", renderProcesses(r.traces, r.runs), `One row per kind of process, across every cycle. Sums count nested measures once, through the outermost one, and are per run of that phase (${countBy(r.runs, "cold")} cold, ${countBy(r.runs, "warm")} warm, ${countBy(r.runs, "semi-warm")} semi-warm). Every measure is in graph-perf.json.`));
		if (r.edits.length) sections.push(h2("Semi-warm runs", "One edit per plugin whose glob matched a file, then source-file edits, repeated every cycle. Daemon is the sum of its top-level measures inside that run.", renderSemiWarmRuns(r)));
		sections.push(h2("Key phases", "A phase that stays slow warm costs every command; one that is slow semi-warm costs every edit.", renderKeyPhases(r.workspaceRoot, r.traces)));
	}
	sections.push(h2("Plugin config files", ...renderPluginConfigFiles(r.pluginConfigFiles)));
	if (r.traces.length) sections.push(h2("Timelines", ...renderTimelines(r)));
	sections.push(h2("nx report", ...renderReport(r.report, r.traces, r.instrumented)));
	sections.push(h2("nx.json", ...["plugins", "targetDefaults"].map((key) => h3(key, codeBlock(JSON.stringify("error" in r.nxJson ? r.nxJson.error : r.nxJson[key] ?? null, null, 2), "json")))));
	return h1("Nx graph construction", summary, ...sections) + "\n";
}
function renderSemiWarmRuns(r) {
	const daemons = r.traces.filter((t) => t.role === "daemon");
	const daemonMs = (run) => topLevelMs(daemons.flatMap((t) => t.measures.filter((m) => m.run === run.index)));
	const byEdit = /* @__PURE__ */ new Map();
	for (const run of r.runs) {
		if (run.phase !== "semi-warm" || !run.file) continue;
		const row = byEdit.get(run.file) ?? {
			file: run.file,
			plugin: run.plugin ?? null,
			client: [],
			daemon: []
		};
		row.client.push(run.wallMs);
		if (daemons.length) row.daemon.push(daemonMs(run));
		byEdit.set(run.file, row);
	}
	const stat = (values) => values.length ? ms(median(values)) : "-";
	return table([...byEdit.values()], [
		{
			label: "edited file",
			mapFn: (row) => code(row.file)
		},
		{
			label: "matched by",
			mapFn: (row) => row.plugin ? cell(row.plugin) : "no plugin (source file)"
		},
		{
			label: "runs",
			mapFn: (row) => row.client.length
		},
		{
			label: "client median",
			mapFn: (row) => stat(row.client)
		},
		{
			label: "daemon median",
			mapFn: (row) => stat(row.daemon)
		}
	]);
}
function renderProcesses(traces, runs) {
	const perRun = {
		cold: countBy(runs, "cold") || 1,
		warm: countBy(runs, "warm") || 1,
		"semi-warm": countBy(runs, "semi-warm") || 1
	};
	const byRole = /* @__PURE__ */ new Map();
	for (const t of traces) {
		const row = byRole.get(t.role) ?? {
			role: t.role,
			processes: 0,
			measures: [],
			first: t.timeOrigin
		};
		row.processes++;
		row.measures.push(...t.measures);
		byRole.set(t.role, row);
	}
	const phaseSum = (row, phase) => {
		const total = traces.filter((t) => t.role === row.role).map((t) => topLevelMs(t.measures.filter((m) => m.phase === phase))).reduce((a, b) => a + b, 0);
		return total ? ms(total / perRun[phase]) : "-";
	};
	const rows = [...byRole.values()].sort((a, b) => a.first - b.first);
	return table(rows, [
		{
			label: "role",
			mapFn: (row) => cell(row.role)
		},
		{
			label: "processes",
			field: "processes"
		},
		{
			label: "cold / run",
			mapFn: (row) => phaseSum(row, "cold")
		},
		{
			label: "warm / run",
			mapFn: (row) => phaseSum(row, "warm")
		},
		{
			label: "semi-warm / run",
			mapFn: (row) => phaseSum(row, "semi-warm")
		}
	]);
}
function renderKeyPhases(root, traces) {
	const byPhase = /* @__PURE__ */ new Map();
	for (const t of traces) for (const m of t.measures) {
		const kind = roleKind(t.role);
		if (!KEY_PHASES.some((p) => p.pattern.test(m.name) && (!p.role || p.role === kind))) continue;
		const phase = shortName(root, m.name).replace(/^plugin worker \d+ code loading$/, "plugin worker code loading");
		const key = `${phase} ${roleKind(t.role)}`;
		const entry = byPhase.get(key) ?? {
			phase,
			process: kind,
			cold: [],
			warm: [],
			"semi-warm": []
		};
		entry[m.phase].push(m.duration);
		byPhase.set(key, entry);
	}
	const worst = (row) => Math.max(...row.cold, ...row.warm, ...row["semi-warm"]);
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
			label: "cold median",
			mapFn: (p) => stat(p.cold, median)
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
			label: "semi-warm median",
			mapFn: (p) => stat(p["semi-warm"], median)
		}
	]);
}
const isKeyPhase = (name, kind) => KEY_PHASES.some((p) => p.pattern.test(name) && (!p.role || p.role === kind));
/** Mermaid text is split on colons and semicolons; keep labels to safe characters. */
const mermaidLabel = (text) => text.replace(/[:;#]/g, "-");
/**
* One Gantt chart per phase: every process that did work in that phase is a
* section, and its top-level measures plus the key phases are the bars.
* Times count from the phase's first run window.
*/
function renderTimelines(r) {
	const parts = ["First cycle, cold and warm only. Bars are top-level measures and key phases; time counts from the start of that run."];
	for (const phase of ["cold", "warm"]) {
		const first = r.runs.find((run) => run.phase === phase);
		if (!first) continue;
		const t0 = first.startedAt;
		const lines = [
			"gantt",
			`  title ${phase}`,
			"  dateFormat x",
			"  axisFormat %S.%Ls",
			"  todayMarker off"
		];
		let bars = 0;
		for (const t of r.traces) {
			const kind = roleKind(t.role);
			const inPhase = t.measures.filter((m) => m.phase === phase && m.run === first.index);
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
		if (bars) parts.push(h3(phase, codeBlock(lines.join("\n"), "mermaid")));
	}
	return parts;
}
function renderPluginConfigFiles(plugins) {
	if ("error" in plugins) return [plugins.error];
	return ["Files matched by each loaded plugin's createNodes glob, by basename. A config file can produce more than one project, so this bounds a plugin's share rather than counting its projects.", ...plugins.map((p) => {
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
function renderReport(report, traces, instrumented) {
	if ("error" in report) return [String(report.error)];
	const parts = [];
	const daemonTrace = traces.find((t) => t.role === "daemon");
	const daemon = daemonTrace ? `recorded (pid ${daemonTrace.pid})` : instrumented ? "not recorded: either none ran, or one started before this run and still has the original module" : "unknown, instrumentation was off";
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
	let instrument = null;
	if (opts.instrument) {
		const source = opts.instrumentFile ? node_fs.default.readFileSync(node_path.default.resolve(opts.instrumentFile), "utf8") : instrumentSource();
		console.log(`instrumenting nx perf-logging${opts.instrumentFile ? ` from ${opts.instrumentFile}` : ""}`);
		instrument = installInstrument(ws, source);
	}
	const runs = [];
	const traces = [];
	const edits = [];
	let projects = [];
	let inspection = { error: "plugins were not inspected" };
	const show = (label) => {
		const result = nx(ws, [
			"show",
			"projects",
			"--json"
		]);
		assertOk(`nx show projects (${label})`, result);
		return result;
	};
	const record = (phase, result, extra = {}) => runs.push({
		index: runs.length,
		phase,
		startedAt: result.startedAt,
		endedAt: result.endedAt,
		wallMs: result.wallMs,
		...extra
	});
	try {
		for (let cycle = 1; cycle <= opts.runs; cycle++) {
			const tag = `cycle ${cycle} of ${opts.runs}`;
			if (opts.reset) {
				console.log(`${tag}: nx reset`);
				assertOk("nx reset", nx(ws, ["reset"]));
			}
			if (instrument) announceSession(ws);
			console.log(`${tag}: cold nx show projects --json`);
			const cold = show("cold");
			record("cold", cold);
			if (cycle === 1) try {
				projects = JSON.parse(cold.stdout);
			} catch {
				console.error("could not parse `nx show projects --json` output");
				console.error(cold.stdout.slice(0, 500));
				process.exit(1);
			}
			console.log(`${tag}: warm`);
			record("warm", show("warm"));
			if (cycle === 1) {
				withdrawSession(ws);
				console.log(`${tag}: plugin config files`);
				inspection = await readPluginConfigFiles(ws);
				if (instrument) announceSession(ws);
				if (opts.edit) {
					const plan = opts.editFile ? [{
						file: opts.editFile,
						plugin: null
					}] : planEdits(ws, "error" in inspection ? /* @__PURE__ */ new Map() : inspection.matched, opts.sourceEdits);
					if (!plan.length) console.warn("nothing to edit; skipping semi-warm runs");
					for (const item of plan) {
						const edit = installEdit(ws, item);
						if (edit) edits.push(edit);
					}
				}
			}
			for (const [i, edit] of edits.entries()) {
				console.log(`${tag}: semi-warm ${i + 1} of ${edits.length}, editing ${edit.file}${edit.plugin ? ` (${edit.plugin})` : ""}`);
				const editedAt = Date.now();
				edit.touch();
				await sleep(500);
				record("semi-warm", {
					...show("semi-warm"),
					startedAt: editedAt
				}, {
					file: edit.file,
					plugin: edit.plugin
				});
			}
			withdrawSession(ws);
		}
		if (instrument) {
			traces.push(...readTraces(ws, runs));
			node_fs.default.rmSync(ws.sessionDir, {
				recursive: true,
				force: true
			});
		}
		console.log("nx report data");
		const report = await readReportData(ws);
		const byPhase = (phase) => runs.filter((run) => run.phase === phase).map((run) => Math.round(run.wallMs));
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
			cycles: opts.runs,
			coldMs: byPhase("cold"),
			warmMs: byPhase("warm"),
			semiWarmMs: byPhase("semi-warm"),
			edits: edits.map(({ file, plugin }) => ({
				file,
				plugin
			})),
			reset: opts.reset,
			runs,
			instrumented: instrument !== null,
			traces,
			report,
			pluginConfigFiles: "error" in inspection ? inspection : inspection.summary,
			nxJson: readNxJson(ws.root)
		};
		node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.md"), renderMarkdown(result));
		node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.json"), JSON.stringify(result, null, 2) + "\n");
		const med = (values) => values.length ? `${Math.round(median(values))}ms` : "n/a";
		console.log(`wrote ${node_path.default.join(outDir, "graph-perf.md")} and graph-perf.json`);
		console.log(`projects ${projects.length}, cycles ${opts.runs}, cold median ${med(result.coldMs)}, warm median ${med(result.warmMs)}, semi-warm median ${med(result.semiWarmMs)}, recorded processes ${traces.length}, measures ${traces.reduce((n, t) => n + t.measures.length, 0)}`);
	} finally {
		for (const edit of edits) edit.restore();
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