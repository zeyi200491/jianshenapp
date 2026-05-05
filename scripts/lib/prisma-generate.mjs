import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

function sleepWithAtomics(delayMs) {
  if (delayMs <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
}

function normalizeForMatch(value) {
  return String(value ?? '').replace(/\//g, '\\').toLowerCase();
}

function runJsonPowershell(command, spawn = spawnSync) {
  const result = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
    {
      stdio: 'pipe',
      encoding: 'utf8',
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr ?? result.stdout ?? '').trim() || 'PowerShell command failed');
  }

  const output = (result.stdout ?? '').trim();
  if (!output) {
    return [];
  }

  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function isWorkspaceApiProcess(commandLine) {
  const normalized = normalizeForMatch(commandLine);

  if (!normalized) {
    return false;
  }

  if (
    normalized.includes('db-init.mjs') ||
    normalized.includes('local-postgres.mjs') ||
    normalized.includes('prisma generate') ||
    normalized.includes('prisma:generate')
  ) {
    return false;
  }

  return (
    normalized.includes('apps\\api\\dist\\apps\\api\\src\\main.js') ||
    normalized.includes('apps\\api\\dist\\main.js') ||
    (normalized.includes('ts-node') && normalized.includes('src\\main.ts')) ||
    normalized.includes('nest start')
  );
}

export function isWindowsPrismaEngineRenameError(message) {
  return /EPERM:\s*operation not permitted,\s*rename[\s\S]*query_engine-windows\.dll\.node/i.test(message ?? '');
}

export function isGeneratedPrismaClientStale({ schemaPath, generatedClientPath }) {
  if (!existsSync(schemaPath) || !existsSync(generatedClientPath)) {
    return true;
  }

  return statSync(generatedClientPath).mtimeMs < statSync(schemaPath).mtimeMs;
}

export function resolveGeneratedPrismaClientPath(apiWorkdir) {
  const requireFromApi = createRequire(resolve(apiWorkdir, 'package.json'));
  const prismaPackageJsonPath = requireFromApi.resolve('@prisma/client/package.json');
  return resolve(dirname(prismaPackageJsonPath), '..', '.prisma', 'client', 'index.js');
}

export function releaseWorkspaceApiProcesses({
  platform = process.platform,
  currentPid = process.pid,
  spawn = spawnSync,
} = {}) {
  if (platform !== 'win32') {
    return [];
  }

  const processRows = runJsonPowershell(
    `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine } | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress`,
    spawn,
  );

  const candidates = processRows
    .filter((row) => Number(row.ProcessId) !== Number(currentPid))
    .filter((row) => isWorkspaceApiProcess(row.CommandLine));

  const releasedPids = [];

  for (const row of candidates) {
    const pid = Number(row.ProcessId);
    const killResult = spawn('taskkill.exe', ['/PID', String(pid), '/F', '/T'], {
      stdio: 'pipe',
      encoding: 'utf8',
    });

    if (killResult.error) {
      throw killResult.error;
    }

    if (killResult.status === 0) {
      releasedPids.push(pid);
    }
  }

  return releasedPids;
}

function buildFailureMessage(detail, attempts) {
  const trimmed = detail.trim();
  const prefix = `Prisma Client 生成失败（已尝试 ${attempts} 次）。`;

  if (isWindowsPrismaEngineRenameError(trimmed)) {
    return [
      prefix,
      'Windows 正在占用 Prisma 查询引擎 DLL，通常是已有 API/Node 进程或安全软件暂时锁住了文件。',
      '脚本会优先释放当前工作区的 API 进程后重试；如果仍失败，再检查安全软件或手动残留进程。',
      trimmed,
    ].join('\n');
  }

  return trimmed ? `${prefix}\n${trimmed}` : prefix;
}

export function runPrismaGenerateCommand({
  cwd,
  env,
  platform = process.platform,
  schemaPath,
  generatedClientPath,
  maxRetries = 3,
  retryDelayMs = 1200,
  spawn = spawnSync,
  sleep = sleepWithAtomics,
  releaseLocks = () => [],
}) {
  if (!isGeneratedPrismaClientStale({ schemaPath, generatedClientPath })) {
    return { status: 'skipped', attempts: 0, releasedPids: [] };
  }

  const command = platform === 'win32' ? 'cmd.exe' : 'npm';
  const args =
    platform === 'win32'
      ? ['/d', '/s', '/c', 'npm.cmd run prisma:generate']
      : ['run', 'prisma:generate'];

  let attempts = 0;
  let lastDetail = '';
  const releasedPids = [];

  while (attempts < maxRetries) {
    attempts += 1;

    const result = spawn(command, args, {
      cwd,
      env,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status === 0) {
      return { status: 'generated', attempts, releasedPids };
    }

    lastDetail = [result.stdout ?? '', result.stderr ?? '']
      .filter(Boolean)
      .join('\n');

    const shouldRetry =
      platform === 'win32' &&
      attempts < maxRetries &&
      isWindowsPrismaEngineRenameError(lastDetail);

    if (!shouldRetry) {
      break;
    }

    const currentReleasedPids = releaseLocks();
    if (Array.isArray(currentReleasedPids) && currentReleasedPids.length > 0) {
      releasedPids.push(...currentReleasedPids);
    }

    sleep(retryDelayMs);
  }

  throw new Error(buildFailureMessage(lastDetail, attempts));
}
