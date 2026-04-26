"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { WeeklyTrainingTemplate, WeekdayKey } from "@/lib/contracts";

const weekdayLabels: Record<WeekdayKey, string> = {
  monday: "周一",
  tuesday: "周二",
  wednesday: "周三",
  thursday: "周四",
  friday: "周五",
  saturday: "周六",
  sunday: "周天",
};

const movementPatternLabelMap = {
  compound: "复合",
  isolation: "孤立",
  recovery: "恢复",
} as const;

export default function WeeklyTrainingTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<WeeklyTrainingTemplate>(`/api/v1/admin/weekly-training-templates/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载周训练模板详情..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "模板不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.notes}
        actions={[{ label: "编辑模板", href: `/weekly-training-templates/${data.id}/edit` }]}
      />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <div className="flex flex-wrap gap-2">
          <Badge tone={data.status}>{data.status}</Badge>
          <Badge tone="active">{data.goalType}</Badge>
          <Badge tone="reviewed">{data.experienceLevel}</Badge>
        </div>
        <p className="mt-4 text-sm text-black/60">{data.trainingDaysPerWeek} 天 / 周 · {data.intensityLevel}</p>
      </div>
      <div className="grid gap-4">
        {data.weekDays.map((day) => (
          <section key={day.weekday} className="rounded-[28px] border border-black/8 bg-white/88 p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl text-ink">{weekdayLabels[day.weekday]} · {day.title}</h2>
                <p className="mt-2 text-sm text-black/60">{day.notes}</p>
              </div>
              <Badge tone={day.dayType === "rest" ? "inactive" : "active"}>{day.dayType === "rest" ? "休息日" : "训练日"}</Badge>
            </div>
            {day.items.length ? (
              <div className="mt-4 space-y-3">
                {day.items.map((item, index) => (
                  <article key={`${day.weekday}-${index}`} className="rounded-[20px] border border-black/6 bg-sand/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-black/45">{item.exerciseCode}</p>
                        <h3 className="mt-2 text-lg font-semibold text-ink">{item.exerciseName}</h3>
                      </div>
                      <div className="text-right text-sm text-black/55">
                        <p>{item.sets} 组 / {item.reps}</p>
                        <p>{movementPatternLabelMap[item.movementPattern || "isolation"]} · 休息 {item.restSeconds} 秒</p>
                      </div>
                    </div>
                    {item.restHint ? <p className="mt-3 text-sm text-black/55">{item.restHint}</p> : null}
                    <p className="mt-3 text-sm leading-7 text-black/65">{item.notes}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] bg-sand/30 p-4 text-sm text-black/60">今天不安排力量训练，按休息说明执行恢复内容。</div>
            )}
          </section>
        ))}
      </div>
      <Link href="/weekly-training-templates" className="inline-flex text-sm text-leaf">返回列表</Link>
    </div>
  );
}
