"use strict";
// Drop-in replacement for nx/dist/src/utils/perf-logging.js, installed by
// graph-perf.js for the duration of a measurement and restored afterwards.
//
// It keeps the original behaviour (perf lines when NX_PERF_LOGGING=true,
// analytics for tracked measures) and additionally appends every measure as one
// JSON line to <session dir>/<pid>.jsonl, where the session directory is read
// from a marker file beside this module. Without that marker the module
// behaves exactly like the original, so leaving it installed by accident costs
// nothing.
Object.defineProperty(exports, "__esModule", { value: true });
const perf_hooks_1 = require("perf_hooks");
const fs = require("fs");
const path = require("path");

function isTrackedDetail(detail) {
  return typeof detail === "object" && detail !== null && detail.track === true;
}

let recorder = { session: null, file: null };
// Written by graph-perf.js next to this module; holds the session directory.
const marker = path.join(__dirname, 'perf-logging.js.graph-perf-session');

// Re-reads the marker on every batch: a long-lived daemon outlives the session
// that started it, and its measures must land with whichever session is active
// now, or nowhere when none is.
function getRecorder() {
    try {
        const session = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : '';
        if (!session) {
            recorder = { session: null, file: null };
            return recorder;
        }
        if (recorder.session === session) return recorder;
        const dir = session;
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${process.pid}.jsonl`);
        // Header line, so the file says which process it belongs to.
        fs.appendFileSync(file, JSON.stringify({
            kind: 'process',
            pid: process.pid,
            ppid: process.ppid,
            argv: process.argv,
            execArgv: process.execArgv,
            cwd: process.cwd(),
            node: process.version,
            timeOrigin: perf_hooks_1.performance.timeOrigin,
        }) + '\n');
        recorder = { session, file };
    } catch {
        recorder = { session: null, file: null };
    }
    return recorder;
}

function safeDetail(detail) {
  if (detail === undefined || detail === null) return null;
  try {
    return JSON.parse(JSON.stringify(detail));
  } catch {
    return String(detail);
  }
}

new perf_hooks_1.PerformanceObserver((list) => {
  // observer is configured for 'measure' entries only (see .observe call below)
  const entries = list.getEntries();
  const rec = getRecorder();
  if (rec.file) {
    let lines = "";
    for (const entry of entries) {
      lines +=
        JSON.stringify({
          kind: "measure",
          pid: process.pid,
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          detail: safeDetail(entry.detail),
        }) + "\n";
    }
    try {
      fs.appendFileSync(rec.file, lines);
    } catch {
      // Recording is best effort; never break the process being measured.
    }
  }
  const logEnabled = process.env.NX_PERF_LOGGING === "true";
  const tracked = entries.filter((e) => isTrackedDetail(e.detail));
  // Short-circuit before loading analytics / daemon logger (~60ms of native
  // binding + module init) when there's nothing to do.
  if (!logEnabled && tracked.length === 0) return;
  if (logEnabled) {
    const { isOnDaemon } = require("../daemon/is-on-daemon");
    const { serverLogger } = require("../daemon/logger");
    const { logger } = require("./logger");
    const log = isOnDaemon() ? (msg) => serverLogger.log(msg) : (msg) => logger.warn(msg);
    for (const entry of entries) {
      log(`Time taken for '${entry.name}' ${entry.duration}ms`);
    }
  }
  if (tracked.length === 0) return;
  const { customDimensions, reportEvent } = require("../analytics");
  if (!customDimensions) return;
  const dimensionValues = new Set(Object.values(customDimensions));
  for (const entry of tracked) {
    const { track, ...rest } = entry.detail;
    const params = {
      [customDimensions.duration]: entry.duration,
    };
    for (const [key, value] of Object.entries(rest)) {
      if (dimensionValues.has(key)) params[key] = value;
    }
    reportEvent(entry.name, params);
  }
}).observe({ entryTypes: ["measure"] });
