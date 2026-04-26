"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { useApiResource } from "@/hooks/use-api-resource";
import type { WeeklyTrainingTemplate } from "@/lib/contracts";
import { experienceOptions, goalTypeOptions, templateStatusOptions } from "@/lib/options";
import { queryString } from "@/lib/query-string";
import { formatDateTime } from "@/lib/utils";

const experienceLabelMap = { beginner: "新手", intermediate: "中级" } as const;
const goalLabelMap = { cut: "减脂", maintain: "维持", bulk: "增肌" } as const;

export default function WeeklyTrainingTemplatesPage() {
  const [filters, setFilters] = useState({ keyword: "", status: "all", goalType: "all", experienceLevel: "all" });
  const url = useMemo(() => `/api/v1/admin/weekly-training-templates${queryString(filters)}`, [filters]);
  const { data, error, isLoading, reload } = useApiResource<WeeklyTrainingTemplate[]>(url);

  return (
    <div className="space-y-6">
      <PageHeader
        title="周训练模板"
        description="按周一到周天维护训练内容，显式配置休息日，并让系统自动补默认休息时间。"
        actions={[{ label: "新建周模板", href: "/weekly-training-templates/new" }]}
      />
      <FilterBar
        fields={[
          { key: "keyword", label: "关键词", type: "search", placeholder: "搜索模板名、说明、标签" },
          { key: "status", label: "状态", type: "select", options: templateStatusOptions },
          { key: "goalType", label: "目标", type: "select", options: goalTypeOptions },
          { key: "experienceLevel", label: "经验", type: "select", options: experienceOptions },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ keyword: "", status: "all", goalType: "all", experienceLevel: "all" })}
      />
      {isLoading ? <LoadingState title="正在加载周训练模板..." /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!isLoading && !error && data && data.length === 0 ? (
        <EmptyState title="暂无匹配周模板" description="调整筛选条件，或创建一个新的周训练模板。" />
      ) : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <DataTable
          rows={data}
          rowKey={(row) => row.id}
          rowHref={(row) => `/weekly-training-templates/${row.id}`}
          columns={[
            { key: "name", header: "模板名称", render: (row) => row.name },
            { key: "goal", header: "目标", render: (row) => goalLabelMap[row.goalType] },
            { key: "exp", header: "经验", render: (row) => experienceLabelMap[row.experienceLevel] },
            { key: "days", header: "天数", render: (row) => `${row.trainingDaysPerWeek} 天/周` },
            { key: "status", header: "状态", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "updatedAt", header: "更新时间", render: (row) => formatDateTime(row.updatedAt) },
            { key: "action", header: "操作", render: (row) => <Link className="text-leaf" href={`/weekly-training-templates/${row.id}/edit`}>编辑</Link> },
          ]}
        />
      ) : null}
    </div>
  );
}
