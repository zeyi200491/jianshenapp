"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { UserFeedback } from "@/lib/contracts";
import { formatDateTime } from "@/lib/utils";

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, reload } = useApiResource<UserFeedback>(`/api/v1/admin/feedback/${params.id}`);

  if (isLoading) {
    return <LoadingState title="正在加载反馈详情..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "反馈不存在"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`反馈：${data.userNickname}`} description="详情页聚焦原始文本、来源和处理状态，暂不引入复杂工单流。" />
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex flex-wrap gap-2">
            <Badge tone={data.sentiment}>{data.sentiment}</Badge>
            <Badge tone={data.status}>{data.status}</Badge>
            <Badge tone="reviewed">{data.channel}</Badge>
          </div>
          <dl className="mt-6 space-y-5 text-sm text-black/60">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">来源页面</dt>
              <dd className="mt-2 text-base text-ink">{data.sourcePage}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">评分</dt>
              <dd className="mt-2 text-base text-ink">{data.rating} / 5</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-black/40">提交时间</dt>
              <dd className="mt-2 text-base text-ink">{formatDateTime(data.createdAt)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">反馈原文</h2>
            <Link href="/feedback" className="text-sm text-leaf">返回列表</Link>
          </div>
          <div className="mt-6 rounded-[24px] bg-sand/35 p-5 text-sm leading-8 text-black/70">{data.content}</div>
          <div className="mt-6 rounded-[24px] border border-dashed border-black/12 p-5 text-sm leading-7 text-black/55">
            当前状态为只读查看。若后续需要处理流转，可在正式后端补充反馈备注、指派人和关闭原因字段。
          </div>
        </section>
      </div>
    </div>
  );
}
