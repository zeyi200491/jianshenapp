"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFieldWrapper, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type { DietMeal, DietTemplate } from "@/lib/contracts";
import { mealTypeOptions } from "@/lib/options";
import { dietTemplateSchema, flattenZodErrors } from "@/lib/validation";
import { splitLines } from "@/lib/utils";

const defaultMeal: DietMeal = {
  mealType: "breakfast",
  title: "",
  targetCalories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  suggestionText: "",
  alternatives: [""],
};

export function DietTemplateForm({ initialValue, mode }: { initialValue?: DietTemplate; mode: "create" | "edit" }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: initialValue?.name ?? "",
    scene: initialValue?.scene ?? "canteen",
    goalType: initialValue?.goalType ?? "cut",
    status: initialValue?.status ?? "draft",
    version: initialValue?.version ?? "v1.0.0",
    summary: initialValue?.summary ?? "",
    tags: initialValue?.tags ?? [],
    supplementNotes: initialValue?.supplementNotes ?? "",
    meals: initialValue?.meals ?? [defaultMeal],
  });
  const [tagText, setTagText] = useState((initialValue?.tags ?? []).join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (mode === "create" ? "创建饮食模板" : "保存饮食模板"), [mode]);

  function updateMeal(index: number, key: keyof DietMeal, value: string | number | string[]) {
    setValues((current) => ({
      ...current,
      meals: current.meals.map((meal, mealIndex) => (mealIndex === index ? { ...meal, [key]: value } : meal)),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      ...values,
      tags: splitLines(tagText),
      meals: values.meals.map((meal) => ({
        ...meal,
        alternatives: meal.alternatives.filter(Boolean),
      })),
    };

    const result = dietTemplateSchema.safeParse(payload);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await apiRequest<DietTemplate>(
        mode === "create" ? "/api/v1/admin/diet-templates" : `/api/v1/admin/diet-templates/${initialValue?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(result.data),
        },
      );
      router.push(`/diet-templates/${response.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormFieldWrapper label="模板名称" error={errors.name}>
          <Input value={values.name} error={errors.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="版本号" error={errors.version}>
          <Input value={values.version} error={errors.version} onChange={(event) => setValues((current) => ({ ...current, version: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="饮食场景" error={errors.scene}>
          <Select value={values.scene} onChange={(event) => setValues((current) => ({ ...current, scene: event.target.value as DietTemplate["scene"] }))}>
            <option value="canteen">食堂</option>
            <option value="dorm">宿舍简做</option>
            <option value="home">家庭烹饪</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="目标类型" error={errors.goalType}>
          <Select value={values.goalType} onChange={(event) => setValues((current) => ({ ...current, goalType: event.target.value as DietTemplate["goalType"] }))}>
            <option value="cut">减脂</option>
            <option value="maintain">维持</option>
            <option value="bulk">增肌</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="状态" error={errors.status}>
          <Select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as DietTemplate["status"] }))}>
            <option value="draft">草稿</option>
            <option value="active">已启用</option>
            <option value="inactive">已停用</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="标签" error={errors.tags} hint="每行一个标签，例如：高蛋白、食堂党。">
          <Textarea value={tagText} error={errors.tags} onChange={(event) => setTagText(event.target.value)} />
        </FormFieldWrapper>
      </div>

      <FormFieldWrapper label="模板摘要" error={errors.summary}>
        <Textarea value={values.summary} error={errors.summary} onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))} />
      </FormFieldWrapper>

      <FormFieldWrapper label="补剂说明" error={errors.supplementNotes}>
        <Textarea
          value={values.supplementNotes}
          error={errors.supplementNotes}
          onChange={(event) => setValues((current) => ({ ...current, supplementNotes: event.target.value }))}
        />
      </FormFieldWrapper>

      <div className="space-y-4 rounded-[28px] border border-black/8 bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl text-ink">餐次配置</h3>
            <p className="text-sm text-black/55">支持新增、删除和逐餐编辑，字段和后端模板结构保持一致。</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setValues((current) => ({ ...current, meals: [...current.meals, defaultMeal] }))}
          >
            新增餐次
          </Button>
        </div>
        {errors.meals ? <p className="text-sm text-[#a14e3a]">{errors.meals}</p> : null}
        <div className="space-y-4">
          {values.meals.map((meal, index) => (
            <div key={`${meal.mealType}-${index}`} className="rounded-[24px] border border-black/8 bg-sand/45 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-medium text-ink">餐次 {index + 1}</p>
                {values.meals.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setValues((current) => ({ ...current, meals: current.meals.filter((_, mealIndex) => mealIndex !== index) }))}
                  >
                    删除
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <FormFieldWrapper label="餐次类型" error={errors[`meals.${index}.mealType`]}>
                  <Select value={meal.mealType} onChange={(event) => updateMeal(index, "mealType", event.target.value as DietMeal["mealType"])}>
                    {mealTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </FormFieldWrapper>
                <FormFieldWrapper label="标题" error={errors[`meals.${index}.title`]}>
                  <Input value={meal.title} error={errors[`meals.${index}.title`]} onChange={(event) => updateMeal(index, "title", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper label="目标热量" error={errors[`meals.${index}.targetCalories`]}>
                  <Input type="number" value={meal.targetCalories} error={errors[`meals.${index}.targetCalories`]} onChange={(event) => updateMeal(index, "targetCalories", Number(event.target.value))} />
                </FormFieldWrapper>
                <FormFieldWrapper label="蛋白质(g)" error={errors[`meals.${index}.proteinG`]}>
                  <Input type="number" value={meal.proteinG} error={errors[`meals.${index}.proteinG`]} onChange={(event) => updateMeal(index, "proteinG", Number(event.target.value))} />
                </FormFieldWrapper>
                <FormFieldWrapper label="碳水(g)" error={errors[`meals.${index}.carbsG`]}>
                  <Input type="number" value={meal.carbsG} error={errors[`meals.${index}.carbsG`]} onChange={(event) => updateMeal(index, "carbsG", Number(event.target.value))} />
                </FormFieldWrapper>
                <FormFieldWrapper label="脂肪(g)" error={errors[`meals.${index}.fatG`]}>
                  <Input type="number" value={meal.fatG} error={errors[`meals.${index}.fatG`]} onChange={(event) => updateMeal(index, "fatG", Number(event.target.value))} />
                </FormFieldWrapper>
              </div>
              <div className="mt-4 space-y-4">
                <FormFieldWrapper label="推荐说明" error={errors[`meals.${index}.suggestionText`]}>
                  <Textarea value={meal.suggestionText} error={errors[`meals.${index}.suggestionText`]} onChange={(event) => updateMeal(index, "suggestionText", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper label="替代方案" error={errors[`meals.${index}.alternatives`]} hint="每行一个替代方案。">
                  <Textarea
                    value={meal.alternatives.join("\n")}
                    error={errors[`meals.${index}.alternatives`]}
                    onChange={(event) => updateMeal(index, "alternatives", splitLines(event.target.value))}
                  />
                </FormFieldWrapper>
              </div>
            </div>
          ))}
        </div>
      </div>

      {submitError ? <p className="text-sm text-[#a14e3a]">{submitError}</p> : null}
      <div className="flex gap-3">
        <Button disabled={submitting} type="submit">{submitting ? `${title}中...` : title}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>取消</Button>
      </div>
    </form>
  );
}
