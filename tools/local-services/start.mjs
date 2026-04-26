import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(currentDir, '../../scripts/local-postgres.mjs');
const result = spawnSync(process.execPath, [scriptPath, 'start'], { stdio: 'inherit' });
process.exit(result.status ?? 0);
