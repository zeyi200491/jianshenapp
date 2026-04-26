import { resolve } from 'node:path';

import { loadProjectEnv } from './lib/env.mjs';
import { ROOT_DIR } from './lib/project.mjs';
import { runCommand } from './lib/process.mjs';

const { env } = loadProjectEnv({ allowMissing: true });
const commandEnv = {
  ...process.env,
  ...env,
};

console.log('[CampusFit DB] 正在启动本机 PostgreSQL...');
runCommand(process.execPath, ['scripts/local-postgres.mjs', 'ensure-db'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});

console.log('[CampusFit DB] 正在同步本机数据库 Schema...');
runCommand(process.execPath, ['scripts/local-schema.mjs'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});

console.log('[CampusFit DB] 正在生成 Prisma Client...');
if (process.platform === 'win32') {
  runCommand('cmd.exe', ['/d', '/s', '/c', 'npm.cmd run prisma:generate'], {
    cwd: resolve(ROOT_DIR, 'apps/api'),
    env: commandEnv,
  });
} else {
  runCommand('npm', ['run', 'prisma:generate'], {
    cwd: resolve(ROOT_DIR, 'apps/api'),
    env: commandEnv,
  });
}

console.log('[CampusFit DB] 正在写入本机基础种子数据...');
runCommand(process.execPath, ['scripts/local-seed.mjs'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});

console.log('[CampusFit DB] 本机数据库初始化完成。');
