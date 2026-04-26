"use client";

import { useParams } from "next/navigation";

import { DietTemplateForm } from "@/components/admin/diet-template-form";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { DietTemplate } from "@/lib/contracts";

export default function EditDietTemplatePage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<DietTemplate>(`/api/v1/admin/diet-templates/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载可编辑的饮食模板..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "模板不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`编辑：${data.name}`} description="所有字段都与模板接口结构一一对应，保存后直接回到详情页。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <DietTemplateForm initialValue={data} mode="edit" />
      </div>
    </div>
  );
}
