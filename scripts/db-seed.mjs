import { loadProjectEnv } from './lib/env.mjs';
import { ROOT_DIR } from './lib/project.mjs';
import { runCommand } from './lib/process.mjs';

const { env } = loadProjectEnv({ allowMissing: true });
const commandEnv = {
  ...process.env,
  ...env,
};

console.log('[CampusFit DB] 正在确保本机 PostgreSQL 可用...');
runCommand(process.execPath, ['scripts/local-postgres.mjs', 'ensure-db'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});

console.log('[CampusFit DB] 正在写入基础种子数据...');
runCommand(process.execPath, ['scripts/local-seed.mjs'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});

console.log('[CampusFit DB] 本机种子数据写入完成。');
