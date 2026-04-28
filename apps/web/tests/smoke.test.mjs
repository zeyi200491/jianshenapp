import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fileDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(fileDirectory, '../../..');

function expectFile(relativePath) {
  assert.equal(
    existsSync(resolve(rootDirectory, relativePath)),
    true,
    `Missing file: ${relativePath}`,
  );
}

function expectIncludes(source, snippet, message) {
  assert.match(source, new RegExp(snippet), message);
}

function expectNotIncludes(source, snippet, message) {
  assert.doesNotMatch(source, new RegExp(snippet), message);
}

function expectAtMostLines(source, maxLines, message) {
  assert.equal(
    source.split('\n').length <= maxLines,
    true,
    message,
  );
}

function main() {
  for (const filePath of [
    'apps/web/app/layout.tsx',
    'apps/web/app/page.tsx',
    'apps/web/app/diet/page.tsx',
    'apps/web/app/login/page.tsx',
    'apps/web/app/onboarding/page.tsx',
    'apps/web/app/today/page.tsx',
    'apps/web/app/check-in/page.tsx',
    'apps/web/app/review/page.tsx',
    'apps/web/app/assistant/page.tsx',
    'apps/web/app/status/layout.tsx',
    'apps/web/app/status/page.tsx',
    'apps/web/app/privacy/page.tsx',
    'apps/web/app/terms/page.tsx',
    'apps/web/app/data-deletion/page.tsx',
    'apps/web/components/web/dashboard-shell.tsx',
    'apps/web/components/web/live-status-card.tsx',
    'apps/web/components/web/today/training-plan-panel.tsx',
    'apps/web/components/web/today/profile-settings-form.tsx',
    'apps/web/components/web/today/today-overview-section.tsx',
    'apps/web/components/web/today/today-coach-section.tsx',
    'apps/web/components/web/check-in/form-controls.tsx',
    'apps/web/components/web/check-in/check-in-overview-section.tsx',
    'apps/web/components/web/check-in/check-in-detail-section.tsx',
    'apps/web/components/web/status/meal-plan-section.tsx',
    'apps/web/components/web/status/meal-search-section.tsx',
    'apps/web/components/web/review/review-overview-section.tsx',
    'apps/web/components/web/review/review-action-items-section.tsx',
    'apps/web/lib/use-unsaved-changes-warning.ts',
    'apps/web/lib/use-diet-page-url-state.ts',
    'apps/web/lib/use-check-in-url-state.ts',
    'apps/web/lib/use-today-dashboard.ts',
    'apps/web/lib/use-diet-plan-editor.ts',
    'apps/web/lib/use-check-in-editor.ts',
    'apps/web/lib/brand.ts',
    'apps/web/lib/onboarding-draft.ts',
    'apps/web/lib/assistant-history.ts',
    'apps/web/lib/user-facing-error.ts',
    'apps/web/lib/today-dashboard-view.ts',
    'apps/web/lib/diet-plan-view.ts',
    'apps/web/lib/check-in-view.ts',
    'apps/web/lib/display-state.ts',
  ]) {
    expectFile(filePath);
  }

  const packageJson = JSON.parse(
    readFileSync(resolve(rootDirectory, 'package.json'), 'utf8'),
  );

  assert.equal(packageJson.scripts['dev:web']?.length > 0, true, 'Missing dev:web script');
  assert.match(packageJson.scripts.dev, /@campusfit\/web/, 'Default dev target is not web');

  const authSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/auth.ts'), 'utf8');
  expectIncludes(authSource, 'setStoredSessionOnboardingStatus', 'Auth helpers should expose onboarding status sync');
  expectNotIncludes(authSource, 'localStorage', 'Web auth must not persist tokens in localStorage');
  expectNotIncludes(authSource, 'SESSION_KEY', 'Web auth must not keep browser token-storage keys');

  const webApiSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/api.ts'), 'utf8');
  expectIncludes(webApiSource, 'X-CampusFit-CSRF', 'Web API client should send a CSRF marker on cookie-authenticated mutations');
  expectIncludes(webApiSource, 'isStateChangingRequest', 'Web API client should only add the CSRF marker to state-changing requests');

  const webNextConfigSource = readFileSync(resolve(rootDirectory, 'apps/web/next.config.ts'), 'utf8');
  expectIncludes(webNextConfigSource, 'Content-Security-Policy', 'Web app should emit a baseline CSP response header');
  expectIncludes(webNextConfigSource, "script-src 'self' 'unsafe-inline'", 'Web app CSP should allow the inline scripts required by Next.js hydration');
  expectIncludes(webNextConfigSource, 'X-Frame-Options', 'Web app should block clickjacking with X-Frame-Options');
  expectIncludes(webNextConfigSource, 'Referrer-Policy', 'Web app should limit referrer leakage');

  const brandSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/brand.ts'), 'utf8');
  expectIncludes(brandSource, "APP_BRAND_NAME = '小健'", 'Brand helpers should expose the unified 小健 brand name');

  const errorHelperSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/user-facing-error.ts'), 'utf8');
  expectIncludes(errorHelperSource, '发生了什么', 'User-facing error helpers should explain what happened');
  expectIncludes(errorHelperSource, '现在怎么做', 'User-facing error helpers should explain next steps');
  expectIncludes(errorHelperSource, '数据情况', 'User-facing error helpers should explain whether data is safe');

  const onboardingDraftSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/onboarding-draft.ts'), 'utf8');
  expectIncludes(onboardingDraftSource, 'saveOnboardingDraft', 'Onboarding drafts should be persisted through a focused helper');
  expectIncludes(onboardingDraftSource, 'readOnboardingDraft', 'Onboarding drafts should be restorable through a focused helper');

  const assistantHistorySource = readFileSync(resolve(rootDirectory, 'apps/web/lib/assistant-history.ts'), 'utf8');
  expectIncludes(assistantHistorySource, 'saveAssistantConversationSnapshot', 'Assistant history should persist cross-day conversation snapshots');
  expectIncludes(assistantHistorySource, 'toggleAssistantActionItem', 'Assistant history should persist actionable checklist items');

  const displayStateSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/display-state.ts'), 'utf8');
  expectIncludes(displayStateSource, '真实数据', 'Display-state helpers should expose readable actual-data labels');
  expectIncludes(displayStateSource, '今日计划总量', 'Display-state helpers should expose readable energy insight titles');
  expectIncludes(displayStateSource, '数据复盘', 'Display-state helpers should expose readable review header copy');
  expectNotIncludes(displayStateSource, '鐪熷疄鏁版嵁', 'Display-state helpers should not keep mojibake labels');
  expectNotIncludes(displayStateSource, '浠婃棩璁″垝鎬婚噺', 'Display-state helpers should not keep mojibake insight titles');

  const landingSource = readFileSync(resolve(rootDirectory, 'apps/web/app/page.tsx'), 'utf8');
  expectIncludes(landingSource, 'APP_BRAND_NAME', 'Landing page should use the unified brand helper');
  expectIncludes(landingSource, '进入今日仪表盘', 'Landing page should expose the new dashboard CTA');
  expectIncludes(landingSource, '训练与饮食仪表盘', 'Landing page should expose the new hero title');
  expectNotIncludes(landingSource, '本地服务状态', 'Landing page should hide developer runtime status');
  expectNotIncludes(landingSource, '开发可见', 'Landing page should not expose developer-only labels');
  expectNotIncludes(landingSource, 'RuntimeStatus', 'Landing page should not render runtime diagnostics');
  expectIncludes(landingSource, '个人中心', 'Landing page should expose the account entry');
  expectNotIncludes(landingSource, '92%', 'Landing page should not render hard-coded completion ratios');
  expectNotIncludes(landingSource, '88%', 'Landing page should not render hard-coded check-in ratios');
  expectNotIncludes(landingSource, 'CampusFit AI', 'Landing page should not expose the old brand name');
  expectNotIncludes(landingSource, 'Kinetic', 'Landing page should not expose the retired Kinetic brand');

  expectFile('apps/web/app/account/page.tsx');

  const accountSource = readFileSync(resolve(rootDirectory, 'apps/web/app/account/page.tsx'), 'utf8');
  expectIncludes(accountSource, '个人中心', 'Account page should expose the account title');
  expectIncludes(accountSource, '账号信息', 'Account page should expose account information');
  expectIncludes(accountSource, '我的设置', 'Account page should expose settings summary');
  expectIncludes(accountSource, '帮助支持', 'Account page should expose help content');
  expectIncludes(accountSource, '退出登录', 'Account page should expose logout action');
  expectIncludes(accountSource, '饮食偏好', 'Account page should expose diet preference summary');
  expectIncludes(accountSource, '饮食限制', 'Account page should expose diet restriction summary');
  expectIncludes(accountSource, '申请删除数据', 'Account page should expose a data deletion request action');
  expectIncludes(accountSource, 'requestDataDeletion', 'Account page should call the backend data deletion request API');
  expectNotIncludes(accountSource, '涓汉涓績', 'Account page should not keep mojibake text');
  expectNotIncludes(accountSource, '鍓嶅線寤烘。椤', 'Account page should not keep mojibake actions');
  expectNotIncludes(accountSource, 'API 已启动', 'Account page should not expose developer-facing recovery copy');

  const dashboardShellSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/dashboard-shell.tsx'),
    'utf8',
  );
  const liveStatusCardSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/live-status-card.tsx'),
    'utf8',
  );
  const layoutSource = readFileSync(resolve(rootDirectory, 'apps/web/app/layout.tsx'), 'utf8');
  expectIncludes(layoutSource, 'href="#main-content"', 'Root layout should expose a skip link to the main content');
  expectIncludes(layoutSource, '跳到主要内容', 'Root layout should expose skip-link copy');
  expectIncludes(dashboardShellSource, '/account', 'Dashboard shell should route account entry to /account');
  expectIncludes(dashboardShellSource, '/diet', 'Dashboard shell should route diet entry to /diet');
  expectIncludes(dashboardShellSource, 'APP_BRAND_NAME', 'Dashboard shell should expose the unified brand helper');
  expectIncludes(dashboardShellSource, 'aria-label="个人中心"', 'Dashboard shell should label the account icon');
  expectIncludes(dashboardShellSource, '我的档案', 'Dashboard shell should give the account entry a clear text cue');
  expectIncludes(dashboardShellSource, 'aria-label="通知中心"', 'Dashboard shell should label the notification icon');
  expectIncludes(dashboardShellSource, 'id="main-content"', 'Dashboard shell should expose the main-content skip target');
  expectNotIncludes(dashboardShellSource, 'transition-all', 'Dashboard shell should not keep broad transition-all styles in shared components');
  expectNotIncludes(dashboardShellSource, '>设置<', 'Dashboard shell should not keep the fake settings text link');
  expectNotIncludes(dashboardShellSource, '>帮助<', 'Dashboard shell should not keep the fake help text link');
  expectNotIncludes(dashboardShellSource, 'Kinetic', 'Dashboard shell should not expose the retired Kinetic brand');
  expectNotIncludes(dashboardShellSource, 'Fluid Sanctuary', 'Dashboard shell should not expose the retired slogan');
  expectIncludes(liveStatusCardSource, "ariaLive: 'polite'", 'Shared live-status card should expose polite announcements');
  expectIncludes(liveStatusCardSource, "ariaLive: 'assertive'", 'Shared live-status card should expose assertive announcements');

  const headerSource = readFileSync(resolve(rootDirectory, 'apps/web/components/web/site-header.tsx'), 'utf8');
  expectIncludes(headerSource, 'APP_BRAND_NAME', 'Public header should expose the unified brand helper');
  expectIncludes(headerSource, '/account', 'Public header should expose the account entry');
  expectIncludes(headerSource, '/diet', 'Site header should expose the diet page entry');
  expectIncludes(headerSource, '/privacy', 'Site header should expose privacy policy');
  expectIncludes(headerSource, '/terms', 'Site header should expose terms of service');
  expectIncludes(headerSource, '/data-deletion', 'Site header should expose data deletion instructions');

  const loginSource = readFileSync(resolve(rootDirectory, 'apps/web/app/login/page.tsx'), 'utf8');
  expectIncludes(loginSource, '邮箱登录', 'Login page should expose the new login title');
  expectIncludes(loginSource, 'APP_BRAND_NAME', 'Login page should expose the unified brand helper');
  expectIncludes(loginSource, 'dataStatus', 'Login page should explain whether login errors lose user data');
  expectNotIncludes(loginSource, 'student@example.com', 'Login page should not prefill a fake email');
  expectNotIncludes(loginSource, '联调支持', 'Login page should not expose developer-only support messaging');
  expectIncludes(loginSource, 'deliveryMode', 'Login page should react to the backend delivery mode');
  expectIncludes(loginSource, '当前环境使用模拟发码', 'Login page should clearly explain mock email mode');
  expectNotIncludes(loginSource, 'NEXT_PUBLIC_SHOW_DEV_CODE', 'Login page should not rely on a frontend-only dev-code flag');
  expectIncludes(loginSource, 'name="email"', 'Login page should give the email field a stable name');
  expectIncludes(loginSource, 'autoComplete="email"', 'Login page should enable email autofill');
  expectIncludes(loginSource, 'spellCheck=\\{false\\}', 'Login page should disable spellcheck on credential fields');
  expectIncludes(loginSource, 'autoComplete="one-time-code"', 'Login page should enable OTP autofill');
  expectIncludes(loginSource, 'aria-live="polite"', 'Login page should announce non-blocking async hints');
  expectIncludes(loginSource, 'aria-live="assertive"', 'Login page should announce blocking async errors');
  expectNotIncludes(loginSource, 'CampusFit AI', 'Login page should not expose the old brand name');
  expectNotIncludes(loginSource, 'Kinetic', 'Login page should not expose the retired brand');
  expectNotIncludes(loginSource, 'API 已启动', 'Login page should not expose developer-facing error recovery copy');

  const onboardingSource = readFileSync(resolve(rootDirectory, 'apps/web/app/onboarding/page.tsx'), 'utf8');
  expectIncludes(onboardingSource, '建立你的训练档案', 'Onboarding page should expose the new onboarding title');
  expectIncludes(onboardingSource, '预计 2 分钟', 'Onboarding page should explain the expected onboarding effort');
  expectIncludes(onboardingSource, '为什么要填这些信息', 'Onboarding page should explain why profile fields matter');
  expectIncludes(onboardingSource, '自动暂存', 'Onboarding page should explain that drafts are saved automatically');
  expectIncludes(onboardingSource, '恢复上次草稿', 'Onboarding page should let users restore onboarding drafts');
  expectIncludes(onboardingSource, '第 1 步', 'Onboarding page should expose explicit step labels');
  expectIncludes(onboardingSource, 'saveOnboardingDraft', 'Onboarding page should save progress through the draft helper');
  expectIncludes(onboardingSource, 'clearOnboardingDraft', 'Onboarding page should clear drafts after completion');
  expectIncludes(onboardingSource, '饮食偏好', 'Onboarding page should expose diet preference controls');
  expectIncludes(onboardingSource, '饮食限制', 'Onboarding page should expose diet restriction controls');
  expectNotIncludes(onboardingSource, 'session.user.hasCompletedOnboarding', 'Onboarding page should not auto-redirect based only on stale local session flags');
  expectIncludes(onboardingSource, 'name="birthYear"', 'Onboarding page should give core numeric fields stable names');
  expectIncludes(onboardingSource, 'inputMode="numeric"', 'Onboarding page should hint numeric keyboards for integer fields');
  expectIncludes(onboardingSource, 'name="supplementOptIn"', 'Onboarding page should give the supplement toggle a stable name');
  expectIncludes(onboardingSource, 'useUnsavedChangesWarning', 'Onboarding page should warn before leaving with unsaved changes');
  expectIncludes(onboardingSource, 'LiveStatusCard', 'Onboarding page should use the shared live-status card for async feedback');
  expectNotIncludes(onboardingSource, 'API 已启动', 'Onboarding page should not expose developer-facing error recovery copy');

  const todaySource = readFileSync(resolve(rootDirectory, 'apps/web/app/today/page.tsx'), 'utf8');
  const todayTrainingPanelSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/today/training-plan-panel.tsx'),
    'utf8',
  );
  const todayProfileFormSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/today/profile-settings-form.tsx'),
    'utf8',
  );
  const todayOverviewSectionSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/today/today-overview-section.tsx'),
    'utf8',
  );
  const todayCoachSectionSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/today/today-coach-section.tsx'),
    'utf8',
  );
  expectIncludes(todaySource, '指挥中心', 'Today page should expose the dashboard title');
  expectIncludes(todaySource, 'isCardioPlan', 'Today page should compute cardio-plan state before rendering the training panel');
  expectIncludes(todaySource, 'isCutTarget', 'Today page should keep target-type branching explicit through dashboard state');
  expectIncludes(todaySource, 'isStrengthTarget', 'Today page should explicitly gate strength-only actions through dashboard state');
  expectNotIncludes(todaySource, '处于热量缺口中，训练与饮食节奏良好', 'Today page should not render a fixed energy conclusion');
  expectNotIncludes(todaySource, '比昨日同一时间高出 12%', 'Today page should not render a fixed burn-rate comparison');
  expectNotIncludes(todaySource, '2.4L', 'Today page should not render a fixed hydration value');
  expectNotIncludes(todaySource, 'estimateBurnRate', 'Today page should not keep local burn-rate estimation helpers');
  expectNotIncludes(todaySource, 'estimateBalance', 'Today page should not keep local energy-balance estimation helpers');
  expectNotIncludes(todaySource, 'estimateReadiness', 'Today page should not keep local readiness estimation helpers');
  expectNotIncludes(todaySource, 'readinessScore', 'Today page should not render synthetic readiness scores');
  expectNotIncludes(todaySource, 'buildBurnRateInsight', 'Today page should remove the training scale card and its burn-rate helper');
  expectNotIncludes(todaySource, 'buildHydrationInsight', 'Today page should remove the hydration card and its helper');
  expectIncludes(todaySource, 'useUnsavedChangesWarning', 'Today page should warn before leaving profile edits unsaved');
  expectIncludes(todaySource, 'TrainingPlanPanel', 'Today page should delegate training panel rendering to a focused component');
  expectIncludes(todaySource, 'ProfileSettingsForm', 'Today page should delegate profile form rendering to a focused component');
  expectIncludes(todaySource, 'TodayOverviewSection', 'Today page should delegate hero and check-in overview rendering');
  expectIncludes(todaySource, 'TodayCoachSection', 'Today page should delegate AI coach and macro summary rendering');
  expectIncludes(todaySource, 'LiveStatusCard', 'Today page should use the shared live-status card for async feedback');
  expectIncludes(todaySource, 'useTodayDashboard', 'Today page should move data loading and mutations into a dedicated hook');
  expectIncludes(todaySource, 'buildHeroMetrics', 'Today page should move hero metric derivation into a dedicated view helper');
  expectIncludes(todaySource, 'buildMacroSummary', 'Today page should move macro summary derivation into a dedicated view helper');
  expectIncludes(todaySource, 'buildCheckInInsight', 'Today page should move check-in insight derivation into a dedicated view helper');
  expectAtMostLines(todaySource, 260, 'Today page should stay focused and avoid growing back into a giant page component');
  expectIncludes(todayOverviewSectionSource, 'getStateLabel', 'Today overview section should render shared data-state labels');
  expectIncludes(todayCoachSectionSource, 'LiveStatusCard', 'Today coach section should announce AI refresh errors through the shared live-status card');
  expectIncludes(todayTrainingPanelSource, '今日减脂有氧计划', 'Training panel component should expose a dedicated cardio training title');
  expectIncludes(todayTrainingPanelSource, '爬坡有氧', 'Training panel component should describe treadmill incline cardio in the training panel');
  expectIncludes(todayProfileFormSource, '饮食偏好', 'Profile settings form component should expose diet preference summary');
  expectIncludes(todayProfileFormSource, '饮食限制', 'Profile settings form component should expose diet restriction summary');
  expectIncludes(todayProfileFormSource, 'name="heightCm"', 'Profile settings form component should give profile form fields stable names');
  expectIncludes(todayProfileFormSource, 'inputMode="decimal"', 'Profile settings form component should hint decimal keyboards for weight-like fields');

  const statusSource = readFileSync(resolve(rootDirectory, 'apps/web/app/status/page.tsx'), 'utf8');
  const statusMealPlanSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/status/meal-plan-section.tsx'),
    'utf8',
  );
  const statusMealSearchSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/status/meal-search-section.tsx'),
    'utf8',
  );
  expectIncludes(statusSource, '智能饮食计划', 'Status implementation should remain the diet planning page');
  expectNotIncludes(statusSource, 'buildPageState', 'Status implementation should remove the page-level state helper');
  expectNotIncludes(statusSource, '页面状态', 'Status implementation should remove the page-level data state block');
  expectNotIncludes(statusSource, 'Math\\.ceil\\(day \\/ 7\\) \\+ 38', 'Status implementation should not fake week labels with hard-coded offsets');
  expectNotIncludes(statusSource, '鏅鸿兘楗璁', 'Status implementation should not keep mojibake title text');
  expectNotIncludes(statusSource, '鏃╅', 'Status implementation should not keep mojibake meal labels');
  expectIncludes(statusSource, 'MealPlanSection', 'Status page should delegate the meal-detail section');
  expectIncludes(statusSource, 'MealSearchSection', 'Status page should delegate the meal-search section');
  expectIncludes(statusSource, 'LiveStatusCard', 'Status page should use the shared live-status card for async feedback');
  expectIncludes(statusSource, 'useDietPageUrlState', 'Status page should move URL state wiring into a dedicated hook');
  expectIncludes(statusSource, 'useDietPlanEditor', 'Status page should move meal search and replace flows into a dedicated hook');
  expectIncludes(statusSource, 'buildMealState', 'Status page should move meal-state derivation into a dedicated view helper');
  expectIncludes(statusSource, 'buildSearchState', 'Status page should move search-state derivation into a dedicated view helper');
  expectIncludes(statusSource, 'mergeUnique', 'Status page should move meal guidance merging into a dedicated view helper');
  expectNotIncludes(
    statusSource,
    '这一页只展示 today 接口已经返回的真实周菜单',
    'Diet page should remove the retired data-explanation paragraph',
  );
  expectAtMostLines(statusSource, 280, 'Status page should stay at orchestration level instead of keeping giant inline sections');
  expectIncludes(statusMealPlanSource, '当日三餐详情', 'Meal-plan section should expose the selected-day meal detail panel');
  expectIncludes(statusMealPlanSource, '替换方案', 'Meal-plan section should expose meal alternatives');
  expectIncludes(statusMealPlanSource, '执行指导', 'Meal-plan section should expose meal guidance');
  expectIncludes(statusMealSearchSource, '餐次状态', 'Meal-search section should expose a meal-level data state block');
  expectIncludes(statusMealSearchSource, '搜索状态', 'Meal-search section should expose a search-level data state block');
  expectIncludes(statusMealSearchSource, 'getStateLabel', 'Meal-search section should use the shared data-state labels');
  expectIncludes(statusMealSearchSource, 'name="searchQuery"', 'Meal-search section should give the meal-search field a stable name');
  expectIncludes(statusMealSearchSource, 'spellCheck=\\{false\\}', 'Meal-search section should disable spellcheck for the meal-search field');
  expectIncludes(statusMealSearchSource, 'inputMode="search"', 'Meal-search section should hint the search keyboard for meal search');

  const dietSource = readFileSync(resolve(rootDirectory, 'apps/web/app/diet/page.tsx'), 'utf8');
  expectIncludes(dietSource, "export \\{ default \\} from '../status/page'", 'Diet page should delegate to the diet implementation entry');

  const statusLayoutSource = readFileSync(resolve(rootDirectory, 'apps/web/app/status/layout.tsx'), 'utf8');
  expectIncludes(statusLayoutSource, "redirect\\('/diet'\\)", 'Status route should redirect to /diet');

  const checkInSource = readFileSync(resolve(rootDirectory, 'apps/web/app/check-in/page.tsx'), 'utf8');
  const checkInControlsSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/check-in/form-controls.tsx'),
    'utf8',
  );
  const checkInOverviewSectionSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/check-in/check-in-overview-section.tsx'),
    'utf8',
  );
  const checkInDetailSectionSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/check-in/check-in-detail-section.tsx'),
    'utf8',
  );
  expectIncludes(checkInSource, '每日打卡', 'Check-in page should expose the daily check-in title');
  expectIncludes(checkInSource, 'useUnsavedChangesWarning', 'Check-in page should warn before leaving with unsaved form changes');
  expectIncludes(checkInSource, '当前有未保存的打卡内容', 'Check-in page should explain discard risk before switching dates');
  expectIncludes(checkInSource, 'useCheckInUrlState', 'Check-in page should move URL state wiring into a dedicated hook');
  expectIncludes(checkInSource, 'CheckInOverviewSection', 'Check-in page should delegate overview panels to a focused component');
  expectIncludes(checkInSource, 'CheckInDetailSection', 'Check-in page should delegate detailed fields to a focused component');
  expectIncludes(checkInSource, 'LiveStatusCard', 'Check-in page should use the shared live-status card for async feedback');
  expectIncludes(checkInSource, 'useCheckInEditor', 'Check-in page should move editor loading and submit flows into a dedicated hook');
  expectIncludes(checkInSource, 'buildReadinessState', 'Check-in page should move readiness-state derivation into a dedicated view helper');
  expectIncludes(checkInSource, 'buildCoachTip', 'Check-in page should move coach-tip derivation into a dedicated view helper');
  expectIncludes(checkInSource, 'buildCompletionSummary', 'Check-in page should move completion-summary derivation into a dedicated view helper');
  expectIncludes(
    checkInSource,
    'buildDailyEncouragement\\s*\\(',
    'Check-in page should derive the headline encouragement through the shared helper',
  );
  expectNotIncludes(checkInSource, 'buildCheckInFormState', 'Check-in page should not keep local baseline-form reconstruction after extracting the editor hook');
  expectNotIncludes(checkInSource, 'md:grid-cols-\\[minmax\\(0,1fr\\)_auto\\] md:items-end', 'Check-in completion controls should not keep the overlapping split layout');
  expectNotIncludes(checkInSource, '核心力量强化 · 45 分钟', 'Check-in page should not render a fixed training duration');
  expectNotIncludes(
    checkInSource,
    '力量不在于你能做什么，而在于你克服了曾经以为做不到的事情',
    'Check-in page should not keep the retired fixed quote',
  );
  expectNotIncludes(checkInSource, "dietCompletionRate: '80'", 'Check-in page should not prefill fake diet completion values');
  expectNotIncludes(checkInSource, "trainingCompletionRate: '100'", 'Check-in page should not prefill fake training completion values');
  expectNotIncludes(checkInSource, "waterIntakeMl: '2000'", 'Check-in page should not prefill fake hydration values');
  expectNotIncludes(checkInSource, "stepCount: '8000'", 'Check-in page should not prefill fake step counts');
  expectNotIncludes(checkInSource, "energyLevel: '4'", 'Check-in page should not prefill fake energy scores');
  expectNotIncludes(checkInSource, "satietyLevel: '4'", 'Check-in page should not prefill fake satiety scores');
  expectNotIncludes(checkInSource, "fatigueLevel: '2'", 'Check-in page should not prefill fake fatigue scores');
  expectNotIncludes(checkInSource, 'readinessScore', 'Check-in page should not render synthetic readiness scores for empty records');
  expectAtMostLines(checkInSource, 280, 'Check-in page should stay focused and delegate detailed blocks');
  expectIncludes(checkInOverviewSectionSource, '快打卡', 'Check-in overview section should expose the quick check-in mode');
  expectIncludes(checkInOverviewSectionSource, '详细模式', 'Check-in overview section should expose the detailed mode entry');
  expectIncludes(checkInOverviewSectionSource, '未补充的体感会先留空', 'Check-in overview section should explain that signal fields remain empty in quick mode');
  expectIncludes(checkInOverviewSectionSource, '饮食完成度（%）', 'Check-in overview section should expose precise diet completion input labels');
  expectIncludes(checkInControlsSource, 'name=\\{name\\}', 'Check-in controls should bind stable names into completion inputs');
  expectIncludes(checkInDetailSectionSource, 'name="waterIntakeMl"', 'Check-in detail section should give detailed numeric fields stable names');
  expectIncludes(checkInDetailSectionSource, 'spellCheck=\\{false\\}', 'Check-in detail section should disable spellcheck for note input');

  const reviewSource = readFileSync(resolve(rootDirectory, 'apps/web/app/review/page.tsx'), 'utf8');
  const reviewOverviewSectionSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/review/review-overview-section.tsx'),
    'utf8',
  );
  const reviewActionItemsSectionSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/review/review-action-items-section.tsx'),
    'utf8',
  );
  expectIncludes(reviewSource, '数据复盘', 'Review page should expose the weekly review title');
  expectIncludes(reviewSource, 'setStoredSessionOnboardingStatus\\(false\\)', 'Review page should sync onboarding status when backend requires onboarding');
  expectIncludes(reviewSource, 'LiveStatusCard', 'Review page should use the shared live-status card for async feedback');
  expectIncludes(reviewSource, 'ReviewOverviewSection', 'Review page should delegate overview cards to a focused component');
  expectIncludes(reviewSource, 'ReviewActionItemsSection', 'Review page should delegate action items to a focused component');
  expectNotIncludes(reviewSource, '第42周数据复盘', 'Review page should not render a fixed week label');
  expectNotIncludes(reviewSource, '上海 · 世纪公园', 'Review page should not render a fixed location');
  expectNotIncludes(reviewSource, '12.4 km', 'Review page should not render a fixed outdoor running distance');
  expectNotIncludes(reviewSource, '数据采样说明', 'Review page should remove the sampling explanation block');
  expectAtMostLines(reviewSource, 300, 'Review page should stay at orchestration level instead of keeping every block inline');
  expectIncludes(reviewOverviewSectionSource, '本周亮点', 'Review overview section should expose weekly highlights');
  expectIncludes(reviewActionItemsSectionSource, '下周行动清单', 'Review action-items section should expose next-week actions');

  const assistantSource = readFileSync(resolve(rootDirectory, 'apps/web/app/assistant/page.tsx'), 'utf8');
  expectIncludes(assistantSource, 'AI 训练助理', 'Assistant page should expose the new assistant title');
  expectIncludes(assistantSource, '执行助手', 'Assistant page should frame AI as an execution assistant, not a generic chatbot');
  expectIncludes(assistantSource, '今日行动项', 'Assistant page should expose actionable checklist items');
  expectIncludes(assistantSource, '快捷追问', 'Assistant page should expose quick follow-up prompts');
  expectIncludes(assistantSource, '历史会话', 'Assistant page should expose cross-day conversation history');
  expectIncludes(assistantSource, '加入今日行动项', 'Assistant page should let users turn answers into action items');
  expectIncludes(assistantSource, 'saveAssistantConversationSnapshot', 'Assistant page should persist conversation history snapshots');
  expectIncludes(assistantSource, 'toggleAssistantActionItem', 'Assistant page should persist action-item completion state');
  expectIncludes(assistantSource, 'streamingMessageId', 'Assistant page should progressively reveal assistant replies');
  expectIncludes(assistantSource, 'setStoredSessionOnboardingStatus\\(false\\)', 'Assistant page should sync onboarding status when backend requires onboarding');
  expectIncludes(assistantSource, 'LiveStatusCard', 'Assistant page should use the shared live-status card for async feedback');
  expectIncludes(assistantSource, 'name="question"', 'Assistant page should give the question field a stable name');
  expectIncludes(assistantSource, 'spellCheck=\\{false\\}', 'Assistant page should disable spellcheck for the question field');
  expectIncludes(assistantSource, 'autoComplete="off"', 'Assistant page should disable autofill for the question field');
  expectNotIncludes(assistantSource, 'API 和 AI 服务已启动', 'Assistant page should not expose developer-facing availability copy');
  expectNotIncludes(todaySource, '晚间黄金时段', 'Today page should not use a fixed AI fallback schedule');

  const accountSourceLive = readFileSync(resolve(rootDirectory, 'apps/web/app/account/page.tsx'), 'utf8');
  expectIncludes(accountSourceLive, 'LiveStatusCard', 'Account page should use the shared live-status card for async feedback');

  const privacySource = readFileSync(resolve(rootDirectory, 'apps/web/app/privacy/page.tsx'), 'utf8');
  const termsSource = readFileSync(resolve(rootDirectory, 'apps/web/app/terms/page.tsx'), 'utf8');
  const deletionSource = readFileSync(resolve(rootDirectory, 'apps/web/app/data-deletion/page.tsx'), 'utf8');
  expectIncludes(privacySource, 'APP_BRAND_NAME', 'Privacy page should expose the unified brand helper');
  expectIncludes(privacySource, '隐私政策', 'Privacy page should expose privacy policy copy');
  expectIncludes(privacySource, '身体数据', 'Privacy page should explain health and body data handling');
  expectIncludes(termsSource, 'APP_BRAND_NAME', 'Terms page should expose the unified brand helper');
  expectIncludes(termsSource, '用户协议', 'Terms page should expose terms of service copy');
  expectIncludes(termsSource, '不替代医疗建议', 'Terms page should clarify fitness guidance limits');
  expectIncludes(deletionSource, 'APP_BRAND_NAME', 'Data deletion page should expose the unified brand helper');
  expectIncludes(deletionSource, '数据删除', 'Data deletion page should expose deletion instructions');
  expectIncludes(deletionSource, '个人中心', 'Data deletion page should route logged-in users to account actions');

  const unsavedChangesHookSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/use-unsaved-changes-warning.ts'), 'utf8');
  expectIncludes(unsavedChangesHookSource, 'beforeunload', 'Unsaved-changes hook should warn before the browser unloads');
  expectIncludes(unsavedChangesHookSource, 'window.confirm', 'Unsaved-changes hook should confirm before internal link navigation');

  const dietUrlStateSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/use-diet-page-url-state.ts'), 'utf8');
  expectIncludes(dietUrlStateSource, 'window.history.replaceState', 'Diet URL-state hook should persist local selection into the URL');
  expectIncludes(dietUrlStateSource, 'window.location.search', 'Diet URL-state hook should restore selection from the URL');

  const checkInUrlStateSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/use-check-in-url-state.ts'), 'utf8');
  expectIncludes(checkInUrlStateSource, 'window.history.replaceState', 'Check-in URL-state hook should persist local selection into the URL');
  expectIncludes(checkInUrlStateSource, 'window.location.search', 'Check-in URL-state hook should restore selection from the URL');

  const todayDashboardHookSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/use-today-dashboard.ts'), 'utf8');
  expectIncludes(todayDashboardHookSource, 'fetchToday', 'Today dashboard hook should own today data loading');
  expectIncludes(todayDashboardHookSource, 'generateAiGuide', 'Today dashboard hook should own AI guide generation');
  expectIncludes(todayDashboardHookSource, 'updateProfile', 'Today dashboard hook should own profile-save mutations');
  expectIncludes(todayDashboardHookSource, 'setStoredSessionOnboardingStatus\\(false\\)', 'Today dashboard hook should sync onboarding status when backend requires onboarding');
  expectIncludes(todayDashboardHookSource, 'describeUserFacingError', 'Today dashboard hook should normalize user-facing errors through the shared helper');

  const dietPlanEditorHookSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/use-diet-plan-editor.ts'), 'utf8');
  expectIncludes(dietPlanEditorHookSource, 'searchMealFoods', 'Diet plan editor hook should own meal search');
  expectIncludes(dietPlanEditorHookSource, 'upsertMealIntake', 'Diet plan editor hook should own meal replacement');
  expectIncludes(dietPlanEditorHookSource, 'removeMealIntake', 'Diet plan editor hook should own actual-meal removal');
  expectIncludes(dietPlanEditorHookSource, 'setStoredSessionOnboardingStatus\\(false\\)', 'Diet plan editor hook should sync onboarding status when backend requires onboarding');
  expectIncludes(dietPlanEditorHookSource, 'describeUserFacingError', 'Diet plan editor hook should normalize user-facing errors through the shared helper');

  const checkInEditorHookSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/use-check-in-editor.ts'), 'utf8');
  expectIncludes(checkInEditorHookSource, 'fetchCheckIn', 'Check-in editor hook should own record loading');
  expectIncludes(checkInEditorHookSource, 'submitCheckIn', 'Check-in editor hook should own submission');
  expectIncludes(checkInEditorHookSource, 'validateForm', 'Check-in editor hook should keep validation close to submission flow');
  expectIncludes(checkInEditorHookSource, 'setStoredSessionOnboardingStatus\\(false\\)', 'Check-in editor hook should sync onboarding status when backend requires onboarding');
  expectIncludes(checkInEditorHookSource, 'describeUserFacingError', 'Check-in editor hook should normalize user-facing errors through the shared helper');

  const todayDashboardViewSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/today-dashboard-view.ts'), 'utf8');
  expectIncludes(todayDashboardViewSource, 'buildHeroMetrics', 'Today dashboard view helper should expose hero metric derivation');
  expectIncludes(todayDashboardViewSource, 'buildCheckInInsight', 'Today dashboard view helper should expose check-in insight derivation');
  expectIncludes(todayDashboardViewSource, 'buildFocusOptions', 'Today dashboard view helper should expose focus option derivation');

  const dietPlanViewSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/diet-plan-view.ts'), 'utf8');
  expectIncludes(dietPlanViewSource, 'buildMealState', 'Diet plan view helper should expose meal-state derivation');
  expectIncludes(dietPlanViewSource, 'buildSearchState', 'Diet plan view helper should expose search-state derivation');
  expectIncludes(dietPlanViewSource, 'mergeUnique', 'Diet plan view helper should expose deduplicated guidance merging');

  const checkInViewSource = readFileSync(resolve(rootDirectory, 'apps/web/lib/check-in-view.ts'), 'utf8');
  expectIncludes(checkInViewSource, 'buildReadinessState', 'Check-in view helper should expose readiness-state derivation');
  expectIncludes(checkInViewSource, 'buildCoachTip', 'Check-in view helper should expose coach-tip derivation');
  expectIncludes(checkInViewSource, 'buildCompletionSummary', 'Check-in view helper should expose completion-summary derivation');

  for (const filePath of [
    'apps/web/app/today/page.tsx',
    'apps/web/app/status/page.tsx',
    'apps/web/app/review/page.tsx',
    'apps/web/app/check-in/page.tsx',
  ]) {
    const source = readFileSync(resolve(rootDirectory, filePath), 'utf8');
    expectNotIncludes(source, '>\\?+<', `${filePath} should not render raw question mark placeholders`);
  }

  console.log('web smoke test passed');
}

main();
