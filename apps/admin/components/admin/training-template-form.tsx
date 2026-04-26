"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFieldWrapper, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type { TrainingItem, TrainingTemplate } from "@/lib/contracts";
import { intensityOptions, splitTypeOptions } from "@/lib/options";
import { flattenZodErrors, trainingTemplateSchema } from "@/lib/validation";
import { splitLines } from "@/lib/utils";

const defaultItem: TrainingItem = {
  exerciseCode: "",
  exerciseName: "",
  sets: 3,
  reps: "10-12",
  restSeconds: 60,
  notes: "",
};

export function TrainingTemplateForm({ initialValue, mode }: { initialValue?: TrainingTemplate; mode: "create" | "edit" }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: initialValue?.name ?? "",
    splitType: initialValue?.splitType ?? "full_body",
    goalType: initialValue?.goalType ?? "cut",
    experienceLevel: initialValue?.experienceLevel ?? "beginner",
    trainingDaysPerWeek: initialValue?.trainingDaysPerWeek ?? 3,
    status: initialValue?.status ?? "draft",
    version: initialValue?.version ?? "v1.0.0",
    durationMinutes: initialValue?.durationMinutes ?? 45,
    intensityLevel: initialValue?.intensityLevel ?? "medium",
    focusTags: initialValue?.focusTags ?? [],
    notes: initialValue?.notes ?? "",
    items: initialValue?.items ?? [defaultItem],
  });
  const [focusTagText, setFocusTagText] = useState((initialValue?.focusTags ?? []).join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (mode === "create" ? "创建训练模板" : "保存训练模板"), [mode]);

  function updateItem(index: number, key: keyof TrainingItem, value: string | number) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      ...values,
      focusTags: splitLines(focusTagText),
    };

    const result = trainingTemplateSchema.safeParse(payload);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await apiRequest<TrainingTemplate>(
        mode === "create" ? "/api/v1/admin/training-templates" : `/api/v1/admin/training-templates/${initialValue?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(result.data),
        },
      );
      router.push(`/training-templates/${response.id}`);
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
        <FormFieldWrapper label="训练分化" error={errors.splitType}>
          <Select value={values.splitType} onChange={(event) => setValues((current) => ({ ...current, splitType: event.target.value as TrainingTemplate["splitType"] }))}>
            {splitTypeOptions.filter((option) => option.value !== "all").map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="目标类型" error={errors.goalType}>
          <Select value={values.goalType} onChange={(event) => setValues((current) => ({ ...current, goalType: event.target.value as TrainingTemplate["goalType"] }))}>
            <option value="cut">减脂</option>
            <option value="maintain">维持</option>
            <option value="bulk">增肌</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="经验等级" error={errors.experienceLevel}>
          <Select value={values.experienceLevel} onChange={(event) => setValues((current) => ({ ...current, experienceLevel: event.target.value as TrainingTemplate["experienceLevel"] }))}>
            <option value="beginner">新手</option>
            <option value="intermediate">中级</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="每周训练天数" error={errors.trainingDaysPerWeek}>
          <Input type="number" value={values.trainingDaysPerWeek} error={errors.trainingDaysPerWeek} onChange={(event) => setValues((current) => ({ ...current, trainingDaysPerWeek: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="训练时长(分钟)" error={errors.durationMinutes}>
          <Input type="number" value={values.durationMinutes} error={errors.durationMinutes} onChange={(event) => setValues((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="强度等级" error={errors.intensityLevel}>
          <Select value={values.intensityLevel} onChange={(event) => setValues((current) => ({ ...current, intensityLevel: event.target.value as TrainingTemplate["intensityLevel"] }))}>
            {intensityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="状态" error={errors.status}>
          <Select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as TrainingTemplate["status"] }))}>
            <option value="draft">草稿</option>
            <option value="active">已启用</option>
            <option value="inactive">已停用</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="训练标签" error={errors.focusTags} hint="每行一个标签，例如：新手、器械友好。">
          <Textarea value={focusTagText} error={errors.focusTags} onChange={(event) => setFocusTagText(event.target.value)} />
        </FormFieldWrapper>
      </div>

      <FormFieldWrapper label="总说明" error={errors.notes}>
        <Textarea value={values.notes} error={errors.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} />
      </FormFieldWrapper>

      <div className="space-y-4 rounded-[28px] border border-black/8 bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl text-ink">动作配置</h3>
            <p className="text-sm text-black/55">动作、组次、休息时长和注意事项全部在此维护。</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setValues((current) => ({ ...current, items: [...current.items, defaultItem] }))}>
            新增动作
          </Button>
        </div>
        {errors.items ? <p className="text-sm text-[#a14e3a]">{errors.items}</p> : null}
        <div className="space-y-4">
          {values.items.map((item, index) => (
            <div key={`${item.exerciseCode}-${index}`} className="rounded-[24px] border border-black/8 bg-sand/45 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-medium text-ink">动作 {index + 1}</p>
                {values.items.length > 1 ? (
                  <Button type="button" variant="ghost" onClick={() => setValues((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>
                    删除
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <FormFieldWrapper label="动作编码" error={errors[`items.${index}.exerciseCode`]}>
                  <Input value={item.exerciseCode} error={errors[`items.${index}.exerciseCode`]} onChange={(event) => updateItem(index, "exerciseCode", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper label="动作名称" error={errors[`items.${index}.exerciseName`]}>
                  <Input value={item.exerciseName} error={errors[`items.${index}.exerciseName`]} onChange={(event) => updateItem(index, "exerciseName", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper label="组数" error={errors[`items.${index}.sets`]}>
                  <Input type="number" value={item.sets} error={errors[`items.${index}.sets`]} onChange={(event) => updateItem(index, "sets", Number(event.target.value))} />
                </FormFieldWrapper>
                <FormFieldWrapper label="次数" error={errors[`items.${index}.reps`]}>
                  <Input value={item.reps} error={errors[`items.${index}.reps`]} onChange={(event) => updateItem(index, "reps", event.target.value)} />
                </FormFieldWrapper>
                <FormFieldWrapper label="休息时长(秒)" error={errors[`items.${index}.restSeconds`]}>
                  <Input type="number" value={item.restSeconds} error={errors[`items.${index}.restSeconds`]} onChange={(event) => updateItem(index, "restSeconds", Number(event.target.value))} />
                </FormFieldWrapper>
                <FormFieldWrapper label="注意事项" error={errors[`items.${index}.notes`]}>
                  <Textarea value={item.notes} error={errors[`items.${index}.notes`]} onChange={(event) => updateItem(index, "notes", event.target.value)} />
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
