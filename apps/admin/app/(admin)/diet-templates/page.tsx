"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { useApiResource } from "@/hooks/use-api-resource";
import type { DietTemplate } from "@/lib/contracts";
import { dietSceneOptions, goalTypeOptions, templateStatusOptions } from "@/lib/options";
import { queryString } from "@/lib/query-string";
import { formatDateTime } from "@/lib/utils";

const sceneLabelMap = { canteen: "食堂", dorm: "宿舍简做", home: "家庭烹饪" } as const;
const goalLabelMap = { cut: "减脂", maintain: "维持", bulk: "增肌" } as const;

export default function DietTemplatesPage() {
  const [filters, setFilters] = useState({ keyword: "", status: "all", scene: "all", goalType: "all" });
  const url = useMemo(() => `/api/v1/admin/diet-templates${queryString(filters)}`, [filters]);
  const { data, error, isLoading, reload } = useApiResource<DietTemplate[]>(url);

  return (
    <div className="space-y-6">
      <PageHeader
        title="饮食模板管理"
        description="支持列表、详情和编辑页。字段设计贴合饮食计划生成所需结构，便于后续直接对接规则引擎模板。"
        actions={[{ label: "新建饮食模板", href: "/diet-templates/new" }]}
      />
      <FilterBar
        fields={[
          { key: "keyword", label: "关键词", type: "search", placeholder: "搜索模板名、摘要、标签" },
          { key: "status", label: "状态", type: "select", options: templateStatusOptions },
          { key: "scene", label: "场景", type: "select", options: dietSceneOptions },
          { key: "goalType", label: "目标", type: "select", options: goalTypeOptions },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ keyword: "", status: "all", scene: "all", goalType: "all" })}
      />
      {isLoading ? <LoadingState title="正在加载饮食模板..." /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!isLoading && !error && data && data.length === 0 ? (
        <EmptyState title="暂无匹配模板" description="当前筛选条件下没有数据，可以调整筛选或创建新模板。" />
      ) : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <DataTable
          rows={data}
          rowKey={(row) => row.id}
          rowHref={(row) => `/diet-templates/${row.id}`}
          columns={[
            { key: "name", header: "模板名称", render: (row) => row.name },
            { key: "scene", header: "场景", render: (row) => sceneLabelMap[row.scene] },
            { key: "goal", header: "目标", render: (row) => goalLabelMap[row.goalType] },
            { key: "status", header: "状态", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "meals", header: "餐次数", render: (row) => `${row.meals.length} 项` },
            { key: "updatedAt", header: "更新时间", render: (row) => formatDateTime(row.updatedAt) },
            { key: "action", header: "操作", render: (row) => <Link className="text-leaf" href={`/diet-templates/${row.id}/edit`}>编辑</Link> },
          ]}
        />
      ) : null}
    </div>
  );
}
