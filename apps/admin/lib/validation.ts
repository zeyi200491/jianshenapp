import { z } from "zod";

const mealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().min(2, "请输入餐次标题"),
  targetCalories: z.number().int().min(0, "热量不能小于 0"),
  proteinG: z.number().int().min(0, "蛋白质不能小于 0"),
  carbsG: z.number().int().min(0, "碳水不能小于 0"),
  fatG: z.number().int().min(0, "脂肪不能小于 0"),
  suggestionText: z.string().min(6, "请输入推荐说明"),
  alternatives: z.array(z.string()).min(1, "至少填写一个替代项"),
});

const trainingItemSchema = z.object({
  exerciseCode: z.string().min(2, "请输入动作编码"),
  exerciseName: z.string().min(2, "请输入动作名称"),
  sets: z.number().int().min(1, "组数至少为 1"),
  reps: z.string().min(1, "请输入次数"),
  restSeconds: z.number().int().min(0, "休息时间不能小于 0"),
  movementPattern: z.enum(["compound", "isolation", "recovery"]).default("isolation"),
  restRuleSource: z.enum(["system", "manual"]).default("system"),
  restHint: z.string().optional().default(""),
  notes: z.string().min(2, "请输入动作说明"),
});

const weeklyTrainingDaySchema = z
  .object({
    weekday: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    dayType: z.enum(["training", "rest"]),
    title: z.string().min(2, "请输入当天标题"),
    notes: z.string().min(2, "请输入当天说明"),
    items: z.array(trainingItemSchema),
  })
  .superRefine((value, context) => {
    if (value.dayType === "training" && value.items.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "训练日至少要配置一个动作",
        path: ["items"],
      });
    }
  });

const foodLibraryItemSchema = z.object({
  code: z.string().trim().min(1, "食物编码不能为空").max(64, "食物编码不能超过 64 个字符"),
  name: z.string().trim().min(1, "食物名称不能为空").max(128, "食物名称不能超过 128 个字符"),
  aliases: z.array(z.string()).optional(),
  sceneTags: z.array(z.enum(["canteen", "cookable"])).optional(),
  suggestedMealTypes: z.array(z.enum(["breakfast", "lunch", "dinner"])).optional(),
  calories: z.number().int().min(0, "热量不能小于 0"),
  proteinG: z.number().int().min(0, "蛋白质不能小于 0"),
  carbG: z.number().int().min(0, "碳水不能小于 0"),
  fatG: z.number().int().min(0, "脂肪不能小于 0"),
  status: z.enum(["active", "inactive"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const dietTemplateSchema = z.object({
  name: z.string().min(2, "请输入模板名称"),
  scene: z.enum(["canteen", "dorm", "home"]),
  goalType: z.enum(["cut", "maintain", "bulk"]),
  status: z.enum(["draft", "active", "inactive"]),
  version: z.string().min(1, "请输入版本号"),
  summary: z.string().min(10, "请输入模板摘要"),
  tags: z.array(z.string()).min(1, "至少填写一个标签"),
  supplementNotes: z.string().min(4, "请输入补剂说明"),
  meals: z.array(mealSchema).min(1, "至少配置一个餐次"),
});

export const trainingTemplateSchema = z.object({
  name: z.string().min(2, "请输入模板名称"),
  splitType: z.enum(["full_body", "upper_lower", "push_pull_legs", "rest"]),
  goalType: z.enum(["cut", "maintain", "bulk"]),
  experienceLevel: z.enum(["beginner", "intermediate"]),
  trainingDaysPerWeek: z.number().int().min(1, "每周训练天数至少为 1").max(7, "每周训练天数不能超过 7"),
  status: z.enum(["draft", "active", "inactive"]),
  version: z.string().min(1, "请输入版本号"),
  durationMinutes: z.number().int().min(10, "训练时长至少 10 分钟"),
  intensityLevel: z.enum(["low", "medium", "high"]),
  focusTags: z.array(z.string()).min(1, "至少填写一个训练标签"),
  notes: z.string().min(8, "请输入训练说明"),
  items: z.array(trainingItemSchema).min(1, "至少配置一个动作"),
});

export const weeklyTrainingTemplateSchema = z.object({
  name: z.string().min(2, "请输入模板名称"),
  goalType: z.enum(["cut", "maintain", "bulk"]),
  experienceLevel: z.enum(["beginner", "intermediate"]),
  trainingDaysPerWeek: z.number().int().min(1, "每周训练天数至少为 1").max(7, "每周训练天数不能超过 7"),
  status: z.enum(["draft", "active", "inactive"]),
  version: z.string().min(1, "请输入版本号"),
  intensityLevel: z.enum(["low", "medium", "high"]),
  focusTags: z.array(z.string()).min(1, "至少填写一个训练标签"),
  notes: z.string().min(8, "请输入训练说明"),
  weekDays: z.array(weeklyTrainingDaySchema).length(7, "必须完整配置周一到周天"),
});

export const productSchema = z.object({
  name: z.string().min(2, "请输入商品名称"),
  categoryName: z.string().min(2, "请输入分类名称"),
  categorySlug: z.string().min(2, "请输入分类标识"),
  subtitle: z.string().min(4, "请输入副标题"),
  description: z.string().min(12, "请输入商品描述"),
  targetTags: z.array(z.string()).min(1, "至少填写一个目标标签"),
  sceneTags: z.array(z.string()).min(1, "至少填写一个场景标签"),
  priceCents: z.number().int().min(1, "价格必须大于 0"),
  coverImageUrl: z.string().url("请输入有效封面图片地址"),
  detailImages: z.array(z.string().url("请输入有效详情图片地址")).min(1, "至少填写一张详情图"),
  status: z.enum(["draft", "active", "inactive"]),
  sortOrder: z.number().int().min(0, "排序不能小于 0"),
});

export const foodLibraryItemCreateSchema = foodLibraryItemSchema;
export const foodLibraryItemPatchSchema = foodLibraryItemSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "至少提供一个字段",
});

export function flattenZodErrors(error: z.ZodError) {
  return error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const path = issue.path.join(".");
    accumulator[path] = issue.message;
    return accumulator;
  }, {});
}
