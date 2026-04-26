import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDirectory = process.cwd();

function stripBom(content) {
  return content.replace(/^\uFEFF/u, '');
}

const packageJson = JSON.parse(stripBom(readFileSync(resolve(rootDirectory, 'package.json'), 'utf8')));
assert.equal(typeof packageJson.scripts['start:local'], 'string', '缺少 start:local 脚本命令');
assert.match(packageJson.scripts['start:local'], /scripts\\start-local\.ps1|scripts\/start-local\.ps1/, 'start:local 未指向 scripts/start-local.ps1');
assert.equal(typeof packageJson.scripts.dev, 'string', '缺少根目录 dev 脚本');
assert.match(packageJson.scripts.dev, /@campusfit\/ai-service/, '根目录 dev 未覆盖 ai-service，AI 助手会因 8001 未启动而调用失败');

const cmdEntryPath = resolve(rootDirectory, 'start-local.cmd');
assert.equal(existsSync(cmdEntryPath), true, '缺少根目录 start-local.cmd 入口');
const cmdEntry = stripBom(readFileSync(cmdEntryPath, 'utf8'));
assert.match(cmdEntry, /powershell/i, 'start-local.cmd 未调用 PowerShell 启动脚本');
assert.match(cmdEntry, /scripts\\start-local\.ps1|scripts\/start-local\.ps1/, 'start-local.cmd 未指向 scripts/start-local.ps1');

const scriptPath = resolve(rootDirectory, 'scripts/start-local.ps1');
assert.equal(existsSync(scriptPath), true, '缺少 scripts/start-local.ps1');

const script = stripBom(readFileSync(scriptPath, 'utf8'));
assert.match(script, /API_PORT' -Fallback '3050'/, '脚本未覆盖 API 默认端口');
assert.match(script, /WEB_PORT' -Fallback '3200'/, '脚本未覆盖 Web 默认端口');
assert.match(script, /AI_SERVICE_PORT' -Fallback '8001'/, '脚本未覆盖 AI 服务默认端口');
assert.match(script, /api\/v1\/health/, '脚本未检查 API 健康接口');
assert.match(script, /\$aiHealthUrl = "http:\/\/\$\{aiHost\}:\$\{aiPort\}\/health"/, '脚本未检查 AI 服务健康接口');
assert.match(script, /Start-ManagedService -ServiceName 'AI'/, '脚本未纳入 AI 服务启动');
assert.match(script, /function Open-LocalUrl/, '脚本缺少本地页面打开兜底逻辑');
assert.match(script, /function Get-EdgeExecutable/, '脚本缺少 Edge 探测逻辑');
assert.match(script, /--user-data-dir=/, '脚本未使用隔离浏览器配置目录');
assert.match(script, /\.tmp[\\/]+edge-local-profile/, '脚本未使用固定的隔离 Edge profile');
assert.match(script, /Write-Warning/, '脚本在打开浏览器失败时未降级提示');
assert.match(script, /Open-LocalUrl -Url \$webUrl/, '脚本未自动打开 Web 页面');
assert.match(script, /Open-LocalUrl -Url \$docsUrl/, '脚本未自动打开 API 文档');

const dietPlanView = stripBom(readFileSync(resolve(rootDirectory, 'apps/web/lib/diet-plan-view.ts'), 'utf8'));
assert.match(dietPlanView, /从可用食物库中匹配更贴近当前场景的替换项/, '饮食页未说明搜索来自可用食物库');
assert.match(dietPlanView, /当前场景下没有匹配项/, '饮食页未提示当前场景无匹配项');

const apiClient = stripBom(readFileSync(resolve(rootDirectory, 'apps/web/lib/api.ts'), 'utf8'));
assert.match(apiClient, /searchMealFoods\([\s\S]*mealType\?: 'breakfast' \| 'lunch' \| 'dinner'/, '搜索接口未接收当前餐次');
assert.match(apiClient, /params\.set\('mealType', mealType\)/, '搜索接口未透传当前餐次');

const dietPlanEditor = stripBom(readFileSync(resolve(rootDirectory, 'apps/web/lib/use-diet-plan-editor.ts'), 'utf8'));
assert.match(dietPlanEditor, /searchMealFoods\([\s\S]*payload\.weeklyDietPlan\.displayScene,[\s\S]*selectedMealType[\s\S]*\)/, '饮食页未把当前餐次传给搜索接口');

const mealSearchSection = stripBom(
  readFileSync(resolve(rootDirectory, 'apps/web/components/web/status/meal-search-section.tsx'), 'utf8'),
);
assert.match(mealSearchSection, /从可用食物库搜索并替换今天这餐/, '搜索区标题仍未体现可用食物库');

console.log('start-local smoke passed');
