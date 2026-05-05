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
  assert.match(script, /Set-ProcessEnvValue -Key 'ADMIN_EMAIL' -Value \$adminEmail/, '一键启动脚本必须为 API 子进程注入 ADMIN_EMAIL');
  assert.match(script, /Set-ProcessEnvValue -Key 'ADMIN_PASSWORD' -Value \$adminPassword/, '一键启动脚本必须为 API 子进程注入 ADMIN_PASSWORD');
  assert.match(script, /Get-EnvValue -Key 'ADMIN_EMAIL' -Fallback/, '本地启动应为缺失的管理员邮箱提供开发兜底值');
  assert.match(
    script,
    /if \(Get-ListeningProcessId -Port \$apiPort\)\s*\{\s*Stop-ListeningProcess -Port \$apiPort -ServiceName 'API'/,
    '一键启动脚本必须在执行 db:init 前先释放旧的 API 进程，避免 Prisma Client 在 Windows 下被 DLL 占用'
  );
  assert.match(
    script,
    /node dist\/apps\/api\/src\/main\.js|node dist\\apps\\api\\src\\main\.js/,
    '一键启动脚本在完成 API build 后应直接启动编译产物，避免再次触发 npm prestart 导致健康检查超时'
  );
  assert.match(script, /\$rebuiltServices = \[System\.Collections\.Generic\.HashSet\[string\]\]::new\(\)/);
  assert.match(script, /\$rebuiltServices\.Contains\(\$ServiceName\)/);
  assert.match(script, /Rebuilt in current run, restarting to load latest artifacts\./);
  assert.doesNotMatch(script, /campusfit_dev_secret|campusfit-dev-secret/, '本地启动脚本不应内置固定 JWT 开发密钥');
  assert.doesNotMatch(script, /CampusFit123!/, '本地启动脚本不应内置固定管理员密码');
  assert.match(script, /New-DevJwtSecret/, '缺失 JWT_SECRET 时应动态生成开发密钥');
  assert.match(script, /New-DevAdminPassword/, '缺失 ADMIN_PASSWORD 时应动态生成开发密码');
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

test('一键启动脚本会在 AI 相关源码或 .env 更新后自动重启 AI 服务', () => {
  const scriptPath = resolve(rootDirectory, 'scripts/start-local.ps1');
  const script = stripBom(readFileSync(scriptPath, 'utf8'));

  assert.match(script, /\$envFile = Join-Path \$root '\.env'/, '脚本必须显式跟踪根目录 .env 的修改时间');
  assert.match(script, /\[string\[\]\]\$WatchFilePaths/, '启动函数必须支持传入监控文件列表');
  assert.match(script, /Start-ManagedService -ServiceName 'AI'[\s\S]*-WatchFilePaths @\(\$envFile, \$aiWorkdir\)/, 'AI 服务必须监控 .env 和 ai-service 源码目录');
  assert.match(script, /Detected newer watched files, restarting to load latest changes\./, '检测到 AI 源码或配置更新后必须重启服务');
  assert.match(script, /Get-ListeningProcessStartTimeUtc -Port \$Port/, '判断是否需要重启时必须读取当前监听进程的启动时间');
});

test('一键启动脚本会在 Web 构建产物或 .env 更新后自动重启 Web 服务', () => {
  const scriptPath = resolve(rootDirectory, 'scripts/start-local.ps1');
  const script = stripBom(readFileSync(scriptPath, 'utf8'));

  assert.match(script, /Start-ManagedService -ServiceName 'Web'[\s\S]*-WatchFilePaths @\(\$envFile, \(Join-Path \$webWorkdir '\.next\/BUILD_ID'\)\)/, 'Web 启动必须传入文件监控路径');
  assert.match(script, /\$latestWatchUtc = Get-FileWatchUtc -Paths \$WatchFilePaths/, 'Web 服务必须基于监控文件时间决定是否重启');
});
