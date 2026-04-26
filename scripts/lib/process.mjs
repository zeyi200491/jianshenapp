import { spawnSync } from 'node:child_process';

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? 'inherit'
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`未找到命令：${command}`);
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}
