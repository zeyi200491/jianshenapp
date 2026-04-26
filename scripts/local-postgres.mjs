import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { loadProjectEnv } from './lib/env.mjs';
import { ROOT_DIR } from './lib/project.mjs';

const requireFromLocalServices = createRequire(resolve(ROOT_DIR, 'tools/local-services/package.json'));
const { Client } = requireFromLocalServices('pg');

const postgresBinaryModule = await import(
  pathToFileURL(resolve(ROOT_DIR, 'tools/local-services/node_modules/@embedded-postgres/windows-x64/dist/index.js')).href,
);

const DATA_ROOT = resolve(ROOT_DIR, '.local/postgres');
const DATA_DIR = resolve(DATA_ROOT, 'data');
const LOG_FILE = resolve(DATA_ROOT, 'postgres.log');
const PASSWORD_FILE = resolve(DATA_ROOT, '.pgpass.tmp');
const PID_FILE = resolve(DATA_DIR, 'postmaster.pid');
const PG_VERSION_FILE = resolve(DATA_DIR, 'PG_VERSION');
const POSTGRESQL_CONF = resolve(DATA_DIR, 'postgresql.conf');
const PG_HBA_CONF = resolve(DATA_DIR, 'pg_hba.conf');

const { env } = loadProjectEnv({ allowMissing: true });
const postgresHost = process.env.POSTGRES_HOST ?? env.POSTGRES_HOST ?? '127.0.0.1';
const postgresPort = Number(process.env.POSTGRES_PORT ?? env.POSTGRES_PORT ?? '5432');
const postgresUser = process.env.POSTGRES_USER ?? env.POSTGRES_USER ?? 'campusfit';
const postgresPassword = process.env.POSTGRES_PASSWORD ?? env.POSTGRES_PASSWORD ?? 'campusfit_dev';
const postgresDatabase = process.env.POSTGRES_DB ?? env.POSTGRES_DB ?? 'campusfit_ai';

function ensureDirectory(targetPath) {
  mkdirSync(targetPath, { recursive: true });
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function appendIfMissing(filePath, marker, content) {
  const current = existsSync(filePath) ? readText(filePath) : '';
  if (current.includes(marker)) {
    return;
  }

  writeFileSync(filePath, `${current.trimEnd()}\n\n${content}\n`, 'utf8');
}

function runBinary(binaryPath, args, options = {}) {
  const result = spawnSync(binaryPath, args, {
    cwd: options.cwd ?? ROOT_DIR,
    env: {
      ...process.env,
      PGPASSWORD: postgresPassword,
      ...(options.env ?? {}),
    },
    stdio: options.stdio ?? 'pipe',
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stdout = result.stdout?.trim() ?? '';
    const stderr = result.stderr?.trim() ?? '';
    const detail = [stdout, stderr].filter(Boolean).join('\n');
    throw new Error(detail || `${binaryPath} 执行失败，退出码 ${result.status ?? 'unknown'}`);
  }

  return result.stdout?.trim() ?? '';
}

function getAdminClient(database = 'postgres') {
  return new Client({
    host: postgresHost,
    port: postgresPort,
    user: postgresUser,
    password: postgresPassword,
    database,
  });
}

async function isDatabaseReachable() {
  const client = getAdminClient('postgres');
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function ensureInitialised() {
  ensureDirectory(DATA_ROOT);

  if (existsSync(PG_VERSION_FILE)) {
    return;
  }

  writeFileSync(PASSWORD_FILE, `${postgresPassword}\n`, 'utf8');

  try {
    runBinary(postgresBinaryModule.initdb, [
      '-D',
      DATA_DIR,
      '--username',
      postgresUser,
      '--pwfile',
      PASSWORD_FILE,
      '--auth',
      'scram-sha-256',
      '--encoding',
      'UTF8',
    ]);
  } finally {
    if (existsSync(PASSWORD_FILE)) {
      rmSync(PASSWORD_FILE, { force: true });
    }
  }

  appendIfMissing(
    POSTGRESQL_CONF,
    '# campusfit local overrides',
    [
      '# campusfit local overrides',
      `listen_addresses = '${postgresHost}'`,
      `port = ${postgresPort}`,
      `unix_socket_directories = ''`,
    ].join('\n'),
  );

  appendIfMissing(
    PG_HBA_CONF,
    '# campusfit local access',
    [
      '# campusfit local access',
      `host all all ${postgresHost}/32 scram-sha-256`,
    ].join('\n'),
  );
}

async function startServer() {
  await ensureInitialised();

  if (await isDatabaseReachable()) {
    console.log(`[CampusFit DB] PostgreSQL 已在 ${postgresHost}:${postgresPort} 运行。`);
    return;
  }

  ensureDirectory(dirname(LOG_FILE));

  runBinary(postgresBinaryModule.pg_ctl, [
    'start',
    '-D',
    DATA_DIR,
    '-l',
    LOG_FILE,
    '-w',
    '-o',
    `-h ${postgresHost} -p ${postgresPort}`,
  ]);

  console.log(`[CampusFit DB] PostgreSQL 已启动：${postgresHost}:${postgresPort}`);
}

function stopServer() {
  if (!existsSync(PID_FILE)) {
    console.log('[CampusFit DB] PostgreSQL 当前未运行。');
    return;
  }

  runBinary(postgresBinaryModule.pg_ctl, ['stop', '-D', DATA_DIR, '-m', 'fast']);
  console.log('[CampusFit DB] PostgreSQL 已停止。');
}

function printStatus() {
  try {
    const output = runBinary(postgresBinaryModule.pg_ctl, ['status', '-D', DATA_DIR]);
    console.log(output || '[CampusFit DB] PostgreSQL 正在运行。');
  } catch (error) {
    console.log(
      `[CampusFit DB] PostgreSQL 未运行：${error instanceof Error ? error.message : 'unknown error'}`,
    );
    process.exitCode = 1;
  }
}

async function ensureDatabase() {
  await startServer();

  const client = getAdminClient('postgres');
  await client.connect();

  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [postgresDatabase]);
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${postgresDatabase}"`);
      console.log(`[CampusFit DB] 已创建数据库 ${postgresDatabase}。`);
    } else {
      console.log(`[CampusFit DB] 数据库 ${postgresDatabase} 已存在。`);
    }
  } finally {
    await client.end();
  }
}

function resetDataDir() {
  if (existsSync(PID_FILE)) {
    stopServer();
  }

  rmSync(DATA_ROOT, { recursive: true, force: true });
  console.log('[CampusFit DB] 本地 PostgreSQL 数据目录已清理。');
}

const command = process.argv[2] ?? 'status';

switch (command) {
  case 'start':
    await startServer();
    break;
  case 'stop':
    stopServer();
    break;
  case 'status':
    printStatus();
    break;
  case 'ensure-db':
    await ensureDatabase();
    break;
  case 'reset':
    resetDataDir();
    break;
  default:
    console.error(`不支持的命令：${command}`);
    console.error('可用命令：start | stop | status | ensure-db | reset');
    process.exit(1);
}
