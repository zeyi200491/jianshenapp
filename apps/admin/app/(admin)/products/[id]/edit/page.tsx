"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { Product } from "@/lib/contracts";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<Product>(`/api/v1/admin/products/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载可编辑的商品数据..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "商品不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`编辑：${data.name}`} description="编辑页只覆盖 MVP 商品字段，不延伸到库存或订单体系。" />
      <div className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
        <ProductForm initialValue={data} mode="edit" />
      </div>
    </div>
  );
}
