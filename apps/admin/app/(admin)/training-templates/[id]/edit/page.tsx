"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { TrainingTemplateForm } from "@/components/admin/training-template-form";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { TrainingTemplate } from "@/lib/contracts";

export default function EditTrainingTemplatePage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<TrainingTemplate>(`/api/v1/admin/training-templates/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载可编辑的训练模板..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "模板不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`编辑：${data.name}`} description="编辑页直接复用创建表单，便于保持字段与校验逻辑统一。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <TrainingTemplateForm initialValue={data} mode="edit" />
      </div>
    </div>
  );
}
