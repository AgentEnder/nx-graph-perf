import fs from 'node:fs';
import path from 'node:path';

// Source of the instrumented perf-logging module. When bundling, the rolldown
// config replaces this module with the file's contents inlined.
export function instrumentSource(): string {
  return fs.readFileSync(path.join(__dirname, 'perf-logging.js'), 'utf8');
}
