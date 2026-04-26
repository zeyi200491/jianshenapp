import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

import { loadProjectEnv } from './lib/env.mjs';
import { ROOT_DIR } from './lib/project.mjs';

const envState = loadProjectEnv({ allowMissing: true });
const envFilePath = resolve(ROOT_DIR, '.env');

if (!existsSync(envFilePath)) {
  console.warn('[CampusFit Dev] 未找到 .env，当前将使用默认环境变量启动。');
  console.warn('[CampusFit Dev] 建议先执行：Copy-Item .env.example .env');
}

const mergedEnv = {
  ...envState.env,
  ...process.env
};

const child = spawn(process.execPath, ['apps/api/src/server.mjs'], {
  cwd: ROOT_DIR,
  env: mergedEnv,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
