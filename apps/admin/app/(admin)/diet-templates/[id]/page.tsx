"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { DietTemplate } from "@/lib/contracts";

const sceneLabelMap = { canteen: "食堂", dorm: "宿舍简做", home: "家庭烹饪" } as const;
const goalLabelMap = { cut: "减脂", maintain: "维持", bulk: "增肌" } as const;
const mealLabelMap = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" } as const;

export default function DietTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<DietTemplate>(`/api/v1/admin/diet-templates/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载饮食模板详情..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "模板不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.summary}
        actions={[{ label: "编辑模板", href: `/diet-templates/${data.id}/edit` }]}
      />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex flex-wrap gap-2">
            <Badge tone={data.status}>{data.status}</Badge>
            <Badge tone="active">{sceneLabelMap[data.scene]}</Badge>
            <Badge tone="reviewed">{goalLabelMap[data.goalType]}</Badge>
          </div>
          <dl className="mt-6 space-y-4 text-sm text-black/60">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">版本号</dt>
              <dd className="mt-2 text-base text-ink">{data.version}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">模板标签</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {data.tags.map((tag) => <span key={tag} className="rounded-full bg-sand px-3 py-1 text-xs text-ink">{tag}</span>)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">补剂说明</dt>
              <dd className="mt-2 leading-7 text-black/65">{data.supplementNotes}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">餐次结构</h2>
            <Link href="/diet-templates" className="text-sm text-leaf">返回列表</Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.meals.map((meal, index) => (
              <article key={`${meal.mealType}-${index}`} className="rounded-[24px] border border-black/6 bg-sand/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-black/45">{mealLabelMap[meal.mealType]}</p>
                    <h3 className="mt-2 text-lg font-semibold text-ink">{meal.title}</h3>
                  </div>
                  <div className="text-right text-sm text-black/55">
                    <p>{meal.targetCalories} kcal</p>
                    <p>P {meal.proteinG} / C {meal.carbsG} / F {meal.fatG}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-black/65">{meal.suggestionText}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {meal.alternatives.map((item) => <span key={item} className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs text-ink">{item}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
