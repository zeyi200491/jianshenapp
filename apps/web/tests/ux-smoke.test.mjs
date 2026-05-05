import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fileDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(fileDirectory, '..');

function readSource(relativePath) {
  return readFileSync(resolve(webRoot, relativePath), 'utf8');
}

function expectIncludes(source, snippet, message) {
  assert.match(source, new RegExp(snippet), message);
}

test('dashboard shell keeps account and notification entry labels', () => {
  const source = readSource('components/web/dashboard-shell.tsx');
  expectIncludes(source, 'aria-label="通知中心"', '仪表盘壳层必须暴露通知中心语义标签');
  expectIncludes(source, 'aria-label="个人中心"', '仪表盘壳层必须暴露个人中心语义标签');
  expectIncludes(source, 'id="main-content"', '仪表盘壳层必须提供主内容跳转锚点');
});

test('login page exposes accessible async feedback hooks', () => {
  const source = readSource('app/login/page.tsx');
  expectIncludes(source, 'aria-live="polite"', '登录页必须为非阻塞提示提供 polite 通知区');
  expectIncludes(source, 'aria-live="assertive"', '登录页必须为阻塞错误提供 assertive 通知区');
  expectIncludes(source, 'autoComplete="one-time-code"', '登录页必须支持验证码自动填充');
});

test('training template flows keep draft-first import ux', () => {
  const pageSource = readSource('app/account/training-templates/page.tsx');
  const editorSource = readSource('components/web/training-templates/training-template-editor.tsx');
  const drawerSource = readSource('components/web/training-templates/training-template-import-drawer.tsx');

  expectIncludes(pageSource, 'buildDraftFromImportPreview', '训练模板页必须把导入预览转换成草稿');
  expectIncludes(pageSource, "window\\.confirm\\('继续后会替换当前未保存内容，是否继续？'\\)", '训练模板页必须在覆盖未保存草稿前二次确认');
  expectIncludes(editorSource, '当前是未保存草稿，确认无误后再保存模板', '训练模板编辑器必须提醒当前草稿尚未保存');
  expectIncludes(drawerSource, '生成草稿模板', '训练模板导入抽屉必须暴露草稿生成功能');
});

test('root layout exposes the skip link for keyboard users', () => {
  const source = readSource('app/layout.tsx');
  expectIncludes(source, 'href="#main-content"', '根布局必须暴露跳到主内容的快捷链接');
  expectIncludes(source, '跳到主要内容', '根布局必须提供清晰的跳转文案');
});
