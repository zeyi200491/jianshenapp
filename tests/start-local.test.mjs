import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDirectory = process.cwd();

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

test('提供本地一键启动脚本入口', () => {
  const packageJson = JSON.parse(stripBom(readFileSync(resolve(rootDirectory, 'package.json'), 'utf8')));
  assert.equal(typeof packageJson.scripts['start:local'], 'string');
  assert.match(packageJson.scripts['start:local'], /scripts\\start-local\.ps1|scripts\/start-local\.ps1/);
});

test('根目录 dev 脚本默认覆盖 ai-service，避免 AI 助手调用失败', () => {
  const packageJson = JSON.parse(stripBom(readFileSync(resolve(rootDirectory, 'package.json'), 'utf8')));
  assert.equal(typeof packageJson.scripts.dev, 'string');
  assert.match(packageJson.scripts.dev, /@campusfit\/ai-service/);
});

test('一键启动脚本覆盖 web、api 与 ai-service 的启动和健康检查', () => {
  const scriptPath = resolve(rootDirectory, 'scripts/start-local.ps1');
  assert.equal(existsSync(scriptPath), true, '缺少 scripts/start-local.ps1');

  const script = stripBom(readFileSync(scriptPath, 'utf8'));
  assert.match(script, /API_PORT' -Fallback '3050'/);
  assert.match(script, /WEB_PORT' -Fallback '3200'/);
  assert.match(script, /AI_SERVICE_PORT' -Fallback '8001'/);
  assert.match(script, /api\/v1\/health/);
  assert.match(script, /\$aiHealthUrl = "http:\/\/\$\{aiHost\}:\$\{aiPort\}\/health"/);
  assert.match(script, /Start-ManagedService -ServiceName 'AI'/);
  assert.match(script, /Edge\\Application\\msedge\.exe|Microsoft\\Edge\\Application\\msedge\.exe/);
  assert.match(script, /--user-data-dir/);
  assert.match(script, /\.tmp[\\/]+edge-local-profile/);
  assert.match(script, /Open-LocalUrl -Url \$webUrl/);
  assert.match(script, /Open-LocalUrl -Url \$docsUrl/);
  assert.ok(
    script.indexOf("Stop-ListeningProcess -Port $apiPort -ServiceName 'API'") < script.indexOf('Ensure-LocalDatabase'),
    '一键启动脚本必须在执行 db:init 前先释放旧的 API 进程，避免 Prisma Client 在 Windows 下被 DLL 占用'
  );
  assert.match(script, /\$rebuiltServices = \[System\.Collections\.Generic\.HashSet\[string\]\]::new\(\)/);
  assert.match(script, /\$rebuiltServices\.Contains\(\$ServiceName\)/);
  assert.match(script, /Rebuilt in current run, restarting to load latest artifacts\./);
});

test('Edge 独立 profile 路径带引号，避免项目路径含空格时被拆成错误标签页', () => {
  const scriptPath = resolve(rootDirectory, 'scripts/start-local.ps1');
  assert.equal(existsSync(scriptPath), true, '缺少 scripts/start-local.ps1');

  const script = stripBom(readFileSync(scriptPath, 'utf8'));
  assert.match(
    script,
    /--user-data-dir=`"\$edgeProfileDir`"/,
    'Edge profile 路径未加引号，路径含空格时会被 Edge 拆成错误页面参数'
  );
});
