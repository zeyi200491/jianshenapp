# 椋熺墿搴撶鐞?Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 鎶娾€滄悳绱㈠苟鏇挎崲浠婂ぉ杩欓鈥濅粠鍐欐椋熺墿甯搁噺鍗囩骇涓烘暟鎹簱椋熺墿搴擄紝骞舵彁渚涘彲鐪熸缁存姢鏁版嵁鐨勫悗鍙扮鐞嗛棴鐜€?
**Architecture:** 鍦?`apps/api` 鐨?`meal-intakes` 妯″潡鍐呮柊澧炴暟鎹簱椋熺墿搴撹兘鍔涘拰鍚庡彴绠＄悊鎺ュ彛锛屼繚鐣欑敤鎴峰疄闄呮憚鍏ョ殑蹇収鍐欏叆鏂瑰紡銆俙apps/admin` 鏂板椋熺墿搴撶鐞嗛〉闈紝浣嗘暟鎹潵婧愪笉鍐嶈蛋 `mock-store`锛岃€屾槸閫氳繃 admin app route 浠ｇ悊鍒扮湡瀹?API銆?
**Tech Stack:** Prisma + PostgreSQL銆丯estJS銆丯ext.js App Router銆乑od銆乶ode:test銆丣est

---

## 鏂囦欢缁撴瀯

### 鏁版嵁搴撲笌鍒濆鍖?
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_food_library_items/migration.sql`
- Modify: `scripts/local-seed.mjs`
- Modify: `scripts/db-init.mjs`
- Test: `tests/infrastructure.test.mjs`

### API 鎼滅储涓庢憚鍏ュ啓鍥?
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.module.ts`
- Create: `apps/api/src/modules/meal-intakes/food-library.repository.ts`
- Create: `apps/api/src/modules/meal-intakes/dto/admin-food-library-query.dto.ts`
- Create: `apps/api/src/modules/meal-intakes/dto/upsert-food-library-item.dto.ts`
- Create: `apps/api/src/modules/meal-intakes/admin-food-library.controller.ts`
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.service.ts`
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.service.spec.ts`

### Admin 浠ｇ悊涓庨〉闈?
- Modify: `apps/admin/lib/contracts.ts`
- Modify: `apps/admin/lib/validation.ts`
- Modify: `apps/admin/lib/options.ts`
- Modify: `apps/admin/lib/admin-nav.ts`
- Create: `apps/admin/components/admin/food-library-item-form.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/page.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/new/page.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/[id]/page.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/[id]/edit/page.tsx`
- Create: `apps/admin/app/api/v1/admin/food-library-items/route.ts`
- Create: `apps/admin/app/api/v1/admin/food-library-items/[id]/route.ts`

### Web 绔彁绀轰笌鍥炲綊

- Modify: `apps/web/lib/use-diet-plan-editor.ts`
- Modify: `apps/web/lib/diet-plan-view.ts`
- Modify: `apps/web/components/web/status/meal-search-section.tsx`
- Test: `tests/start-local-smoke.mjs`

---

### Task 1: 寤虹珛鏁版嵁搴撻鐗╁簱涓庡垵濮嬪寲閾捐矾

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_food_library_items/migration.sql`
- Modify: `scripts/local-seed.mjs`
- Modify: `scripts/db-init.mjs`
- Test: `tests/infrastructure.test.mjs`

- [ ] **Step 1: 鍐欏け璐ユ祴璇曪紝鍏堥攣瀹氭ā鍨嬪拰鍒濆鍖栧叆鍙?*

鍦?`tests/infrastructure.test.mjs` 杩藉姞涓や釜鏂█锛?
```js
test('food library prisma model exists', () => {
  const schema = stripBom(readFileSync(resolve(rootDirectory, 'apps/api/prisma/schema.prisma'), 'utf8'));
  assert.match(schema, /model FoodLibraryItem\s+\{/);
  assert.match(schema, /@@map\("food_library_items"\)/);
});

test('db init seeds food library items', () => {
  const seedScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/local-seed.mjs'), 'utf8'));
  const dbInitScript = stripBom(readFileSync(resolve(rootDirectory, 'scripts/db-init.mjs'), 'utf8'));
  assert.match(seedScript, /prisma\.foodLibraryItem\.upsert/);
  assert.match(dbInitScript, /scripts\/local-seed\.mjs|scripts\\local-seed\.mjs/);
});
```

- [ ] **Step 2: 杩愯娴嬭瘯锛岀‘璁ゅ畠鍏堝け璐?*

Run: `node tests\infrastructure.test.mjs`
Expected: FAIL锛屾彁绀虹己灏?`FoodLibraryItem` 鎴?`local-seed.mjs`/`db-init.mjs` 鐩稿叧鏂█涓嶆弧瓒炽€?
- [ ] **Step 3: 鍐欐渶灏忓疄鐜帮紝鏂板琛ㄥ苟鎶婃棫甯搁噺瀵煎叆涓虹瀛?*

鍦?`apps/api/prisma/schema.prisma` 澧炲姞妯″瀷锛?
```prisma
model FoodLibraryItem {
  id                 String   @id @default(uuid())
  code               String   @unique @db.VarChar(64)
  name               String   @db.VarChar(128)
  aliases            Json     @default("[]")
  sceneTags          Json     @map("scene_tags") @default("[]")
  suggestedMealTypes Json     @map("suggested_meal_types") @default("[]")
  calories           Int
  proteinG           Int      @map("protein_g")
  carbG              Int      @map("carb_g")
  fatG               Int      @map("fat_g")
  status             String   @default("active") @db.VarChar(16)
  sortOrder          Int      @default(0) @map("sort_order")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@map("food_library_items")
}
```

鍦?`scripts/local-seed.mjs` 杩藉姞骞傜瓑瀵肩锛?
```js
await prisma.foodLibraryItem.upsert({
  where: { code: 'fried-rice' },
  update: {
    name: '鐐掗キ',
    aliases: ['铔嬬倰楗?, '鎵窞鐐掗キ', '浠€閿︾倰楗?],
    sceneTags: ['canteen'],
    suggestedMealTypes: ['lunch', 'dinner'],
    calories: 680,
    proteinG: 18,
    carbG: 92,
    fatG: 24,
    status: 'active',
    sortOrder: 10,
  },
  create: {
    id: '70000000-0000-0000-0000-000000000001',
    code: 'fried-rice',
    name: '鐐掗キ',
    aliases: ['铔嬬倰楗?, '鎵窞鐐掗キ', '浠€閿︾倰楗?],
    sceneTags: ['canteen'],
    suggestedMealTypes: ['lunch', 'dinner'],
    calories: 680,
    proteinG: 18,
    carbG: 92,
    fatG: 24,
    status: 'active',
    sortOrder: 10,
  },
});
```

鍦?`scripts/db-init.mjs` 鍚屾 schema 鍚庤ˉ绉嶅瓙锛?
```js
console.log('[CampusFit DB] 姝ｅ湪鍐欏叆鏈満椋熺墿搴撶瀛?..');
runCommand(process.execPath, ['scripts/local-seed.mjs'], {
  cwd: ROOT_DIR,
  env: commandEnv,
});
```

- [ ] **Step 4: 鍐嶈窇娴嬭瘯锛岀‘璁ゅ熀纭€璁炬柦閾捐矾杞豢**

Run: `node tests\infrastructure.test.mjs`
Expected: PASS锛屽寘鍚?`FoodLibraryItem` 妯″瀷鍜?`db:init` 瑙﹀彂瀵肩鏂█銆?
- [ ] **Step 5: 鍋氫竴娆℃鏌ョ偣**

Run:

```bash
git rev-parse --show-toplevel
```

Expected:
- 濡傛灉鍛戒护鎴愬姛锛歚git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/... scripts/local-seed.mjs scripts/db-init.mjs tests/infrastructure.test.mjs`锛岀劧鍚?`git commit -m "feat: add food library storage and seed flow"`
- 濡傛灉鍛戒护澶辫触骞舵樉绀?`not a git repository`锛氬湪鎵ц璁板綍閲屽啓鏄庝互涓?5 涓枃浠跺凡瀹屾垚妫€鏌ョ偣锛岀劧鍚庤繘鍏ヤ笅涓€浠诲姟

### Task 2: 鎶婇椋熸悳绱笌瀹為檯鎽勫叆鍒囧埌鏁版嵁搴撻鐗╁簱

**Files:**
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.module.ts`
- Create: `apps/api/src/modules/meal-intakes/food-library.repository.ts`
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.service.ts`
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.service.spec.ts`

- [ ] **Step 1: 鍏堣ˉ澶辫触娴嬭瘯锛岄攣瀹氬埆鍚嶅懡涓€佸満鏅繃婊ゃ€佸仠鐢ㄨ繃婊ゅ拰蹇収鍐欏洖**

鍦?`apps/api/src/modules/meal-intakes/meal-intakes.service.spec.ts` 澧炲姞鍩轰簬鏁版嵁搴撲粨鍌?mock 鐨勬柇瑷€锛?
```js
it('searches foods by alias and excludes inactive items', async () => {
  const repository = createRepository();
  repository.searchFoodLibrary = jest.fn().mockResolvedValue([
    {
      id: 'food-1',
      code: 'oatmeal-yogurt-bowl',
      name: '鐕曢害閰稿ザ纰?,
      aliases: ['閰稿ザ鐕曢害'],
      sceneTags: ['cookable'],
      suggestedMealTypes: ['breakfast'],
      calories: 420,
      proteinG: 24,
      carbG: 48,
      fatG: 10,
      status: 'active',
      sortOrder: 1,
    },
  ]);
  const service = new MealIntakesService(repository);

  const result = await service.searchFoods('閰稿ザ鐕曢害', 'cookable');

  expect(repository.searchFoodLibrary).toHaveBeenCalledWith('閰稿ザ鐕曢害', 'cookable');
  expect(result[0].code).toBe('oatmeal-yogurt-bowl');
});
```

骞惰鐜版湁鍐欏叆娴嬭瘯鏂█涓嶅啀渚濊禆纭紪鐮佸父閲忥紝鑰屾槸渚濊禆浠撳偍杩斿洖鐨勬暟鎹簱椋熺墿鏁版嵁銆?
- [ ] **Step 2: 杩愯 API 鍗曟祴锛岀‘璁ゅ畠鍏堝け璐?*

Run: `npm.cmd --prefix apps\api test -- meal-intakes.service.spec.ts`
Expected: FAIL锛屾彁绀?`searchFoodLibrary` 鎴栨暟鎹簱椋熺墿璇诲彇閾捐矾涓嶅瓨鍦ㄣ€?
- [ ] **Step 3: 鍐欐渶灏忓疄鐜帮紝鎶婇鐗╁父閲忔浛鎹㈡垚浠撳偍鏌ヨ**

鍒涘缓 `food-library.repository.ts`锛?
```ts
@Injectable()
export class FoodLibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  searchFoodLibrary(keyword: string, scene?: string) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return this.prisma.foodLibraryItem.findMany({
      where: {
        status: 'active',
        ...(scene ? { sceneTags: { array_contains: [scene] } } : {}),
        ...(normalizedKeyword
          ? {
              OR: [
                { name: { contains: normalizedKeyword, mode: 'insensitive' } },
                { aliases: { array_contains: [keyword.trim()] } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  findFoodByCode(code: string) {
    return this.prisma.foodLibraryItem.findUnique({ where: { code } });
  }
}
```

淇敼 `meal-intakes.service.ts`锛?
```ts
constructor(
  private readonly repository: MealIntakesRepository,
  private readonly foodLibraryRepository: FoodLibraryRepository,
) {}

async searchFoods(keyword: string, scene?: string) {
  const items = await this.foodLibraryRepository.searchFoodLibrary(keyword, scene);
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    aliases: item.aliases as string[],
    sceneTags: item.sceneTags as Array<'canteen' | 'cookable'>,
    sceneLabels: [],
    suggestedMealTypes: item.suggestedMealTypes as Array<'breakfast' | 'lunch' | 'dinner'>,
    nutritionPerMedium: {
      calories: item.calories,
      proteinG: item.proteinG,
      carbG: item.carbG,
      fatG: item.fatG,
    },
    portions: ['small', 'medium', 'large'],
  }));
}
```

骞跺湪鍐欏叆閫昏緫涓敼鐢?`findFoodByCode()` 璇诲彇椋熺墿鍚庡啀璁＄畻蹇収銆?
- [ ] **Step 4: 杩愯 API 鍗曟祴锛岀‘璁ゆ悳绱㈠拰鍐欏洖閫昏緫杞豢**

Run: `npm.cmd --prefix apps\api test -- meal-intakes.service.spec.ts`
Expected: PASS锛屾柊澧炲埆鍚嶆悳绱€佸仠鐢ㄨ繃婊ゃ€佸揩鐓у啓鍥炴柇瑷€鍏ㄩ儴閫氳繃銆?
- [ ] **Step 5: 鍋氫竴娆℃鏌ョ偣**

Run:

```bash
git rev-parse --show-toplevel
```

Expected:
- git 鍙敤锛歚git add apps/api/src/modules/meal-intakes/* apps/api/src/modules/meal-intakes/dto/*`锛岀劧鍚?`git commit -m "feat: query meal foods from database library"`
- git 涓嶅彲鐢細璁板綍鏈换鍔℃秹鍙婃枃浠跺凡瀹屾垚妫€鏌ョ偣

### Task 3: 鏂板鐪熷疄鍚庡彴椋熺墿搴撶鐞嗘帴鍙?
**Files:**
- Create: `apps/api/src/modules/meal-intakes/dto/admin-food-library-query.dto.ts`
- Create: `apps/api/src/modules/meal-intakes/dto/upsert-food-library-item.dto.ts`
- Create: `apps/api/src/modules/meal-intakes/admin-food-library.controller.ts`
- Modify: `apps/api/src/modules/meal-intakes/food-library.repository.ts`
- Modify: `apps/api/src/modules/meal-intakes/meal-intakes.module.ts`

- [ ] **Step 1: 鍏堝啓澶辫触娴嬭瘯锛岄攣瀹氬悗鍙板垪琛ㄧ瓫閫夊拰鏂板缓缂栬緫鐨勪粨鍌ㄥ绾?*

鍦?`apps/api/src/modules/meal-intakes/meal-intakes.service.spec.ts` 鎴栨柊寤?`food-library.repository.spec.ts` 鍐欎粨鍌?鏈嶅姟娴嬭瘯锛?
```js
it('lists admin food library items with keyword, status and scene filters', async () => {
  const repository = new FoodLibraryRepository(prismaMock);
  prismaMock.foodLibraryItem.findMany.mockResolvedValue([]);

  await repository.listAdminFoodLibraryItems({ keyword: '楦¤兏', status: 'active', scene: 'cookable' });

  expect(prismaMock.foodLibraryItem.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: 'active',
      }),
    }),
  );
});
```

- [ ] **Step 2: 璺戞祴璇曪紝纭鍚庡彴鎺ュ彛濂戠害杩樹笉瀛樺湪**

Run: `npm.cmd --prefix apps\api test -- meal-intakes.service.spec.ts`
Expected: FAIL锛屾彁绀?`listAdminFoodLibraryItems` 鎴?DTO/controller 鏈疄鐜般€?
- [ ] **Step 3: 鍐欐渶灏忓疄鐜帮紝鎻愪緵鐪熷疄 admin API**

鏂板 DTO锛?
```ts
export class AdminFoodLibraryQueryDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'all']) status?: 'active' | 'inactive' | 'all';
  @IsOptional() @IsIn(['canteen', 'cookable']) scene?: 'canteen' | 'cookable';
}
```

鏂板 controller锛?
```ts
@ApiTags('admin-food-library')
@ApiBearerAuth()
@Controller('admin/food-library-items')
export class AdminFoodLibraryController {
  constructor(private readonly foodLibraryRepository: FoodLibraryRepository) {}

  @Get()
  list(@Query() query: AdminFoodLibraryQueryDto) {
    return this.foodLibraryRepository.listAdminFoodLibraryItems(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.foodLibraryRepository.findAdminFoodLibraryItemById(id);
  }

  @Post()
  create(@Body() dto: UpsertFoodLibraryItemDto) {
    return this.foodLibraryRepository.createFoodLibraryItem(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertFoodLibraryItemDto) {
    return this.foodLibraryRepository.updateFoodLibraryItem(id, dto);
  }
}
```

鍦?`meal-intakes.module.ts` 鎸備笂 controller/provider锛?
```ts
@Module({
  controllers: [MealIntakesController, AdminFoodLibraryController],
  providers: [MealIntakesRepository, MealIntakesService, FoodLibraryRepository],
  exports: [MealIntakesService, FoodLibraryRepository],
})
```

- [ ] **Step 4: 鍐嶈窇 API 鍗曟祴锛岀‘璁ゅ悗鍙版帴鍙ｄ緷璧栭綈浜?*

Run: `npm.cmd --prefix apps\api test -- meal-intakes.service.spec.ts`
Expected: PASS锛屽悗鍙扮瓫閫変粨鍌ㄨ皟鐢ㄦ柇瑷€閫氳繃銆?
- [ ] **Step 5: 鍋氫竴娆℃鏌ョ偣**

Run:

```bash
git rev-parse --show-toplevel
```

Expected:
- git 鍙敤锛歚git add apps/api/src/modules/meal-intakes/*.ts apps/api/src/modules/meal-intakes/dto/*.ts`锛岀劧鍚?`git commit -m "feat: add admin food library api"`
- git 涓嶅彲鐢細璁板綍鏈换鍔℃秹鍙婃枃浠跺凡瀹屾垚妫€鏌ョ偣

### Task 4: 鎺ラ€?Admin 浠ｇ悊銆佸绾﹀拰琛ㄥ崟妯″瀷

**Files:**
- Modify: `apps/admin/lib/contracts.ts`
- Modify: `apps/admin/lib/validation.ts`
- Modify: `apps/admin/lib/options.ts`
- Modify: `apps/admin/lib/admin-nav.ts`
- Create: `apps/admin/app/api/v1/admin/food-library-items/route.ts`
- Create: `apps/admin/app/api/v1/admin/food-library-items/[id]/route.ts`

- [ ] **Step 1: 鍏堝啓澶辫触娴嬭瘯锛岄攣瀹氬悗鍙拌〃鍗曟暟鎹粨鏋勫拰浠ｇ悊璺敱瀛樺湪**

鏂板缓鏍圭骇娴嬭瘯 `tests/admin-food-library.test.mjs`锛?
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

test('admin food library routes and contracts exist', () => {
  assert.equal(existsSync(resolve(root, 'apps/admin/app/api/v1/admin/food-library-items/route.ts')), true);
  assert.equal(existsSync(resolve(root, 'apps/admin/app/api/v1/admin/food-library-items/[id]/route.ts')), true);
  const contracts = readFileSync(resolve(root, 'apps/admin/lib/contracts.ts'), 'utf8');
  assert.match(contracts, /export type FoodLibraryItem = \{/);
});
```

- [ ] **Step 2: 璺戞祴璇曪紝纭鍚庡彴濂戠害鍜屼唬鐞嗗叆鍙ｅ厛澶辫触**

Run: `node tests\admin-food-library.test.mjs`
Expected: FAIL锛屾彁绀?route 鎴?`FoodLibraryItem` 绫诲瀷涓嶅瓨鍦ㄣ€?
- [ ] **Step 3: 鍐欐渶灏忓疄鐜帮紝鎺ヤ笂鐪熷疄鍚庣浠ｇ悊鍜岃〃鍗?schema**

鍦?`apps/admin/lib/contracts.ts` 澧炲姞锛?
```ts
export type FoodLibraryItemStatus = "active" | "inactive";

export type FoodLibraryItem = {
  id: string;
  code: string;
  name: string;
  aliases: string[];
  sceneTags: Array<"canteen" | "cookable">;
  suggestedMealTypes: Array<"breakfast" | "lunch" | "dinner">;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  status: FoodLibraryItemStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
```

鍦?`apps/admin/lib/validation.ts` 澧炲姞锛?
```ts
export const foodLibraryItemSchema = z.object({
  code: z.string().min(2, "璇疯緭鍏ラ鐗╃紪鐮?),
  name: z.string().min(2, "璇疯緭鍏ラ鐗╁悕绉?),
  aliases: z.array(z.string()).min(1, "鑷冲皯濉啓涓€涓埆鍚?),
  sceneTags: z.array(z.enum(["canteen", "cookable"])).min(1, "鑷冲皯閫夋嫨涓€涓満鏅?),
  suggestedMealTypes: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1, "鑷冲皯閫夋嫨涓€涓帹鑽愰娆?),
  calories: z.number().int().min(1, "鐑噺蹇呴』澶т簬 0"),
  proteinG: z.number().int().min(0, "铔嬬櫧璐ㄤ笉鑳藉皬浜?0"),
  carbG: z.number().int().min(0, "纰虫按涓嶈兘灏忎簬 0"),
  fatG: z.number().int().min(0, "鑴傝偑涓嶈兘灏忎簬 0"),
  status: z.enum(["active", "inactive"]),
  sortOrder: z.number().int().min(0, "鎺掑簭涓嶈兘灏忎簬 0"),
});
```

鍦?admin app route 涓敤 `fetch` 浠ｇ悊鐪熷疄 API銆?
- [ ] **Step 4: 鍐嶈窇娴嬭瘯锛岀‘璁ゅ绾﹀拰浠ｇ悊鍏ュ彛榻愪簡**

Run: `node tests\admin-food-library.test.mjs`
Expected: PASS锛宺oute 鏂囦欢鍜?`FoodLibraryItem` 绫诲瀷鏂█鍏ㄩ儴閫氳繃銆?
- [ ] **Step 5: 鍋氫竴娆℃鏌ョ偣**

Run:

```bash
git rev-parse --show-toplevel
```

Expected:
- git 鍙敤锛歚git add apps/admin/lib/*.ts apps/admin/app/api/v1/admin/food-library-items/**/*.ts tests/admin-food-library.test.mjs`锛岀劧鍚?`git commit -m "feat: add admin food library proxy contracts"`
- git 涓嶅彲鐢細璁板綍鏈换鍔℃秹鍙婃枃浠跺凡瀹屾垚妫€鏌ョ偣

### Task 5: 瀹屾垚 Admin 椋熺墿搴撶鐞嗛〉闈?
**Files:**
- Create: `apps/admin/components/admin/food-library-item-form.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/page.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/new/page.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/[id]/page.tsx`
- Create: `apps/admin/app/(admin)/food-library-items/[id]/edit/page.tsx`

- [ ] **Step 1: 鍏堝啓澶辫触娴嬭瘯锛岄攣瀹氶〉闈㈠叆鍙ｅ拰琛ㄥ崟缁勪欢瀛樺湪**

鎵╁睍 `tests/admin-food-library.test.mjs`锛?
```js
test('admin food library pages and form exist', () => {
  assert.equal(existsSync(resolve(root, 'apps/admin/components/admin/food-library-item-form.tsx')), true);
  assert.equal(existsSync(resolve(root, 'apps/admin/app/(admin)/food-library-items/page.tsx')), true);
  assert.equal(existsSync(resolve(root, 'apps/admin/app/(admin)/food-library-items/new/page.tsx')), true);
  assert.equal(existsSync(resolve(root, 'apps/admin/app/(admin)/food-library-items/[id]/page.tsx')), true);
  assert.equal(existsSync(resolve(root, 'apps/admin/app/(admin)/food-library-items/[id]/edit/page.tsx')), true);
});
```

- [ ] **Step 2: 璺戞祴璇曪紝纭椤甸潰澹冲瓙杩樹笉瀛樺湪**

Run: `node tests\admin-food-library.test.mjs`
Expected: FAIL锛屾彁绀?page/form 鏂囦欢缂哄け銆?
- [ ] **Step 3: 鍐欐渶灏忓疄鐜帮紝鍋氬嚭鍒楄〃/璇︽儏/鏂板缓/缂栬緫椤?*

鍒楄〃椤垫部鐢?products 绠＄悊椤垫ā寮忥細

```tsx
const [filters, setFilters] = useState({ keyword: "", status: "all", scene: "all" });
const url = useMemo(() => `/api/v1/admin/food-library-items${queryString(filters)}`, [filters]);
const { data, error, isLoading, reload } = useApiResource<FoodLibraryItem[]>(url);
```

琛ㄥ崟缁勪欢缁熶竴澶勭悊鍒悕涓庡閫夊瓧娈碉細

```tsx
const [values, setValues] = useState({
  code: initialValue?.code ?? "",
  name: initialValue?.name ?? "",
  aliases: initialValue?.aliases ?? [""],
  sceneTags: initialValue?.sceneTags ?? ["cookable"],
  suggestedMealTypes: initialValue?.suggestedMealTypes ?? ["breakfast"],
  calories: initialValue?.calories ?? 0,
  proteinG: initialValue?.proteinG ?? 0,
  carbG: initialValue?.carbG ?? 0,
  fatG: initialValue?.fatG ?? 0,
  status: initialValue?.status ?? "active",
  sortOrder: initialValue?.sortOrder ?? 0,
});
```

- [ ] **Step 4: 璺?Admin 鏋勫缓锛岀‘璁ら〉闈㈠拰绫诲瀷娌℃湁缂栬瘧閿欒**

Run: `npm.cmd --prefix apps\admin run build`
Expected: PASS锛宍food-library-items` 椤甸潰銆佽〃鍗曞拰浠ｇ悊 route 鍧囪兘閫氳繃缂栬瘧銆?
- [ ] **Step 5: 鍋氫竴娆℃鏌ョ偣**

Run:

```bash
git rev-parse --show-toplevel
```

Expected:
- git 鍙敤锛歚git add apps/admin/components/admin/food-library-item-form.tsx apps/admin/app/(admin)/food-library-items/**/*.tsx`锛岀劧鍚?`git commit -m "feat: add admin food library pages"`
- git 涓嶅彲鐢細璁板綍鏈换鍔℃秹鍙婃枃浠跺凡瀹屾垚妫€鏌ョ偣

### Task 6: 浼樺寲 Web 鏂囨骞跺仛绔埌绔洖褰掗獙璇?
**Files:**
- Modify: `apps/web/lib/use-diet-plan-editor.ts`
- Modify: `apps/web/lib/diet-plan-view.ts`
- Modify: `apps/web/components/web/status/meal-search-section.tsx`
- Modify: `tests/start-local-smoke.mjs`

- [ ] **Step 1: 鍏堝啓澶辫触娴嬭瘯锛岄攣瀹氭柊鐨勬彁绀鸿涔?*

鍦?`tests/start-local-smoke.mjs` 鎴栨柊寤?`tests/meal-search-copy.test.mjs` 澧炲姞鏂█锛?
```js
const view = readFileSync(resolve(rootDirectory, 'apps/web/lib/diet-plan-view.ts'), 'utf8');
assert.match(view, /鍙敤椋熺墿搴?);
assert.match(view, /褰撳墠鍦烘櫙涓嬫病鏈夊尮閰嶉」/);
```

- [ ] **Step 2: 杩愯娴嬭瘯锛岀‘璁ゆ棫鏂囨鍏堝け璐?*

Run: `node tests\start-local-smoke.mjs`
Expected: FAIL锛屾彁绀烘柊鏂囨杩樻湭鍑虹幇銆?
- [ ] **Step 3: 鍐欐渶灏忓疄鐜帮紝鏄庣‘鍛婄煡鐢ㄦ埛杩欐槸鍙敤椋熺墿搴撴悳绱?*

淇敼 `apps/web/lib/diet-plan-view.ts` 鐨勬棤缁撴灉鎻愮ず锛?
```ts
return {
  value: '鏃犲尮閰?,
  detail: '褰撳墠鍦烘櫙涓嬫病鏈夊尮閰嶉」锛屽缓璁皾璇曟洿閫氱敤鐨勯鐗╁悕锛屾垨璁╁悗鍙拌ˉ鍏呭彲鐢ㄩ鐗╁簱銆?,
  kind: 'explained',
};
```

淇敼 `meal-search-section.tsx` 鏍囬鍜屾寜閽檮杩戞彁绀猴細

```tsx
<h2 className="mt-3 text-[34px] font-semibold text-[#17324d]">浠庡彲鐢ㄩ鐗╁簱鎼滅储骞舵浛鎹粖澶╄繖椁?/h2>
```

- [ ] **Step 4: 璺戞渶缁堝洖褰掗獙璇?*

Run:
- `node tests\infrastructure.test.mjs`
- `npm.cmd --prefix apps\api test -- meal-intakes.service.spec.ts`
- `node tests\admin-food-library.test.mjs`
- `npm.cmd --prefix apps\admin run build`
- `node tests\start-local-smoke.mjs`

Expected:
- 鎵€鏈夊懡浠ら€€鍑虹爜鍧囦负 `0`
- API 鎼滅储銆丄dmin 绠＄悊鍏ュ彛鍜?Web 鏂囨鍥炲綊鍏ㄩ儴閫氳繃

- [ ] **Step 5: 鍋氭渶缁堟鏌ョ偣**

Run:

```bash
git rev-parse --show-toplevel
```

Expected:
- git 鍙敤锛歚git add apps/web/lib/use-diet-plan-editor.ts apps/web/lib/diet-plan-view.ts apps/web/components/web/status/meal-search-section.tsx tests/start-local-smoke.mjs`锛岀劧鍚?`git commit -m "feat: polish meal search library messaging"`
- git 涓嶅彲鐢細璁板綍鏈换鍔℃秹鍙婃枃浠跺凡瀹屾垚妫€鏌ョ偣锛屽苟鍦ㄤ氦浠樿鏄庝腑鏄庣‘褰撳墠宸ヤ綔鍖烘病鏈?`.git`

---

## Self-Review

### Spec coverage

- 鏁版嵁搴撳瓨鍌ㄤ笌杩佺Щ锛歍ask 1
- Web 鎼滅储鍒囨暟鎹簱锛歍ask 2
- 鍘嗗彶鎽勫叆缁х画淇濆瓨蹇収锛歍ask 2
- 鐪熷疄鍚庡彴绠＄悊鎺ュ彛锛歍ask 3
- Admin 绠＄悊椤甸潰锛歍ask 4銆乀ask 5
- Web 鏂囨浼樺寲锛歍ask 6
- 绉嶅瓙鍜屾湰鍦板垵濮嬪寲锛歍ask 1

### Placeholder scan

- 娌℃湁 `TBD`銆乣TODO`銆乣implement later`
- 姣忎釜浠诲姟閮界粰浜嗙簿纭枃浠躲€佸懡浠ゃ€侀鏈熺粨鏋?- 鎵€鏈夊疄鐜版楠ら兘缁欎簡瀵瑰簲浠ｇ爜鐗囨

### Type consistency

- 椋熺墿瀹炰綋缁熶竴浣跨敤 `FoodLibraryItem`
- Web 鎼滅储缁撴灉缁熶竴淇濇寔 `MealFoodSearchResult`
- 鐘舵€佺粺涓€浣跨敤 `active` / `inactive`
- 鍦烘櫙缁熶竴浣跨敤 `canteen` / `cookable`

---

Plan complete and saved to `docs/superpowers/plans/2026-04-21-food-library-management.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

