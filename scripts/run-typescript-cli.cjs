const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function candidatePaths(startDir, moduleRelativePath) {
  const candidates = [];
  let currentDir = path.resolve(startDir);

  while (true) {
    candidates.push(path.join(currentDir, 'node_modules', moduleRelativePath));
    candidates.push(path.join(currentDir, 'node_modules', '.ignored', moduleRelativePath));

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return candidates;
}

function resolveWorkspaceCli(startDir = process.cwd(), moduleRelativePath) {
  if (!moduleRelativePath) {
    throw new Error('moduleRelativePath 不能为空。');
  }

  for (const candidatePath of candidatePaths(startDir, moduleRelativePath)) {
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(`无法定位 CLI 模块：${moduleRelativePath}。已检查目录起点：${path.resolve(startDir)}`);
}

function resolveTypeScriptCli(startDir = process.cwd()) {
  return resolveWorkspaceCli(startDir, path.join('typescript', 'bin', 'tsc'));
}

function parseCliArguments(argv) {
  const args = [...argv];

  if (args[0] === '--module') {
    return {
      moduleRelativePath: args[1],
      forwardedArgs: args.slice(2),
    };
  }

  if (args[0]?.startsWith('--module=')) {
    return {
      moduleRelativePath: args[0].slice('--module='.length),
      forwardedArgs: args.slice(1),
    };
  }

  return {
    moduleRelativePath: path.join('typescript', 'bin', 'tsc'),
    forwardedArgs: args,
  };
}

function run() {
  const { moduleRelativePath, forwardedArgs } = parseCliArguments(process.argv.slice(2));
  const cliPath = resolveWorkspaceCli(process.cwd(), moduleRelativePath);
  const result = spawnSync(process.execPath, [cliPath, ...forwardedArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

if (require.main === module) {
  run();
}

module.exports = {
  resolveWorkspaceCli,
  resolveTypeScriptCli,
};
