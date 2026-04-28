'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  createTrainingTemplate,
  enableTrainingTemplate,
  fetchTrainingTemplateDetail,
  fetchTrainingTemplates,
  setDefaultTrainingTemplate,
  type TrainingTemplateDetail,
  type TrainingTemplatePayload,
  type TrainingTemplateWeekday,
  updateTrainingTemplate,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { DashboardShell, MetricPill, SectionEyebrow } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { TrainingTemplateEditor, type TrainingTemplateDraft } from '@/components/web/training-templates/training-template-editor';
import { TrainingTemplateList } from '@/components/web/training-templates/training-template-list';
import { describeUserFacingError } from '@/lib/user-facing-error';

const weekdayOrder: TrainingTemplateWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function buildEmptyDraft(): TrainingTemplateDraft {
  return {
    name: '我的周训练模板',
    status: 'active',
    isEnabled: false,
    isDefault: false,
    notes: '',
    days: weekdayOrder.map((weekday, index) => {
      const isRestDay = index === 2 || index === 6;
      return {
        weekday,
        dayType: isRestDay ? 'rest' : 'training',
        title: isRestDay ? '恢复日' : `训练日 ${index + 1}`,
        splitType: isRestDay ? null : 'push_pull_legs',
        durationMinutes: isRestDay ? null : 45,
        intensityLevel: isRestDay ? null : 'medium',
        notes: '',
        items: isRestDay
          ? []
          : [
              {
                exerciseCode: '',
                exerciseName: '',
                sets: 3,
                reps: '10-12',
                restSeconds: 90,
                notes: '',
              },
            ],
      };
    }),
  };
}

function normalizeError(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '训练模板页暂时没有完成同步。',
    nextStep: '稍后刷新页面重试，或重新进入训练模板页。',
    dataStatus: '你已经保存的模板不会因为这次失败丢失。',
  });
}

function validateDraft(draft: TrainingTemplateDraft) {
  if (!draft.name.trim()) {
    return '模板名称不能为空。';
  }

  for (const day of draft.days) {
    if (!day.title.trim()) {
      return `${day.weekday} 的标题不能为空。`;
    }
    if (day.dayType === 'rest') {
      continue;
    }
    if (!day.splitType?.trim()) {
      return `${day.title} 还没有填写 splitType。`;
    }
    if (!day.durationMinutes) {
      return `${day.title} 还没有填写训练时长。`;
    }
    if (!day.intensityLevel) {
      return `${day.title} 还没有选择训练强度。`;
    }
    if (day.items.length === 0) {
      return `${day.title} 至少要有 1 个训练动作。`;
    }
    for (const item of day.items) {
      if (!item.exerciseName.trim()) {
        return `${day.title} 里有动作名称为空。`;
      }
      if (!item.exerciseCode.trim()) {
        return `${day.title} 里有动作 code 为空。`;
      }
      if (!item.reps.trim()) {
        return `${day.title} 里有动作次数为空。`;
      }
    }
  }

  return '';
}

function toDraft(detail: TrainingTemplateDetail): TrainingTemplateDraft {
  return {
    id: detail.id,
    name: detail.name,
    status: detail.status,
    isEnabled: detail.isEnabled,
    isDefault: detail.isDefault,
    notes: detail.notes,
    days: detail.days.map((day) => ({
      weekday: day.weekday,
      dayType: day.dayType,
      title: day.title,
      splitType: day.splitType ?? null,
      durationMinutes: day.durationMinutes ?? null,
      intensityLevel: day.intensityLevel ?? null,
      notes: day.notes ?? '',
      items: day.items.map((item) => ({
        exerciseCode: item.exerciseCode,
        exerciseName: item.exerciseName,
        sets: item.sets,
        reps: item.reps,
        restSeconds: item.restSeconds,
        notes: item.notes ?? '',
      })),
    })),
  };
}

function toPayload(draft: TrainingTemplateDraft): TrainingTemplatePayload {
  return {
    name: draft.name,
    status: draft.status,
    isEnabled: draft.isEnabled,
    isDefault: draft.isDefault,
    notes: draft.notes,
    days: draft.days,
  };
}

export default function TrainingTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TrainingTemplateDetail[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrainingTemplateDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadTemplates(nextSelectedId?: string | null) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const list = await fetchTrainingTemplates(session.accessToken);
      setTemplates(list);

      const targetId = nextSelectedId ?? selectedTemplateId ?? list[0]?.id ?? null;
      setSelectedTemplateId(targetId);

      if (targetId) {
        const detail = await fetchTrainingTemplateDetail(session.accessToken, targetId);
        setDraft(toDraft(detail));
      } else {
        setDraft(null);
      }
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
      setError(normalizeError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function handleSelectTemplate(templateId: string) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setSelectedTemplateId(templateId);
    setError('');
    try {
      const detail = await fetchTrainingTemplateDetail(session.accessToken, templateId);
      setDraft(toDraft(detail));
    } catch (loadError) {
      setError(normalizeError(loadError));
    }
  }

  async function handleSaveDraft() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!draft) {
      return;
    }

    const validationMessage = validateDraft(draft);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = toPayload(draft);
      const saved = draft.id
        ? await updateTrainingTemplate(session.accessToken, draft.id, payload)
        : await createTrainingTemplate(session.accessToken, payload);

      await loadTemplates(saved.id);
      setMessage('训练模板已保存。');
    } catch (saveError) {
      setError(normalizeError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleEnableTemplate(templateId: string) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setMessage('');
    setError('');
    try {
      await enableTrainingTemplate(session.accessToken, templateId);
      await loadTemplates(templateId);
      setMessage('这套模板已设为 today 页默认来源。');
    } catch (requestError) {
      setError(normalizeError(requestError));
    }
  }

  async function handleSetDefaultTemplate(templateId: string) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setMessage('');
    setError('');
    try {
      await setDefaultTrainingTemplate(session.accessToken, templateId);
      await loadTemplates(templateId);
      setMessage('这套模板已设为长期默认模板。');
    } catch (requestError) {
      setError(normalizeError(requestError));
    }
  }

  return (
    <DashboardShell
      currentPath="/account"
      sidebarHint="把你的长期周节奏先定下来，today 页再负责按天执行。"
      primaryCta={{ label: '返回今日页', href: '/today' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Training Templates</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">个人训练模板</h1>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-[#5f768d]">
              先维护周一到周日的长期模板，再回到 today 页按自然日预览，或手动切星期后应用到今天。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill label="模板数量" value={`${templates.length}`} accent />
            <MetricPill label="已启用模板" value={`${templates.filter((item) => item.isEnabled).length}`} />
            <MetricPill label="默认模板" value={`${templates.filter((item) => item.isDefault).length}`} />
          </div>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在读取个人训练模板...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}
      {message ? <LiveStatusCard tone="success">{message}</LiveStatusCard> : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <TrainingTemplateList
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={(templateId) => void handleSelectTemplate(templateId)}
          onCreateTemplate={() => {
            setSelectedTemplateId(null);
            setDraft(buildEmptyDraft());
            setMessage('');
            setError('');
          }}
          onEnableTemplate={(templateId) => void handleEnableTemplate(templateId)}
          onSetDefaultTemplate={(templateId) => void handleSetDefaultTemplate(templateId)}
          disabled={saving}
        />

        <TrainingTemplateEditor
          draft={draft}
          onChange={setDraft}
          onSave={() => void handleSaveDraft()}
          disabled={saving}
        />
      </section>
    </DashboardShell>
  );
}
