import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('dist-electron', { recursive: true });
writeFileSync(
  'dist-electron/package.json',
  JSON.stringify({ type: 'commonjs' }, null, 2) + '\n',
);
