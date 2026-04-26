"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFieldWrapper, Input, Select, Textarea } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type {
  GoalType,
  IntensityLevel,
  RestRuleSource,
  TemplateStatus,
  TrainingItem,
  WeeklyTrainingDay,
  WeeklyTrainingTemplate,
  WeekdayKey,
} from "@/lib/contracts";
import { applyTrainingItemRule, detectMovementPattern, getDefaultRestSeconds, getRestHint } from "@/lib/training-template-rules";
import { flattenZodErrors, weeklyTrainingTemplateSchema } from "@/lib/validation";
import { splitLines } from "@/lib/utils";

const weekdayLabels: Record<WeekdayKey, string> = {
  monday: "周一",
  tuesday: "周二",
  wednesday: "周三",
  thursday: "周四",
  friday: "周五",
  saturday: "周六",
  sunday: "周天",
};

const weekdayOrder: WeekdayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const defaultItem: TrainingItem = applyTrainingItemRule({
  exerciseCode: "",
  exerciseName: "",
  sets: 3,
  reps: "10-12 次",
  restSeconds: 150,
  movementPattern: "isolation",
  restRuleSource: "system",
  notes: "填写动作重点或组合说明",
});

function createDefaultDay(weekday: WeekdayKey): WeeklyTrainingDay {
  const isRestDay = weekday === "monday" || weekday === "friday";

  return {
    weekday,
    dayType: isRestDay ? "rest" : "training",
    title: isRestDay ? "休息" : "",
    notes: isRestDay ? "安排轻活动、步行和拉伸恢复。" : "填写当天训练主题和执行重点。",
    items: isRestDay ? [] : [{ ...defaultItem }],
  };
}

function normalizeDay(day: WeeklyTrainingDay): WeeklyTrainingDay {
  return {
    ...day,
    items: day.items.map((item) => applyTrainingItemRule(item)),
  };
}

export function WeeklyTrainingTemplateForm({
  initialValue,
  mode,
}: {
  initialValue?: WeeklyTrainingTemplate;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: initialValue?.name ?? "",
    goalType: initialValue?.goalType ?? ("bulk" as GoalType),
    experienceLevel: initialValue?.experienceLevel ?? "intermediate",
    trainingDaysPerWeek: initialValue?.trainingDaysPerWeek ?? 5,
    status: initialValue?.status ?? ("draft" as TemplateStatus),
    version: initialValue?.version ?? "v1.0.0",
    intensityLevel: initialValue?.intensityLevel ?? ("high" as IntensityLevel),
    focusTags: initialValue?.focusTags ?? [],
    notes: initialValue?.notes ?? "",
    weekDays: initialValue?.weekDays.map((day) => normalizeDay(day)) ?? weekdayOrder.map((weekday) => createDefaultDay(weekday)),
  });
  const [focusTagText, setFocusTagText] = useState((initialValue?.focusTags ?? []).join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (mode === "create" ? "创建周训练模板" : "保存周训练模板"), [mode]);

  function updateDay(dayIndex: number, patch: Partial<WeeklyTrainingDay>) {
    setValues((current) => ({
      ...current,
      weekDays: current.weekDays.map((day, index) => {
        if (index !== dayIndex) {
          return day;
        }

        const nextDay = { ...day, ...patch };

        if (patch.dayType === "rest") {
          return {
            ...nextDay,
            title: nextDay.title || "休息",
            items: [],
          };
        }

        if (patch.dayType === "training" && nextDay.items.length === 0) {
          return {
            ...nextDay,
            items: [{ ...defaultItem }],
          };
        }

        return nextDay;
      }),
    }));
  }

  function updateDayItem(dayIndex: number, itemIndex: number, patch: Partial<TrainingItem>) {
    setValues((current) => ({
      ...current,
      weekDays: current.weekDays.map((day, index) => {
        if (index !== dayIndex) {
          return day;
        }

        return {
          ...day,
          items: day.items.map((item, currentItemIndex) => {
            if (currentItemIndex !== itemIndex) {
              return item;
            }

            const nextItem = { ...item, ...patch };

            if (patch.exerciseCode !== undefined || patch.exerciseName !== undefined) {
              nextItem.movementPattern = detectMovementPattern(nextItem.exerciseCode, nextItem.exerciseName);
            }

            if ((patch.movementPattern || nextItem.movementPattern) && nextItem.restRuleSource === "system") {
              nextItem.restSeconds = getDefaultRestSeconds(nextItem.movementPattern || "isolation");
            }

            nextItem.restHint = getRestHint(nextItem.movementPattern || "isolation", nextItem.restRuleSource || "system");

            return nextItem;
          }),
        };
      }),
    }));
  }

  function updateRestRuleSource(dayIndex: number, itemIndex: number, restRuleSource: RestRuleSource) {
    setValues((current) => ({
      ...current,
      weekDays: current.weekDays.map((day, index) => {
        if (index !== dayIndex) {
          return day;
        }

        return {
          ...day,
          items: day.items.map((item, currentItemIndex) => {
            if (currentItemIndex !== itemIndex) {
              return item;
            }

            const movementPattern = item.movementPattern || detectMovementPattern(item.exerciseCode, item.exerciseName);
            const restSeconds = restRuleSource === "system" ? getDefaultRestSeconds(movementPattern) : item.restSeconds;

            return {
              ...item,
              movementPattern,
              restRuleSource,
              restSeconds,
              restHint: getRestHint(movementPattern, restRuleSource),
            };
          }),
        };
      }),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      ...values,
      focusTags: splitLines(focusTagText),
      weekDays: values.weekDays.map((day) => ({
        ...day,
        items: day.items.map((item) => applyTrainingItemRule(item)),
      })),
    };

    const result = weeklyTrainingTemplateSchema.safeParse(payload);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await apiRequest<WeeklyTrainingTemplate>(
        mode === "create"
          ? "/api/v1/admin/weekly-training-templates"
          : `/api/v1/admin/weekly-training-templates/${initialValue?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(result.data),
        },
      );
      router.push(`/weekly-training-templates/${response.id}`);
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
        <FormFieldWrapper label="目标类型" error={errors.goalType}>
          <Select value={values.goalType} onChange={(event) => setValues((current) => ({ ...current, goalType: event.target.value as GoalType }))}>
            <option value="cut">减脂</option>
            <option value="maintain">维持</option>
            <option value="bulk">增肌</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="经验等级" error={errors.experienceLevel}>
          <Select value={values.experienceLevel} onChange={(event) => setValues((current) => ({ ...current, experienceLevel: event.target.value as "beginner" | "intermediate" }))}>
            <option value="beginner">新手</option>
            <option value="intermediate">中级</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="每周训练天数" error={errors.trainingDaysPerWeek}>
          <Input type="number" value={values.trainingDaysPerWeek} error={errors.trainingDaysPerWeek} onChange={(event) => setValues((current) => ({ ...current, trainingDaysPerWeek: Number(event.target.value) }))} />
        </FormFieldWrapper>
        <FormFieldWrapper label="强度等级" error={errors.intensityLevel}>
          <Select value={values.intensityLevel} onChange={(event) => setValues((current) => ({ ...current, intensityLevel: event.target.value as IntensityLevel }))}>
            <option value="low">低强度</option>
            <option value="medium">中强度</option>
            <option value="high">高强度</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="状态" error={errors.status}>
          <Select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as TemplateStatus }))}>
            <option value="draft">草稿</option>
            <option value="active">已启用</option>
            <option value="inactive">已停用</option>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper label="训练标签" error={errors.focusTags} hint="每行一个标签。">
          <Textarea value={focusTagText} error={errors.focusTags} onChange={(event) => setFocusTagText(event.target.value)} />
        </FormFieldWrapper>
      </div>

      <FormFieldWrapper label="模板总说明" error={errors.notes}>
        <Textarea value={values.notes} error={errors.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} />
      </FormFieldWrapper>

      <div className="space-y-4">
        {values.weekDays.map((day, dayIndex) => (
          <section key={day.weekday} className="rounded-[28px] border border-black/8 bg-white/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl text-ink">{weekdayLabels[day.weekday]}</h3>
                <p className="text-sm text-black/55">按天维护训练内容或休息安排。</p>
              </div>
              <div className="w-[180px]">
                <Select value={day.dayType} onChange={(event) => updateDay(dayIndex, { dayType: event.target.value as "training" | "rest" })}>
                  <option value="training">训练日</option>
                  <option value="rest">休息日</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FormFieldWrapper label="当天标题" error={errors[`weekDays.${dayIndex}.title`]}>
                <Input value={day.title} error={errors[`weekDays.${dayIndex}.title`]} onChange={(event) => updateDay(dayIndex, { title: event.target.value })} />
              </FormFieldWrapper>
              <FormFieldWrapper label="当天说明" error={errors[`weekDays.${dayIndex}.notes`]}>
                <Textarea value={day.notes} error={errors[`weekDays.${dayIndex}.notes`]} onChange={(event) => updateDay(dayIndex, { notes: event.target.value })} />
              </FormFieldWrapper>
            </div>

            {day.dayType === "training" ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">动作列表</p>
                  <Button type="button" variant="secondary" onClick={() => updateDay(dayIndex, { items: [...day.items, { ...defaultItem }] })}>
                    新增动作
                  </Button>
                </div>
                {day.items.map((item, itemIndex) => (
                  <div key={`${day.weekday}-${itemIndex}`} className="rounded-[24px] border border-black/8 bg-sand/45 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-medium text-ink">动作 {itemIndex + 1}</p>
                      {day.items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            updateDay(dayIndex, {
                              items: day.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
                            })
                          }
                        >
                          删除
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormFieldWrapper label="动作编码">
                        <Input value={item.exerciseCode} onChange={(event) => updateDayItem(dayIndex, itemIndex, { exerciseCode: event.target.value })} />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="动作名称">
                        <Input value={item.exerciseName} onChange={(event) => updateDayItem(dayIndex, itemIndex, { exerciseName: event.target.value })} />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="组数">
                        <Input type="number" value={item.sets} onChange={(event) => updateDayItem(dayIndex, itemIndex, { sets: Number(event.target.value) })} />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="次数">
                        <Input value={item.reps} onChange={(event) => updateDayItem(dayIndex, itemIndex, { reps: event.target.value })} />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="动作类型">
                        <Select value={item.movementPattern} onChange={(event) => updateDayItem(dayIndex, itemIndex, { movementPattern: event.target.value as TrainingItem["movementPattern"] })}>
                          <option value="compound">复合动作</option>
                          <option value="isolation">孤立动作</option>
                          <option value="recovery">恢复活动</option>
                        </Select>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="休息来源">
                        <Select value={item.restRuleSource} onChange={(event) => updateRestRuleSource(dayIndex, itemIndex, event.target.value as RestRuleSource)}>
                          <option value="system">系统默认</option>
                          <option value="manual">手动覆盖</option>
                        </Select>
                      </FormFieldWrapper>
                      <FormFieldWrapper label="休息秒数">
                        <Input type="number" value={item.restSeconds} disabled={item.restRuleSource === "system"} onChange={(event) => updateDayItem(dayIndex, itemIndex, { restSeconds: Number(event.target.value) })} />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="休息说明">
                        <Input value={item.restHint || ""} disabled />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="备注" error={errors[`weekDays.${dayIndex}.items.${itemIndex}.notes`]}>
                        <Textarea value={item.notes} error={errors[`weekDays.${dayIndex}.items.${itemIndex}.notes`]} onChange={(event) => updateDayItem(dayIndex, itemIndex, { notes: event.target.value })} />
                      </FormFieldWrapper>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {submitError ? <p className="text-sm text-[#a14e3a]">{submitError}</p> : null}
      <div className="flex gap-3">
        <Button disabled={submitting} type="submit">{submitting ? `${title}中...` : title}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>取消</Button>
      </div>
    </form>
  );
}
