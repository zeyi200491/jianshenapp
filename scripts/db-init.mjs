import { resolve } from 'node:path';

import { loadProjectEnv } from './lib/env.mjs';
import {
  releaseWorkspaceApiProcesses,
  resolveGeneratedPrismaClientPath,
  runPrismaGenerateCommand,
} from './lib/prisma-generate.mjs';
import { ROOT_DIR } from './lib/project.mjs';
import { runCommand } from './lib/process.mjs';

const { env } = loadProjectEnv({ allowMissing: true });
const commandEnv = {
  ...process.env,
  ...env,
};

const apiWorkdir = resolve(ROOT_DIR, 'apps/api');
const schemaPath = resolve(apiWorkdir, 'prisma/schema.prisma');
const generatedClientPath = resolveGeneratedPrismaClientPath(apiWorkdir);

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
const prismaGenerateResult = runPrismaGenerateCommand({
  cwd: apiWorkdir,
  env: commandEnv,
  platform: process.platform,
  schemaPath,
  generatedClientPath,
  releaseLocks: () => releaseWorkspaceApiProcesses(),
});

if (prismaGenerateResult.status === 'skipped') {
  console.log('[CampusFit DB] Prisma Client 已是最新，跳过重复生成。');
} else {
  if (prismaGenerateResult.releasedPids.length > 0) {
    console.log(`[CampusFit DB] 已释放 Prisma 锁进程：${prismaGenerateResult.releasedPids.join(', ')}。`);
  }
  console.log(`[CampusFit DB] Prisma Client 已生成（第 ${prismaGenerateResult.attempts} 次尝试成功）。`);
}

console.log('[CampusFit DB] 正在写入本机基础种子数据...');
runCommand(process.execPath, ['scripts/local-seed.mjs'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});

console.log('[CampusFit DB] 本机数据库初始化完成。');
