import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseEnvFile } from './lib/env.mjs';
import { fileExists, ROOT_DIR } from './lib/project.mjs';

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

const requiredEnvKeys = [
  'NODE_ENV',
  'API_HOST',
  'API_PORT',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL'
];

const errors = [];

const exampleEnvPath = resolve(ROOT_DIR, '.env.example');
const exampleEnv = parseEnvFile(exampleEnvPath);
for (const key of requiredEnvKeys) {
  if (!exampleEnv[key]) {
    errors.push(`.env.example 缺少关键变量：${key}`);
  }
}

const composeContent = stripBom(readFileSync(resolve(ROOT_DIR, 'docker-compose.yml'), 'utf8'));
if (!composeContent.includes('postgres:16-alpine')) {
  errors.push('docker-compose.yml 未声明 PostgreSQL 基础镜像');
}

if (!composeContent.includes('infra/postgres/init')) {
  errors.push('docker-compose.yml 未挂载数据库初始化目录');
}

const packageJson = JSON.parse(stripBom(readFileSync(resolve(ROOT_DIR, 'package.json'), 'utf8')));
for (const scriptName of ['dev', 'build', 'lint', 'format', 'typecheck', 'test', 'db:init', 'db:seed']) {
  if (!packageJson.scripts?.[scriptName]) {
    errors.push(`package.json 缺少脚本：${scriptName}`);
  }
}

const deliveryBuildFilters = [
  '@campusfit/api',
  '@campusfit/admin',
  '@campusfit/web',
  '@campusfit/ai-service'
];
const excludedBuildFilters = ['@campusfit/miniapp', '@campusfit/mobile'];
const buildScript = packageJson.scripts?.build ?? '';

for (const buildFilter of deliveryBuildFilters) {
  if (!buildScript.includes(`--filter=${buildFilter}`)) {
    errors.push(`package.json build 脚本缺少交付范围过滤器：${buildFilter}`);
  }
}

for (const excludedFilter of excludedBuildFilters) {
  if (buildScript.includes(excludedFilter)) {
    errors.push(`package.json build 脚本不应包含当前未纳入门禁的应用：${excludedFilter}`);
  }
}

const ciWorkflowContent = stripBom(
  readFileSync(resolve(ROOT_DIR, '.github/workflows/ci.yml'), 'utf8')
);
if (!/run:\s+corepack pnpm build/u.test(ciWorkflowContent)) {
  errors.push('.github/workflows/ci.yml 缺少根构建门禁：corepack pnpm build');
}

const serverSource = stripBom(readFileSync(resolve(ROOT_DIR, 'apps/api/src/server.mjs'), 'utf8'));
for (const requiredSnippet of ['createServer', '/api/v1/health', '/api/v1/bootstrap']) {
  if (!serverSource.includes(requiredSnippet)) {
    errors.push(`apps/api/src/server.mjs 缺少关键片段：${requiredSnippet}`);
  }
}

for (const filePath of [
  'apps/api/src/config.mjs',
  'apps/api/src/server.mjs',
  'apps/api/test/server.test.mjs',
  'scripts/dev.mjs',
  'scripts/db-init.mjs',
  'scripts/db-seed.mjs',
  'scripts/test.mjs',
  'infra/postgres/init/001_extensions.sql',
  'infra/postgres/init/010_schema.sql',
  'infra/postgres/seed/seed.sql',
  '.github/workflows/ci.yml'
]) {
  if (!fileExists(filePath)) {
    errors.push(`缺少关键文件：${filePath}`);
  }
}

if (errors.length > 0) {
  console.error('Typecheck 失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Typecheck 通过。');