'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  createConversation,
  fetchToday,
  listConversationMessages,
  sendConversationMessage,
  type ConversationContext,
  type ConversationMessage,
  type TodayPayload,
} from '@/lib/api';
import {
  addAssistantActionItem,
  readAssistantActionItems,
  readAssistantConversationSnapshots,
  removeAssistantActionItem,
  saveAssistantConversationSnapshot,
  toggleAssistantActionItem,
  type AssistantActionItem,
} from '@/lib/assistant-history';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { APP_BRAND_NAME } from '@/lib/brand';
import { DashboardCard, DashboardShell, MetricPill, PanelTag, SectionEyebrow } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { describeUserFacingError } from '@/lib/user-facing-error';

const starterPrompts = [
  '今天训练后特别饿，晚餐怎么调整比较合适？',
  '今天训练没做完，明天需要补吗？',
  '如果食堂没有合适蛋白质来源，我该怎么替换？',
];

const quickFollowUps = [
  '把刚才的建议压缩成 3 条执行重点。',
  '按训练前、训练中、训练后再拆一次。',
  '按食堂场景给我一个更省时的版本。',
];

function normalizeMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '执行助手暂时没有准备好。',
    nextStep: '稍后重试，或先回到今日页确认计划已经生成。',
    dataStatus: '当前会话和今日行动项会保留在这台设备上。',
  });
}

function buildStorageKey(dailyPlanId?: string) {
  return dailyPlanId ? `xiaojian-assistant:${dailyPlanId}` : '';
}

function buildConversationTitle(payload: TodayPayload) {
  return `${payload.date} ${APP_BRAND_NAME}执行助手`;
}

function buildContext(payload: TodayPayload): ConversationContext {
  return {
    dailyPlanId: payload.dailyPlanId,
    dietPlanId: payload.dietPlan?.id,
    trainingPlanId: payload.trainingPlan?.id,
  };
}

function validateQuestion(question: string) {
  const trimmed = question.trim();
  if (trimmed.length < 6) {
    return '问题至少输入 6 个字，这样执行建议才会足够具体。';
  }
  if (trimmed.length > 400) {
    return '问题请控制在 400 字以内，避免一次塞入太多目标。';
  }
  return null;
}

function buildMessagePreview(messages: ConversationMessage[]) {
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  return latestAssistantMessage?.content.slice(0, 48) ?? '继续围绕今天的计划追问';
}

function buildActionItemDraft(message: ConversationMessage) {
  const sentence = message.content
    .split(/[。！？\n]/)
    .map((item) => item.trim())
    .find(Boolean);
  const title = sentence ? sentence.slice(0, 24) : '跟进这条执行建议';

  return {
    title,
    detail: message.content.slice(0, 120),
  };
}

export default function AssistantPage() {
  const router = useRouter();
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState(starterPrompts[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionItems, setActionItems] = useState<AssistantActionItem[]>([]);
  const [historySnapshots, setHistorySnapshots] = useState(readAssistantConversationSnapshots());
  const [activeConversationDate, setActiveConversationDate] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState('');
  const initializedRef = useRef(false);
  const streamTimerRef = useRef<number | null>(null);

  function stopStreaming() {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setStreamingMessageId('');
  }

  function syncLocalState(date: string) {
    setHistorySnapshots(readAssistantConversationSnapshots());
    setActionItems(readAssistantActionItems(date));
  }

  async function loadMessages(targetConversationId: string, token: string) {
    const result = await listConversationMessages(token, targetConversationId);
    setMessages(result.messages);
    return result.messages;
  }

  function persistConversationSnapshot(payload: TodayPayload, targetConversationId: string, nextMessages: ConversationMessage[]) {
    saveAssistantConversationSnapshot({
      date: payload.date,
      conversationId: targetConversationId,
      title: buildConversationTitle(payload),
      preview: buildMessagePreview(nextMessages),
      updatedAt: new Date().toISOString(),
    });
    syncLocalState(payload.date);
  }

  async function ensureConversation(token: string, payload: TodayPayload, forceNew = false) {
    const storageKey = buildStorageKey(payload.dailyPlanId);
    const storedConversationId =
      !forceNew && typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKey) || '' : '';

    if (storedConversationId) {
      const storedMessages = await loadMessages(storedConversationId, token);
      setConversationId(storedConversationId);
      setActiveConversationDate(payload.date);
      persistConversationSnapshot(payload, storedConversationId, storedMessages);
      return storedConversationId;
    }

    const conversation = await createConversation(token, {
      title: buildConversationTitle(payload),
      context: buildContext(payload),
    });

    setConversationId(conversation.id);
    setActiveConversationDate(payload.date);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, conversation.id);
    }
    persistConversationSnapshot(payload, conversation.id, []);
    return conversation.id;
  }

  async function bootstrap(forceNew = false) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (initializedRef.current && !forceNew) {
      return;
    }

    initializedRef.current = true;
    setLoading(true);
    setError('');

    try {
      const todayPayload = await fetchToday(session.accessToken);
      setToday(todayPayload);
      if (forceNew && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(buildStorageKey(todayPayload.dailyPlanId));
      }
      await ensureConversation(session.accessToken, todayPayload, forceNew);
      syncLocalState(todayPayload.date);
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

  useEffect(() => {
    void bootstrap();

    return () => {
      stopStreaming();
    };
  }, []);

  function startStreamingAssistantMessage(message: ConversationMessage, payload: TodayPayload, targetConversationId: string) {
    stopStreaming();
    setStreamingMessageId(message.id);
    setMessages((current) => [...current, { ...message, content: '' }]);

    const chunks = message.content.match(/.{1,18}/gu) ?? [message.content];
    let index = 0;

    streamTimerRef.current = window.setInterval(() => {
      index += 1;
      const nextContent = chunks.slice(0, index).join('');
      setMessages((current) => {
        const nextMessages = current.map((item) =>
          item.id === message.id ? { ...item, content: nextContent } : item,
        );
        if (index >= chunks.length) {
          persistConversationSnapshot(payload, targetConversationId, nextMessages);
        }
        return nextMessages;
      });

      if (index >= chunks.length) {
        stopStreaming();
      }
    }, 28);
  }

  function handleCreateNewConversation() {
    initializedRef.current = false;
    setMessages([]);
    setConversationId('');
    setActiveConversationDate('');
    void bootstrap(true);
  }

  async function handleOpenHistoryConversation(targetConversationId: string, targetDate: string) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const historyMessages = await loadMessages(targetConversationId, session.accessToken);
      setConversationId(targetConversationId);
      setActiveConversationDate(targetDate);
      if (today && targetDate === today.date) {
        persistConversationSnapshot(today, targetConversationId, historyMessages);
      }
    } catch (historyError) {
      setError(normalizeMessage(historyError));
    } finally {
      setLoading(false);
    }
  }

  function handleReturnToTodayConversation() {
    if (!today) {
      return;
    }

    initializedRef.current = false;
    setMessages([]);
    setConversationId('');
    void bootstrap();
  }

  function handleAddActionItemFromMessage(message: ConversationMessage) {
    if (!today) {
      return;
    }

    const draft = buildActionItemDraft(message);
    const nextItem = addAssistantActionItem(today.date, message.id, draft.title, draft.detail);
    setActionItems((current) => [nextItem, ...current]);
  }

  function handleToggleActionItem(itemId: string) {
    if (!today) {
      return;
    }

    setActionItems(toggleAssistantActionItem(today.date, itemId));
  }

  function handleRemoveActionItem(itemId: string) {
    if (!today) {
      return;
    }

    setActionItems(removeAssistantActionItem(today.date, itemId));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!conversationId || !today) {
      setError('发生了什么：会话还没有准备完成。\n现在怎么做：请稍等几秒，再发送问题。\n数据情况：当前已生成的会话不会丢失。');
      return;
    }
    if (activeConversationDate && activeConversationDate !== today.date) {
      setError('发生了什么：你正在查看历史会话。\n现在怎么做：先回到今天会话，再继续追问新的执行问题。\n数据情况：历史会话会继续保留。');
      return;
    }

    const validationError = validateQuestion(question);
    if (validationError) {
      setError(`发生了什么：问题还不够清楚。\n现在怎么做：${validationError}\n数据情况：当前输入的文字还在。`);
      return;
    }

    const content = question.trim();
    setError('');

    startTransition(async () => {
      try {
        const result = await sendConversationMessage(session.accessToken, conversationId, {
          content,
          context: buildContext(today),
        });
        setMessages((current) => [...current, result.userMessage]);
        startStreamingAssistantMessage(result.assistantMessage, today, conversationId);
        setQuestion('');
      } catch (sendError) {
        if (sendError instanceof ApiError && sendError.status === 401) {
          clearStoredSession();
          router.replace('/login');
          return;
        }
        setError(normalizeMessage(sendError));
      }
    });
  }

  const historyLabel = useMemo(() => {
    if (!today || !activeConversationDate || activeConversationDate === today.date) {
      return '';
    }

    return `正在查看 ${activeConversationDate} 的历史会话。`;
  }, [activeConversationDate, today]);

  return (
    <DashboardShell
      currentPath=""
      sidebarHint="想把回答变成今天就能做的动作？"
      primaryCta={{ label: '回到今日页', href: '/today' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Execution Copilot</SectionEyebrow>
            <h1 className="mt-4 text-[52px] font-semibold leading-none text-[#1b3042] sm:text-[64px]">AI 训练助理</h1>
            <p className="mt-4 max-w-3xl text-lg leading-9 text-[#5f768d]">
              这里不是普通问答页，而是{APP_BRAND_NAME}的执行助手。它会围绕你今天的训练、饮食和打卡状态给出更可落地的建议，并把回答沉淀成今日行动项。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricPill label="今日训练" value={today?.trainingPlan?.title ?? '读取中'} />
            <MetricPill label="今日饮食" value={today?.dietPlan?.summary ?? '读取中'} />
            <MetricPill label="今日行动项" value={String(actionItems.length)} accent />
          </div>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在初始化执行助手会话...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}
      {historyLabel ? <LiveStatusCard tone="loading">{historyLabel}</LiveStatusCard> : null}

      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionEyebrow>Conversation</SectionEyebrow>
              <h2 className="mt-3 text-[36px] font-semibold text-[#17324d]">围绕当日计划持续追问</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {today && activeConversationDate !== today.date ? (
                <button
                  type="button"
                  onClick={handleReturnToTodayConversation}
                  className="rounded-full border border-[#d3e3ee] bg-white px-4 py-3 text-sm font-semibold text-[#17324d]"
                >
                  回到今天会话
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCreateNewConversation}
                className="rounded-full border border-[#d3e3ee] bg-white px-5 py-3 text-sm font-semibold text-[#17324d]"
              >
                新建会话
              </button>
            </div>
          </div>
          <div className="mt-7 grid gap-4">
            {messages.length === 0 ? (
              <div className="rounded-[24px] bg-[#eef4f9] px-5 py-5 text-sm text-[#5d7288]">
                当前还没有消息，可以先从右侧快捷追问开始。
              </div>
            ) : null}
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === 'assistant'
                    ? 'rounded-[26px] bg-[#ecf6fd] px-5 py-5 text-sm leading-8 text-[#17324d]'
                    : 'rounded-[26px] bg-[#f5f9fd] px-5 py-5 text-sm leading-8 text-[#5d7288]'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#6e8396]">
                    {message.role === 'assistant' ? `${APP_BRAND_NAME}执行助手` : '用户'}
                  </p>
                  {message.role === 'assistant' ? (
                    <div className="flex flex-wrap gap-2">
                      {today?.trainingPlan?.title ? <PanelTag tone="deep">训练：{today.trainingPlan.title}</PanelTag> : null}
                      {today?.dietPlan?.summary ? <PanelTag tone="soft">饮食：{today.dietPlan.summary}</PanelTag> : null}
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap">{message.content}</p>
                {message.role === 'assistant' ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleAddActionItemFromMessage(message)}
                      className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#17324d] shadow-[0_10px_22px_rgba(22,67,102,0.08)]"
                    >
                      加入今日行动项
                    </button>
                    {streamingMessageId === message.id ? (
                      <span className="text-xs text-[#6e8396]">正在流式展开回答...</span>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </DashboardCard>

        <div className="grid gap-6">
          <DashboardCard className="bg-[#eef4f9]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionEyebrow>Ask Better</SectionEyebrow>
                <h2 className="mt-3 text-[34px] font-semibold text-[#17324d]">让执行建议更具体</h2>
              </div>
              <PanelTag tone="deep">{activeConversationDate === today?.date ? '今日会话' : '历史会话'}</PanelTag>
            </div>
            <div className="mt-6 rounded-[24px] bg-white px-5 py-5">
              <p className="text-sm font-semibold text-[#17324d]">快捷追问</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...starterPrompts, ...quickFollowUps].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="rounded-full bg-[#eef4f9] px-4 py-2 text-xs font-semibold text-[#17324d]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <textarea
                name="question"
                autoComplete="off"
                spellCheck={false}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={8}
                className="rounded-[26px] border border-[#d8e5ee] bg-white px-5 py-5 text-sm leading-8 text-[#17324d]"
                placeholder="例如：今天训练没做完，明天需要补吗？或者我的饮食完成度只有 60%，晚餐怎么补救？"
              />
              <p className="text-xs text-[#6e8396]">建议问题长度控制在 6 到 400 字之间，越具体越容易落到今天的动作。</p>
              <button
                type="submit"
                disabled={loading || isPending || !conversationId || activeConversationDate !== today?.date}
                className="rounded-full bg-[#0f7ea5] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,126,165,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? '发送中...' : '发送给执行助手'}
              </button>
            </form>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionEyebrow>Action Board</SectionEyebrow>
                <h2 className="mt-3 text-[34px] font-semibold text-[#17324d]">今日行动项</h2>
              </div>
              <PanelTag tone="deep">{actionItems.length} 项</PanelTag>
            </div>
            <div className="mt-6 grid gap-3">
              {actionItems.length === 0 ? (
                <div className="rounded-[24px] bg-[#eef4f9] px-5 py-5 text-sm leading-7 text-[#5d7288]">
                  还没有加入行动项。看到合适的 AI 回答后，点击“加入今日行动项”即可沉淀成今天的执行清单。
                </div>
              ) : null}
              {actionItems.map((item) => (
                <article key={item.id} className="rounded-[24px] bg-[#eef4f9] px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${item.done ? 'text-[#6e8396] line-through' : 'text-[#17324d]'}`}>{item.title}</p>
                      <p className="mt-2 text-xs leading-6 text-[#5d7288]">{item.detail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActionItem(item.id)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#17324d]"
                      >
                        {item.done ? '标记未完成' : '标记完成'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(item.id)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#17324d]"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionEyebrow>History</SectionEyebrow>
                <h2 className="mt-3 text-[34px] font-semibold text-[#17324d]">历史会话</h2>
              </div>
              <PanelTag tone="soft">{historySnapshots.length} 条</PanelTag>
            </div>
            <div className="mt-6 grid gap-3">
              {historySnapshots.length === 0 ? (
                <div className="rounded-[24px] bg-[#eef4f9] px-5 py-5 text-sm leading-7 text-[#5d7288]">
                  还没有跨天历史会话。今天开始使用后，这里会保留最近的会话入口。
                </div>
              ) : null}
              {historySnapshots.map((snapshot) => (
                <button
                  key={snapshot.conversationId}
                  type="button"
                  onClick={() => handleOpenHistoryConversation(snapshot.conversationId, snapshot.date)}
                  className="rounded-[24px] bg-[#eef4f9] px-5 py-5 text-left transition hover:bg-[#e6f1f8]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#17324d]">{snapshot.date}</p>
                    <PanelTag tone={snapshot.date === today?.date ? 'deep' : 'soft'}>
                      {snapshot.date === today?.date ? '今天' : '历史'}
                    </PanelTag>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#5d7288]">{snapshot.preview}</p>
                </button>
              ))}
            </div>
          </DashboardCard>
        </div>
      </section>
    </DashboardShell>
  );
}
