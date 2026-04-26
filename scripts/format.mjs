import { readFileSync, writeFileSync } from 'node:fs';

import { normalizeTextContent } from './lib/formatting.mjs';
import { listProjectFiles, toProjectRelativePath } from './lib/project.mjs';

let changedFileCount = 0;

for (const filePath of listProjectFiles()) {
  const originalContent = readFileSync(filePath, 'utf8');
  const normalizedContent = normalizeTextContent(filePath, originalContent);

  if (originalContent !== normalizedContent) {
    writeFileSync(filePath, normalizedContent, 'utf8');
    changedFileCount += 1;
    console.log(`已格式化：${toProjectRelativePath(filePath)}`);
  }
}

console.log(`格式化完成，共处理 ${changedFileCount} 个文件。`);
