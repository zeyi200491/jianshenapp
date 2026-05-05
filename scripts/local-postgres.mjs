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

function readLogTail(maxLines = 30) {
  if (!existsSync(LOG_FILE)) {
    return 'postgres.log 暂未生成。';
  }

  const lines = readText(LOG_FILE).split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

export function parsePostmasterPid(content) {
  if (!content) {
    return null;
  }

  const firstLine = content.split(/\r?\n/u).map((line) => line.trim()).find(Boolean);
  if (!firstLine || !/^\d+$/u.test(firstLine)) {
    return null;
  }

  return Number(firstLine);
}

function readPostmasterPid() {
  if (!existsSync(PID_FILE)) {
    return null;
  }

  return parsePostmasterPid(readText(PID_FILE));
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isPgCtlStatusRunning() {
  const result = spawnSync(postgresBinaryModule.pg_ctl, ['status', '-D', DATA_DIR], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PGPASSWORD: postgresPassword,
    },
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 15_000,
  });

  return result.status === 0;
}

export function shouldRecoverStaleServerState({
  databaseReachable,
  pgCtlThinksRunning,
  pidFileExists,
  pidAlive,
}) {
  if (databaseReachable) {
    return false;
  }

  if (!pidFileExists) {
    return false;
  }

  return pidAlive || !pgCtlThinksRunning;
}

export function isRecoverableStartupFailure(message) {
  if (!message) {
    return false;
  }

  return message.includes('another server might be running') || message.includes('Permission denied');
}

export function isStartupTimeoutError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message.includes('ETIMEDOUT')) {
    return true;
  }

  return error.cause instanceof Error && 'code' in error.cause && error.cause.code === 'ETIMEDOUT';
}

function sleepMs(durationMs) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
}

function listOwnedPostgresProcessIds() {
  if (process.platform !== 'win32') {
    return [];
  }

  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"name = 'postgres.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
    ],
    {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 15_000,
    },
  );

  if (result.error || result.status !== 0 || !result.stdout?.trim()) {
    return [];
  }

  const rawEntries = JSON.parse(result.stdout);
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  const workspaceToken = ROOT_DIR.replaceAll('\\', '/').toLowerCase();

  return entries
    .filter((entry) => {
      const commandLine = String(entry.CommandLine ?? '').replaceAll('\\', '/').toLowerCase();
      return commandLine.includes(workspaceToken) && commandLine.includes('/@embedded-postgres/windows-x64/native/bin/postgres.exe');
    })
    .map((entry) => Number(entry.ProcessId))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function killProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return;
  }

  if (!isProcessAlive(pid)) {
    return;
  }

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill.exe', ['/PID', String(pid), '/F', '/T'], {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 15_000,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0 && isProcessAlive(pid)) {
      throw new Error(result.stderr?.trim() || `taskkill 失败，PID=${pid}`);
    }

    return;
  }

  process.kill(pid, 'SIGKILL');
}

function repairStaleServerState(reason) {
  const pidFromFile = readPostmasterPid();
  console.warn(`[CampusFit DB] 检测到异常实例状态，准备清理后重试：${reason}`);

  if (pidFromFile && isProcessAlive(pidFromFile)) {
    killProcessTree(pidFromFile);
  }

  for (const processId of listOwnedPostgresProcessIds()) {
    if (processId !== pidFromFile) {
      killProcessTree(processId);
    }
  }

  if (existsSync(PID_FILE)) {
    rmSync(PID_FILE, { force: true });
  }

  sleepMs(1200);
}

async function runPgCtlStartWithTimeoutTolerance(diagnosticsLabel) {
  try {
    runBinary(postgresBinaryModule.pg_ctl, [
      'start',
      '-D',
      DATA_DIR,
      '-l',
      LOG_FILE,
      '-w',
      '-o',
      `-h ${postgresHost} -p ${postgresPort}`,
    ], {
      diagnosticsLabel,
    });
  } catch (error) {
    if (isStartupTimeoutError(error)) {
      if (await isDatabaseReachable()) {
        console.warn('[CampusFit DB] pg_ctl start 超时，但数据库已经可连接，按启动成功继续。');
        return;
      }
    }

    throw error;
  }
}

function buildStartupDiagnostics(stage) {
  return [
    '[CampusFit DB] Startup diagnostics',
    `- stage: ${stage}`,
    `- host: ${postgresHost}`,
    `- port: ${postgresPort}`,
    `- dataDir: ${DATA_DIR}`,
    `- dataDirExists: ${existsSync(DATA_DIR)}`,
    `- pgVersionExists: ${existsSync(PG_VERSION_FILE)}`,
    `- pidFileExists: ${existsSync(PID_FILE)}`,
    `- logFile: ${LOG_FILE}`,
    '- 最近 postgres.log:',
    readLogTail(),
  ].join('\n');
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
    timeout: options.timeoutMs ?? 90_000,
  });

  if (result.error) {
    const message = [
      result.error.message,
      buildStartupDiagnostics(options.diagnosticsLabel ?? binaryPath),
    ].join('\n\n');
    throw new Error(message, { cause: result.error });
  }

  if (result.status !== 0) {
    const stdout = result.stdout?.trim() ?? '';
    const stderr = result.stderr?.trim() ?? '';
    const detail = [stdout, stderr, buildStartupDiagnostics(options.diagnosticsLabel ?? binaryPath)]
      .filter(Boolean)
      .join('\n\n');
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
    connectionTimeoutMillis: 3_000,
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
    console.log('[CampusFit DB] 检测到现有本地 PostgreSQL 数据目录。');
    return;
  }

  console.log('[CampusFit DB] 首次初始化本地 PostgreSQL 数据目录...');

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
    ], {
      diagnosticsLabel: 'initdb',
    });
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

  const databaseReachable = await isDatabaseReachable();
  const pidFileExists = existsSync(PID_FILE);
  const pidFromFile = readPostmasterPid();
  const pidAlive = isProcessAlive(pidFromFile);
  const pgCtlThinksRunning = isPgCtlStatusRunning();

  if (databaseReachable) {
    console.log(`[CampusFit DB] PostgreSQL 已在 ${postgresHost}:${postgresPort} 运行。`);
    return;
  }

  if (shouldRecoverStaleServerState({
    databaseReachable,
    pgCtlThinksRunning,
    pidFileExists,
    pidAlive,
  })) {
    repairStaleServerState(
      `reachable=${databaseReachable}; pg_ctl=${pgCtlThinksRunning}; pidFile=${pidFileExists}; pidAlive=${pidAlive}`,
    );
  }

  ensureDirectory(dirname(LOG_FILE));
  console.log(`[CampusFit DB] 尝试拉起本地 PostgreSQL：${postgresHost}:${postgresPort}`);

  try {
    await runPgCtlStartWithTimeoutTolerance('pg_ctl start');
  } catch (error) {
    if (error instanceof Error && isRecoverableStartupFailure(error.message)) {
      repairStaleServerState(error.message);
      await runPgCtlStartWithTimeoutTolerance('pg_ctl start retry');
    } else {
      throw error;
    }
  }

  console.log(`[CampusFit DB] PostgreSQL 已启动：${postgresHost}:${postgresPort}`);
}

function stopServer() {
  if (!existsSync(PID_FILE)) {
    console.log('[CampusFit DB] PostgreSQL 当前未运行。');
    return;
  }

  runBinary(postgresBinaryModule.pg_ctl, ['stop', '-D', DATA_DIR, '-m', 'fast'], {
    diagnosticsLabel: 'pg_ctl stop',
  });
  console.log('[CampusFit DB] PostgreSQL 已停止。');
}

function printStatus() {
  try {
    const output = runBinary(postgresBinaryModule.pg_ctl, ['status', '-D', DATA_DIR], {
      diagnosticsLabel: 'pg_ctl status',
    });
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

export async function main(command = process.argv[2] ?? 'status') {
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
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
