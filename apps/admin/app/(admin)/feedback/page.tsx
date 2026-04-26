"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/resource-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { useApiResource } from "@/hooks/use-api-resource";
import type { UserFeedback } from "@/lib/contracts";
import { feedbackChannelOptions, feedbackStatusOptions, sentimentOptions } from "@/lib/options";
import { queryString } from "@/lib/query-string";
import { formatDateTime } from "@/lib/utils";

export default function FeedbackPage() {
  const [filters, setFilters] = useState({ keyword: "", status: "all", channel: "all", sentiment: "all" });
  const url = useMemo(() => `/api/v1/admin/feedback${queryString(filters)}`, [filters]);
  const { data, error, isLoading, reload } = useApiResource<UserFeedback[]>(url);

  return (
    <div className="space-y-6">
      <PageHeader title="用户反馈列表" description="当前仅做列表与详情查看，帮助运营快速聚焦模板、AI 和商品的可执行问题。" />
      <FilterBar
        fields={[
          { key: "keyword", label: "关键词", type: "search", placeholder: "搜索昵称、内容、来源页面" },
          { key: "status", label: "状态", type: "select", options: feedbackStatusOptions },
          { key: "channel", label: "来源", type: "select", options: feedbackChannelOptions },
          { key: "sentiment", label: "情绪", type: "select", options: sentimentOptions },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ keyword: "", status: "all", channel: "all", sentiment: "all" })}
      />
      {isLoading ? <LoadingState title="正在加载用户反馈..." /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {!isLoading && !error && data && data.length === 0 ? (
        <EmptyState title="暂无匹配反馈" description="当前筛选条件下没有反馈数据。" />
      ) : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <DataTable
          rows={data}
          rowKey={(row) => row.id}
          rowHref={(row) => `/feedback/${row.id}`}
          columns={[
            { key: "user", header: "用户", render: (row) => row.userNickname },
            { key: "channel", header: "来源", render: (row) => row.channel },
            { key: "content", header: "反馈内容", render: (row) => <span className="block max-w-[420px] truncate">{row.content}</span> },
            { key: "sentiment", header: "情绪", render: (row) => <Badge tone={row.sentiment}>{row.sentiment}</Badge> },
            { key: "status", header: "状态", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "createdAt", header: "提交时间", render: (row) => formatDateTime(row.createdAt) },
          ]}
        />
      ) : null}
    </div>
  );
}

