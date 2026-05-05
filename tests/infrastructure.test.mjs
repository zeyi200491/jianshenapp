import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

const rootDirectory = process.cwd();

test('.env.example includes required environment keys', () => {
  const envExample = stripBom(readFileSync(resolve(rootDirectory, '.env.example'), 'utf8'));

  for (const key of [
    'NODE_ENV',
    'API_HOST',
    'API_PORT',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'DATABASE_URL',
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, 'm'));
  }
});

test('database bootstrap files exist', () => {
  assert.equal(existsSync(resolve(rootDirectory, 'infra/postgres/init/001_extensions.sql')), true);
  assert.equal(existsSync(resolve(rootDirectory, 'infra/postgres/init/010_schema.sql')), true);
  assert.equal(existsSync(resolve(rootDirectory, 'infra/postgres/seed/seed.sql')), true);
});

test('local schema patch includes training cycle columns', () => {
  const localSchemaScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-schema.mjs'), 'utf8'));

  assert.match(localSchemaScript, /training_cycle_start_focus/i);
  assert.match(localSchemaScript, /training_cycle_reset_at/i);
});

test('local schema patch makes quick check-in signal columns nullable', () => {
  const localSchemaScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-schema.mjs'), 'utf8'));

  assert.match(localSchemaScript, /ALTER TABLE check_ins ALTER COLUMN energy_level DROP NOT NULL;/i);
  assert.match(localSchemaScript, /ALTER TABLE check_ins ALTER COLUMN satiety_level DROP NOT NULL;/i);
  assert.match(localSchemaScript, /ALTER TABLE check_ins ALTER COLUMN fatigue_level DROP NOT NULL;/i);
});

test('local schema patch creates weekly review action items table', () => {
  const localSchemaScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-schema.mjs'), 'utf8'));

  assert.match(localSchemaScript, /CREATE TABLE IF NOT EXISTS weekly_review_action_items/i);
  assert.match(localSchemaScript, /weekly_review_id UUID/i);
  assert.match(localSchemaScript, /REFERENCES weekly_reviews\(id\) ON DELETE SET NULL/i);
  assert.match(localSchemaScript, /CREATE INDEX IF NOT EXISTS weekly_review_action_items_user_week_idx/i);
});

test('api build and start generate prisma client first', () => {
  const apiPackage = JSON.parse(stripBom(readFileSync(resolve(rootDirectory, 'apps/api/package.json'), 'utf8')));

  assert.match(apiPackage.scripts.prebuild, /^npm run prisma:generate\b/);
  assert.equal(apiPackage.scripts.prestart, 'npm run prisma:generate && npm --prefix ../../packages/rule-engine run build');
});

test('prisma schema file does not start with bom', () => {
  const schemaContent = readFileSync(resolve(rootDirectory, 'apps/api/prisma/schema.prisma'), 'utf8');

  assert.equal(schemaContent.startsWith('\uFEFF'), false);
});

test('food library database wiring exists', () => {
  const schemaContent = stripBom(readFileSync(resolve(rootDirectory, 'apps/api/prisma/schema.prisma'), 'utf8'));
  const localSeedScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-seed.mjs'), 'utf8'));
  const dbInitScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/db-init.mjs'), 'utf8'));
  const localSchemaScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-schema.mjs'), 'utf8'));

  assert.match(schemaContent, /model\s+FoodLibraryItem\b/);
  assert.match(schemaContent, /@@map\("food_library_items"\)/);
  assert.match(localSeedScript, /prisma\.foodLibraryItem\.upsert/);
  assert.match(dbInitScript, /runPrismaGenerateCommand/);
  assert.match(dbInitScript, /scripts\/local-seed\.mjs/);
  assert.ok(
    dbInitScript.indexOf('runPrismaGenerateCommand') < dbInitScript.indexOf('scripts/local-seed.mjs'),
    'db-init.mjs 必须先准备 Prisma Client，再执行 local-seed.mjs',
  );
  assert.match(localSchemaScript, /CREATE TABLE IF NOT EXISTS food_library_items/i);
});

test('food library seed covers common foods at usable scale', () => {
  const localSeedScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-seed.mjs'), 'utf8'));
  const codeMatches = localSeedScript.match(/\bcode:\s*['"]/g) ?? [];

  assert.ok(codeMatches.length >= 80, `食物库种子数量过少，当前只有 ${codeMatches.length} 条`);
  assert.match(localSeedScript, /鸡胸肉/);
  assert.match(localSeedScript, /番茄炒蛋|西红柿炒蛋/);
  assert.match(localSeedScript, /牛肉盖饭/);
  assert.match(localSeedScript, /燕麦/);
});

test('db-init uses Windows-safe prisma generate invocation', () => {
  const prismaGenerateScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/lib/prisma-generate.mjs'), 'utf8'));

  assert.match(prismaGenerateScript, /platform === 'win32'/);
  assert.match(prismaGenerateScript, /'cmd\.exe'/);
  assert.match(prismaGenerateScript, /npm\.cmd run prisma:generate/);
  assert.match(prismaGenerateScript, /maxRetries = 3/);
  assert.match(prismaGenerateScript, /isWindowsPrismaEngineRenameError/);
});

test('local postgres bootstrap has connection timeout and startup diagnostics', () => {
  const localPostgresScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-postgres.mjs'), 'utf8'));

  assert.match(
    localPostgresScript,
    /connectionTimeoutMillis:\s*\d+/,
    'local-postgres.mjs 必须限制 pg 客户端连接超时，避免启动阶段无限等待',
  );
  assert.match(
    localPostgresScript,
    /timeout:\s*options\.timeoutMs\s*\?\?\s*\d+/,
    'local-postgres.mjs 必须为 initdb/pg_ctl 等本地二进制调用设置超时',
  );
  assert.match(
    localPostgresScript,
    /Startup diagnostics/,
    'local-postgres.mjs 卡住时必须输出启动诊断信息，明确是端口、初始化还是 pg_ctl 阶段出问题',
  );
  assert.match(
    localPostgresScript,
    /postgres\.log/,
    'local-postgres.mjs 失败时必须提示查看 postgres.log',
  );
  assert.match(
    localPostgresScript,
    /ETIMEDOUT/,
    'local-postgres.mjs 必须识别 pg_ctl 在 Windows 下已启动成功但自身未退出的超时场景',
  );
  assert.match(
    localPostgresScript,
    /if\s*\(await isDatabaseReachable\(\)\)/,
    'local-postgres.mjs 遇到 pg_ctl 超时后必须回查数据库是否其实已经可连接',
  );
});
