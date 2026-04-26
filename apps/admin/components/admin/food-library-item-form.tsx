"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFieldWrapper, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type { FoodLibraryItem } from "@/lib/contracts";
import {
  foodLibraryMealTypeSelectionOptions,
  foodLibrarySceneSelectionOptions,
  foodLibraryStatusSelectionOptions,
} from "@/lib/options";
import { flattenZodErrors, foodLibraryItemCreateSchema } from "@/lib/validation";
import { splitLines } from "@/lib/utils";

type FormValues = {
  code: string;
  name: string;
  aliases: string;
  sceneTags: string[];
  suggestedMealTypes: string[];
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  status: FoodLibraryItem["status"];
  sortOrder: number;
};

function createInitialValues(initialValue?: FoodLibraryItem): FormValues {
  return {
    code: initialValue?.code ?? "",
    name: initialValue?.name ?? "",
    aliases: (initialValue?.aliases ?? []).join("\n"),
    sceneTags: initialValue?.sceneTags ?? [],
    suggestedMealTypes: initialValue?.suggestedMealTypes ?? [],
    calories: initialValue?.calories ?? 0,
    proteinG: initialValue?.proteinG ?? 0,
    carbG: initialValue?.carbG ?? 0,
    fatG: initialValue?.fatG ?? 0,
    status: initialValue?.status ?? "active",
    sortOrder: initialValue?.sortOrder ?? 0,
  };
}

function normalizeFieldErrors(error: Parameters<typeof flattenZodErrors>[0]) {
  return Object.entries(flattenZodErrors(error)).reduce<Record<string, string>>((accumulator, [path, message]) => {
    const normalizedPath = path.startsWith("sceneTags")
      ? "sceneTags"
      : path.startsWith("suggestedMealTypes")
        ? "suggestedMealTypes"
        : path;

    if (!accumulator[normalizedPath]) {
      accumulator[normalizedPath] = message;
    }

    return accumulator;
  }, {});
}

export function FoodLibraryItemForm({
  initialValue,
  mode,
}: {
  initialValue?: FoodLibraryItem;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => createInitialValues(initialValue));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function getSelectedValues(event: ChangeEvent<HTMLSelectElement>) {
    return Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      code: values.code,
      name: values.name,
      aliases: splitLines(values.aliases),
      sceneTags: values.sceneTags,
      suggestedMealTypes: values.suggestedMealTypes,
      calories: values.calories,
      proteinG: values.proteinG,
      carbG: values.carbG,
      fatG: values.fatG,
      status: values.status,
      sortOrder: values.sortOrder,
    };

    const result = foodLibraryItemCreateSchema.safeParse(payload);
    if (!result.success) {
      setErrors(normalizeFieldErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await apiRequest<FoodLibraryItem>(
        mode === "create" ? "/api/v1/admin/food-library-items" : `/api/v1/admin/food-library-items/${initialValue?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(result.data),
        },
      );

      router.push(`/food-library-items/${response.id}`);
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
        <FormFieldWrapper label="食物编码" error={errors.code} hint="建议使用稳定的英文短编码。">
          <Input value={values.code} error={errors.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="食物名称" error={errors.name}>
          <Input value={values.name} error={errors.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="热量(kcal)" error={errors.calories}>
          <Input type="number" value={values.calories} error={errors.calories} onChange={(event) => setValues((current) => ({ ...current, calories: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="排序值" error={errors.sortOrder}>
          <Input type="number" value={values.sortOrder} error={errors.sortOrder} onChange={(event) => setValues((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="蛋白质(g)" error={errors.proteinG}>
          <Input type="number" value={values.proteinG} error={errors.proteinG} onChange={(event) => setValues((current) => ({ ...current, proteinG: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="碳水(g)" error={errors.carbG}>
          <Input type="number" value={values.carbG} error={errors.carbG} onChange={(event) => setValues((current) => ({ ...current, carbG: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="脂肪(g)" error={errors.fatG}>
          <Input type="number" value={values.fatG} error={errors.fatG} onChange={(event) => setValues((current) => ({ ...current, fatG: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="状态" error={errors.status}>
          <Select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as FoodLibraryItem["status"] }))}>
            {foodLibraryStatusSelectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormFieldWrapper>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormFieldWrapper label="别名" error={errors.aliases} hint="每行一个别名。">
          <Textarea value={values.aliases} error={errors.aliases} onChange={(event) => setValues((current) => ({ ...current, aliases: event.target.value }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="适用场景" error={errors.sceneTags} hint="按住 Ctrl/Command 可多选。">
          <Select
            multiple
            size={Math.max(2, foodLibrarySceneSelectionOptions.length)}
            value={values.sceneTags}
            error={errors.sceneTags}
            onChange={(event) => setValues((current) => ({ ...current, sceneTags: getSelectedValues(event) as FoodLibraryItem["sceneTags"] }))}
          >
            {foodLibrarySceneSelectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="推荐餐次" error={errors.suggestedMealTypes} hint="按住 Ctrl/Command 可多选。">
          <Select
            multiple
            size={Math.max(3, foodLibraryMealTypeSelectionOptions.length)}
            value={values.suggestedMealTypes}
            error={errors.suggestedMealTypes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                suggestedMealTypes: getSelectedValues(event) as FoodLibraryItem["suggestedMealTypes"],
              }))
            }
          >
            {foodLibraryMealTypeSelectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormFieldWrapper>
      </div>

      {submitError ? <p className="text-sm text-[#a14e3a]">{submitError}</p> : null}
      <div className="flex gap-3">
        <Button disabled={submitting} type="submit">
          {submitting ? "保存中..." : "保存食物"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  );
}
