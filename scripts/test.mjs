import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createServer } from '../apps/api/src/server.mjs';

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

function listen(server) {
  return new Promise((resolveAddress) => {
    server.listen(0, '127.0.0.1', () => {
      resolveAddress(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error);
        return;
      }
      resolveClose();
    });
  });
}

async function testHealthEndpoint() {
  const server = createServer({
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 0,
    databaseUrl: 'postgresql://demo',
    postgresHost: '127.0.0.1',
    postgresPort: 5432,
    postgresDatabase: 'campusfit_ai'
  });
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.code, 'OK');
    assert.equal(payload.data.service, 'campusfit-api');
    console.log('测试通过：健康检查接口');
  } finally {
    await close(server);
  }
}

async function testBootstrapEndpoint() {
  const server = createServer({
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 0,
    databaseUrl: 'postgresql://demo',
    postgresHost: '127.0.0.1',
    postgresPort: 5432,
    postgresDatabase: 'campusfit_ai'
  });
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/bootstrap`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.code, 'OK');
    assert.equal(payload.data.databaseConfigured, true);
    assert.equal(payload.data.databaseName, 'campusfit_ai');
    console.log('测试通过：启动状态接口');
  } finally {
    await close(server);
  }
}

function testInfrastructureFiles() {
  const rootDirectory = process.cwd();
  const envExample = stripBom(readFileSync(resolve(rootDirectory, '.env.example'), 'utf8'));
  const ciWorkflow = stripBom(readFileSync(resolve(rootDirectory, '.github/workflows/ci.yml'), 'utf8'));
  const adminApiClient = stripBom(readFileSync(resolve(rootDirectory, 'apps/admin/lib/api-client.ts'), 'utf8'));
  const adminLoginForm = stripBom(
    readFileSync(resolve(rootDirectory, 'apps/admin/components/admin/login-form.tsx'), 'utf8')
  );
  const adminMiddleware = stripBom(readFileSync(resolve(rootDirectory, 'apps/admin/middleware.ts'), 'utf8'));
  const adminNextConfig = stripBom(readFileSync(resolve(rootDirectory, 'apps/admin/next.config.ts'), 'utf8'));

  for (const key of [
    'NODE_ENV',
    'API_HOST',
    'API_PORT',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'DATABASE_URL'
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, 'm'));
  }

  for (const filePath of [
    'infra/postgres/init/001_extensions.sql',
    'infra/postgres/init/010_schema.sql',
    'infra/postgres/seed/seed.sql',
    'infra/nginx/campusfit.conf',
    'infra/compose/docker-compose.prod.yml',
    'scripts/backup-postgres.ps1',
    'scripts/restore-postgres.ps1',
    'docs/production-runbook.md',
    'docs/compliance-data-policy.md'
  ]) {
    assert.equal(existsSync(resolve(rootDirectory, filePath)), true);
  }

  assert.match(ciWorkflow, /apps\\api test -- --runInBand|apps\/api test -- --runInBand/);
  assert.match(ciWorkflow, /python -m pytest apps\/ai-service\/tests/);
  assert.match(adminApiClient, /X-CampusFit-CSRF/);
  assert.match(adminLoginForm, /sanitizeInternalPath\(searchParams\.get\("next"\), "\/dashboard"\)/);
  assert.doesNotMatch(adminLoginForm, /router\.push\(next\)/);
  assert.match(adminMiddleware, /X-CampusFit-CSRF/);
  assert.match(adminMiddleware, /matcher:\s*\["\/api\/v1\/admin\/:path\*"\]/);
  assert.match(adminNextConfig, /Content-Security-Policy/);
  assert.match(adminNextConfig, /X-Frame-Options/);
  assert.match(adminNextConfig, /Referrer-Policy/);

  console.log('测试通过：环境变量模板与数据库文件');
}

async function main() {
  await testHealthEndpoint();
  await testBootstrapEndpoint();
  testInfrastructureFiles();
  console.log('全部测试通过。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
