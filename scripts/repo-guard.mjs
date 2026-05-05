import net from 'node:net';
import { existsSync, lstatSync, readdirSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { ROOT_DIR } from './lib/project.mjs';

const PROTECTED_BRANCHES = new Set(['main', 'master']);
const WATCH_PORTS = [8001, 3050, 3200];
const KNOWN_ARTIFACT_PATHS = [
  'apps/ai-service/logs',
  'apps/web/playwright-report',
  'apps/web/test-results',
  'playwright-report',
  'test-results',
  'coverage',
  'output',
  'logs'
];
const FORBIDDEN_STAGE_PATTERNS = [
  /(^|\/)\.last-run\.json$/,
  /(^|\/)(playwright-report|test-results|coverage|output|logs)(\/|$)/,
  /(^|\/)\.local(\/|$)/,
  /(^|\/)\.logs(\/|$)/,
  /(^|\/)\.tmp(\/|$)/,
  /^apps\/ai-service\/logs(\/|$)/,
  /^apps\/web\/(playwright-report|test-results)(\/|$)/
];

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });

  return {
    ...result,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

function runGit(args, options = {}) {
  const result = runCommand('git', args, options);
  if (options.allowFailure || result.status === 0) {
    return result;
  }

  const details = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n');
  throw new Error(details || `git ${args.join(' ')} 执行失败`);
}

function getCurrentBranch() {
  return runGit(['branch', '--show-current']).stdout.trim();
}

function listStatusLines() {
  const output = runGit(['status', '--short']).stdout.trim();
  if (!output) {
    return [];
  }

  return output.split(/\r?\n/).filter(Boolean);
}

function listStagedPaths() {
  const output = runGit(['diff', '--cached', '--name-only', '-z']).stdout;
  return output
    .split('\0')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function listWorktrees() {
  const output = runGit(['worktree', 'list', '--porcelain']).stdout;
  return output
    .split(/\r?\n/)
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length).trim());
}

function isProtectedBranch(branchName) {
  return PROTECTED_BRANCHES.has(branchName);
}

function hasMergeInProgress() {
  return runGit(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { allowFailure: true }).status === 0;
}

function findArtifactResidue() {
  return KNOWN_ARTIFACT_PATHS.filter((relativePath) => existsSync(resolve(ROOT_DIR, relativePath)));
}

function isForbiddenStagedPath(relativePath) {
  return FORBIDDEN_STAGE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function removePathSafely(relativePath) {
  const absolutePath = resolve(ROOT_DIR, relativePath);
  const relativeToRoot = relative(ROOT_DIR, absolutePath);
  if (relativeToRoot.startsWith('..') || relativeToRoot === '') {
    throw new Error(`拒绝删除仓库外路径：${absolutePath}`);
  }

  if (!existsSync(absolutePath)) {
    return false;
  }

  rmSync(absolutePath, { recursive: true, force: true });
  return true;
}

function formatList(title, items) {
  if (items.length === 0) {
    return `${title}: 无`;
  }

  return `${title}:\n${items.map((item) => `- ${item}`).join('\n')}`;
}

function printFailure(message, details = []) {
  console.error(`repo-guard: ${message}`);
  for (const detail of details) {
    console.error(`- ${detail}`);
  }
}

async function isPortReachable(port) {
  return new Promise((resolvePromise) => {
    const socket = new net.Socket();

    const finish = (reachable) => {
      socket.destroy();
      resolvePromise(reachable);
    };

    socket.setTimeout(300);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, '127.0.0.1');
  });
}

async function listReachablePorts() {
  const statuses = await Promise.all(
    WATCH_PORTS.map(async (port) => ({
      port,
      reachable: await isPortReachable(port)
    }))
  );

  return statuses.filter((entry) => entry.reachable).map((entry) => entry.port);
}

function handlePreCommit() {
  const branch = getCurrentBranch();
  const stagedPaths = listStagedPaths();
  const forbiddenPaths = stagedPaths.filter(isForbiddenStagedPath);

  if (isProtectedBranch(branch) && !hasMergeInProgress()) {
    printFailure('禁止直接在受保护分支提交。', [
      `当前分支：${branch}`,
      '请先创建功能分支或使用 worktree，再提交改动。'
    ]);
    return 1;
  }

  if (forbiddenPaths.length > 0) {
    printFailure('发现不应提交的测试产物或本地运行产物。', forbiddenPaths);
    return 1;
  }

  console.log(`repo-guard: pre-commit 检查通过（分支：${branch || 'DETACHED'}）`);
  return 0;
}

function handlePrePush() {
  const branch = getCurrentBranch();
  const statusLines = listStatusLines();
  const artifactResidue = findArtifactResidue();

  if (statusLines.length > 0) {
    printFailure('推送前工作区必须干净。', statusLines);
    return 1;
  }

  if (artifactResidue.length > 0) {
    printFailure('推送前请先清理本地产物。', artifactResidue);
    return 1;
  }

  console.log(`repo-guard: pre-push 检查通过（分支：${branch || 'DETACHED'}）`);
  return 0;
}

async function handleCheck() {
  const branch = getCurrentBranch();
  const statusLines = listStatusLines();
  const worktrees = listWorktrees();
  const artifactResidue = findArtifactResidue();
  const reachablePorts = await listReachablePorts();

  console.log(`当前分支: ${branch || 'DETACHED'}`);
  console.log(`受保护分支: ${isProtectedBranch(branch) ? '是' : '否'}`);
  console.log(`工作区状态: ${statusLines.length === 0 ? '干净' : '有改动'}`);
  if (statusLines.length > 0) {
    console.log(formatList('改动列表', statusLines));
  }

  console.log(`worktree 数量: ${worktrees.length}`);
  console.log(formatList('worktree 列表', worktrees));
  console.log(formatList('产物残留', artifactResidue));
  console.log(formatList('运行中的本地服务端口', reachablePorts.map((port) => String(port))));

  const hasBlockingIssues = statusLines.length > 0 || artifactResidue.length > 0;
  if (hasBlockingIssues) {
    console.error('repo-guard: 自检未通过。请先清理工作区或本地产物。');
    return 1;
  }

  console.log('repo-guard: 自检通过。');
  return 0;
}

function handleClean() {
  const removed = [];
  for (const relativePath of KNOWN_ARTIFACT_PATHS) {
    if (removePathSafely(relativePath)) {
      removed.push(relativePath);
    }
  }

  if (removed.length === 0) {
    console.log('repo-guard: 没有发现需要清理的常见产物。');
    return 0;
  }

  console.log(formatList('已清理路径', removed));
  return 0;
}

function handleInstallHooks() {
  const hooksDir = join(ROOT_DIR, '.githooks');
  if (!existsSync(hooksDir) || !lstatSync(hooksDir).isDirectory()) {
    throw new Error('缺少 .githooks 目录，无法安装 Git 防护。');
  }

  runGit(['config', 'core.hooksPath', '.githooks']);
  console.log('repo-guard: 已安装仓库级 Git hooks。');
  console.log('repo-guard: 当前仓库后续会使用 .githooks 下的 pre-commit / pre-push。');
  return 0;
}

function handleHelp() {
  console.log('用法: node scripts/repo-guard.mjs <install-hooks|check|clean|pre-commit|pre-push>');
  return 0;
}

const command = process.argv[2] ?? 'help';

let exitCode = 0;

switch (command) {
  case 'install-hooks':
    exitCode = handleInstallHooks();
    break;
  case 'check':
    exitCode = await handleCheck();
    break;
  case 'clean':
    exitCode = handleClean();
    break;
  case 'pre-commit':
    exitCode = handlePreCommit();
    break;
  case 'pre-push':
    exitCode = handlePrePush();
    break;
  case 'help':
  default:
    exitCode = handleHelp();
    break;
}

process.exit(exitCode);
