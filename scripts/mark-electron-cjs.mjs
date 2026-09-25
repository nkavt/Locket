import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// Start from a clean output dir: tsc never deletes files, and a stale
// dist-electron/db.js would shadow dist-electron/db/index.js on require('./db').
if (process.argv.includes('--clean')) rmSync('dist-electron', { recursive: true, force: true });

mkdirSync('dist-electron', { recursive: true });
writeFileSync('dist-electron/package.json', JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
