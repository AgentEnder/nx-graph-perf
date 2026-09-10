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
* Function to link to an external resource.
* @param ref The reference to link to.
* @param title The title/label of the link.
* @returns Markdown link to the external resource.
* @example
* ```typescript
* console.log(link('https://example.com', 'Example'));
* // Prints:
* //
* // [Example](https://example.com)
* ```
*/
function link(ref, title) {
	return `[${title ?? ref}](${ref})`;
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
	return "\"use strict\";\n// Drop-in replacement for nx's perf-logging.js, installed by graph-perf.js for\n// the duration of a measurement and restored afterwards.\n//\n// The original module is kept beside this one as perf-logging.js.graph-perf-backup\n// and loaded first, so whatever this nx version does with measures (perf log\n// lines, analytics) keeps happening. This module only adds a second observer\n// that appends every measure as one JSON line to <session dir>/<pid>.jsonl,\n// where the session directory is read from a marker file beside this module.\n// Without that marker the observer does nothing.\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst perf_hooks_1 = require(\"perf_hooks\");\nconst fs = require(\"fs\");\nconst path = require(\"path\");\n\ntry {\n    require(\"./perf-logging.js.graph-perf-backup\");\n} catch {\n    // No original to delegate to; recording still works.\n}\n\nlet recorder = { session: null, file: null };\n// Written by graph-perf.js next to this module; holds the session directory.\nconst marker = path.join(__dirname, 'perf-logging.js.graph-perf-session');\n\n// Re-reads the marker on every batch: a long-lived daemon outlives the session\n// that started it, and its measures must land with whichever session is active\n// now, or nowhere when none is.\nfunction getRecorder() {\n    try {\n        const session = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : '';\n        if (!session) {\n            recorder = { session: null, file: null };\n            return recorder;\n        }\n        if (recorder.session === session) return recorder;\n        const dir = session;\n        fs.mkdirSync(dir, { recursive: true });\n        const file = path.join(dir, `${process.pid}.jsonl`);\n        // Header line, so the file says which process it belongs to.\n        fs.appendFileSync(file, JSON.stringify({\n            kind: 'process',\n            pid: process.pid,\n            ppid: process.ppid,\n            argv: process.argv,\n            execArgv: process.execArgv,\n            cwd: process.cwd(),\n            node: process.version,\n            timeOrigin: perf_hooks_1.performance.timeOrigin,\n        }) + '\\n');\n        recorder = { session, file };\n    } catch {\n        recorder = { session: null, file: null };\n    }\n    return recorder;\n}\n\nfunction safeDetail(detail) {\n    if (detail === undefined || detail === null) return null;\n    try {\n        return JSON.parse(JSON.stringify(detail));\n    } catch {\n        return String(detail);\n    }\n}\n\nnew perf_hooks_1.PerformanceObserver((list) => {\n    const rec = getRecorder();\n    if (!rec.file) return;\n    let lines = '';\n    for (const entry of list.getEntries()) {\n        lines += JSON.stringify({\n            kind: 'measure',\n            pid: process.pid,\n            name: entry.name,\n            startTime: entry.startTime,\n            duration: entry.duration,\n            detail: safeDetail(entry.detail),\n        }) + '\\n';\n    }\n    try {\n        fs.appendFileSync(rec.file, lines);\n    } catch {\n        // Recording is best effort; never break the process being measured.\n    }\n}).observe({ entryTypes: ['measure'] });\n";
}

//#endregion
//#region src/viewer-assets.ts
function viewerAssets() {
	return {
		"html": "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <title>__TITLE__</title>\n    <style>\n      /*__CSS__*/\n    </style>\n  </head>\n  <body>\n    <main class=\"viz\">\n      <h1 id=\"title\"></h1>\n      <p class=\"sub\" id=\"subtitle\"></p>\n\n      <div class=\"filters\">\n        <label for=\"run\">Run</label>\n        <select id=\"run\"></select>\n        <label for=\"filter\">Measure</label>\n        <input id=\"filter\" type=\"search\" placeholder=\"filter by name\" />\n        <button id=\"reset\" type=\"button\">Reset zoom</button>\n        <span class=\"hint\" id=\"hint\">ctrl-scroll or pinch to zoom, drag or swipe sideways to pan</span>\n        <span class=\"spacer\"></span>\n        <button\n          id=\"trace\"\n          type=\"button\"\n          title=\"Opens ui.perfetto.dev in a new tab and hands it this trace. Perfetto reads the trace in the browser; nothing is uploaded.\"\n        >\n          Open in Perfetto\n        </button>\n        <button id=\"table-view\" type=\"button\" aria-pressed=\"false\">Table</button>\n        <button id=\"theme\" type=\"button\">Dark</button>\n      </div>\n\n      <div class=\"stats\">\n        <div>\n          <span class=\"stat-label\">Wall time</span>\n          <span class=\"stat-value\" id=\"stat-wall\"></span>\n        </div>\n        <div>\n          <span class=\"stat-label\">Processes</span>\n          <span class=\"stat-value\" id=\"stat-procs\"></span>\n        </div>\n        <div>\n          <span class=\"stat-label\">Measures</span>\n          <span class=\"stat-value\" id=\"stat-measures\"></span>\n        </div>\n        <div>\n          <span class=\"stat-label\">Longest measure</span>\n          <span class=\"stat-value\" id=\"stat-longest\"></span>\n        </div>\n        <div class=\"legend\" id=\"legend\"></div>\n      </div>\n\n      <div class=\"panel\" id=\"chart\">\n        <div id=\"axis\">\n          <div id=\"ticks\"></div>\n          <div\n            id=\"scrollbar\"\n            role=\"scrollbar\"\n            aria-orientation=\"horizontal\"\n            aria-controls=\"lanes\"\n            aria-label=\"Visible time range\"\n            tabindex=\"0\"\n          >\n            <div id=\"thumb\"></div>\n          </div>\n        </div>\n        <div id=\"lanes\"></div>\n      </div>\n\n      <div class=\"panel\" id=\"table\" hidden></div>\n    </main>\n\n    <div class=\"tip\" id=\"tip\" hidden role=\"status\" aria-live=\"polite\">\n      <div class=\"tip-value\" id=\"tip-value\"></div>\n      <div class=\"tip-name\" id=\"tip-name\"></div>\n      <div class=\"tip-meta\" id=\"tip-meta\"></div>\n    </div>\n\n    <script id=\"data\" type=\"application/json\">\n      /*__DATA__*/\n    <\/script>\n    <script id=\"trace-data\" type=\"application/json\">\n      /*__TRACE__*/\n    <\/script>\n    <script>\n      /*__JS__*/\n    <\/script>\n  </body>\n</html>\n",
		"css": "/* Light is the base; the media query covers the OS setting and the\n   data-theme scope covers the in-page toggle, which wins either way. */\n\n:root {\n  color-scheme: light;\n  --surface-1: #fcfcfb;\n  --plane: #f9f9f7;\n  --ink: #0b0b0b;\n  --ink-2: #52514e;\n  --muted: #898781;\n  --grid: #e1e0d9;\n  --axis: #c3c2b7;\n  --hairline: rgba(11, 11, 11, 0.1);\n  --client: #2a78d6;\n  --daemon: #eb6834;\n  --worker: #1baf7a;\n  --other: #898781;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) {\n    color-scheme: dark;\n    --surface-1: #1a1a19;\n    --plane: #0d0d0d;\n    --ink: #ffffff;\n    --ink-2: #c3c2b7;\n    --muted: #898781;\n    --grid: #2c2c2a;\n    --axis: #383835;\n    --hairline: rgba(255, 255, 255, 0.1);\n    --client: #3987e5;\n    --daemon: #d95926;\n    --worker: #199e70;\n    --other: #898781;\n  }\n}\n\n:root[data-theme='dark'] {\n  color-scheme: dark;\n  --surface-1: #1a1a19;\n  --plane: #0d0d0d;\n  --ink: #ffffff;\n  --ink-2: #c3c2b7;\n  --muted: #898781;\n  --grid: #2c2c2a;\n  --axis: #383835;\n  --hairline: rgba(255, 255, 255, 0.1);\n  --client: #3987e5;\n  --daemon: #d95926;\n  --worker: #199e70;\n  --other: #898781;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  background: var(--plane);\n  color: var(--ink);\n  font:\n    13px/1.5 system-ui,\n    -apple-system,\n    'Segoe UI',\n    sans-serif;\n}\n\n.viz {\n  max-width: 1400px;\n  margin: 0 auto;\n  padding: 24px 20px 64px;\n}\n\nh1 {\n  margin: 0 0 4px;\n  font-size: 19px;\n  font-weight: 600;\n}\n\n.sub {\n  margin: 0;\n  color: var(--ink-2);\n}\n\n/* Filters scope everything below them, so they sit in one row above the chart. */\n\n.filters {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  margin: 20px 0 16px;\n}\n\n.filters label {\n  color: var(--ink-2);\n}\n\nselect,\ninput[type='search'],\nbutton {\n  font: inherit;\n  color: var(--ink);\n  background: var(--surface-1);\n  border: 1px solid var(--hairline);\n  border-radius: 6px;\n  padding: 5px 9px;\n}\n\ninput[type='search'] {\n  min-width: 200px;\n}\n\nbutton {\n  cursor: pointer;\n}\n\nbutton:hover {\n  border-color: var(--axis);\n}\n\nbutton[aria-pressed='true'] {\n  background: var(--ink);\n  color: var(--surface-1);\n  border-color: var(--ink);\n}\n\n.hint {\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.spacer {\n  flex: 1;\n}\n\n.stats {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 28px;\n  padding: 14px 16px;\n  background: var(--surface-1);\n  border: 1px solid var(--hairline);\n  border-radius: 8px 8px 0 0;\n  border-bottom: 0;\n}\n\n.stat-label {\n  display: block;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.stat-value {\n  display: block;\n  font-size: 22px;\n  font-weight: 600;\n  letter-spacing: -0.01em;\n}\n\n.stat-value small {\n  font-size: 13px;\n  font-weight: 400;\n  color: var(--ink-2);\n}\n\n.legend {\n  display: flex;\n  gap: 16px;\n  align-items: center;\n  margin-left: auto;\n  align-self: center;\n  color: var(--ink-2);\n}\n\n.legend span {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.legend i {\n  width: 12px;\n  height: 12px;\n  border-radius: 2px;\n}\n\n.panel {\n  background: var(--surface-1);\n  border: 1px solid var(--hairline);\n  border-radius: 0 0 8px 8px;\n}\n\n#axis {\n  position: sticky;\n  top: 0;\n  z-index: 2;\n  background: var(--surface-1);\n  border-bottom: 1px solid var(--grid);\n}\n\n#axis svg,\n#lanes svg {\n  display: block;\n  width: 100%;\n}\n\n/* Drawn rather than native: at full zoom the plot would be millions of\n   pixels wide, so the transform stays in script and the thumb reports it. */\n\n#scrollbar {\n  position: relative;\n  height: 9px;\n  margin: 0 12px 5px 0;\n  border-radius: 5px;\n  background: var(--grid);\n  cursor: pointer;\n}\n\n#scrollbar:focus-visible {\n  outline: 2px solid var(--ink);\n  outline-offset: 2px;\n}\n\n#thumb {\n  position: absolute;\n  top: 0;\n  height: 100%;\n  min-width: 24px;\n  border-radius: 5px;\n  background: var(--muted);\n}\n\n#thumb:hover,\n#scrollbar:focus-visible #thumb {\n  background: var(--ink-2);\n}\n\n#scrollbar.dragging #thumb {\n  background: var(--ink);\n}\n\n#lanes {\n  cursor: grab;\n}\n\n#lanes.panning {\n  cursor: grabbing;\n}\n\n.lane-label {\n  fill: var(--ink-2);\n  font-size: 11px;\n}\n\n.lane-rule {\n  stroke: var(--grid);\n  stroke-width: 1;\n}\n\n.tick-line {\n  stroke: var(--grid);\n  stroke-width: 1;\n}\n\n.tick-text {\n  fill: var(--muted);\n  font-size: 11px;\n  font-variant-numeric: tabular-nums;\n}\n\n.bar rect {\n  rx: 2;\n}\n\n.bar {\n  outline: none;\n}\n\n.bar.client rect {\n  fill: var(--client);\n}\n\n.bar.daemon rect {\n  fill: var(--daemon);\n}\n\n.bar.worker rect {\n  fill: var(--worker);\n}\n\n/* Unclassified processes take the de-emphasis gray, never a fourth hue. */\n\n.bar.other rect {\n  fill: var(--other);\n}\n\n/* Hovering one bar recedes the rest, so a single span reads out of a dense run. */\n\n#lanes.hovering .bar:not(.hot) {\n  opacity: 0.3;\n}\n\n.bar.hot rect,\n.bar:focus-visible rect {\n  stroke: var(--ink);\n  stroke-width: 2;\n}\n\n.bar-label {\n  font-size: 10px;\n  pointer-events: none;\n}\n\n.tip {\n  position: fixed;\n  z-index: 5;\n  max-width: 380px;\n  padding: 9px 11px;\n  background: var(--surface-1);\n  border: 1px solid var(--axis);\n  border-radius: 7px;\n  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);\n  pointer-events: none;\n}\n\n.tip[hidden] {\n  display: none;\n}\n\n.tip-value {\n  font-size: 17px;\n  font-weight: 600;\n}\n\n.tip-name {\n  margin-top: 2px;\n  color: var(--ink-2);\n  overflow-wrap: anywhere;\n}\n\n.tip-meta {\n  margin-top: 4px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\ntable {\n  width: 100%;\n  border-collapse: collapse;\n  font-variant-numeric: tabular-nums;\n}\n\ncaption {\n  padding: 12px 16px;\n  text-align: left;\n  color: var(--ink-2);\n}\n\nth,\ntd {\n  padding: 6px 16px;\n  text-align: left;\n  border-bottom: 1px solid var(--grid);\n}\n\nth {\n  color: var(--muted);\n  font-weight: 500;\n}\n\ntd.num {\n  text-align: right;\n}\n\n.empty {\n  padding: 40px 16px;\n  color: var(--muted);\n  text-align: center;\n}\n",
		"js": "// Interactive timeline for the measures graph-perf records. One lane per Nx\n// process, one bar per measure, packed into rows so a measure nested inside\n// another sits below it and concurrent work sits beside it.\n\n(() => {\n  const data = JSON.parse(document.getElementById('data').textContent);\n\n  const SVG_NS = 'http://www.w3.org/2000/svg';\n  const KINDS = ['client', 'daemon', 'worker', 'other'];\n  const KIND_LABELS = ['Client', 'Daemon', 'Plugin worker', 'Other'];\n  const GUTTER = 250;\n  const ROW_H = 15;\n  const BAR_H = 11;\n  const LANE_GAP = 9;\n  const AXIS_H = 26;\n  const MIN_SPAN = 2;\n\n  const el = (id) => document.getElementById(id);\n  const make = (name) => document.createElementNS(SVG_NS, name);\n\n  // Lane labels are cut from the front, since the plugin and the pid at the\n  // end are what tell two workers apart. The full text stays on the element.\n  const LANE_CHARS = Math.floor((GUTTER - 16) / 6.1);\n  const fitLabel = (text) => (text.length <= LANE_CHARS ? text : `…${text.slice(1 - LANE_CHARS)}`);\n\n  const state = { run: 0, filter: '', table: false, view: null, hot: null };\n\n  let lanes = [];\n  let placed = [];\n  let domain = 1;\n\n  // -- formatting ----------------------------------------------------------\n\n  const fmtDur = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(1)} ms`);\n  const fmtAt = (v) => (v >= 1000 ? `+${(v / 1000).toFixed(2)} s` : `+${Math.round(v)} ms`);\n\n  function fmtTick(t, step) {\n    if (step >= 1000) return `${t / 1000}s`;\n    if (step >= 100) return `${(t / 1000).toFixed(1)}s`;\n    return `${t}ms`;\n  }\n\n  function ticks(start, end) {\n    const raw = (end - start) / 8 || 1;\n    const mag = 10 ** Math.floor(Math.log10(raw));\n    const step = ([1, 2, 5, 10].find((m) => mag * m >= raw) ?? 10) * mag;\n    const list = [];\n    for (let t = Math.ceil(start / step) * step; t <= end; t += step) list.push(t);\n    return { list, step };\n  }\n\n  // Text inside a fill takes white or black by whichever clears the fill.\n  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);\n\n  function inkOn(fill) {\n    const m = /^#?([0-9a-f]{6})$/i.exec(fill.trim());\n    if (!m) return '#ffffff';\n    const n = parseInt(m[1], 16);\n    const lum =\n      0.2126 * channel(((n >> 16) & 255) / 255) +\n      0.7152 * channel(((n >> 8) & 255) / 255) +\n      0.0722 * channel((n & 255) / 255);\n    return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? '#ffffff' : '#000000';\n  }\n\n  const fillOf = (kind) => getComputedStyle(document.documentElement).getPropertyValue(`--${KINDS[kind]}`);\n\n  // -- layout --------------------------------------------------------------\n\n  /** Bars of the selected run, packed into rows per process. */\n  function buildLanes() {\n    const q = state.filter.trim().toLowerCase();\n    const out = [];\n    for (const lane of data.lanes) {\n      const bars = [];\n      for (const [run, nameIndex, start, dur] of lane.b) {\n        if (run !== state.run) continue;\n        const name = data.names[nameIndex];\n        if (q && !name.toLowerCase().includes(q)) continue;\n        bars.push({ name, start, dur, row: 0 });\n      }\n      if (!bars.length) continue;\n      bars.sort((a, b) => a.start - b.start || b.dur - a.dur);\n      const rowEnds = [];\n      for (const bar of bars) {\n        let row = rowEnds.findIndex((end) => end <= bar.start);\n        if (row < 0) row = rowEnds.length;\n        rowEnds[row] = bar.start + bar.dur;\n        bar.row = row;\n      }\n      const [label, kind] = data.roles[lane.r];\n      out.push({ pid: lane.p, label, kind, bars, rows: rowEnds.length, start: bars[0].start });\n    }\n    out.sort((a, b) => a.start - b.start || a.label.localeCompare(b.label));\n    return out;\n  }\n\n  const plotWidth = () => Math.max(240, el('lanes').clientWidth - GUTTER - 12);\n  const scale = (t) => GUTTER + ((t - state.view.start) / (state.view.end - state.view.start)) * plotWidth();\n  const unscale = (x) => state.view.start + ((x - GUTTER) / plotWidth()) * (state.view.end - state.view.start);\n\n  // -- rendering -----------------------------------------------------------\n\n  function renderAxis() {\n    const width = GUTTER + plotWidth() + 12;\n    const svg = make('svg');\n    svg.setAttribute('height', AXIS_H);\n    svg.setAttribute('viewBox', `0 0 ${width} ${AXIS_H}`);\n    const { list, step } = ticks(state.view.start, state.view.end);\n    for (const t of list) {\n      const x = scale(t);\n      const text = make('text');\n      text.setAttribute('class', 'tick-text');\n      text.setAttribute('x', x);\n      text.setAttribute('y', AXIS_H - 8);\n      text.setAttribute('text-anchor', 'middle');\n      text.textContent = fmtTick(t, step);\n      svg.append(text);\n    }\n    el('ticks').replaceChildren(svg);\n  }\n\n  function renderScrollbar() {\n    const track = el('scrollbar');\n    const thumb = el('thumb');\n    const width = track.clientWidth;\n    const span = state.view.end - state.view.start;\n    const size = Math.max(24, (span / domain) * width);\n    // The thumb travels `width - size`, not `width`, so its minimum size does\n    // not push the right end past the track.\n    const travel = width - size;\n    const room = domain - span;\n    thumb.style.width = `${size}px`;\n    thumb.style.left = `${room > 0 ? (state.view.start / room) * travel : 0}px`;\n    track.setAttribute('aria-valuemin', '0');\n    track.setAttribute('aria-valuemax', String(Math.round(domain)));\n    track.setAttribute('aria-valuenow', String(Math.round(state.view.start)));\n    track.setAttribute('aria-valuetext', `${fmtAt(state.view.start)} to ${fmtAt(state.view.end)}`);\n  }\n\n  function renderLanes() {\n    const host = el('lanes');\n    placed = [];\n    if (!lanes.length) {\n      const empty = document.createElement('p');\n      empty.className = 'empty';\n      empty.textContent = 'No measures match this run and filter.';\n      host.replaceChildren(empty);\n      return;\n    }\n\n    const width = GUTTER + plotWidth() + 12;\n    const height = lanes.reduce((sum, lane) => sum + lane.rows * ROW_H + LANE_GAP, 0) + 8;\n    const svg = make('svg');\n    svg.setAttribute('height', height);\n    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);\n\n    const clipId = 'plot-clip';\n    const defs = make('defs');\n    const clip = make('clipPath');\n    clip.setAttribute('id', clipId);\n    const clipRect = make('rect');\n    clipRect.setAttribute('x', GUTTER);\n    clipRect.setAttribute('y', 0);\n    clipRect.setAttribute('width', width - GUTTER);\n    clipRect.setAttribute('height', height);\n    clip.append(clipRect);\n    defs.append(clip);\n    svg.append(defs);\n\n    const { list } = ticks(state.view.start, state.view.end);\n    for (const t of list) {\n      const line = make('line');\n      line.setAttribute('class', 'tick-line');\n      line.setAttribute('x1', scale(t));\n      line.setAttribute('x2', scale(t));\n      line.setAttribute('y1', 0);\n      line.setAttribute('y2', height);\n      svg.append(line);\n    }\n\n    const plot = make('g');\n    plot.setAttribute('clip-path', `url(#${clipId})`);\n    const ink = {};\n    for (const kind of KINDS.keys()) ink[kind] = inkOn(fillOf(kind));\n\n    let y = 4;\n    for (const lane of lanes) {\n      const laneHeight = lane.rows * ROW_H;\n\n      const label = make('text');\n      label.setAttribute('class', 'lane-label');\n      label.setAttribute('x', GUTTER - 10);\n      label.setAttribute('y', y + 11);\n      label.setAttribute('text-anchor', 'end');\n      const full = `${lane.label} · ${lane.pid}`;\n      label.textContent = fitLabel(full);\n      const title = make('title');\n      title.textContent = full;\n      label.append(title);\n      svg.append(label);\n\n      for (const bar of lane.bars) {\n        const x = scale(bar.start);\n        const w = Math.max(1.5, scale(bar.start + bar.dur) - x);\n        const barY = y + bar.row * ROW_H + (ROW_H - BAR_H) / 2;\n        if (x > width || x + w < GUTTER) continue;\n\n        const group = make('g');\n        group.setAttribute('class', `bar ${KINDS[lane.kind]}`);\n        group.setAttribute('tabindex', '0');\n        group.setAttribute('role', 'img');\n        group.setAttribute(\n          'aria-label',\n          `${bar.name}, ${fmtDur(bar.dur)}, starting ${fmtAt(bar.start)} in ${lane.label}`,\n        );\n\n        const rect = make('rect');\n        rect.setAttribute('x', x);\n        rect.setAttribute('y', barY);\n        rect.setAttribute('width', w);\n        rect.setAttribute('height', BAR_H);\n        group.append(rect);\n\n        // A label only goes inside a bar that fits it; the rest is on hover\n        // and in the table view, so no text is ever clipped.\n        if (w > bar.name.length * 5.4 + 12) {\n          const text = make('text');\n          text.setAttribute('class', 'bar-label');\n          text.setAttribute('x', x + 5);\n          text.setAttribute('y', barY + BAR_H - 3);\n          text.setAttribute('fill', ink[lane.kind]);\n          text.textContent = bar.name;\n          group.append(text);\n        }\n\n        plot.append(group);\n        placed.push({ bar, lane, x, w, y: barY, node: group });\n      }\n\n      y += laneHeight + LANE_GAP;\n      const rule = make('line');\n      rule.setAttribute('class', 'lane-rule');\n      rule.setAttribute('x1', 0);\n      rule.setAttribute('x2', width);\n      rule.setAttribute('y1', y - LANE_GAP / 2);\n      rule.setAttribute('y2', y - LANE_GAP / 2);\n      svg.append(rule);\n    }\n\n    svg.append(plot);\n    host.replaceChildren(svg);\n  }\n\n  function renderStats() {\n    const run = data.runs[state.run];\n    const bars = lanes.flatMap((lane) => lane.bars);\n    const longest = bars.reduce((best, bar) => (best && best.dur >= bar.dur ? best : bar), null);\n    el('stat-wall').textContent = fmtDur(run.wallMs);\n    el('stat-procs').textContent = String(lanes.length);\n    el('stat-measures').textContent = String(bars.length);\n    const cell = el('stat-longest');\n    cell.replaceChildren();\n    if (longest) {\n      cell.append(document.createTextNode(fmtDur(longest.dur)));\n      const note = document.createElement('small');\n      note.textContent = ` ${longest.name}`;\n      cell.append(note);\n    } else {\n      cell.textContent = '–';\n    }\n\n    const present = [...new Set(lanes.map((lane) => lane.kind))].sort();\n    const legend = el('legend');\n    legend.replaceChildren();\n    for (const kind of present) {\n      const item = document.createElement('span');\n      const swatch = document.createElement('i');\n      swatch.style.background = `var(--${KINDS[kind]})`;\n      item.append(swatch, document.createTextNode(KIND_LABELS[kind]));\n      legend.append(item);\n    }\n  }\n\n  function renderTable() {\n    const rows = lanes.flatMap((lane) => lane.bars.map((bar) => ({ lane, bar }))).sort((a, b) => b.bar.dur - a.bar.dur);\n    const table = document.createElement('table');\n    const caption = document.createElement('caption');\n    caption.textContent = `Every measure of ${data.runs[state.run].label}, longest first.`;\n    table.append(caption);\n\n    const head = document.createElement('tr');\n    for (const [text, cls] of [\n      ['Process', ''],\n      ['Pid', 'num'],\n      ['Measure', ''],\n      ['Starts at', 'num'],\n      ['Duration', 'num'],\n    ]) {\n      const th = document.createElement('th');\n      th.textContent = text;\n      if (cls) th.className = cls;\n      head.append(th);\n    }\n    const thead = document.createElement('thead');\n    thead.append(head);\n    table.append(thead);\n\n    const body = document.createElement('tbody');\n    for (const { lane, bar } of rows) {\n      const tr = document.createElement('tr');\n      for (const [text, cls] of [\n        [lane.label, ''],\n        [String(lane.pid), 'num'],\n        [bar.name, ''],\n        [fmtAt(bar.start), 'num'],\n        [fmtDur(bar.dur), 'num'],\n      ]) {\n        const td = document.createElement('td');\n        td.textContent = text;\n        if (cls) td.className = cls;\n        tr.append(td);\n      }\n      body.append(tr);\n    }\n    table.append(body);\n    el('table').replaceChildren(table);\n  }\n\n  function render() {\n    lanes = buildLanes();\n    renderStats();\n    if (state.table) renderTable();\n    else renderPlot();\n  }\n\n  function renderPlot() {\n    renderAxis();\n    renderScrollbar();\n    renderLanes();\n  }\n\n  /** Slides the visible window without changing its width. */\n  function panBy(deltaMs) {\n    clampView(state.view.start + deltaMs, state.view.end + deltaMs);\n    renderPlot();\n  }\n\n  // -- trace handoff -------------------------------------------------------\n\n  const PERFETTO = 'https://ui.perfetto.dev';\n\n  /**\n   * Perfetto's documented handoff. The tab it opens announces itself with a\n   * PONG, and the trace goes over postMessage, so nothing leaves the browser.\n   */\n  function openInPerfetto() {\n    const tab = window.open(PERFETTO);\n    if (!tab) return 'Allow popups';\n\n    const text = document.getElementById('trace-data').textContent;\n    const buffer = new TextEncoder().encode(text).buffer;\n    const ping = setInterval(() => tab.postMessage('PING', PERFETTO), 60);\n    const stop = () => {\n      clearInterval(ping);\n      removeEventListener('message', give);\n    };\n    const give = (event) => {\n      if (event.data !== 'PONG') return;\n      stop();\n      tab.postMessage({ perfetto: { buffer, title: data.title, fileName: 'graph-perf.trace.json' } }, PERFETTO);\n    };\n    addEventListener('message', give);\n    setTimeout(stop, 30000);\n    return 'Opened';\n  }\n\n  // -- tooltip -------------------------------------------------------------\n\n  function showTip(entry, clientX, clientY) {\n    if (state.hot === entry) return positionTip(clientX, clientY);\n    if (state.hot) state.hot.node.classList.remove('hot');\n    state.hot = entry;\n    entry.node.classList.add('hot');\n    el('lanes').classList.add('hovering');\n    el('tip-value').textContent = fmtDur(entry.bar.dur);\n    el('tip-name').textContent = entry.bar.name;\n    el('tip-meta').textContent = `${entry.lane.label} · pid ${entry.lane.pid} · starts ${fmtAt(entry.bar.start)}`;\n    el('tip').hidden = false;\n    positionTip(clientX, clientY);\n  }\n\n  function positionTip(clientX, clientY) {\n    const tip = el('tip');\n    const box = tip.getBoundingClientRect();\n    const x = Math.min(clientX + 14, window.innerWidth - box.width - 8);\n    const y = clientY + box.height + 20 > window.innerHeight ? clientY - box.height - 12 : clientY + 18;\n    tip.style.left = `${Math.max(8, x)}px`;\n    tip.style.top = `${Math.max(8, y)}px`;\n  }\n\n  function hideTip() {\n    if (state.hot) state.hot.node.classList.remove('hot');\n    state.hot = null;\n    el('lanes').classList.remove('hovering');\n    el('tip').hidden = true;\n  }\n\n  /** Nearest bar to the pointer, so a sub-pixel measure is still reachable. */\n  function nearest(x, y) {\n    let best = null;\n    let bestGap = 14;\n    for (const entry of placed) {\n      if (y < entry.y - 3 || y > entry.y + BAR_H + 3) continue;\n      const gap = x < entry.x ? entry.x - x : x > entry.x + entry.w ? x - entry.x - entry.w : 0;\n      if (gap < bestGap) {\n        best = entry;\n        bestGap = gap;\n      }\n    }\n    return best;\n  }\n\n  function svgPoint(event) {\n    const svg = el('lanes').querySelector('svg');\n    if (!svg) return null;\n    const box = svg.getBoundingClientRect();\n    const width = GUTTER + plotWidth() + 12;\n    return { x: ((event.clientX - box.left) / box.width) * width, y: event.clientY - box.top };\n  }\n\n  // -- interaction ---------------------------------------------------------\n\n  function resetView() {\n    domain = Math.max(\n      data.runs[state.run].wallMs,\n      ...data.lanes.flatMap((lane) => lane.b.filter((b) => b[0] === state.run).map((b) => b[2] + b[3])),\n      1,\n    );\n    state.view = { start: 0, end: domain };\n  }\n\n  function clampView(start, end) {\n    const span = Math.min(Math.max(end - start, MIN_SPAN), domain);\n    const from = Math.min(Math.max(start, 0), domain - span);\n    state.view = { start: from, end: from + span };\n  }\n\n  /** Dragging the thumb, clicking the track and the arrow keys all pan. */\n  function wireScrollbar() {\n    const track = el('scrollbar');\n    const thumb = el('thumb');\n    track.style.marginLeft = `${GUTTER}px`;\n    const left = (event) => event.clientX - track.getBoundingClientRect().left;\n\n    /** Window start for a thumb position, undoing the minimum-width scaling. */\n    const startAt = (x) => {\n      const span = state.view.end - state.view.start;\n      const travel = track.clientWidth - Math.max(24, (span / domain) * track.clientWidth);\n      return travel > 0 ? (x / travel) * (domain - span) : 0;\n    };\n\n    const slideTo = (start) => {\n      const span = state.view.end - state.view.start;\n      clampView(start, start + span);\n      renderPlot();\n    };\n\n    let grab = null;\n    thumb.addEventListener('pointerdown', (event) => {\n      grab = event.clientX - thumb.getBoundingClientRect().left;\n      track.classList.add('dragging');\n      thumb.setPointerCapture(event.pointerId);\n      hideTip();\n    });\n    thumb.addEventListener('pointermove', (event) => {\n      if (grab !== null) slideTo(startAt(left(event) - grab));\n    });\n    const drop = () => {\n      grab = null;\n      track.classList.remove('dragging');\n    };\n    thumb.addEventListener('pointerup', drop);\n    thumb.addEventListener('pointercancel', drop);\n\n    // Anywhere else on the track centres the window on that point.\n    track.addEventListener('pointerdown', (event) => {\n      if (event.target === thumb) return;\n      const span = state.view.end - state.view.start;\n      slideTo((left(event) / track.clientWidth) * domain - span / 2);\n    });\n\n    track.addEventListener('keydown', (event) => {\n      const span = state.view.end - state.view.start;\n      if (event.key === 'ArrowLeft') panBy(-span / 10);\n      else if (event.key === 'ArrowRight') panBy(span / 10);\n      else if (event.key === 'Home') slideTo(0);\n      else if (event.key === 'End') slideTo(domain - span);\n      else return;\n      event.preventDefault();\n    });\n  }\n\n  function wire() {\n    const runSelect = /** @type {HTMLSelectElement} */ (el('run'));\n    for (const [index, run] of data.runs.entries()) {\n      const option = document.createElement('option');\n      option.value = String(index);\n      option.textContent = run.label;\n      runSelect.append(option);\n    }\n    runSelect.addEventListener('change', () => {\n      state.run = Number(runSelect.value);\n      hideTip();\n      resetView();\n      render();\n    });\n\n    const filter = /** @type {HTMLInputElement} */ (el('filter'));\n    let pending = 0;\n    filter.addEventListener('input', () => {\n      state.filter = filter.value;\n      clearTimeout(pending);\n      pending = setTimeout(() => {\n        hideTip();\n        render();\n      }, 120);\n    });\n\n    el('reset').addEventListener('click', () => {\n      hideTip();\n      resetView();\n      render();\n    });\n\n    const tableButton = el('table-view');\n    tableButton.addEventListener('click', () => {\n      state.table = !state.table;\n      tableButton.setAttribute('aria-pressed', String(state.table));\n      el('chart').hidden = state.table;\n      el('table').hidden = !state.table;\n      el('reset').hidden = state.table;\n      el('hint').hidden = state.table;\n      hideTip();\n      render();\n    });\n\n    const traceButton = /** @type {HTMLButtonElement} */ (el('trace'));\n    traceButton.addEventListener('click', () => {\n      traceButton.disabled = true;\n      traceButton.textContent = openInPerfetto();\n      setTimeout(() => {\n        traceButton.textContent = 'Open in Perfetto';\n        traceButton.disabled = false;\n      }, 2600);\n    });\n\n    const themeButton = el('theme');\n    const stored = localStorage.getItem('graph-perf-theme');\n    if (stored) document.documentElement.dataset.theme = stored;\n    const syncTheme = () => {\n      const dark =\n        document.documentElement.dataset.theme === 'dark' ||\n        (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);\n      themeButton.textContent = dark ? 'Light' : 'Dark';\n    };\n    syncTheme();\n    themeButton.addEventListener('click', () => {\n      const dark = themeButton.textContent === 'Dark';\n      document.documentElement.dataset.theme = dark ? 'dark' : 'light';\n      localStorage.setItem('graph-perf-theme', dark ? 'dark' : 'light');\n      syncTheme();\n      render();\n    });\n\n    const host = el('lanes');\n\n    host.addEventListener('pointermove', (event) => {\n      if (host.classList.contains('panning')) return;\n      const point = svgPoint(event);\n      if (!point) return;\n      const entry = nearest(point.x, point.y);\n      if (entry) showTip(entry, event.clientX, event.clientY);\n      else hideTip();\n    });\n    host.addEventListener('pointerleave', hideTip);\n\n    host.addEventListener('focusin', (event) => {\n      const entry = placed.find((candidate) => candidate.node === event.target);\n      if (!entry) return;\n      const box = entry.node.getBoundingClientRect();\n      showTip(entry, box.left + box.width / 2, box.bottom);\n    });\n    host.addEventListener('focusout', hideTip);\n\n    // Zoom is held behind ctrl or meta so the page keeps its own scrolling.\n    // A trackpad pinch arrives as a ctrl-wheel event, so it zooms too.\n    host.addEventListener(\n      'wheel',\n      (event) => {\n        // deltaMode 1 is lines, which a wheel mouse reports instead of pixels.\n        const steps = event.deltaMode === 1 ? 16 : 1;\n        const span = state.view.end - state.view.start;\n        if (!event.ctrlKey && !event.metaKey) {\n          // A sideways swipe pans. A vertical one is left to the page.\n          if (span >= domain || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;\n          event.preventDefault();\n          hideTip();\n          panBy(event.deltaX * steps * (span / plotWidth()));\n          return;\n        }\n        const point = svgPoint(event);\n        if (!point || point.x < GUTTER) return;\n        event.preventDefault();\n        const at = unscale(point.x);\n        const zoomed = span * (event.deltaY < 0 ? 0.8 : 1.25);\n        const ratio = (at - state.view.start) / span;\n        clampView(at - zoomed * ratio, at - zoomed * ratio + zoomed);\n        hideTip();\n        renderPlot();\n      },\n      { passive: false },\n    );\n\n    let anchor = null;\n    host.addEventListener('pointerdown', (event) => {\n      const point = svgPoint(event);\n      if (!point || point.x < GUTTER) return;\n      anchor = { x: point.x, start: state.view.start, end: state.view.end };\n      host.classList.add('panning');\n      host.setPointerCapture(event.pointerId);\n      hideTip();\n    });\n    host.addEventListener('pointermove', (event) => {\n      if (!anchor) return;\n      const point = svgPoint(event);\n      if (!point) return;\n      const perPixel = (anchor.end - anchor.start) / plotWidth();\n      const shift = (anchor.x - point.x) * perPixel;\n      clampView(anchor.start + shift, anchor.end + shift);\n      renderPlot();\n    });\n    const endPan = () => {\n      anchor = null;\n      host.classList.remove('panning');\n    };\n    host.addEventListener('pointerup', endPan);\n    host.addEventListener('pointercancel', endPan);\n    host.addEventListener('dblclick', () => {\n      resetView();\n      renderPlot();\n    });\n\n    wireScrollbar();\n\n    let frame = 0;\n    addEventListener('resize', () => {\n      cancelAnimationFrame(frame);\n      frame = requestAnimationFrame(render);\n    });\n  }\n\n  el('title').textContent = data.title;\n  el('subtitle').textContent = data.subtitle;\n  document.title = data.title;\n  resetView();\n  wire();\n  render();\n})();\n"
	};
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
	NX_TUI: "false"
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
		instrumentFile: null,
		daemon: true,
		concurrentProcesses: 1,
		affected: false
	};
	argv = argv.flatMap((arg) => /^--[^=]+=/.test(arg) ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg]);
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
		else if (arg === "--no-daemon") opts.daemon = false;
		else if (arg === "--concurrent-processes") opts.concurrentProcesses = Math.max(1, Number(argv[++i]) || 1);
		else if (arg === "--affected") opts.affected = true;
		else if (arg === "--help" || arg === "-h") {
			console.log("usage: node graph-perf.js [--runs CYCLES] [--source-edits N] [--edit-file FILE] [--no-edit] [--out DIR] [--no-reset] [--no-instrument] [--instrument FILE] [--no-daemon] [--concurrent-processes N] [--affected]");
			process.exit(0);
		} else {
			console.error(`unknown argument: ${arg}`);
			process.exit(2);
		}
	}
	return opts;
}
function openWorkspace(root, daemon) {
	for (const key of Object.keys(process.env)) if (key === "CI" || /^NX_TASK_/.test(key) || INJECTED_BY_NX.has(key)) delete process.env[key];
	const inheritedEnv = { ...process.env };
	Object.assign(process.env, ENV_OVERRIDES, { NX_DAEMON: "false" });
	const require$1 = (0, node_module.createRequire)(node_path.default.join(root, "package.json"));
	return {
		root,
		require: require$1,
		env: {
			...inheritedEnv,
			...ENV_OVERRIDES,
			NX_DAEMON: daemon ? "true" : "false"
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
/**
* Runs `nx <args>` in `count` processes started together. The run's wall time
* ends when the last client exits; each client's own wall time is kept too.
* Output and exit status come from the first client that failed, or the first
* client when none did.
*/
function nxConcurrent(ws, args, count) {
	const startedAt = Date.now();
	const started = process.hrtime.bigint();
	const common = {
		cwd: ws.root,
		env: ws.env
	};
	const clients = Array.from({ length: count }, () => new Promise((resolve, reject) => {
		const child = ws.nxBin ? (0, node_child_process.spawn)(process.execPath, [ws.nxBin, ...args], common) : (0, node_child_process.spawn)(process.platform === "win32" ? "npx.cmd" : "npx", ["nx", ...args], {
			...common,
			shell: process.platform === "win32"
		});
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8").on("data", (chunk) => stdout += chunk);
		child.stderr.setEncoding("utf8").on("data", (chunk) => stderr += chunk);
		child.on("error", reject);
		child.on("close", (code) => resolve({
			status: code ?? -1,
			stdout,
			stderr,
			wallMs: Number(process.hrtime.bigint() - started) / 1e6
		}));
	}));
	return Promise.all(clients).then((results) => {
		const representative = results.find((r) => r.status !== 0) ?? results[0];
		return {
			status: representative.status,
			stdout: representative.stdout,
			stderr: representative.stderr,
			startedAt,
			endedAt: Date.now(),
			wallMs: Math.max(...results.map((r) => r.wallMs)),
			clientsMs: results.map((r) => r.wallMs)
		};
	});
}
/** Project names from the graph cache the cold run just wrote; null if it is not there. */
function readCachedProjectNames(ws) {
	try {
		const graph = JSON.parse(node_fs.default.readFileSync(node_path.default.join(ws.root, ".nx", "workspace-data", "project-graph.json"), "utf8"));
		return Object.keys(graph.nodes ?? {});
	} catch {
		return null;
	}
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
		const { getPlugins: loadPlugins } = ws.require(getPlugins);
		const { globWithWorkspaceContextSync } = ws.require(workspaceContext);
		const { readNxJson } = ws.require(nxJsonModule);
		const { findMatchingConfigFiles } = ws.require(configUtils);
		const plugins = loadPlugins.length >= 1 ? await loadPlugins(readNxJson(root), root) : await loadPlugins(root);
		const result = [];
		const matchedByPlugin = /* @__PURE__ */ new Map();
		const entries = /* @__PURE__ */ new Map();
		for (const plugin of plugins) {
			entries.set(plugin.name, [...entries.get(plugin.name) ?? [], plugin.index ?? null]);
			if (!plugin.createNodes) continue;
			const pattern = plugin.createNodes[0];
			const candidates = globWithWorkspaceContextSync(root, [pattern]);
			const matched = findMatchingConfigFiles.length >= 4 ? findMatchingConfigFiles(candidates, pattern, plugin.include, plugin.exclude) : findMatchingConfigFiles(candidates, plugin.include, plugin.exclude);
			matchedByPlugin.set(plugin.name, [...matchedByPlugin.get(plugin.name) ?? [], ...matched]);
			const counts = /* @__PURE__ */ new Map();
			for (const file of matched) {
				const base = node_path.default.basename(file);
				counts.set(base, (counts.get(base) ?? 0) + 1);
			}
			result.push({
				name: plugin.name,
				index: plugin.index ?? null,
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
		return {
			summary: result,
			matched: matchedByPlugin,
			entries
		};
	} catch (e) {
		return { error: `plugin inspection failed: ${errorMessage(e)}` };
	}
}
/** Shuts down the plugin workers this process loaded for its own lookups. */
function releasePlugins(ws) {
	const getPlugins = resolveNxInternal(ws, "project-graph/plugins/get-plugins");
	if (!getPlugins) return;
	try {
		ws.require(getPlugins).cleanupPlugins?.();
	} catch {}
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
* One file per plugin that matched config files, chosen so the edits touch
* as few projects as possible: projects are taken greedily by how many still
* uncovered plugins they can serve, with ties and files picked at random.
* Then `sourceEdits` ordinary source files, from projects already in the plan
* where possible. All edits are applied together before each semi-warm run.
*/
function planEdits(ws, matched, sourceEdits) {
	const owner = readProjectOfFile(ws);
	const projectOf = (file) => owner.get(file) ?? file;
	const byProject = /* @__PURE__ */ new Map();
	for (const [plugin, files] of matched) for (const file of files) {
		if (neverEdit(file)) continue;
		const project = projectOf(file);
		const plugins = byProject.get(project) ?? /* @__PURE__ */ new Map();
		plugins.set(plugin, [...plugins.get(plugin) ?? [], file]);
		byProject.set(project, plugins);
	}
	const uncovered = new Set([...byProject.values()].flatMap((plugins) => [...plugins.keys()]));
	const plan = [];
	const usedProjects = /* @__PURE__ */ new Set();
	while (uncovered.size) {
		const gain = (project) => [...byProject.get(project).keys()].filter((p) => uncovered.has(p)).length;
		const best = Math.max(...[...byProject.keys()].map(gain));
		const project = pick([...byProject.keys()].filter((p) => gain(p) === best));
		for (const [plugin, files] of byProject.get(project)) {
			if (!uncovered.has(plugin)) continue;
			uncovered.delete(plugin);
			const existing = plan.find((e) => files.includes(e.file));
			if (existing) existing.plugins.push(plugin);
			else plan.push({
				file: pick(files),
				project,
				plugins: [plugin]
			});
		}
		usedProjects.add(project);
	}
	const configFiles = new Set([...matched.values()].flat());
	const planned = new Set(plan.map((e) => e.file));
	const sources = [...owner.keys()].filter((f) => !configFiles.has(f) && !neverEdit(f) && !planned.has(f));
	for (let i = 0; i < sourceEdits && sources.length; i++) {
		const inUsed = sources.filter((f) => usedProjects.has(projectOf(f)));
		const file = pick(inUsed.length ? inUsed : sources);
		sources.splice(sources.indexOf(file), 1);
		usedProjects.add(projectOf(file));
		plan.push({
			file,
			project: projectOf(file),
			plugins: []
		});
	}
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
/** Replaces a file for the session, keeping the original beside it. */
function swapFile(target, content) {
	const backup = `${target}.graph-perf-backup`;
	if (!node_fs.default.existsSync(backup)) node_fs.default.copyFileSync(target, backup);
	node_fs.default.writeFileSync(target, content);
	let restored = false;
	const restore = () => {
		if (restored) return;
		restored = true;
		node_fs.default.copyFileSync(backup, target);
		node_fs.default.rmSync(backup, { force: true });
	};
	process.on("exit", restore);
	return restore;
}
function installInstrument(ws, source) {
	const target = ws.perfLogging;
	if (!target) {
		console.warn("could not locate nx perf-logging module; running without instrumentation");
		return null;
	}
	const restores = [swapFile(target, source)];
	const hook = (entry) => {
		const relative = node_path.default.relative(node_path.default.dirname(entry), target).split(node_path.default.sep).join("/");
		const original = node_fs.default.readFileSync(entry, "utf8");
		const line = `require(${JSON.stringify(relative.startsWith(".") ? relative : `./${relative}`)});`;
		const patched = original.startsWith("#!") ? original.replace(/^(#![^\n]*\n)/, `$1${line}\n`) : `${line}\n${original}`;
		restores.push(swapFile(entry, patched));
	};
	const loads = (file) => file !== null && node_fs.default.readFileSync(file, "utf8").includes("perf-logging");
	const server = resolveNxInternal(ws, "daemon/server/server.js");
	const start = resolveNxInternal(ws, "daemon/server/start.js");
	if (start && !loads(server) && !loads(start)) hook(start);
	const client = resolveFromWorkspace(ws.require, "nx/bin/nx.js");
	if (client && !loads(client)) hook(client);
	return {
		target,
		restore: () => {
			for (const restore of restores) restore();
		}
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
/**
* Two nx.json entries for one plugin spawn two workers with the same name.
* Nx starts and restarts workers in nx.json order, and the socket path it
* hands each worker carries a base36 spawn counter, so within one host the
* k-th worker of a name is the k-th entry of that name.
*/
function labelPluginInstances(traces, entries) {
	const spawnCounter = (t) => {
		const match = /(\d+)-([0-9a-z]+)-[0-9a-f]{8}/.exec(t.argv[2] ?? "");
		return match ? parseInt(match[2], 36) : Number.MAX_SAFE_INTEGER;
	};
	const groups = /* @__PURE__ */ new Map();
	for (const t of traces) {
		if (roleKind(t.role) !== "plugin worker") continue;
		const name = t.role.slice(15);
		if ((entries.get(name)?.length ?? 0) < 2) continue;
		const key = `${t.ppid} ${name}`;
		groups.set(key, [...groups.get(key) ?? [], t]);
	}
	for (const [key, workers] of groups) {
		const name = key.slice(key.indexOf(" ") + 1);
		const indexes = entries.get(name);
		workers.sort((a, b) => spawnCounter(a) - spawnCounter(b));
		workers.forEach((t, k) => {
			const index = indexes[k % indexes.length];
			if (index !== null) t.role = `${t.role} (plugins[${index}])`;
		});
	}
}
function readTraces(ws, runs, entries) {
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
		const role = classify(ws.root, header);
		if (roleKind(role) === "plugin worker" && header.ppid === process.pid) continue;
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
			role,
			argv: header.argv,
			timeOrigin: header.timeOrigin,
			measures
		});
	}
	traces.sort((a, b) => a.timeOrigin - b.timeOrigin);
	labelPluginInstances(traces, entries);
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
	const summary = ul(`Platform: ${sys.platform} ${sys.release} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB, node ${sys.node}`, `Projects: ${r.projectCount}`, `Cycles: ${r.cycles}, each ${r.reset ? `${code("nx reset")}, ` : ""}cold ${code(r.affected ? "nx show projects --affected" : "nx show projects")}, warm, then semi-warm after ${r.edits.length} file edit${r.edits.length === 1 ? "" : "s"} in ${new Set(r.edits.map((e) => e.project)).size} project${new Set(r.edits.map((e) => e.project)).size === 1 ? "" : "s"}`, `Cold: ${series(r.coldMs)}`, `Warm: ${series(r.warmMs)}`, ...r.edits.length ? [`Semi-warm: ${series(r.semiWarmMs)}`] : [], ...r.reset ? [] : ["Daemon was not reset, so a cold run is only cold if no daemon was running."], ...r.daemon ? [] : ["Daemon off (`--no-daemon`): every run builds the graph in the client, so warm and semi-warm measure the daemonless cache path."], ...r.affected ? ["With `--affected` the client also runs the touched-project locators, which load every plugin in the client process after the graph request."] : [], ...r.concurrentProcesses > 1 ? [`Concurrent clients: ${r.concurrentProcesses} started together for every measured command. A run's wall time is when its last client exited; the per-client spread is below.`] : []);
	const sections = [];
	if (r.traces.length === 0) sections.push("No recorded measures. Instrumentation was off or no Nx process loaded the perf-logging module.");
	else {
		sections.push(h2("Processes", renderProcesses(r.traces, r.runs), `One row per kind of process, across every cycle. Sums count nested measures once, through the outermost one, and are per run of that phase (${countBy(r.runs, "cold")} cold, ${countBy(r.runs, "warm")} warm, ${countBy(r.runs, "semi-warm")} semi-warm). Workers of a plugin registered more than once are told apart by their nx.json position, matched through spawn order. Every measure is in graph-perf.json.`));
		if (r.edits.length) sections.push(h2("Semi-warm edits", "Applied together, a newline each, right before every semi-warm run: one file per plugin whose glob matched anything, in as few projects as possible, then plain source files.", renderSemiWarmEdits(r)));
		sections.push(h2("Key phases", "A phase that stays slow warm costs every command; one that is slow semi-warm costs every edit.", renderKeyPhases(r.workspaceRoot, r.traces)));
	}
	if (r.concurrentProcesses > 1) sections.push(h2("Concurrent clients", "Wall time of each client in the run, fastest to slowest. Clients that find another process building the graph wait for it, so a narrow spread means they shared the work and a wide one means they queued behind it.", renderConcurrentClients(r.runs)));
	sections.push(h2("Plugin config files", ...renderPluginConfigFiles(r.pluginConfigFiles)));
	if (r.traces.length) sections.push(h2("Timelines", `${code("graph-perf.html")} is an interactive timeline of every run: one lane per Nx process, one bar per measure, nested measures below the one that contains them. It is a single file with no network access, so opening it locally is enough.`, `${code("graph-perf.trace.json")} is the same measures in Chrome Trace Event Format, for ${link("https://speedscope.app", "speedscope")} or any flamegraph viewer that reads it. The viewer carries a copy, so its ${code("Open in Perfetto")} button needs no file at all. Perfetto opens with every process collapsed, so press expand-all above the track list to get named tracks and slices.`));
	sections.push(h2("nx report", ...renderReport(r.report, r.traces, r.instrumented)));
	sections.push(h2("nx.json", ...["plugins", "targetDefaults"].map((key) => h3(key, codeBlock(JSON.stringify("error" in r.nxJson ? r.nxJson.error : r.nxJson[key] ?? null, null, 2), "json")))));
	return h1("Nx graph construction", summary, ...sections) + "\n";
}
function renderConcurrentClients(runs) {
	const rows = runs.filter((run) => run.clientsMs && run.clientsMs.length > 1);
	const sorted = (run) => [...run.clientsMs ?? []].sort((a, b) => a - b);
	return table(rows, [
		{
			label: "run",
			mapFn: (run) => String(run.index + 1)
		},
		{
			label: "phase",
			field: "phase"
		},
		{
			label: "fastest",
			mapFn: (run) => ms(sorted(run)[0])
		},
		{
			label: "median",
			mapFn: (run) => ms(median(sorted(run)))
		},
		{
			label: "slowest",
			mapFn: (run) => ms(sorted(run)[sorted(run).length - 1])
		},
		{
			label: "clients",
			mapFn: (run) => sorted(run).map((v) => (v / 1e3).toFixed(2)).join(", ")
		}
	]);
}
function renderSemiWarmEdits(r) {
	return table(r.edits, [
		{
			label: "edited file",
			mapFn: (e) => code(e.file)
		},
		{
			label: "project",
			mapFn: (e) => cell(e.project)
		},
		{
			label: "matched by",
			mapFn: (e) => e.plugins.length ? cell(e.plugins.join(", ")) : "no plugin (source file)"
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
const round1 = (n) => Math.round(n * 10) / 10;
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Kind order the viewer colours by; anything else takes its neutral fourth slot. */
const KIND_ORDER = [
	"client",
	"daemon",
	"plugin worker"
];
/** Labels each run gets in the viewer and the trace: the phase and its cycle. */
function runLabels(runs) {
	const seen = {};
	return runs.map((run) => {
		seen[run.phase] = (seen[run.phase] ?? 0) + 1;
		return `Cycle ${seen[run.phase]} \u00b7 ${run.phase}`;
	});
}
/** Every measure of every run, compacted for the browser. */
function timelineData(r) {
	const names = [];
	const nameIds = /* @__PURE__ */ new Map();
	const intern = (name) => {
		const seen = nameIds.get(name);
		if (seen !== void 0) return seen;
		nameIds.set(name, names.length);
		return names.push(name) - 1;
	};
	const roles = [];
	const roleIds = /* @__PURE__ */ new Map();
	const internRole = (role) => {
		const seen = roleIds.get(role);
		if (seen !== void 0) return seen;
		const kind = KIND_ORDER.indexOf(roleKind(role));
		roleIds.set(role, roles.length);
		return roles.push([role, kind === -1 ? KIND_ORDER.length : kind]) - 1;
	};
	const startedAt = new Map(r.runs.map((run) => [run.index, run.startedAt]));
	const lanes = [];
	for (const t of r.traces) {
		const bars = [];
		for (const m of t.measures) {
			const t0 = startedAt.get(m.run);
			if (t0 === void 0) continue;
			const name = intern(shortName(r.workspaceRoot, m.name));
			bars.push([
				m.run,
				name,
				round1(t.timeOrigin + m.startTime - t0),
				round1(m.duration)
			]);
		}
		if (bars.length) lanes.push({
			p: t.pid,
			r: internRole(t.role),
			b: bars
		});
	}
	const sys = r.system;
	return {
		title: `Nx graph construction \u00b7 ${node_path.default.basename(r.workspaceRoot)}`,
		subtitle: `${r.projectCount} projects \u00b7 ${sys.platform} ${sys.arch}, ${sys.cpus} cpus, ${sys.memoryGb} GB \u00b7 node ${sys.node} \u00b7 collected ${r.collectedAt}`,
		names,
		roles,
		runs: runLabels(r.runs).map((label, i) => ({
			label,
			wallMs: round1(r.runs[i].wallMs)
		})),
		lanes
	};
}
/**
* The viewer with its stylesheet, script, chart data and trace inlined into one
* file. The trace rides along because a page opened over `file:` cannot read
* its own siblings, and handing it to Perfetto needs the bytes in hand.
*/
function renderHtml(r) {
	const { html, css, js } = viewerAssets();
	const data = timelineData(r);
	const embed = (value) => value.replace(/</g, "\\u003c");
	return html.replace("__TITLE__", () => escapeHtml(data.title)).replace("/*__CSS__*/", () => css).replace("/*__DATA__*/", () => embed(JSON.stringify(data))).replace("/*__TRACE__*/", () => embed(renderTrace(r).trim())).replace("/*__JS__*/", () => js);
}
/**
* Thread ids for one process's measures. The trace format only stacks events
* that nest strictly, so a measure joins a track when it fits inside that
* track's innermost open event and starts a new one when it merely overlaps.
*/
function assignTracks(measures) {
	const ordered = [...measures].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
	const tracks = [];
	return ordered.map((measure) => {
		const end = measure.startTime + measure.duration;
		for (const [index, stack] of tracks.entries()) {
			while (stack.length && stack[stack.length - 1] <= measure.startTime) stack.pop();
			if (stack.length === 0 || end <= stack[stack.length - 1]) {
				stack.push(end);
				return {
					measure,
					track: index
				};
			}
		}
		tracks.push([end]);
		return {
			measure,
			track: tracks.length - 1
		};
	});
}
/**
* Chrome Trace Event Format, which Perfetto, speedscope and the flamegraph
* TUIs all read. One process per Nx process, one thread per stack of nested
* measures, microseconds from the first thing that happened, so every cycle
* sits on one timeline.
*/
function renderTrace(r) {
	const origin = Math.min(...r.traces.map((t) => t.timeOrigin), ...r.runs.map((run) => run.startedAt));
	const us = (epochMs) => Math.round((epochMs - origin) * 1e3);
	const offsetUs = (timeOrigin) => (timeOrigin - origin) * 1e3;
	const events = [{
		name: "process_name",
		ph: "M",
		pid: 0,
		tid: 0,
		args: { name: "runs" }
	}, {
		name: "process_sort_index",
		ph: "M",
		pid: 0,
		tid: 0,
		args: { sort_index: -1 }
	}];
	const labels = runLabels(r.runs);
	for (const [i, run] of r.runs.entries()) events.push({
		name: labels[i],
		ph: "X",
		cat: "run",
		pid: 0,
		tid: 0,
		ts: us(run.startedAt),
		dur: us(run.endedAt) - us(run.startedAt),
		args: {
			phase: run.phase,
			run: run.index,
			wallMs: round1(run.wallMs)
		}
	});
	let nextTid = 1;
	for (const [order, t] of r.traces.entries()) {
		events.push({
			name: "process_name",
			ph: "M",
			pid: t.pid,
			tid: 0,
			args: { name: `${t.role} (${t.pid})` }
		}, {
			name: "process_sort_index",
			ph: "M",
			pid: t.pid,
			tid: 0,
			args: { sort_index: order }
		});
		const kind = roleKind(t.role);
		const offset = offsetUs(t.timeOrigin);
		const tids = /* @__PURE__ */ new Map();
		const tidFor = (track) => {
			const seen = tids.get(track);
			if (seen !== void 0) return seen;
			tids.set(track, nextTid);
			return nextTid++;
		};
		for (const { measure, track } of assignTracks(t.measures)) {
			const tid = tidFor(track);
			const ts = Math.round(offset + measure.startTime * 1e3);
			const end = Math.round(offset + (measure.startTime + measure.duration) * 1e3);
			events.push({
				name: shortName(r.workspaceRoot, measure.name),
				ph: "X",
				cat: kind,
				pid: t.pid,
				tid,
				ts,
				dur: end - ts,
				args: {
					phase: measure.phase,
					run: measure.run,
					...measure.detail ? { detail: measure.detail } : {}
				}
			});
		}
		for (const [track, tid] of tids) {
			const name = track === 0 ? t.role : `${t.role} #${track + 1}`;
			events.push({
				name: "thread_name",
				ph: "M",
				pid: t.pid,
				tid,
				args: { name }
			});
			events.push({
				name: "thread_sort_index",
				ph: "M",
				pid: t.pid,
				tid,
				args: { sort_index: track }
			});
		}
	}
	return JSON.stringify({
		displayTimeUnit: "ms",
		otherData: {
			workspace: r.workspaceRoot,
			collectedAt: r.collectedAt,
			projects: String(r.projectCount)
		},
		traceEvents: events
	}) + "\n";
}
function renderPluginConfigFiles(plugins) {
	if ("error" in plugins) return [plugins.error];
	return ["Files matched by each loaded plugin's createNodes glob, by basename. A config file can produce more than one project, so this bounds a plugin's share rather than counting its projects.", ...plugins.map((p) => {
		const scope = [`Pattern: ${code(p.pattern)}`];
		if (p.include?.length) scope.push(`Include: ${p.include.map(code).join(", ")}`);
		if (p.exclude?.length) scope.push(`Exclude: ${p.exclude.map(code).join(", ")}`);
		return h3(p.index === null ? p.name : `${p.name}, nx.json plugins[${p.index}]`, scope.join(" "), p.files.length ? table(p.files, [{
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
	const ws = openWorkspace(workspaceRoot, opts.daemon);
	const startedAt = (/* @__PURE__ */ new Date()).toISOString();
	const outDir = node_path.default.resolve(ws.root, opts.out);
	node_fs.default.mkdirSync(outDir, { recursive: true });
	for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(signal === "SIGINT" ? 130 : 143));
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
	const showArgs = [
		"show",
		"projects",
		...opts.affected ? ["--affected"] : [],
		"--json"
	];
	const show = async (label) => {
		const result = await nxConcurrent(ws, showArgs, opts.concurrentProcesses);
		assertOk(`nx show projects (${label})`, result);
		return result;
	};
	const record = (phase, result, extra = {}) => runs.push({
		index: runs.length,
		phase,
		startedAt: result.startedAt,
		endedAt: result.endedAt,
		wallMs: result.wallMs,
		...result.clientsMs && result.clientsMs.length > 1 ? { clientsMs: result.clientsMs } : {},
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
			const cold = await show("cold");
			record("cold", cold);
			if (cycle === 1) try {
				projects = JSON.parse(cold.stdout);
				if (opts.affected) projects = readCachedProjectNames(ws) ?? projects;
			} catch {
				console.error("could not parse `nx show projects --json` output");
				console.error(cold.stdout.slice(0, 500));
				process.exit(1);
			}
			console.log(`${tag}: warm`);
			record("warm", await show("warm"));
			if (cycle === 1) {
				withdrawSession(ws);
				console.log(`${tag}: plugin config files`);
				inspection = await readPluginConfigFiles(ws);
				if (instrument) announceSession(ws);
				if (opts.edit) {
					const plan = opts.editFile ? [{
						file: opts.editFile,
						project: readProjectOfFile(ws).get(opts.editFile) ?? opts.editFile,
						plugins: []
					}] : planEdits(ws, "error" in inspection ? /* @__PURE__ */ new Map() : inspection.matched, opts.sourceEdits);
					if (!plan.length) console.warn("nothing to edit; skipping semi-warm runs");
					for (const item of plan) {
						const edit = installEdit(ws, item);
						if (edit) edits.push(edit);
					}
				}
			}
			if (edits.length) {
				console.log(`${tag}: semi-warm, editing ${edits.length} file${edits.length === 1 ? "" : "s"}`);
				const editedAt = Date.now();
				for (const edit of edits) edit.touch();
				await sleep(500);
				record("semi-warm", {
					...await show("semi-warm"),
					startedAt: editedAt
				}, { edits: edits.map(({ file, project, plugins }) => ({
					file,
					project,
					plugins
				})) });
			}
			withdrawSession(ws);
		}
		if (instrument) {
			traces.push(...readTraces(ws, runs, "error" in inspection ? /* @__PURE__ */ new Map() : inspection.entries));
			node_fs.default.rmSync(ws.sessionDir, {
				recursive: true,
				force: true
			});
		}
		console.log("nx report data");
		const report = await readReportData(ws);
		releasePlugins(ws);
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
			edits: edits.map(({ file, project, plugins }) => ({
				file,
				project,
				plugins
			})),
			reset: opts.reset,
			daemon: opts.daemon,
			concurrentProcesses: opts.concurrentProcesses,
			affected: opts.affected,
			runs,
			instrumented: instrument !== null,
			traces,
			report,
			pluginConfigFiles: "error" in inspection ? inspection : inspection.summary,
			nxJson: readNxJson(ws.root)
		};
		node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.md"), renderMarkdown(result));
		node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.json"), JSON.stringify(result, null, 2) + "\n");
		if (traces.length) {
			node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.html"), renderHtml(result));
			node_fs.default.writeFileSync(node_path.default.join(outDir, "graph-perf.trace.json"), renderTrace(result));
		}
		const med = (values) => values.length ? `${Math.round(median(values))}ms` : "n/a";
		const written = ["graph-perf.json", ...traces.length ? ["graph-perf.html", "graph-perf.trace.json"] : []];
		console.log(`wrote ${node_path.default.join(outDir, "graph-perf.md")}, ${written.join(", ")}`);
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