"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { WeeklyTrainingTemplateForm } from "@/components/admin/weekly-training-template-form";
import { useApiResource } from "@/hooks/use-api-resource";
import type { WeeklyTrainingTemplate } from "@/lib/contracts";

export default function EditWeeklyTrainingTemplatePage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<WeeklyTrainingTemplate>(`/api/v1/admin/weekly-training-templates/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载周训练模板..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "模板不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`编辑 ${data.name}`} description="修改一周七天的训练安排、动作类型和默认休息规则。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <WeeklyTrainingTemplateForm initialValue={data} mode="edit" />
      </div>
    </div>
  );
}
