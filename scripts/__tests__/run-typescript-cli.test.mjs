import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveTypeScriptCli, resolveWorkspaceCli } from '../run-typescript-cli.cjs';

function makeDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content = '') {
  makeDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, 'utf8');
}

test('优先回退到祖先目录中的 TypeScript CLI', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-cli-resolve-'));
  const appDir = path.join(tempRoot, 'apps', 'api');
  const brokenLocalDir = path.join(appDir, 'node_modules', 'typescript');
  const rootCli = path.join(tempRoot, 'node_modules', 'typescript', 'bin', 'tsc');

  makeDir(brokenLocalDir);
  writeFile(rootCli, 'console.log("ok");');

  assert.equal(resolveTypeScriptCli(appDir), rootCli);
});

test('祖先目录缺失时回退到当前包的 .ignored TypeScript CLI', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-cli-resolve-'));
  const appDir = path.join(tempRoot, 'apps', 'api');
  const ignoredCli = path.join(appDir, 'node_modules', '.ignored', 'typescript', 'bin', 'tsc');

  makeDir(path.join(appDir, 'node_modules', 'typescript'));
  writeFile(ignoredCli, 'console.log("ok");');

  assert.equal(resolveTypeScriptCli(appDir), ignoredCli);
});

test('没有可用 TypeScript CLI 时抛出清晰错误', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-cli-resolve-'));
  const appDir = path.join(tempRoot, 'apps', 'api');

  assert.throws(
    () => resolveTypeScriptCli(appDir),
    /无法定位 CLI 模块：typescript\\bin\\tsc/
  );
});

test('通用解析器支持回退到祖先目录中的 Next CLI', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-cli-resolve-'));
  const appDir = path.join(tempRoot, 'apps', 'web');
  const rootCli = path.join(tempRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

  makeDir(path.join(appDir, 'node_modules', 'next'));
  writeFile(rootCli, 'console.log("ok");');

  assert.equal(resolveWorkspaceCli(appDir, 'next/dist/bin/next'), rootCli);
});
