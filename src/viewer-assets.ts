import fs from 'node:fs';
import path from 'node:path';

// Browser assets for the timeline viewer. When bundling, the rolldown config
// replaces this module with the three files inlined.
export function viewerAssets(): { html: string; css: string; js: string } {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, 'viewer', file), 'utf8');
  return { html: read('viewer.html'), css: read('viewer.css'), js: read('viewer.js') };
}
