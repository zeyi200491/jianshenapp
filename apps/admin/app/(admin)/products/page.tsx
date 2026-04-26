"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { useApiResource } from "@/hooks/use-api-resource";
import type { Product } from "@/lib/contracts";
import { productCategoryOptions, productTargetTagOptions, sceneTagOptions, templateStatusOptions } from "@/lib/options";
import { queryString } from "@/lib/query-string";
import { formatDateTime, formatPrice } from "@/lib/utils";

export default function ProductsPage() {
  const [filters, setFilters] = useState({ keyword: "", status: "all", category: "all", sceneTag: "all", targetTag: "all" });
  const url = useMemo(() => `/api/v1/admin/products${queryString(filters)}`, [filters]);
  const { data, error, isLoading, reload } = useApiResource<Product[]>(url);

  return (
    <div className="space-y-6">
      <PageHeader
        title="商品管理"
        description="商品侧仅覆盖 MVP 的基础展示信息维护，不做购物车、支付和复杂交易流程。"
        actions={[{ label: "新建商品", href: "/products/new" }]}
      />
      <FilterBar
        fields={[
          { key: "keyword", label: "关键词", type: "search", placeholder: "搜索商品名称、副标题、描述" },
          { key: "status", label: "状态", type: "select", options: templateStatusOptions },
          { key: "category", label: "分类", type: "select", options: productCategoryOptions },
          { key: "sceneTag", label: "适用场景", type: "select", options: sceneTagOptions },
          { key: "targetTag", label: "适用目标", type: "select", options: productTargetTagOptions },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ keyword: "", status: "all", category: "all", sceneTag: "all", targetTag: "all" })}
      />
      {isLoading ? <LoadingState title="正在加载商品列表..." /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!isLoading && !error && data && data.length === 0 ? (
        <EmptyState title="暂无匹配商品" description="调整筛选条件或创建新商品后，这里会展示结果。" />
      ) : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <DataTable
          rows={data}
          rowKey={(row) => row.id}
          rowHref={(row) => `/products/${row.id}`}
          columns={[
            { key: "name", header: "商品名称", render: (row) => row.name },
            { key: "category", header: "分类", render: (row) => row.categoryName },
            { key: "price", header: "价格", render: (row) => formatPrice(row.priceCents) },
            { key: "scene", header: "适用场景", render: (row) => row.sceneTags.join(" / ") },
            { key: "status", header: "状态", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "updatedAt", header: "更新时间", render: (row) => formatDateTime(row.updatedAt) },
            { key: "action", header: "操作", render: (row) => <Link className="text-leaf" href={`/products/${row.id}/edit`}>编辑</Link> },
          ]}
        />
      ) : null}
    </div>
  );
}

