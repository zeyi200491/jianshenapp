import { readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = resolve(CURRENT_DIR, '..', '..');

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules'
]);

const IGNORED_DIR_PREFIXES = ['pytest-cache-files-'];

const TEXT_FILE_NAMES = new Set([
  '.editorconfig',
  '.env.example',
  '.gitattributes',
  '.gitignore',
  'README.md',
  'docker-compose.yml'
]);

const TEXT_FILE_EXTENSIONS = new Set([
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml'
]);

function shouldIgnoreDirectory(directoryName) {
  return IGNORED_DIR_NAMES.has(directoryName) || IGNORED_DIR_PREFIXES.some((prefix) => directoryName.startsWith(prefix));
}

export function walkFiles(startDirectory = ROOT_DIR) {
  const discoveredFiles = [];

  let entries = [];
  try {
    entries = readdirSync(startDirectory, { withFileTypes: true });
  } catch {
    return discoveredFiles;
  }

  for (const entry of entries) {
    const absolutePath = resolve(startDirectory, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) {
        discoveredFiles.push(...walkFiles(absolutePath));
      }
      continue;
    }

    discoveredFiles.push(absolutePath);
  }

  return discoveredFiles;
}

export function isTextFile(filePath) {
  const fileName = basename(filePath);

  if (TEXT_FILE_NAMES.has(fileName)) {
    return true;
  }

  return TEXT_FILE_EXTENSIONS.has(extname(filePath));
}

export function listProjectFiles() {
  return walkFiles(ROOT_DIR).filter(isTextFile).sort();
}

export function toProjectRelativePath(filePath) {
  return filePath.slice(ROOT_DIR.length + 1).replaceAll('\\', '/');
}

export function fileExists(relativePath) {
  try {
    return statSync(resolve(ROOT_DIR, relativePath)).isFile();
  } catch {
    return false;
  }
}
