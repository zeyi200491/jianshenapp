"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { TrainingTemplate } from "@/lib/contracts";

const splitLabelMap = { full_body: "全身", upper_lower: "上下肢", push_pull_legs: "推拉腿", cardio: "有氧", rest: "休息" } as const;
const experienceLabelMap = { beginner: "新手", intermediate: "中级" } as const;

export default function TrainingTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<TrainingTemplate>(`/api/v1/admin/training-templates/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载训练模板详情..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "模板不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.notes}
        actions={[{ label: "编辑模板", href: `/training-templates/${data.id}/edit` }]}
      />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex flex-wrap gap-2">
            <Badge tone={data.status}>{data.status}</Badge>
            <Badge tone="active">{splitLabelMap[data.splitType]}</Badge>
            <Badge tone="reviewed">{experienceLabelMap[data.experienceLevel]}</Badge>
          </div>
          <dl className="mt-6 space-y-4 text-sm text-black/60">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">版本号</dt>
              <dd className="mt-2 text-base text-ink">{data.version}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">训练参数</dt>
              <dd className="mt-2 text-base text-ink">{data.trainingDaysPerWeek} 天 / 周，{data.durationMinutes} 分钟，{data.intensityLevel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">训练标签</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {data.focusTags.map((tag) => <span key={tag} className="rounded-full bg-sand px-3 py-1 text-xs text-ink">{tag}</span>)}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">动作清单</h2>
            <Link href="/training-templates" className="text-sm text-leaf">返回列表</Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.items.map((item, index) => (
              <article key={`${item.exerciseCode}-${index}`} className="rounded-[24px] border border-black/6 bg-sand/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-black/45">{item.exerciseCode}</p>
                    <h3 className="mt-2 text-lg font-semibold text-ink">{item.exerciseName}</h3>
                  </div>
                  <div className="text-right text-sm text-black/55">
                    <p>{item.sets} 组 / {item.reps}</p>
                    <p>休息 {item.restSeconds} 秒</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-black/65">{item.notes}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
