import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  isGeneratedPrismaClientStale,
  isWindowsPrismaEngineRenameError,
  releaseWorkspaceApiProcesses,
  runPrismaGenerateCommand,
} from '../scripts/lib/prisma-generate.mjs';

test('识别 Windows Prisma 引擎 DLL 被占用的重命名错误', () => {
  assert.equal(
    isWindowsPrismaEngineRenameError(
      "EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp24556' -> 'query_engine-windows.dll.node'",
    ),
    true,
  );
  assert.equal(isWindowsPrismaEngineRenameError('Error: schema validation failed'), false);
});

test('Prisma Client 产物新于 schema 时跳过 generate', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'campusfit-db-init-'));

  try {
    const prismaDir = join(fixtureDir, 'prisma');
    const clientDir = join(fixtureDir, 'node_modules', '.prisma', 'client');
    mkdirSync(prismaDir, { recursive: true });
    mkdirSync(clientDir, { recursive: true });

    const generatedClientPath = join(clientDir, 'index.js');
    const schemaPath = join(prismaDir, 'schema.prisma');

    writeFileSync(generatedClientPath, '// generated client\n', 'utf8');
    writeFileSync(schemaPath, '// schema\n', 'utf8');
    utimesSync(schemaPath, new Date('2026-05-04T00:00:00.000Z'), new Date('2026-05-04T00:00:00.000Z'));
    utimesSync(generatedClientPath, new Date('2026-05-04T00:00:02.000Z'), new Date('2026-05-04T00:00:02.000Z'));

    assert.equal(isGeneratedPrismaClientStale({ schemaPath, generatedClientPath }), false);

    let spawnCalls = 0;
    const result = runPrismaGenerateCommand({
      cwd: fixtureDir,
      env: process.env,
      platform: 'win32',
      schemaPath,
      generatedClientPath,
      spawn: () => {
        spawnCalls += 1;
        return { status: 0, stdout: '', stderr: '' };
      },
      sleep: () => {},
    });

    assert.equal(result.status, 'skipped');
    assert.equal(spawnCalls, 0);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('Windows 下 Prisma 引擎 DLL 被占用时会重试 generate', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'campusfit-db-init-'));

  try {
    const prismaDir = join(fixtureDir, 'prisma');
    const clientDir = join(fixtureDir, 'node_modules', '.prisma', 'client');
    mkdirSync(prismaDir, { recursive: true });
    mkdirSync(clientDir, { recursive: true });

    const schemaPath = join(prismaDir, 'schema.prisma');
    const generatedClientPath = join(clientDir, 'index.js');
    writeFileSync(schemaPath, '// schema\n', 'utf8');
    utimesSync(schemaPath, new Date('2026-05-04T00:00:02.000Z'), new Date('2026-05-04T00:00:02.000Z'));

    let attempts = 0;
    const result = runPrismaGenerateCommand({
      cwd: fixtureDir,
      env: process.env,
      platform: 'win32',
      schemaPath,
      generatedClientPath,
      maxRetries: 3,
      releaseLocks: () => [21760],
      spawn: () => {
        attempts += 1;
        if (attempts === 1) {
          return {
            status: 1,
            stdout: '',
            stderr:
              "EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp24556' -> 'query_engine-windows.dll.node'",
          };
        }

        return { status: 0, stdout: 'generated', stderr: '' };
      },
      sleep: () => {
        writeFileSync(generatedClientPath, '// generated on retry\n', 'utf8');
      },
    });

    assert.equal(result.status, 'generated');
    assert.equal(result.attempts, 2);
    assert.deepEqual(result.releasedPids, [21760]);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('只释放当前工作区的 API 锁进程', () => {
  const spawnCalls = [];
  const releasedPids = releaseWorkspaceApiProcesses({
    platform: 'win32',
    currentPid: 9999,
    spawn: (command, args) => {
      spawnCalls.push({ command, args });

      if (command === 'powershell.exe') {
        return {
          status: 0,
          stdout: JSON.stringify([
            { ProcessId: 21760, CommandLine: '"E:\\\\app\\\\node.exe" apps/api/dist/apps/api/src/main.js' },
            { ProcessId: 21761, CommandLine: '"E:\\\\app\\\\node.exe" scripts/db-init.mjs' },
            { ProcessId: 21762, CommandLine: '"E:\\\\app\\\\node.exe" C:/other-project/apps/api/dist/apps/api/src/main.js' },
            { ProcessId: 21763, CommandLine: '"E:\\\\app\\\\node.exe" @playwright/mcp@latest' },
          ]),
          stderr: '',
        };
      }

      return {
        status: 0,
        stdout: '',
        stderr: '',
      };
    },
  });

  assert.deepEqual(releasedPids, [21760, 21762]);
  assert.deepEqual(
    spawnCalls
      .filter((call) => call.command === 'taskkill.exe')
      .map((call) => call.args),
    [
      ['/PID', '21760', '/F', '/T'],
      ['/PID', '21762', '/F', '/T'],
    ],
  );
});
