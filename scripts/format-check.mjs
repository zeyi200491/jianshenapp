import { readFileSync } from 'node:fs';

import { normalizeTextContent } from './lib/formatting.mjs';
import { listProjectFiles, toProjectRelativePath } from './lib/project.mjs';

const unformattedFiles = [];

for (const filePath of listProjectFiles()) {
  const originalContent = readFileSync(filePath, 'utf8');
  const normalizedContent = normalizeTextContent(filePath, originalContent);

  if (originalContent !== normalizedContent) {
    unformattedFiles.push(toProjectRelativePath(filePath));
  }
}

if (unformattedFiles.length > 0) {
  console.error('以下文件尚未格式化：');
  unformattedFiles.forEach((filePath) => console.error(`- ${filePath}`));
  process.exit(1);
}

console.log('格式检查通过。');
