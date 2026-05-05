"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { useApiResource } from "@/hooks/use-api-resource";
import type { TrainingTemplate } from "@/lib/contracts";
import { experienceOptions, splitTypeOptions, templateStatusOptions } from "@/lib/options";
import { queryString } from "@/lib/query-string";
import { formatDateTime } from "@/lib/utils";

const splitLabelMap = { full_body: "全身", upper_lower: "上下肢", push_pull_legs: "推拉腿", cardio: "有氧", rest: "休息" } as const;
const experienceLabelMap = { beginner: "新手", intermediate: "中级" } as const;

export default function TrainingTemplatesPage() {
  const [filters, setFilters] = useState({ keyword: "", status: "all", splitType: "all", experienceLevel: "all" });
  const url = useMemo(() => `/api/v1/admin/training-templates${queryString(filters)}`, [filters]);
  const { data, error, isLoading, reload } = useApiResource<TrainingTemplate[]>(url);

  return (
    <div className="space-y-6">
      <PageHeader
        title="训练模板管理"
        description="围绕训练经验、分化方式、每周训练天数和动作结构做配置，避免把复杂编排压到前端。"
        actions={[{ label: "新建训练模板", href: "/training-templates/new" }]}
      />
      <FilterBar
        fields={[
          { key: "keyword", label: "关键词", type: "search", placeholder: "搜索模板名、说明、标签" },
          { key: "status", label: "状态", type: "select", options: templateStatusOptions },
          { key: "splitType", label: "分化", type: "select", options: splitTypeOptions },
          { key: "experienceLevel", label: "经验", type: "select", options: experienceOptions },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ keyword: "", status: "all", splitType: "all", experienceLevel: "all" })}
      />
      {isLoading ? <LoadingState title="正在加载训练模板..." /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!isLoading && !error && data && data.length === 0 ? (
        <EmptyState title="暂无匹配训练模板" description="调整筛选条件，或创建一个新模板用于规则编排。" />
      ) : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <DataTable
          rows={data}
          rowKey={(row) => row.id}
          rowHref={(row) => `/training-templates/${row.id}`}
          columns={[
            { key: "name", header: "模板名称", render: (row) => row.name },
            { key: "split", header: "分化", render: (row) => splitLabelMap[row.splitType] },
            { key: "exp", header: "经验", render: (row) => experienceLabelMap[row.experienceLevel] },
            { key: "days", header: "天数", render: (row) => `${row.trainingDaysPerWeek} 天/周` },
            { key: "status", header: "状态", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "updatedAt", header: "更新时间", render: (row) => formatDateTime(row.updatedAt) },
            { key: "action", header: "操作", render: (row) => <Link className="text-leaf" href={`/training-templates/${row.id}/edit`}>编辑</Link> },
          ]}
        />
      ) : null}
    </div>
  );
}
