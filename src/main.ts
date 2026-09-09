import { run } from './graph-perf';

run(process.argv.slice(2), process.cwd()).then(
  // nx loaded in-process may hold a daemon socket open; do not wait on it.
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    process.exit(1);
  },
);
