import Link from 'next/link';

import { DashboardCard, MetricPill, PanelTag, SectionEyebrow } from '@/components/web/dashboard-shell';
import { APP_BRAND_NAME } from '@/lib/brand';
import { getOverviewStates, getStateLabel } from '@/lib/display-state';

const highlights = [
  {
    title: '今日指挥中心',
    description: '把训练、饮食、AI 洞察和打卡入口收在一个仪表盘里，减少来回跳转。',
  },
  {
    title: '饮食计划台',
    description: '围绕目标、餐次与替代方案组织信息，让“今天吃什么”一眼可用。',
  },
  {
    title: '每周复盘',
    description: '把打卡记录转成可行动的趋势总结与下周建议。',
  },
];

const overviewStates = getOverviewStates();

export default function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1480px] flex-col gap-10 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
        <div className="rounded-[40px] bg-[linear-gradient(135deg,#0e3d62,#0f7ea5_55%,#64b9eb)] px-8 py-10 text-white shadow-[0_32px_90px_rgba(15,126,165,0.24)] sm:px-10 sm:py-12">
          <SectionEyebrow>Open Dashboard</SectionEyebrow>
          <h1 className="mt-4 max-w-4xl text-[48px] font-semibold leading-[0.95] sm:text-[72px]">训练与饮食仪表盘</h1>
          <p className="mt-6 max-w-2xl text-lg leading-9 text-white/84">
            {APP_BRAND_NAME}把训练、饮食、每日打卡、周复盘与 AI 助手收进同一套网页工作台，让“知道该怎么做”直接变成“今天就去做”。
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/today" className="rounded-full bg-white px-6 py-4 text-sm font-semibold text-[#0f6f96] shadow-[0_14px_28px_rgba(255,255,255,0.22)]">
              进入今日仪表盘
            </Link>
            <Link href="/login" className="rounded-full border border-white/24 bg-white/12 px-6 py-4 text-sm font-semibold text-white backdrop-blur">
              邮箱登录
            </Link>
            <Link href="/account" className="rounded-full border border-white/24 bg-white/12 px-6 py-4 text-sm font-semibold text-white backdrop-blur">
              个人中心
            </Link>
            <Link href="/assistant" className="rounded-full border border-white/24 bg-white/12 px-6 py-4 text-sm font-semibold text-white backdrop-blur">
              打开 AI 助手
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <MetricPill label="主入口" value="桌面 Web" accent />
            <MetricPill label="执行链路" value="计划 → 打卡 → 复盘" />
            <MetricPill label="AI 角色" value="解释、问答、建议" />
          </div>
        </div>

        <DashboardCard className="bg-white/92 p-7 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f7ea5]">体验概览</p>
              <h2 className="mt-3 text-[34px] font-semibold text-[#17324d]">一套可直接执行的训练工作台</h2>
            </div>
            <PanelTag tone="deep">Web MVP</PanelTag>
          </div>
          <div className="mt-7 grid gap-3">
            {overviewStates.map((item) => (
              <div key={item.label} className="rounded-[24px] bg-[#eef4f9] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#17324d]">{item.label}</p>
                  <PanelTag tone={item.kind === 'actual' ? 'deep' : 'soft'}>{getStateLabel(item.kind)}</PanelTag>
                </div>
                <p className="mt-3 text-[22px] font-semibold text-[#17324d]">{item.value}</p>
                <p className="mt-2 text-sm leading-7 text-[#5d7288]">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-[24px] bg-[#eef4f9] px-5 py-5">
                <p className="text-lg font-semibold text-[#17324d]">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-[#5d7288]">{item.description}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardCard className="bg-[#ecf5fb] p-7 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionEyebrow>Launch Path</SectionEyebrow>
              <h2 className="mt-3 text-[36px] font-semibold text-[#17324d]">从进入到执行，只保留必要步骤</h2>
            </div>
            <PanelTag>即开即用</PanelTag>
          </div>
          <div className="mt-8 grid gap-4">
            {[
              ['01', '邮箱登录', '使用验证码快速进入；已建档用户直达今日仪表盘。'],
              ['02', '建立档案', '收集目标、训练习惯和饮食场景，生成你的第一版计划。'],
              ['03', '开始执行', '在今日页查看训练、饮食和 AI 提示，然后直接去打卡。'],
            ].map(([index, title, description]) => (
              <div key={index} className="grid gap-4 rounded-[28px] bg-white px-5 py-5 sm:grid-cols-[72px_1fr] sm:items-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#dff2ff] text-lg font-semibold text-[#0f7ea5]">{index}</div>
                <div>
                  <p className="text-xl font-semibold text-[#17324d]">{title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#5d7288]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

      </section>
    </main>
  );
}
