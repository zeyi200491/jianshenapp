'use client';

import { useCallback, useEffect, useState } from 'react';

type ApiHealth = {
  status: string;
  service: string;
  dataMode: string;
  timestamp?: string;
  authEmail?: {
    provider: string;
    ready: boolean;
    issue: string | null;
  };
};

type AiHealth = {
  service: string;
  env: string;
  provider: string;
  model?: string;
  providerReady?: boolean;
  providerIssue?: string | null;
};

type RuntimeState = {
  api: ApiHealth | null;
  ai: AiHealth | null;
  error: string;
  loading: boolean;
  checkedAt: string;
};

type RuntimeStatusProps = {
  compact?: boolean;
  showRefresh?: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3050/api/v1';
const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL ?? 'http://127.0.0.1:8001';

function formatCheckedAt(value: string) {
  if (!value) {
    return '尚未检查';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function buildStatusLabel(ready?: boolean) {
  return ready ? '已就绪' : '未就绪';
}

export function RuntimeStatus({ compact = false, showRefresh = true }: RuntimeStatusProps) {
  const [state, setState] = useState<RuntimeState>({
    api: null,
    ai: null,
    error: '',
    loading: true,
    checkedAt: '',
  });

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    try {
      const [apiResponse, aiResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/health`, { cache: 'no-store' }),
        fetch(`${AI_BASE_URL}/health`, { cache: 'no-store' }),
      ]);

      if (!apiResponse.ok) {
        throw new Error(`API health 请求失败: ${apiResponse.status}`);
      }
      if (!aiResponse.ok) {
        throw new Error(`AI health 请求失败: ${aiResponse.status}`);
      }

      const apiPayload = (await apiResponse.json()) as { data: ApiHealth };
      const aiPayload = (await aiResponse.json()) as { data: AiHealth };

      setState({
        api: apiPayload.data,
        ai: aiPayload.data,
        error: '',
        loading: false,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      setState({
        api: null,
        ai: null,
        error: error instanceof Error ? error.message : '运行状态读取失败',
        loading: false,
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return <div className="rounded-[28px] bg-[#eef4f9] px-4 py-4 text-sm text-[#5d7288]">正在读取运行状态...</div>;
  }

  if (state.error) {
    return (
      <div className="rounded-[28px] bg-[#fff2f1] px-4 py-4 text-sm text-[#a34d47]">
        运行状态读取失败：{state.error}
      </div>
    );
  }

  const wrapperClassName = compact ? 'grid gap-3 text-sm text-[#5d7288]' : 'grid gap-4 text-sm text-[#5d7288] lg:grid-cols-2';

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.24em] text-[#6e8396]">
        <span>最近检查：{formatCheckedAt(state.checkedAt)}</span>
        {showRefresh ? (
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-[#d3e3ee] bg-white px-4 py-2 text-[11px] font-semibold tracking-[0.24em] text-[#17324d] transition hover:bg-[#eef4f9]"
          >
            刷新状态
          </button>
        ) : null}
      </div>

      <div className={wrapperClassName}>
        <article className="rounded-[28px] bg-[#eef4f9] px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#6e8396]">API 服务</p>
          <p className="mt-2 text-lg font-semibold text-[#17324d]">{state.api?.service ?? 'unknown'}</p>
          <p className="mt-2">数据模式：{state.api?.dataMode ?? 'unknown'}</p>
          <p className="mt-1">邮件提供方：{state.api?.authEmail?.provider ?? 'unknown'} / {buildStatusLabel(state.api?.authEmail?.ready)}</p>
          {state.api?.authEmail?.issue ? <p className="mt-2 text-[#a34d47]">问题：{state.api.authEmail.issue}</p> : null}
          <p className="mt-3 text-xs text-[#6e8396]">接口：{API_BASE_URL}/health</p>
        </article>

        <article className="rounded-[28px] bg-[#eef4f9] px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#6e8396]">AI 服务</p>
          <p className="mt-2 text-lg font-semibold text-[#17324d]">{state.ai?.service ?? 'unknown'}</p>
          <p className="mt-2">提供方：{state.ai?.provider ?? 'unknown'} / {buildStatusLabel(state.ai?.providerReady)}</p>
          <p className="mt-1">模型：{state.ai?.model ?? 'unknown'}</p>
          {state.ai?.providerIssue ? <p className="mt-2 text-[#a34d47]">问题：{state.ai.providerIssue}</p> : null}
          <p className="mt-3 text-xs text-[#6e8396]">接口：{AI_BASE_URL}/health</p>
        </article>
      </div>
    </div>
  );
}
