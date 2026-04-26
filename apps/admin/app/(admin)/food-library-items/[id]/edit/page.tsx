"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FoodLibraryItemForm } from "@/components/admin/food-library-item-form";
import { useApiResource } from "@/hooks/use-api-resource";
import type { FoodLibraryItem } from "@/lib/contracts";

export default function EditFoodLibraryItemPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<FoodLibraryItem>(`/api/v1/admin/food-library-items/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载可编辑的食物数据..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "食物不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`编辑：${data.name}`} description="编辑页与新建页共用同一套字段和校验，降低食物库数据漂移风险。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <FoodLibraryItemForm initialValue={data} mode="edit" />
      </div>
    </div>
  );
}
