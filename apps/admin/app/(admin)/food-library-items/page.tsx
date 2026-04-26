"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { useApiResource } from "@/hooks/use-api-resource";
import type { FoodLibraryItem } from "@/lib/contracts";
import {
  foodLibraryMealTypeLabelMap,
  foodLibrarySceneLabelMap,
  foodLibrarySceneOptions,
  foodLibraryStatusLabelMap,
  foodLibraryStatusOptions,
} from "@/lib/options";
import { queryString } from "@/lib/query-string";

export default function FoodLibraryItemsPage() {
  const [filters, setFilters] = useState({ keyword: "", status: "all", scene: "all" });
  const url = useMemo(() => `/api/v1/admin/food-library-items${queryString(filters)}`, [filters]);
  const { data, error, isLoading, reload } = useApiResource<FoodLibraryItem[]>(url);

  return (
    <div className="space-y-6">
      <PageHeader
        title="食物库管理"
        description="维护食物编码、营养值、适用场景与推荐餐次，供后台推荐和内容配置复用。"
        actions={[{ label: "新建食物", href: "/food-library-items/new" }]}
      />
      <FilterBar
        fields={[
          { key: "keyword", label: "关键词", type: "search", placeholder: "搜索编码、名称或别名" },
          { key: "status", label: "状态", type: "select", options: foodLibraryStatusOptions },
          { key: "scene", label: "场景", type: "select", options: foodLibrarySceneOptions },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ keyword: "", status: "all", scene: "all" })}
      />
      {isLoading ? <LoadingState title="正在加载食物库列表..." /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!isLoading && !error && data && data.length === 0 ? (
        <EmptyState title="暂无匹配食物" description="调整筛选条件或新建食物后，这里会显示结果。" />
      ) : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <DataTable
          rows={data}
          rowKey={(row) => row.id}
          rowHref={(row) => `/food-library-items/${row.id}`}
          columns={[
            { key: "code", header: "编码", render: (row) => row.code },
            { key: "name", header: "名称", render: (row) => row.name },
            {
              key: "sceneTags",
              header: "场景",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {row.sceneTags.map((tag) => (
                    <Badge key={tag} tone="reviewed">
                      {foodLibrarySceneLabelMap[tag]}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              key: "mealTypes",
              header: "餐次",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {row.suggestedMealTypes.map((mealType) => (
                    <Badge key={mealType} tone="active">
                      {foodLibraryMealTypeLabelMap[mealType]}
                    </Badge>
                  ))}
                </div>
              ),
            },
            { key: "calories", header: "热量", render: (row) => `${row.calories} kcal` },
            { key: "nutrition", header: "营养", render: (row) => `P ${row.proteinG} / C ${row.carbG} / F ${row.fatG}` },
            { key: "status", header: "状态", render: (row) => <Badge tone={row.status}>{foodLibraryStatusLabelMap[row.status]}</Badge> },
            { key: "sortOrder", header: "排序", render: (row) => row.sortOrder },
            {
              key: "action",
              header: "操作",
              render: (row) => (
                <Link className="text-leaf" href={`/food-library-items/${row.id}/edit`}>
                  编辑
                </Link>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
