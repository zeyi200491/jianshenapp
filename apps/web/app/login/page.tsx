'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestEmailCode, verifyEmailCode } from '@/lib/api';
import { getStoredSession, setStoredSession } from '@/lib/auth';
import { APP_BRAND_NAME } from '@/lib/brand';
import { DashboardCard, MetricPill, PanelTag, SectionEyebrow } from '@/components/web/dashboard-shell';
import { describeUserFacingError } from '@/lib/user-facing-error';

function normalizeMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '这次登录没有成功发起。',
    nextStep: '检查邮箱地址和验证码后再试一次。',
    dataStatus: '你当前输入的内容还在，数据不会因为这次失败丢失。',
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      return;
    }

    router.replace(session.user.hasCompletedOnboarding ? '/today' : '/onboarding');
  }, [router]);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const canSubmit = useMemo(() => emailValid && code.trim().length === 6, [emailValid, code]);

  function handleRequestCode() {
    if (!emailValid) {
      setError('请输入有效的邮箱地址。');
      setHint('');
      return;
    }

    setError('');
    setHint('');
    setDevCode('');
    setDeliveryMode('');

    startTransition(async () => {
      try {
        const result = await requestEmailCode(email);
        setDeliveryMode(result.deliveryMode);
        if (result.deliveryMode === 'mock') {
          setHint('当前环境使用模拟发码，邮箱不会收到验证码。请直接使用下方开发验证码继续登录。');
        } else {
          setHint(`验证码已发送到 ${result.destination}。`);
        }
        if (result.devCode) {
          setDevCode(result.devCode);
        } else {
          setDevCode('');
        }
      } catch (requestError) {
        setError(normalizeMessage(requestError));
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!emailValid) {
      setError('请输入有效的邮箱地址。');
      return;
    }
    if (code.trim().length !== 6) {
      setError('请输入 6 位验证码。');
      return;
    }

    setError('');
    setHint('');

    startTransition(async () => {
      try {
        const session = await verifyEmailCode(email, code);
        setStoredSession(session);
        router.replace(session.user.hasCompletedOnboarding ? '/today' : '/onboarding');
      } catch (loginError) {
        setError(normalizeMessage(loginError));
      }
    });
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1450px] gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-10">
      <DashboardCard className="bg-[linear-gradient(160deg,#0e3d62,#0f7ea5_58%,#63b9ec)] p-8 text-white shadow-[0_30px_80px_rgba(15,126,165,0.24)] sm:p-10">
        <SectionEyebrow>Email Access</SectionEyebrow>
        <h1 className="mt-4 text-[48px] font-semibold leading-[0.95] sm:text-[64px]">邮箱登录</h1>
        <p className="mt-6 max-w-xl text-lg leading-9 text-white/84">
          这里是进入{APP_BRAND_NAME}的唯一入口。登录成功后，已建档用户直接进入今日页，未建档用户进入档案建立流程。
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <MetricPill label="认证方式" value="邮箱验证码" accent />
          <MetricPill label="登录后去向" value="今日页 / 建档页" />
          <MetricPill label="验证码来源" value={deliveryMode === 'mock' ? '模拟发码' : '邮箱收取'} />
          <MetricPill label="环境要求" value="API 邮件能力可用" />
        </div>
      </DashboardCard>

      <DashboardCard className="p-8 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionEyebrow>Account Entry</SectionEyebrow>
            <h2 className="mt-4 text-[40px] font-semibold text-[#17324d]">输入邮箱，拿到验证码后立即进入</h2>
          </div>
          <PanelTag tone="deep">{APP_BRAND_NAME}</PanelTag>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-[#5d7288]">
            邮箱地址
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-describedby="email-error"
              aria-invalid={!emailValid && email.trim().length > 0}
              className="rounded-[22px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4 outline-none transition focus:border-[#0f7ea5]"
            />
          </label>
          {!emailValid && email.trim().length > 0 ? <p id="email-error" role="alert" className="text-sm text-[#a34d47]">邮箱格式不正确。</p> : null}

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm text-[#5d7288]">
              验证码
              <input
                type="text"
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                spellCheck={false}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="输入 6 位验证码"
                className="rounded-[22px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4 outline-none transition focus:border-[#0f7ea5]"
              />
            </label>
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={isPending || !emailValid}
              className="rounded-full border border-[#d3e3ee] bg-white px-5 py-4 text-sm font-semibold text-[#17324d] transition hover:bg-[#eef4f9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? '发送中...' : '发送验证码'}
            </button>
          </div>

          {hint ? (
            <p aria-live="polite" role="status" className="rounded-[20px] bg-[#ecf6fd] px-4 py-3 text-sm text-[#0f6f96]">
              {hint}
            </p>
          ) : null}
          {deliveryMode === 'mock' && devCode ? (
            <p aria-live="polite" role="status" className="rounded-[20px] bg-[#fff4e8] px-4 py-3 text-sm text-[#8a4e1f]">
              当前开发验证码：<span className="font-semibold tracking-[0.2em]">{devCode}</span>
            </p>
          ) : null}
          {deliveryMode === 'smtp' && hint ? <p aria-live="polite" className="text-sm text-[#5d7288]">请到邮箱中收取 6 位验证码。</p> : null}
          {error ? (
            <p aria-live="assertive" role="alert" className="rounded-[20px] bg-[#fff2f1] px-4 py-3 text-sm text-[#a34d47]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="rounded-full bg-[#0f7ea5] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,126,165,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? '登录中...' : '登录并继续'}
          </button>
        </form>
      </DashboardCard>
    </main>
  );
}
