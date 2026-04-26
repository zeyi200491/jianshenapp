import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT_DIR } from './project.mjs';

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

function parseLine(line) {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const value = trimmedLine.slice(separatorIndex + 1).trim();

  if (!key) {
    return null;
  }

  return [key, value];
}

export function parseEnvFile(filePath) {
  const content = stripBom(readFileSync(filePath, 'utf8'));
  const pairs = content
    .split(/\r?\n/u)
    .map(parseLine)
    .filter(Boolean);

  return Object.fromEntries(pairs);
}

export function loadProjectEnv(options = {}) {
  const { allowMissing = false } = options;
  const envPath = resolve(ROOT_DIR, '.env');

  if (!existsSync(envPath)) {
    if (allowMissing) {
      return {
        env: {},
        envPath,
        exists: false
      };
    }

    throw new Error('缺少 .env 文件，请先基于 .env.example 创建。');
  }

  return {
    env: parseEnvFile(envPath),
    envPath,
    exists: true
  };
}
