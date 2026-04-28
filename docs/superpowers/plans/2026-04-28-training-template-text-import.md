# Training Template Text Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为个人周训练模板增加“粘贴文字解析预览后确认覆盖”的导入能力，并修复训练模板相关页面与接口摘要中的中文乱码。

**Architecture:** 后端新增统一的文本解析与预览令牌流程，前端在现有模板编辑器中接入抽屉式导入交互。数据层对模板项与当日覆盖项做最小字段扩展，保证自由文本动作在 today 链路中不丢失，同时把当前训练模板页面和接口里的乱码清干净。

**Tech Stack:** NestJS、Prisma、Mock Prisma Store、Next.js App Router、React、Node test、现有 smoke test

---

## 文件结构

### 后端

- Create: `apps/api/src/modules/training-templates/dto/import-training-template-preview.dto.ts`
- Create: `apps/api/src/modules/training-templates/dto/apply-training-template-import.dto.ts`
- Create: `apps/api/src/modules/training-templates/training-template-import.parser.ts`
- Create: `apps/api/src/modules/training-templates/training-template-import.parser.spec.ts`
- Create: `apps/api/src/modules/training-templates/training-template-import-preview.store.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260428000000_training_template_text_import_fields/migration.sql`
- Modify: `apps/api/src/prisma/mock-store.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.controller.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.repository.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.module.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.repository.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
- Modify: `apps/api/src/modules/today/today.service.ts`
- Modify: `apps/api/src/modules/today/today.service.spec.ts`

### 前端

- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/account/training-templates/page.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-editor.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-list.tsx`
- Create: `apps/web/components/web/training-templates/training-template-import-drawer.tsx`
- Modify: `apps/web/components/web/today/training-plan-panel.tsx`
- Modify: `apps/web/lib/use-today-dashboard.ts`
- Modify: `apps/web/tests/smoke.test.mjs`

### 文档与验证

- Modify: `docs/superpowers/specs/2026-04-28-training-template-text-import-design.md`（只在实现偏离 spec 时回写）

---

### Task 1: 先把数据模型和乱码基线拉平

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260428000000_training_template_text_import_fields/migration.sql`
- Modify: `apps/api/src/prisma/mock-store.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.repository.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
- Modify: `apps/api/src/modules/today/today.service.ts`
- Modify: `apps/api/src/modules/today/today.service.spec.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.controller.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.ts`
- Modify: `apps/web/app/account/training-templates/page.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-editor.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-list.tsx`
- Modify: `apps/web/components/web/today/training-plan-panel.tsx`
- Modify: `apps/web/lib/use-today-dashboard.ts`
- Test: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
- Test: `apps/api/src/modules/today/today.service.spec.ts`

- [ ] **Step 1: 写数据结构回归测试，先锁住新字段会沿链路传递**

```ts
it('copies repText/sourceType/rawInput into the active override response', async () => {
  repository.findDailyPlanByIdAndUser = async () => ({
    id: 'daily-plan-1',
    trainingPlan: { id: 'system-plan', items: [] },
  });
  repository.findTemplateByIdAndUser = async () => ({
    id: 'template-1',
    days: [
      {
        id: 'day-1',
        weekday: 'tuesday',
        title: '胸肩三头',
        splitType: 'push_pull_legs',
        durationMinutes: 60,
        intensityLevel: 'high',
        notes: '',
        items: [
          {
            id: 'item-1',
            exerciseCode: 'free-text/cable-fly',
            exerciseName: '哑铃飞鸟',
            sets: 3,
            reps: '8-10',
            repText: '8+10+15',
            sourceType: 'free_text',
            rawInput: '哑铃飞鸟 8+10+15×3（10kg+7.5kg+5kg）',
            restSeconds: 90,
            notes: '肩后束',
          },
        ],
      },
    ],
  });
});
```

- [ ] **Step 2: 运行后端链路测试，确认现在因为缺字段而失败**

Run: `npm.cmd --prefix apps/api test -- training-overrides.service.spec.ts today.service.spec.ts --runInBand`

Expected: FAIL，报错里出现 `repText`、`sourceType` 或 `rawInput` 缺失。

- [ ] **Step 3: 扩展 Prisma、迁移和 mock store**

```prisma
model UserTrainingTemplateItem {
  id            String   @id @default(uuid())
  templateDayId String   @map("template_day_id")
  exerciseCode  String   @map("exercise_code") @db.VarChar(64)
  exerciseName  String   @map("exercise_name") @db.VarChar(128)
  sets          Int
  reps          String   @db.VarChar(32)
  repText       String?  @map("rep_text") @db.VarChar(64)
  sourceType    String   @default("standard") @map("source_type") @db.VarChar(16)
  rawInput      String?  @map("raw_input")
  restSeconds   Int      @map("rest_seconds")
  notes         String   @default("")
  displayOrder  Int      @map("display_order")
}

model DailyTrainingOverrideItem {
  id                      String  @id @default(uuid())
  dailyTrainingOverrideId String  @map("daily_training_override_id")
  sourceTemplateItemId    String? @map("source_template_item_id")
  exerciseCode            String  @map("exercise_code") @db.VarChar(64)
  exerciseName            String  @map("exercise_name") @db.VarChar(128)
  sets                    Int
  reps                    String  @db.VarChar(32)
  repText                 String? @map("rep_text") @db.VarChar(64)
  sourceType              String  @default("standard") @map("source_type") @db.VarChar(16)
  rawInput                String? @map("raw_input")
  restSeconds             Int     @map("rest_seconds")
  notes                   String  @default("")
  displayOrder            Int     @map("display_order")
}
```

```sql
ALTER TABLE user_training_template_items
  ADD COLUMN rep_text VARCHAR(64),
  ADD COLUMN source_type VARCHAR(16) NOT NULL DEFAULT 'standard',
  ADD COLUMN raw_input TEXT;

ALTER TABLE daily_training_override_items
  ADD COLUMN rep_text VARCHAR(64),
  ADD COLUMN source_type VARCHAR(16) NOT NULL DEFAULT 'standard',
  ADD COLUMN raw_input TEXT;
```

- [ ] **Step 4: 在 repository、service、today 映射里把新字段传通，同时修乱码文案**

```ts
items: (templateDay.items ?? []).map((item: any) => ({
  sourceTemplateItemId: item.id,
  exerciseCode: item.exerciseCode,
  exerciseName: item.exerciseName,
  sets: item.sets,
  reps: item.reps,
  repText: item.repText ?? item.reps,
  sourceType: item.sourceType ?? 'standard',
  rawInput: item.rawInput ?? null,
  restSeconds: item.restSeconds,
  notes: item.notes ?? '',
}))
```

```ts
return {
  id: item.id,
  exerciseCode: item.exerciseCode,
  exerciseName: item.exerciseName,
  sets: item.sets,
  reps: item.reps,
  repText: item.repText ?? item.reps,
  sourceType: item.sourceType ?? 'standard',
  rawInput: item.rawInput ?? null,
  restSeconds: item.restSeconds,
  notes: item.notes,
};
```

```ts
throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
throw new AppException('VALIDATION_ERROR', '只有启用状态的模板才能设为 today 来源。', 400);
```

- [ ] **Step 5: 跑链路测试，确认字段和乱码修正不破坏 today / override**

Run: `npm.cmd --prefix apps/api test -- training-overrides.service.spec.ts today.service.spec.ts --runInBand`

Expected: PASS，断言里能读取 `repText`、`sourceType`、`rawInput`。

- [ ] **Step 6: 提交这一层**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260428000000_training_template_text_import_fields/migration.sql apps/api/src/prisma/mock-store.ts apps/api/src/modules/training-overrides/training-overrides.repository.ts apps/api/src/modules/training-overrides/training-overrides.service.ts apps/api/src/modules/training-overrides/training-overrides.service.spec.ts apps/api/src/modules/today/today.service.ts apps/api/src/modules/today/today.service.spec.ts apps/api/src/modules/training-templates/training-templates.controller.ts apps/api/src/modules/training-templates/training-templates.service.ts apps/web/app/account/training-templates/page.tsx apps/web/components/web/training-templates/training-template-editor.tsx apps/web/components/web/training-templates/training-template-list.tsx apps/web/components/web/today/training-plan-panel.tsx apps/web/lib/use-today-dashboard.ts
git commit -m "refactor: normalize training template text fields"
```

### Task 2: 先做解析器和预览令牌，让后端能稳定产出预览

**Files:**
- Create: `apps/api/src/modules/training-templates/dto/import-training-template-preview.dto.ts`
- Create: `apps/api/src/modules/training-templates/training-template-import.parser.ts`
- Create: `apps/api/src/modules/training-templates/training-template-import.parser.spec.ts`
- Create: `apps/api/src/modules/training-templates/training-template-import-preview.store.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.module.ts`
- Test: `apps/api/src/modules/training-templates/training-template-import.parser.spec.ts`

- [ ] **Step 1: 先写纯解析器测试，覆盖样例里的关键写法**

```ts
it('parses partial weekdays with rest days, compound reps and warnings', () => {
  const result = parseTrainingTemplateImportText(`
周一 休息
周二 胸 肩 三头
杠铃卧推 8✖️4
哑铃飞鸟 8+10+15✖️2（10kg+7.5kg+5kg）
周天 背二头
二头超级组（站姿+坐姿 10+10✖️3）
`.trim());

  expect(result.parsedDays).toHaveLength(3);
  expect(result.parsedDays[0]).toMatchObject({ weekday: 'monday', dayType: 'rest' });
  expect(result.parsedDays[1].items[1]).toMatchObject({
    exerciseName: '哑铃飞鸟',
    sets: 2,
    repText: '8+10+15',
    matchStatus: 'warning',
  });
});
```

```ts
it('marks orphan lines as blocking errors', () => {
  const result = parseTrainingTemplateImportText('杠铃卧推 8×4');
  expect(result.errors[0]).toMatchObject({
    lineNumber: 1,
    blocking: true,
    message: '该行没有归属到任何周几。',
  });
});
```

- [ ] **Step 2: 运行解析测试，确认它先失败**

Run: `npm.cmd --prefix apps/api test -- training-template-import.parser.spec.ts --runInBand`

Expected: FAIL，提示 `parseTrainingTemplateImportText` 未定义。

- [ ] **Step 3: 实现解析器和预览存储**

```ts
export type ParsedImportItem = {
  rawLine: string;
  exerciseName: string;
  matchedExerciseCode: string | null;
  sets: number | null;
  reps: string | null;
  repText: string | null;
  notes: string;
  matchStatus: 'matched' | 'free_text' | 'warning' | 'invalid';
};

export function parseTrainingTemplateImportText(rawText: string) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  // 先识别周几，再把后续动作归组；无法归组的动作行直接报 blocking error。
}
```

```ts
@Injectable()
export class TrainingTemplateImportPreviewStore {
  private readonly previews = new Map<string, { templateId: string; createdAt: number; payload: ParsedImportPreview }>();

  save(templateId: string, payload: ParsedImportPreview) {
    const token = randomUUID();
    this.previews.set(token, { templateId, createdAt: Date.now(), payload });
    return token;
  }

  consume(token: string, maxAgeMs = 15 * 60 * 1000) {
    const preview = this.previews.get(token);
    if (!preview || Date.now() - preview.createdAt > maxAgeMs) {
      return null;
    }
    return preview;
  }
}
```

- [ ] **Step 4: 跑解析测试，确认对样例文本能给出稳定结果**

Run: `npm.cmd --prefix apps/api test -- training-template-import.parser.spec.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交解析器和预览存储**

```bash
git add apps/api/src/modules/training-templates/dto/import-training-template-preview.dto.ts apps/api/src/modules/training-templates/training-template-import.parser.ts apps/api/src/modules/training-templates/training-template-import.parser.spec.ts apps/api/src/modules/training-templates/training-template-import-preview.store.ts apps/api/src/modules/training-templates/training-templates.module.ts
git commit -m "feat: add training template text import parser"
```

### Task 3: 接上预览接口和确认覆盖接口

**Files:**
- Create: `apps/api/src/modules/training-templates/dto/apply-training-template-import.dto.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.controller.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.repository.ts`
- Modify: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Test: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`

- [ ] **Step 1: 先写 service 测试，锁住预览和确认的行为**

```ts
it('returns a preview token with parsed days and blocking errors', async () => {
  repository.findByIdAndUserId = async () => ({ id: 'template-1', userId: 'user-1', updatedAt: new Date().toISOString() });
  const result = await service.importPreview('user-1', {
    templateId: 'template-1',
    rawText: '周二 胸肩三头\\n杠铃卧推 8×4',
  });

  expect(result.previewToken).toBeDefined();
  expect(result.parsedDays[0].weekday).toBe('tuesday');
});
```

```ts
it('applies only selected weekdays from a valid preview token', async () => {
  const result = await service.applyImport('user-1', 'template-1', {
    previewToken: 'preview-1',
    selectedWeekdays: ['tuesday'],
  });

  expect(repository.replaceTemplateDaysFromImport).toHaveBeenCalledWith(
    'template-1',
    'user-1',
    ['tuesday'],
    expect.any(Array),
  );
});
```

- [ ] **Step 2: 运行 service 测试，确认现在因接口不存在而失败**

Run: `npm.cmd --prefix apps/api test -- training-templates.service.spec.ts --runInBand`

Expected: FAIL，缺少 `importPreview` / `applyImport` 方法或 DTO。

- [ ] **Step 3: 实现 DTO、controller 路由、service 逻辑和 repository 覆盖写入**

```ts
@Post('import-preview')
@ApiOperation({ summary: '解析训练模板文本并返回预览结果' })
importPreview(@CurrentUser() user: CurrentUserPayload, @Body() dto: ImportTrainingTemplatePreviewDto) {
  return this.trainingTemplatesService.importPreview(user.userId, dto);
}

@Post(':id/import-apply')
@ApiOperation({ summary: '确认导入训练模板文本并覆盖选中的周几' })
applyImport(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') id: string,
  @Body() dto: ApplyTrainingTemplateImportDto,
) {
  return this.trainingTemplatesService.applyImport(user.userId, id, dto);
}
```

```ts
async replaceTemplateDaysFromImport(
  templateId: string,
  userId: string,
  weekdays: string[],
  parsedDays: ParsedImportDay[],
) {
  return this.prisma.$transaction(async (tx) => {
    const existingDays = await tx.userTrainingTemplateDay.findMany({ where: { templateId, weekday: { in: weekdays } } });
    await tx.userTrainingTemplateItem.deleteMany({ where: { templateDayId: { in: existingDays.map((day) => day.id) } } });
    // 按 weekday 定位旧 day，更新 day 头信息，再重建 items。
  });
}
```

- [ ] **Step 4: 跑 service 测试，确认预览和确认接口稳定**

Run: `npm.cmd --prefix apps/api test -- training-templates.service.spec.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交接口层**

```bash
git add apps/api/src/modules/training-templates/dto/apply-training-template-import.dto.ts apps/api/src/modules/training-templates/training-templates.controller.ts apps/api/src/modules/training-templates/training-templates.service.ts apps/api/src/modules/training-templates/training-templates.repository.ts apps/api/src/modules/training-templates/training-templates.service.spec.ts
git commit -m "feat: add training template import preview and apply endpoints"
```

### Task 4: 接前端 API 和抽屉交互，完成“预览后确认覆盖”

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/account/training-templates/page.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-editor.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-list.tsx`
- Create: `apps/web/components/web/training-templates/training-template-import-drawer.tsx`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 先写 smoke test，锁住导入入口、抽屉和乱码清理**

```js
expectIncludes(
  readFileSync(resolve(rootDirectory, 'apps/web/components/web/training-templates/training-template-editor.tsx'), 'utf8'),
  '文字导入',
  'Training template editor should expose text import entry',
);
expectIncludes(
  readFileSync(resolve(rootDirectory, 'apps/web/components/web/training-templates/training-template-import-drawer.tsx'), 'utf8'),
  '开始解析',
  'Import drawer should render parse action',
);
expectIncludes(
  readFileSync(resolve(rootDirectory, 'apps/web/components/web/training-templates/training-template-import-drawer.tsx'), 'utf8'),
  '确认覆盖',
  'Import drawer should render apply action',
);
```

- [ ] **Step 2: 运行 smoke test，确认前端入口现在缺失**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: FAIL，提示找不到 `training-template-import-drawer.tsx` 或 `文字导入`。

- [ ] **Step 3: 在 API 层增加导入方法和类型**

```ts
export async function importTrainingTemplatePreview(
  token: string,
  payload: { templateId: string; rawText: string },
) {
  return requestJson<TrainingTemplateImportPreview>(
    '/users/me/training-templates/import-preview',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function applyTrainingTemplateImport(
  token: string,
  templateId: string,
  payload: { previewToken: string; selectedWeekdays: TrainingTemplateWeekday[] },
) {
  return requestJson<TrainingTemplateDetail>(
    `/users/me/training-templates/${templateId}/import-apply`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}
```

- [ ] **Step 4: 增加抽屉组件并接入编辑页**

```tsx
<button
  type="button"
  onClick={() => setImportDrawerOpen(true)}
  className="rounded-full border border-[#c7d8e5] px-4 py-2 text-sm font-semibold text-[#17324d]"
>
  文字导入
</button>
<TrainingTemplateImportDrawer
  open={importDrawerOpen}
  templateId={draft.id}
  onClose={() => setImportDrawerOpen(false)}
  onApplied={(nextTemplate) => onChange(nextTemplate)}
/>
```

```tsx
export function TrainingTemplateImportDrawer({ open, templateId, onClose, onApplied }: Props) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<TrainingTemplateImportPreview | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<TrainingTemplateWeekday[]>([]);
  // 解析、勾选、确认覆盖都在这里完成。
}
```

- [ ] **Step 5: 运行 smoke test，确认入口、抽屉和文案都已可见**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS。

- [ ] **Step 6: 提交前端交互**

```bash
git add apps/web/lib/api.ts apps/web/app/account/training-templates/page.tsx apps/web/components/web/training-templates/training-template-editor.tsx apps/web/components/web/training-templates/training-template-list.tsx apps/web/components/web/training-templates/training-template-import-drawer.tsx apps/web/tests/smoke.test.mjs
git commit -m "feat: add training template text import drawer"
```

### Task 5: 做全链路回归，确认 today 和上线前检查都过

**Files:**
- Modify: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Modify: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
- Modify: `apps/api/src/modules/today/today.service.spec.ts`
- Modify: `apps/web/tests/smoke.test.mjs`
- Modify: `apps/web/components/web/today/training-plan-panel.tsx`（仅在 today 卡片需要展示新增字段或修正文案时）
- Test: `apps/api/src/modules/training-templates/training-template-import.parser.spec.ts`
- Test: `apps/api/src/modules/training-templates/training-templates.service.spec.ts`
- Test: `apps/api/src/modules/training-overrides/training-overrides.service.spec.ts`
- Test: `apps/api/src/modules/today/today.service.spec.ts`
- Test: `apps/web/tests/smoke.test.mjs`
- Test: `apps/web/tests/hook-helpers.test.mjs`

- [ ] **Step 1: 加最终回归断言，覆盖“导入后应用到今天”**

```ts
it('uses imported free-text metadata when applying a template to today', async () => {
  const applied = await overridesService.apply('user-1', 'daily-plan-1', {
    templateId: 'template-1',
    weekday: 'tuesday',
  });

  expect(applied.activeTrainingPlan?.items[0]).toMatchObject({
    repText: '8+10+15',
    sourceType: 'free_text',
    rawInput: '哑铃飞鸟 8+10+15×3（10kg+7.5kg+5kg）',
  });
});
```

- [ ] **Step 2: 跑定向后端测试**

Run: `npm.cmd --prefix apps/api test -- training-template-import.parser.spec.ts training-templates.service.spec.ts training-overrides.service.spec.ts today.service.spec.ts --runInBand`

Expected: PASS。

- [ ] **Step 3: 跑前端回归测试**

Run: `node apps/web/tests/hook-helpers.test.mjs`

Expected: PASS。

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS。

- [ ] **Step 4: 跑类型检查和构建**

Run: `npm.cmd run typecheck`

Expected: PASS。

Run: `npm.cmd run build`

Expected: PASS。

- [ ] **Step 5: 提交回归与收尾**

```bash
git add apps/api/src/modules/training-templates/training-templates.service.spec.ts apps/api/src/modules/training-overrides/training-overrides.service.spec.ts apps/api/src/modules/today/today.service.spec.ts apps/web/tests/smoke.test.mjs apps/web/components/web/today/training-plan-panel.tsx
git commit -m "test: cover training template text import flow"
```

## Spec Coverage Check

1. “后端解析预览 + 前端确认覆盖” 由 Task 2、Task 3、Task 4 覆盖。
2. “允许只导入部分天” 由 Task 3 的 `selectedWeekdays` 覆盖。
3. “部分成功、部分报错” 由 Task 2 的解析器测试和错误结构覆盖。
4. “动作优先匹配标准动作库，匹配不上按自由文本保存” 由 Task 2 的解析器与 Task 3 的落库逻辑覆盖。
5. “模板链路字段扩展并传到 today / override” 由 Task 1 和 Task 5 覆盖。
6. “训练模板相关乱码修复” 由 Task 1 和 Task 4 覆盖。

## Placeholder Scan

1. 没有 `TODO`、`TBD`、`之后处理` 这类占位词。
2. 每个任务都带了明确文件、命令和预期结果。
3. 所有新增方法名、DTO 名、文件名在计划中保持一致。

## Type Consistency Check

1. 后端统一使用 `previewToken`、`selectedWeekdays`、`repText`、`sourceType`、`rawInput`。
2. 前端 API、抽屉组件、后端 DTO 使用同一组字段命名。
3. 解析器返回结构里的 `matchStatus` 只使用 `matched | free_text | warning | invalid`。
