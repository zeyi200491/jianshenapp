import { readFileSync } from 'node:fs';

import { fileExists, listProjectFiles, toProjectRelativePath } from './lib/project.mjs';

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

const requiredFiles = [
  'README.md',
  '.env.example',
  'docker-compose.yml',
  'docs/progress.md',
  'docs/release-checklist.md',
  'infra/postgres/init/001_extensions.sql',
  'infra/postgres/init/010_schema.sql',
  'infra/postgres/seed/seed.sql'
];

const errors = [];

for (const requiredFile of requiredFiles) {
  if (!fileExists(requiredFile)) {
    errors.push(`缺少必备文件：${requiredFile}`);
  }
}

for (const filePath of listProjectFiles()) {
  const relativePath = toProjectRelativePath(filePath);
  const content = stripBom(readFileSync(filePath, 'utf8'));

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  lines.forEach((line, index) => {
    if (/[ \t]+$/u.test(line)) {
      errors.push(`${relativePath}:${index + 1} 存在行尾空格`);
    }

    if (line.includes('\t')) {
      errors.push(`${relativePath}:${index + 1} 包含制表符，请改为空格`);
    }
  });

  if (relativePath.endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch (error) {
      errors.push(`${relativePath} 不是合法 JSON：${error.message}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Lint 失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Lint 通过。');
