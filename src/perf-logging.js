"use strict";
// Drop-in replacement for nx's perf-logging.js, installed by graph-perf.js for
// the duration of a measurement and restored afterwards.
//
// The original module is kept beside this one as perf-logging.js.graph-perf-backup
// and loaded first, so whatever this nx version does with measures (perf log
// lines, analytics) keeps happening. This module only adds a second observer
// that appends every measure as one JSON line to <session dir>/<pid>.jsonl,
// where the session directory is read from a marker file beside this module.
// Without that marker the observer does nothing.
Object.defineProperty(exports, "__esModule", { value: true });
const perf_hooks_1 = require("perf_hooks");
const fs = require("fs");
const path = require("path");

try {
    require("./perf-logging.js.graph-perf-backup");
} catch {
    // No original to delegate to; recording still works.
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
    const rec = getRecorder();
    if (!rec.file) return;
    let lines = '';
    for (const entry of list.getEntries()) {
        lines += JSON.stringify({
            kind: 'measure',
            pid: process.pid,
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            detail: safeDetail(entry.detail),
        }) + '\n';
    }
    try {
        fs.appendFileSync(rec.file, lines);
    } catch {
        // Recording is best effort; never break the process being measured.
    }
}).observe({ entryTypes: ['measure'] });
