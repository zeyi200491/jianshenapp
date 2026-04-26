import { extname } from 'node:path';

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

export function normalizeTextContent(filePath, content) {
  const sanitizedContent = stripBom(content);

  if (extname(filePath) === '.json') {
    const parsedJson = JSON.parse(sanitizedContent);
    return `${JSON.stringify(parsedJson, null, 2)}\n`;
  }

  const normalizedContent = sanitizedContent
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n');

  return normalizedContent.endsWith('\n')
    ? normalizedContent
    : `${normalizedContent}\n`;
}
