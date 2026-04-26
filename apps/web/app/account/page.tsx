'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  fetchCurrentUser,
  requestDataDeletion,
  type CurrentUserPayload,
  type OnboardingPayload,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { DashboardCard, DashboardShell, MetricPill, PanelTag, SectionEyebrow } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { describeUserFacingError } from '@/lib/user-facing-error';

function normalizeMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '个人中心暂时没有加载成功。',
    nextStep: '稍后刷新页面重试，或重新进入个人中心。',
    dataStatus: '你的账号资料和已保存记录不会丢失。',
  });
}

function formatTargetType(value?: OnboardingPayload['targetType']) {
  if (value === 'cut') return '减脂增肌';
  if (value === 'bulk') return '增肌提升';
  if (value === 'maintain') return '维持表现';
  return '待建档';
}

function formatDietScene(value?: OnboardingPayload['dietScene']) {
  if (value === 'canteen') return '食堂优先';
  if (value === 'dorm') return '宿舍场景';
  if (value === 'home') return '家庭场景';
  return '待建档';
}

function formatListSummary(values: string[] | undefined, emptyLabel: string) {
  if (!values || values.length === 0) {
    return emptyLabel;
  }

  return values.join(' / ');
}

function formatAccountStatus(value?: string) {
  if (!value) {
    return '读取中';
  }

  if (value === 'ACTIVE') {
    return '正常使用';
  }

  return value;
}

function buildSettingsSummary(profile: CurrentUserPayload['profile']) {
  if (!profile) {
    return [
      { label: '训练目标', value: '待建档' },
      { label: '饮食场景', value: '待建档' },
      { label: '训练频率', value: '待建档' },
      { label: '饮食偏好', value: '未设置' },
      { label: '饮食限制', value: '无' },
    ];
  }

  return [
    { label: '训练目标', value: formatTargetType(profile.targetType) },
    { label: '饮食场景', value: formatDietScene(profile.dietScene) },
    { label: '训练频率', value: `${profile.trainingDaysPerWeek} 天 / 周` },
    { label: '饮食偏好', value: formatListSummary(profile.dietPreferences, '未设置') },
    { label: '饮食限制', value: formatListSummary(profile.dietRestrictions, '无') },
  ];
}

const helpItems = [
  {
    title: '如何开始使用',
    detail: '先完成邮箱登录和建档，再进入今日页查看训练、饮食和 AI 提示，最后通过每日打卡记录执行结果。',
  },
  {
    title: '饮食计划怎么看',
    detail: '饮食计划页会展示三餐安排、替换方案和执行指导，帮助你按当天目标落实到每一餐。',
  },
  {
    title: '每周复盘有什么用',
    detail: '每周复盘会把本周打卡结果转成趋势总结，帮助你判断训练和饮食节奏是否稳定。',
  },
  {
    title: 'AI 助手负责什么',
    detail: 'AI 助手负责解释、问答和执行建议，但不会替代真实打卡或篡改你的记录。',
  },
];

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletionMessage, setDeletionMessage] = useState('');

  useEffect(() => {
    async function load() {
      const session = getStoredSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const payload = await fetchCurrentUser(session.accessToken);
        setUser(payload);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearStoredSession();
          router.replace('/login');
          return;
        }

        if (loadError instanceof ApiError && loadError.code === 'CONFLICT') {
          setStoredSessionOnboardingStatus(false);
          router.replace('/onboarding');
          return;
        }

        setError(normalizeMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  const settingsSummary = buildSettingsSummary(user?.profile ?? null);
  const loginStatus = user ? '已登录' : '读取中';
  const onboardingStatus = user?.hasCompletedOnboarding ? '已完成' : '待完成';
  const identityLabel = user?.nickname ?? '读取中';
  const accountStatus = formatAccountStatus(user?.status);

  function handleLogout() {
    clearStoredSession();
    router.replace('/login');
  }

  async function handleDataDeletionRequest() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setDeletionMessage('');
    try {
      const result = await requestDataDeletion(session.accessToken, {
        reason: '用户在个人中心主动申请删除数据',
      });
      setDeletionMessage(`申请删除数据已提交，当前状态：${result.status}`);
    } catch (requestError) {
      setDeletionMessage(
        describeUserFacingError(requestError, {
          whatHappened: '数据删除申请还没有提交成功。',
          nextStep: '稍后再试一次，或先确认当前登录状态是否有效。',
          dataStatus: '你的账号数据不会因为这次失败被删除。',
        }),
      );
    }
  }

  return (
    <DashboardShell
      currentPath="/account"
      sidebarHint="账号信息、帮助支持和退出登录统一收在这里。"
      primaryCta={{ label: '返回今日页', href: '/today' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Account Hub</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">个人中心</h1>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-[#5f768d]">
              这里统一承接账号信息、我的设置、帮助支持和退出登录，不再把相关入口分散成假按钮或临时跳转。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill label="登录状态" value={loginStatus} accent />
            <MetricPill label="建档状态" value={onboardingStatus} />
            <MetricPill label="当前身份" value={identityLabel} />
          </div>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在读取个人中心...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}
      {deletionMessage ? <LiveStatusCard tone="success">{deletionMessage}</LiveStatusCard> : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#17324d]">账号信息</p>
              <p className="mt-2 text-sm leading-7 text-[#5f768d]">展示当前登录账号、账户状态和建档完成情况。</p>
            </div>
            <PanelTag tone="deep">统一入口</PanelTag>
          </div>
          <div className="mt-6 grid gap-3">
            <MetricPill label="昵称" value={identityLabel} />
            <MetricPill label="账户状态" value={accountStatus} />
            <MetricPill label="建档进度" value={onboardingStatus} accent />
          </div>
        </DashboardCard>

        <DashboardCard>
          <p className="text-lg font-semibold text-[#17324d]">我的设置</p>
          <p className="mt-2 text-sm leading-7 text-[#5f768d]">第一版只提供查看和跳转，不在这里引入新的编辑表单或保存逻辑。</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {settingsSummary.map((item) => (
              <MetricPill key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding" className="rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white">
              前往建档页
            </Link>
            <Link href="/diet" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
              查看饮食计划
            </Link>
            <Link href="/today" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
              返回今日页
            </Link>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <DashboardCard>
          <p className="text-lg font-semibold text-[#17324d]">帮助支持</p>
          <div className="mt-6 grid gap-3">
            {helpItems.map((item) => (
              <div key={item.title} className="rounded-[24px] bg-[#eef4f9] px-5 py-5">
                <p className="text-lg font-semibold text-[#17324d]">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-[#5f768d]">{item.detail}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard>
          <p className="text-lg font-semibold text-[#17324d]">退出登录</p>
          <p className="mt-2 text-sm leading-7 text-[#5f768d]">这里只保留最小账户动作，避免把个人中心继续做成新的复杂操作台。</p>
          <div className="mt-6 grid gap-3">
            <Link href="/" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
              返回首页
            </Link>
            <Link href="/today" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
              返回今日页
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white"
            >
              退出登录
            </button>
            <button
              type="button"
              onClick={handleDataDeletionRequest}
              className="rounded-full bg-[#a14e3a] px-5 py-3 text-sm font-semibold text-white"
            >
              申请删除数据
            </button>
            <Link href="/data-deletion" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
              查看数据删除说明
            </Link>
          </div>
        </DashboardCard>
      </section>
    </DashboardShell>
  );
}

