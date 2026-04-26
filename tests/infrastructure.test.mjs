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
  assert.match(dbInitScript, /prisma:generate/);
  assert.match(dbInitScript, /scripts\/local-seed\.mjs/);
  assert.ok(
    dbInitScript.indexOf('prisma:generate') < dbInitScript.indexOf('scripts/local-seed.mjs'),
    'db-init.mjs 必须先生成 Prisma Client，再执行 local-seed.mjs',
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
  const dbInitScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/db-init.mjs'), 'utf8'));

  assert.match(dbInitScript, /process\.platform === 'win32'/);
  assert.match(dbInitScript, /runCommand\('cmd\.exe', \['\/d', '\/s', '\/c', 'npm\.cmd run prisma:generate'\]/);
  assert.match(dbInitScript, /runCommand\('npm', \['run', 'prisma:generate'\]/);
});
