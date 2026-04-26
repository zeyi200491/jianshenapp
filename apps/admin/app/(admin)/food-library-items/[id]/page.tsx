"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { FoodLibraryItem } from "@/lib/contracts";
import {
  foodLibraryMealTypeLabelMap,
  foodLibrarySceneLabelMap,
  foodLibraryStatusLabelMap,
} from "@/lib/options";

export default function FoodLibraryItemDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<FoodLibraryItem>(`/api/v1/admin/food-library-items/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载食物详情..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "食物不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={data.name} description={data.code} actions={[{ label: "编辑食物", href: `/food-library-items/${data.id}/edit` }]} />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex flex-wrap gap-2">
            <Badge tone={data.status}>{foodLibraryStatusLabelMap[data.status]}</Badge>
          </div>
          <dl className="mt-6 space-y-4 text-sm text-black/60">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">食物编码</dt>
              <dd className="mt-2 text-base text-ink">{data.code}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">别名</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {data.aliases.length > 0 ? data.aliases.map((alias) => (
                  <span key={alias} className="rounded-full bg-sand px-3 py-1 text-xs text-ink">
                    {alias}
                  </span>
                )) : <span className="text-black/45">未设置</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">排序值</dt>
              <dd className="mt-2 text-base text-ink">{data.sortOrder}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">营养与使用场景</h2>
            <Link href="/food-library-items" className="text-sm text-leaf">
              返回列表
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-black/6 bg-sand/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">营养值</p>
              <p className="mt-3 text-sm leading-7 text-black/65">热量 {data.calories} kcal</p>
              <p className="text-sm leading-7 text-black/65">蛋白质 {data.proteinG} g</p>
              <p className="text-sm leading-7 text-black/65">碳水 {data.carbG} g</p>
              <p className="text-sm leading-7 text-black/65">脂肪 {data.fatG} g</p>
            </div>
            <div className="rounded-[24px] border border-black/6 bg-sand/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">适用场景</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.sceneTags.length > 0 ? data.sceneTags.map((tag) => (
                  <Badge key={tag} tone="reviewed">
                    {foodLibrarySceneLabelMap[tag]}
                  </Badge>
                )) : <span className="text-sm text-black/45">未设置</span>}
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.16em] text-black/45">推荐餐次</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.suggestedMealTypes.length > 0 ? data.suggestedMealTypes.map((mealType) => (
                  <Badge key={mealType} tone="active">
                    {foodLibraryMealTypeLabelMap[mealType]}
                  </Badge>
                )) : <span className="text-sm text-black/45">未设置</span>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
