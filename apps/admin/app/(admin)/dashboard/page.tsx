"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/admin/metric-card";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/resource-state";
import { useApiResource } from "@/hooks/use-api-resource";
import type { DashboardMetrics } from "@/lib/contracts";
import { formatDateTime, formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const { data, error, isLoading, reload } = useApiResource<DashboardMetrics>("/api/v1/admin/dashboard/metrics");

  if (isLoading) {
    return <LoadingState title="正在加载基础数据总览..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "加载失败"} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="基础数据总览"
        description="围绕 MVP 的建档、计划查看、打卡、复盘、AI 和商品点击做轻量监控，不引入复杂图表。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="总用户数" value={data.totalUsers.toLocaleString("zh-CN")} hint="累计进入小程序并创建用户实体的人数。" />
        <MetricCard label="建档完成率" value={formatPercent(data.onboardingCompletionRate)} hint="与用户故事中的首轮主闭环直接相关。" />
        <MetricCard label="计划查看率" value={formatPercent(data.planViewRate)} hint="衡量今日页是否真正成为高频入口。" />
        <MetricCard label="打卡率" value={formatPercent(data.checkInRate)} hint="本轮重点观察执行闭环是否成立。" />
        <MetricCard label="周复盘触达率" value={formatPercent(data.weeklyReviewReachRate)} hint="复盘能力当前仍为轻量形态，先看触达。" />
        <MetricCard label="AI 使用率" value={formatPercent(data.aiUsageRate)} hint="AI 是辅助解释能力，不应压过规则链路。" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">运营资源健康度</h2>
            <Badge tone="active">已对齐 MVP 范围</Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-sand/55 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-black/45">启用饮食模板</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{data.activeDietTemplates}</p>
              <Link className="mt-4 inline-block text-sm text-leaf" href="/diet-templates">查看模板</Link>
            </div>
            <div className="rounded-[24px] bg-sand/55 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-black/45">启用训练模板</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{data.activeTrainingTemplates}</p>
              <Link className="mt-4 inline-block text-sm text-leaf" href="/training-templates">查看模板</Link>
            </div>
            <div className="rounded-[24px] bg-sand/55 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-black/45">在售商品</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{data.activeProducts}</p>
              <Link className="mt-4 inline-block text-sm text-leaf" href="/products">查看商品</Link>
            </div>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink">高使用饮食模板</p>
              <div className="mt-3 space-y-3">
                {data.topDietTemplates.map((item) => (
                  <Link key={item.id} href={`/diet-templates/${item.id}`} className="flex items-center justify-between rounded-[20px] bg-sand/45 px-4 py-3 text-sm hover:bg-sand/70">
                    <span>{item.name}</span>
                    <span className="text-black/55">{item.usageCount} 次命中</span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">高使用训练模板</p>
              <div className="mt-3 space-y-3">
                {data.topTrainingTemplates.map((item) => (
                  <Link key={item.id} href={`/training-templates/${item.id}`} className="flex items-center justify-between rounded-[20px] bg-sand/45 px-4 py-3 text-sm hover:bg-sand/70">
                    <span>{item.name}</span>
                    <span className="text-black/55">{item.usageCount} 次命中</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-black/8 bg-white/88 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-ink">最新用户反馈</h2>
            <Link className="text-sm text-leaf" href="/feedback">查看全部</Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.latestFeedback.map((item) => (
              <Link key={item.id} href={`/feedback/${item.id}`} className="block rounded-[24px] border border-black/6 bg-sand/30 p-4 transition hover:bg-sand/55">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{item.userNickname}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/45">{item.sourcePage}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={item.sentiment}>{item.sentiment}</Badge>
                    <Badge tone={item.status}>{item.status}</Badge>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-black/60">{item.content}</p>
                <p className="mt-4 text-xs text-black/40">{formatDateTime(item.createdAt)}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
