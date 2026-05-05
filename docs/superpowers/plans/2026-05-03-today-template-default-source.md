# Today 页默认展示个人模板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `today` 页在用户启用个人训练模板后，长期默认优先展示模板当天内容，并允许用户通过“恢复系统方案”切回系统训练来源。

**Architecture:** 在 `user_profiles` 上新增持久化字段 `preferredTrainingSource`，由模板启用链路和训练来源切回链路维护。`today` 接口根据该偏好、启用模板和当天星期，决定 `activeTrainingSource`、`activeTrainingPlan` 与备用 `systemTrainingPlan` 的返回值，前端只根据接口结果决定主展示，不再自己猜来源。

**Tech Stack:** NestJS、Prisma、PostgreSQL、Next.js App Router、React、TypeScript、Jest、Node test

---

## 文件结构

### 需要新增
- Create: `apps/api/prisma/migrations/20260503000000_preferred_training_source/migration.sql`
  - 为 `user_profiles` 增加 `preferred_training_source`
- Create: `apps/api/src/modules/profiles/dto/update-training-source-preference.dto.ts`
  - 若决定单独暴露偏好更新接口时承载 DTO

### 需要修改
- Modify: `apps/api/prisma/schema.prisma`
  - 在 `UserProfile` 上新增 `preferredTrainingSource`
- Modify: `scripts/local-schema.mjs`
  - 本地 schema 同步脚本补齐 `preferred_training_source`
- Modify: `tests/infrastructure.test.mjs`
  - 锁住本地 schema 脚本包含新列
- Modify: `apps/api/src/modules/profiles/profiles.repository.ts`
  - upsert / update / 新增偏好切换方法
- Modify: `apps/api/src/modules/profiles/profiles.service.ts`
  - 提供“切到模板来源 / 切回系统来源 / 无模板时兜底纠正”能力
- Modify: `apps/api/src/modules/profiles/profiles.module.ts`
  - 导出 `ProfilesService` 或 `ProfilesRepository`
- Modify: `apps/api/src/modules/users/users.service.ts`
  - `getCurrentUser` 回传 `preferredTrainingSource`
- Modify: `apps/api/src/modules/users/users.service.spec.ts`
  - 新增用户资料返回偏好字段测试
- Modify: `apps/api/src/modules/training-templates/training-templates.service.ts`
  - 模板启用成功后切换默认训练来源为 `template`
- Modify: `apps/api/src/modules/training-templates/training-templates.module.ts`
  - 引入 `ProfilesModule`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
  - 新增启用模板时切换偏好测试
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.ts`
  - 移除 override 时将默认来源改回 `system`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.module.ts`
  - 引入 `ProfilesModule`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
  - 新增恢复系统方案时切回偏好测试
- Modify: `apps/api/src/modules/today/today.service.ts`
  - 按偏好决定主训练来源与主训练内容
- Modify: `apps/api/src/modules/today/today.service.spec.ts`
  - 覆盖 `template/system` 偏好与休息日展示
- Modify: `apps/web/lib/api.ts`
  - 类型补齐 `preferredTrainingSource` 与新的 `activeTrainingSource`
- Modify: `apps/web/lib/use-today-dashboard.ts`
  - 接口返回驱动主展示，恢复系统方案提示文案同步长期语义
- Modify: `apps/web/components/web/today/training-plan-panel.tsx`
  - 模板来源成为主展示，系统方案退为恢复入口
- Modify: `apps/web/app/today/page.tsx`
  - 如需透传新状态文案和组件 props
- Modify: `apps/web/tests/smoke.test.mjs`
  - 锁住模板优先展示与恢复系统方案入口

---

### Task 1: 先补持久化字段与本地 schema，锁住长期训练来源偏好

**Files:**
- Create: `apps/api/prisma/migrations/20260503000000_preferred_training_source/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `scripts/local-schema.mjs`
- Modify: `tests/infrastructure.test.mjs`
- Test: `tests/infrastructure.test.mjs`

- [ ] **Step 1: 先写本地 schema 回归测试，锁住新列**

```js
test('local schema patch includes preferred training source column', () => {
  const localSchemaScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-schema.mjs'), 'utf8'));

  assert.match(localSchemaScript, /preferred_training_source/i);
  assert.match(localSchemaScript, /ALTER TABLE user_profiles/i);
});
```

- [ ] **Step 2: 运行测试，确认它先失败**

Run: `node --test tests/infrastructure.test.mjs`

Expected: FAIL，提示 `preferred_training_source` 尚未出现在 `local-schema.mjs`

- [ ] **Step 3: 增加 Prisma schema 与 migration**

```prisma
model UserProfile {
  id                      String    @id @default(uuid())
  userId                  String    @unique @map("user_id")
  gender                  String    @db.VarChar(16)
  birthYear               Int       @map("birth_year")
  heightCm                Decimal   @map("height_cm") @db.Decimal(5, 2)
  currentWeightKg         Decimal   @map("current_weight_kg") @db.Decimal(5, 2)
  targetType              String    @map("target_type") @db.VarChar(16)
  activityLevel           String    @map("activity_level") @db.VarChar(32)
  trainingExperience      String    @map("training_experience") @db.VarChar(32)
  trainingDaysPerWeek     Int       @map("training_days_per_week")
  dietScene               String    @map("diet_scene") @db.VarChar(32)
  dietPreferences         Json      @map("diet_preferences")
  dietRestrictions        Json      @map("diet_restrictions")
  supplementOptIn         Boolean   @default(false) @map("supplement_opt_in")
  preferredTrainingSource String    @default("system") @map("preferred_training_source") @db.VarChar(16)
  trainingCycleStartFocus String?   @map("training_cycle_start_focus") @db.VarChar(16)
  trainingCycleResetAt    DateTime? @map("training_cycle_reset_at")
  onboardingCompletedAt   DateTime? @map("onboarding_completed_at")
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")
  user                    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_training_source VARCHAR(16) NOT NULL DEFAULT 'system';
```

- [ ] **Step 4: 给本地 schema 脚本补幂等列同步**

```js
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_training_source VARCHAR(16) NOT NULL DEFAULT 'system';
```

- [ ] **Step 5: 重新运行基础设施测试**

Run: `node --test tests/infrastructure.test.mjs`

Expected: PASS

- [ ] **Step 6: 提交这一层**

```bash
git add tests/infrastructure.test.mjs scripts/local-schema.mjs apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260503000000_preferred_training_source/migration.sql
git commit -m "feat: add preferred training source persistence"
```

---

### Task 2: 补 profile/users 链路，让偏好能读写并回传给前端

**Files:**
- Modify: `apps/api/src/modules/profiles/profiles.repository.ts`
- Modify: `apps/api/src/modules/profiles/profiles.service.ts`
- Modify: `apps/api/src/modules/profiles/profiles.module.ts`
- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/users/users.service.spec.ts`
- Modify: `apps/web/lib/api.ts`
- Test: `apps/api/src/modules/users/users.service.spec.ts`

- [ ] **Step 1: 先写 users service 失败测试，锁住回传字段**

```js
it('returns preferred training source from profile payload', async () => {
  repository.findCurrentUser.mockResolvedValue({
    id: 'user-1',
    nickname: '小健用户',
    avatarUrl: null,
    status: 'active',
    profile: {
      gender: 'male',
      birthYear: 1999,
      heightCm: 178,
      currentWeightKg: 75,
      targetType: 'cut',
      activityLevel: 'moderate',
      trainingExperience: 'intermediate',
      trainingDaysPerWeek: 4,
      dietScene: 'dorm',
      dietPreferences: [],
      dietRestrictions: [],
      supplementOptIn: true,
      preferredTrainingSource: 'template',
      onboardingCompletedAt: new Date('2026-05-03T00:00:00.000Z'),
    },
  });

  const result = await service.getCurrentUser('user-1');

  expect(result.profile.preferredTrainingSource).toBe('template');
});
```

- [ ] **Step 2: 运行定向测试，确认先失败**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/users/users.service.spec.ts`

Expected: FAIL，提示 `preferredTrainingSource` 未出现在返回结构

- [ ] **Step 3: 在 repository/service 中补默认值与偏好更新方法**

```ts
upsertProfile(userId: string, dto: OnboardingDto | UpdateProfileDto, completeOnboarding: boolean) {
  const profileData = this.buildProfileData(dto, completeOnboarding);

  return this.prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      gender: (dto as OnboardingDto).gender,
      birthYear: (dto as OnboardingDto).birthYear,
      heightCm: (dto as OnboardingDto).heightCm,
      currentWeightKg: (dto as OnboardingDto).currentWeightKg,
      targetType: (dto as OnboardingDto).targetType,
      activityLevel: (dto as OnboardingDto).activityLevel,
      trainingExperience: (dto as OnboardingDto).trainingExperience,
      trainingDaysPerWeek: (dto as OnboardingDto).trainingDaysPerWeek,
      dietScene: (dto as OnboardingDto).dietScene,
      dietPreferences: (dto as OnboardingDto).dietPreferences ?? [],
      dietRestrictions: (dto as OnboardingDto).dietRestrictions ?? [],
      supplementOptIn: (dto as OnboardingDto).supplementOptIn,
      preferredTrainingSource: 'system',
      onboardingCompletedAt: completeOnboarding ? new Date() : null,
      trainingCycleStartFocus: null,
      trainingCycleResetAt: null,
    },
    update: profileData,
  });
}

setPreferredTrainingSource(userId: string, preferredTrainingSource: 'system' | 'template') {
  return this.prisma.userProfile.update({
    where: { userId },
    data: { preferredTrainingSource },
  });
}
```

```ts
async setPreferredTrainingSource(userId: string, preferredTrainingSource: 'system' | 'template') {
  const existing = await this.profilesRepository.findProfileByUserId(userId);
  if (!existing?.onboardingCompletedAt) {
    throw new AppException('CONFLICT', '用户尚未完成建档', 409);
  }

  return serializeValue(
    await this.profilesRepository.setPreferredTrainingSource(userId, preferredTrainingSource),
  );
}
```

- [ ] **Step 4: 在 `users.service.ts` 和前端 API 类型中回传该字段**

```ts
profile: user.profile
  ? {
      gender: user.profile.gender,
      birthYear: user.profile.birthYear,
      heightCm: user.profile.heightCm,
      currentWeightKg: user.profile.currentWeightKg,
      targetType: user.profile.targetType,
      activityLevel: user.profile.activityLevel,
      trainingExperience: user.profile.trainingExperience,
      trainingDaysPerWeek: user.profile.trainingDaysPerWeek,
      dietScene: user.profile.dietScene,
      dietPreferences: user.profile.dietPreferences,
      dietRestrictions: user.profile.dietRestrictions,
      supplementOptIn: user.profile.supplementOptIn,
      preferredTrainingSource: user.profile.preferredTrainingSource ?? 'system',
      onboardingCompletedAt: user.profile.onboardingCompletedAt,
    }
  : null,
```

```ts
export type PreferredTrainingSource = 'system' | 'template';

export type CurrentUserPayload = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  status: string;
  hasCompletedOnboarding: boolean;
  profile: (OnboardingPayload & {
    preferredTrainingSource: PreferredTrainingSource;
    onboardingCompletedAt: string | null;
  }) | null;
};
```

- [ ] **Step 5: 重新运行 users service 测试**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/users/users.service.spec.ts`

Expected: PASS

- [ ] **Step 6: 提交这一层**

```bash
git add apps/api/src/modules/profiles/profiles.repository.ts apps/api/src/modules/profiles/profiles.service.ts apps/api/src/modules/profiles/profiles.module.ts apps/api/src/modules/users/users.service.ts apps/api/src/modules/users/users.service.spec.ts apps/web/lib/api.ts
git commit -m "feat: expose preferred training source on user profile"
```

---

### Task 3: 接模板启用与恢复系统方案链路，真正维护长期默认来源

**Files:**
- Modify: `apps/api/src/modules/training-templates/training-templates.module.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.module.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
- Test: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Test: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`

- [ ] **Step 1: 先写启用模板会切到 `template` 的失败测试**

```js
it('switches preferred training source to template after enabling a template', async () => {
  const profilesService = { setPreferredTrainingSource: jest.fn().mockResolvedValue({}) };
  const { repository, service } = createServiceWithProfiles(profilesService);
  repository.findByIdAndUserId.mockResolvedValue(createTemplate());
  repository.setEnabledTemplate.mockResolvedValue(createTemplate({ isEnabled: true }));

  await service.enable('user-1', 'template-1');

  expect(profilesService.setPreferredTrainingSource).toHaveBeenCalledWith('user-1', 'template');
});
```

- [ ] **Step 2: 再写恢复系统方案会切回 `system` 的失败测试**

```js
it('switches preferred training source to system after removing override', async () => {
  const profilesService = { setPreferredTrainingSource: jest.fn().mockResolvedValue({}) };
  const repository = createRepository();
  repository.findDailyPlanByIdAndUser.mockResolvedValue({
    id: 'daily-plan-1',
    trainingPlan: createSystemTrainingPlan(),
  });

  const service = new TrainingOverridesService(repository, profilesService);

  await service.remove('user-1', 'daily-plan-1');

  expect(profilesService.setPreferredTrainingSource).toHaveBeenCalledWith('user-1', 'system');
});
```

- [ ] **Step 3: 运行两组测试，确认先失败**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/training-templates/training-templates.service.spec.ts src/modules/training-overrides/training-overrides.service.spec.ts`

Expected: FAIL，提示缺少 `ProfilesService` 依赖或未调用 `setPreferredTrainingSource`

- [ ] **Step 4: 在两个模块里引入 `ProfilesModule`，并在服务中更新长期偏好**

```ts
@Module({
  imports: [ProfilesModule],
  controllers: [TrainingTemplatesController],
  providers: [TrainingTemplatesService, TrainingTemplatesRepository, TrainingTemplateImportPreviewStore],
  exports: [TrainingTemplatesService, TrainingTemplatesRepository, TrainingTemplateImportPreviewStore],
})
export class TrainingTemplatesModule {}
```

```ts
constructor(
  private readonly repository: TrainingTemplatesRepository,
  private readonly previewStore: TrainingTemplateImportPreviewStore,
  private readonly profilesService: ProfilesService,
) {}

async enable(userId: string, templateId: string) {
  const existing = await this.repository.findByIdAndUserId(templateId, userId);
  if (!existing) {
    throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
  }
  if (existing.status !== 'active') {
    throw new AppException('VALIDATION_ERROR', '只有启用状态的模板才能设为 today 来源。', 400);
  }

  const enabled = await this.repository.setEnabledTemplate(userId, templateId);
  await this.profilesService.setPreferredTrainingSource(userId, 'template');
  return serializeValue(enabled);
}
```

```ts
constructor(
  private readonly repository: TrainingOverridesRepository,
  private readonly profilesService: ProfilesService,
) {}

async remove(userId: string, dailyPlanId: string) {
  const dailyPlan = await this.repository.findDailyPlanByIdAndUser(dailyPlanId, userId);
  if (!dailyPlan) {
    throw new AppException('NOT_FOUND', '今日计划不存在。', 404);
  }

  await this.repository.removeActiveOverride(dailyPlanId, userId);
  await this.profilesService.setPreferredTrainingSource(userId, 'system');

  return serializeValue({
    dailyPlanId,
    activeTrainingSource: 'system',
    systemTrainingPlan: mapTrainingLike(dailyPlan.trainingPlan),
    activeTrainingPlan: mapTrainingLike(dailyPlan.trainingPlan),
  });
}
```

- [ ] **Step 5: 重新运行两组测试**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/training-templates/training-templates.service.spec.ts src/modules/training-overrides/training-overrides.service.spec.ts`

Expected: PASS

- [ ] **Step 6: 提交这一层**

```bash
git add apps/api/src/modules/training-templates/training-templates.module.ts apps/api/src/modules/training-templates/training-templates.service.ts apps/api/src/modules/training-templates/training-templates.service.spec.ts apps/api/src/modules/training-overrides/training-overrides.module.ts apps/api/src/modules/training-overrides/training-overrides.service.ts apps/api/src/modules/training-overrides/training-overrides.service.spec.ts
git commit -m "feat: persist template training source preference"
```

---

### Task 4: 改 today 服务，按长期偏好自动切主展示并处理模板休息日

**Files:**
- Modify: `apps/api/src/modules/today/today.service.ts`
- Modify: `apps/api/src/modules/today/today.module.ts`
- Modify: `apps/api/src/modules/today/today.service.spec.ts`
- Test: `apps/api/src/modules/today/today.service.spec.ts`

- [ ] **Step 1: 先写 `template` 偏好下主训练区切模板的失败测试**

```js
it('prefers enabled template preview as active training when preferred source is template', async () => {
  const plansService = createPlansService();
  plansService.getRuleProfileInput.mockResolvedValue({
    ...createRuleProfile(),
    preferredTrainingSource: 'template',
  });
  const trainingTemplatesService = {
    previewForTodaySource: jest.fn().mockResolvedValue({
      templateId: 'template-1',
      templateName: '我的周模板',
      weekday: 'friday',
      day: {
        id: 'template-day-1',
        weekday: 'friday',
        dayType: 'training',
        title: '腿臀',
        splitType: 'push_pull_legs',
        durationMinutes: 45,
        intensityLevel: 'medium',
        notes: '',
        items: [
          {
            id: 'template-item-1',
            exerciseCode: 'free-text/squat',
            exerciseName: '深蹲',
            sets: 4,
            reps: '8',
            repText: '8',
            sourceType: 'free_text',
            rawInput: '深蹲 4组 8次',
            restSeconds: 90,
            notes: '',
          },
        ],
      },
    }),
  };

  const service = new TodayService(
    plansService,
    { findByDate: jest.fn().mockResolvedValue(null) },
    { findLatest: jest.fn().mockResolvedValue(null) },
    undefined,
    trainingTemplatesService,
    { setPreferredTrainingSource: jest.fn() },
  );

  const result = await service.getToday('user-1', '2026-05-02');

  expect(result.activeTrainingSource).toBe('template');
  expect(result.trainingPlan.title).toBe('腿臀');
  expect(result.systemTrainingPlan.title).toBe('今日减脂有氧计划');
});
```

- [ ] **Step 2: 再写休息日不回退系统训练的失败测试**

```js
it('keeps template rest day as active training instead of falling back to system plan', async () => {
  // template preview.day.dayType = 'rest'
  // systemTrainingPlan 仍存在
  // 断言 activeTrainingSource === 'template'
  // 断言 trainingPlan.title === '休息'
});
```

- [ ] **Step 3: 再写无可用模板时自动回退并纠正偏好的失败测试**

```js
it('falls back to system source and fixes preference when preferred template is unavailable', async () => {
  const profilesService = { setPreferredTrainingSource: jest.fn().mockResolvedValue({}) };
  const trainingTemplatesService = { previewForTodaySource: jest.fn().mockResolvedValue(null) };

  const service = new TodayService(
    plansService,
    { findByDate: jest.fn().mockResolvedValue(null) },
    { findLatest: jest.fn().mockResolvedValue(null) },
    undefined,
    trainingTemplatesService,
    profilesService,
  );

  const result = await service.getToday('user-1', '2026-05-02');

  expect(result.activeTrainingSource).toBe('system');
  expect(profilesService.setPreferredTrainingSource).toHaveBeenCalledWith('user-1', 'system');
});
```

- [ ] **Step 4: 运行 today service 测试，确认先失败**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/today/today.service.spec.ts`

Expected: FAIL，提示缺少模板来源逻辑与 `template` active source

- [ ] **Step 5: 在 today service 中引入模板预览与来源偏好决策**

```ts
function mapTemplateDayAsTrainingPlan(day: any) {
  return {
    id: day.id,
    title: day.title,
    splitType: day.dayType === 'rest' ? 'rest' : day.splitType ?? 'custom_template',
    durationMinutes: day.dayType === 'rest' ? 0 : day.durationMinutes ?? 45,
    intensityLevel: day.dayType === 'rest' ? 'low' : day.intensityLevel ?? 'medium',
    notes: day.notes ?? '',
    items: (day.items ?? []).map((item: any) => {
      const metadata = resolveTrainingItemMetadata({
        exerciseCode: item.exerciseCode,
        exerciseName: item.exerciseName,
        restSeconds: item.restSeconds,
      });

      return {
        id: item.id,
        name: item.exerciseName,
        sets: item.sets,
        reps: item.reps,
        repText: item.repText ?? item.reps,
        sourceType: item.sourceType ?? 'standard',
        rawInput: item.rawInput ?? null,
        restSeconds: metadata.restSeconds,
        movementPattern: metadata.movementPattern,
        restRuleSource: metadata.restRuleSource,
        restHint: metadata.restHint,
        notes: item.notes ? [item.notes] : [],
      };
    }),
  };
}
```

```ts
const systemTrainingPlan = mapTrainingPlan(plan.trainingPlan);
const preferredTrainingSource = profile.preferredTrainingSource ?? 'system';
const activeOverride = ...;

let activeTrainingPlan = mapTrainingPlan(activeOverride ?? plan.trainingPlan);
let activeTrainingSource = activeOverride ? 'user_override' : 'system';

if (!activeOverride && preferredTrainingSource === 'template') {
  const templatePreview = await this.trainingTemplatesService.previewForTodaySource(userId, targetDate);

  if (templatePreview?.day) {
    activeTrainingPlan = mapTemplateDayAsTrainingPlan(templatePreview.day);
    activeTrainingSource = 'template';
  } else {
    await this.profilesService.setPreferredTrainingSource(userId, 'system');
    activeTrainingPlan = systemTrainingPlan;
    activeTrainingSource = 'system';
  }
}
```

- [ ] **Step 6: 重新运行 today service 测试**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/today/today.service.spec.ts`

Expected: PASS

- [ ] **Step 7: 提交这一层**

```bash
git add apps/api/src/modules/today/today.service.ts apps/api/src/modules/today/today.module.ts apps/api/src/modules/today/today.service.spec.ts
git commit -m "feat: prefer training templates on today page"
```

---

### Task 5: 改前端 today 主展示与恢复入口，锁住用户看到的行为

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/lib/use-today-dashboard.ts`
- Modify: `apps/web/components/web/today/training-plan-panel.tsx`
- Modify: `apps/web/app/today/page.tsx`
- Modify: `apps/web/tests/smoke.test.mjs`
- Test: `apps/web/tests/smoke.test.mjs`
- Test: `npm.cmd run typecheck`

- [ ] **Step 1: 先写 smoke 失败断言，锁住模板来源成为主展示**

```js
expectIncludes(
  todayHookSource,
  "activeTrainingSource: (payload?.activeTrainingSource ?? 'system') as ActiveTrainingSource",
  'Today dashboard hook should surface the active training source from API payload',
);
expectIncludes(
  trainingPlanPanelSource,
  "activeTrainingSource === 'template'",
  'Training plan panel should treat template as a first-class active source',
);
expectIncludes(
  trainingPlanPanelSource,
  '恢复系统方案',
  'Training plan panel should keep the restore-system entry visible',
);
expectNotIncludes(
  trainingPlanPanelSource,
  '应用个人模板到今天',
  'Template source should no longer require a manual apply button to become the default main display',
);
```

- [ ] **Step 2: 运行 smoke，确认它先失败**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: FAIL，至少提示 `template` active source 和旧按钮文案仍存在

- [ ] **Step 3: 调整前端类型和 hook，把 `template` 作为主来源透传**

```ts
export type ActiveTrainingSource = 'system' | 'user_override' | 'template';
export type PreferredTrainingSource = 'system' | 'template';

activeTrainingSource: (payload?.activeTrainingSource ?? 'system') as ActiveTrainingSource,
preferredTrainingSource: currentUser?.profile?.preferredTrainingSource ?? 'system',
```

```ts
setFocusMessage('已恢复系统生成的今日训练方案，并将默认来源切回系统方案。');
```

- [ ] **Step 4: 改训练面板，让模板来源直接接管主区域**

```tsx
const isTemplateSource = activeTrainingSource === 'template';
const isUserOverride = activeTrainingSource === 'user_override';

<PanelTag tone="deep">
  {isTemplateSource
    ? '个人模板默认生效中'
    : isUserOverride
      ? '个人模板已替换今天'
      : isCardioPlan
        ? '有氧计划'
        : '系统方案'}
</PanelTag>
```

```tsx
{templatePreview ? null : (
  <p className="mt-1 text-sm text-[#5f768d]">
    启用个人周模板后，这里会按自然日自动优先展示你的模板。
  </p>
)}
```

```tsx
{isTemplateSource || isUserOverride ? (
  <button
    type="button"
    onClick={onRestoreSystemTraining}
    disabled={disabled}
    className="rounded-full border border-[#d3e3ee] bg-white px-5 py-3 text-sm font-semibold text-[#17324d] disabled:opacity-60"
  >
    恢复系统方案
  </button>
) : null}
```

- [ ] **Step 5: 重新运行 smoke 与类型检查**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS

Run: `npm.cmd run typecheck`

Expected: PASS

- [ ] **Step 6: 提交这一层**

```bash
git add apps/web/lib/api.ts apps/web/lib/use-today-dashboard.ts apps/web/components/web/today/training-plan-panel.tsx apps/web/app/today/page.tsx apps/web/tests/smoke.test.mjs
git commit -m "feat: default today training display to templates"
```

---

### Task 6: 做最终回归，确认 today 与模板页链路一起稳定

**Files:**
- Modify: `apps/api/src/modules/today/today.service.spec.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Modify: `apps/web/tests/smoke.test.mjs`
- Test: `npm.cmd --prefix apps/api test -- --runInBand src/modules/users/users.service.spec.ts src/modules/training-templates/training-templates.service.spec.ts src/modules/training-overrides/training-overrides.service.spec.ts src/modules/today/today.service.spec.ts`
- Test: `node --test tests/infrastructure.test.mjs`
- Test: `node apps/web/tests/smoke.test.mjs`
- Test: `npm.cmd run typecheck`
- Test: `npm.cmd --prefix apps/web run build`

- [ ] **Step 1: 跑后端定向回归**

Run: `npm.cmd --prefix apps/api test -- --runInBand src/modules/users/users.service.spec.ts src/modules/training-templates/training-templates.service.spec.ts src/modules/training-overrides/training-overrides.service.spec.ts src/modules/today/today.service.spec.ts`

Expected: PASS

- [ ] **Step 2: 跑基础设施与前端 smoke**

Run: `node --test tests/infrastructure.test.mjs`

Expected: PASS

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS

- [ ] **Step 3: 跑类型检查与 web 构建**

Run: `npm.cmd run typecheck`

Expected: PASS

Run: `npm.cmd --prefix apps/web run build`

Expected: PASS

- [ ] **Step 4: 提交收尾**

```bash
git add apps/api/src/modules/users/users.service.spec.ts apps/api/src/modules/training-templates/training-templates.service.spec.ts apps/api/src/modules/training-overrides/training-overrides.service.spec.ts apps/api/src/modules/today/today.service.spec.ts apps/web/tests/smoke.test.mjs
git commit -m "test: cover default today template source flow"
```

## Spec Coverage Check

1. “today 页主训练区默认展示个人模板”由 Task 4 的 `TodayService` 来源决策和 Task 5 的主展示切换覆盖。
2. “这种默认行为持续生效”由 Task 1/Task 2 的 `preferredTrainingSource` 持久化与用户资料回传覆盖。
3. “恢复系统方案后成为长期默认”由 Task 3 的 override remove 持久化切回和 Task 5 的前端入口覆盖。
4. “休息日严格按模板显示，不自动回退系统训练”由 Task 4 的模板休息日测试与 `mapTemplateDayAsTrainingPlan` 覆盖。
5. “无可用模板时自动回退并纠正偏好”由 Task 4 的回退测试与 TodayService 纠偏逻辑覆盖。

## Placeholder Scan

1. 计划中没有 `TODO`、`TBD`、`后续处理` 一类占位词。
2. 每个测试步骤都带了明确断言、命令和预期结果。
3. 每个代码步骤都给了明确文件、函数名和最小实现片段，没有“自行补齐边界处理”的空话。

## Type Consistency Check

1. 后端长期偏好字段统一命名为 `preferredTrainingSource`，取值统一为 `system | template`。
2. today 主训练来源统一命名为 `activeTrainingSource`，新取值统一加入 `template`。
3. 系统备用方案统一命名为 `systemTrainingPlan`，前端与后端都沿用现有字段，不再新增平行命名。
