'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  applyTrainingTemplateImport,
  createTrainingTemplate,
  enableTrainingTemplate,
  fetchTrainingTemplateDetail,
  fetchTrainingTemplates,
  importTrainingTemplatePreview,
  setDefaultTrainingTemplate,
  type TrainingTemplateDetail,
  type TrainingTemplateImportPreview,
  type TrainingTemplatePayload,
  type TrainingTemplateWeekday,
  updateTrainingTemplate,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { DashboardShell, MetricPill, SectionEyebrow } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';
import {
  TrainingTemplateEditor,
  type TrainingTemplateDraft,
} from '@/components/web/training-templates/training-template-editor';
import { TrainingTemplateImportDrawer } from '@/components/web/training-templates/training-template-import-drawer';
import { TrainingTemplateList } from '@/components/web/training-templates/training-template-list';
import { describeUserFacingError } from '@/lib/user-facing-error';

type DraftItem = TrainingTemplateDraft['days'][number]['items'][number];

const weekdayOrder: TrainingTemplateWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const importExampleText = `周一 休息

周二 胸 肩 三头
杠铃卧推 8×4
自重臂屈伸 8×3（下胸）
龙门架绳索下压 12×3（三头外侧）

周三 背 二头
引体向上 8×4
宽距高位下拉 10×3
二头超级组（站姿+坐姿 10+10×3）`;

function createDefaultItem(): DraftItem {
  return {
    exerciseCode: '',
    exerciseName: '',
    sets: 3,
    reps: '10-12',
    repText: '10-12',
    sourceType: 'standard',
    rawInput: null,
    restSeconds: 90,
    notes: '',
  };
}

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
        items: isRestDay ? [] : [createDefaultItem()],
      };
    }),
  };
}

function normalizeError(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '训练模板页面暂时没有完成同步。',
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
        return `${day.title} 里有动作编码为空。`;
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
      items: day.items.map((item) => {
        const source = item as typeof item & {
          repText?: string;
          sourceType?: string;
          rawInput?: string | null;
        };
        return {
          exerciseCode: item.exerciseCode,
          exerciseName: item.exerciseName,
          sets: item.sets,
          reps: item.reps,
          repText: source.repText ?? item.reps,
          sourceType: source.sourceType ?? 'standard',
          rawInput: source.rawInput ?? null,
          restSeconds: item.restSeconds,
          notes: item.notes ?? '',
        };
      }),
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
    days: draft.days.map((day) => ({
      ...day,
      items: day.items.map((item) => ({
        ...item,
        repText: item.repText ?? item.reps,
        sourceType: item.sourceType ?? 'standard',
        rawInput: item.rawInput ?? null,
      })),
    })),
  } as TrainingTemplatePayload;
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
  const [importOpen, setImportOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importPreview, setImportPreview] = useState<TrainingTemplateImportPreview | null>(null);
  const [importSelectedWeekdays, setImportSelectedWeekdays] = useState<TrainingTemplateWeekday[]>([]);
  const [importError, setImportError] = useState('');
  const [importParsing, setImportParsing] = useState(false);
  const [importApplying, setImportApplying] = useState(false);

  function resetImportState(options?: { keepText?: boolean }) {
    setImportPreview(null);
    setImportSelectedWeekdays([]);
    setImportError('');
    if (!options?.keepText) {
      setImportRawText('');
    }
  }

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

    setImportOpen(false);
    resetImportState();
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

  function handleOpenImport() {
    if (!draft?.id) {
      setError('请先保存这套模板，再使用文字导入。');
      return;
    }

    setImportOpen(true);
    setImportError('');
  }

  function handleCloseImport() {
    setImportOpen(false);
    resetImportState();
  }

  function handleImportRawTextChange(value: string) {
    setImportRawText(value);
    setImportPreview(null);
    setImportSelectedWeekdays([]);
    setImportError('');
  }

  function handleToggleImportWeekday(weekday: TrainingTemplateWeekday) {
    setImportSelectedWeekdays((current) =>
      current.includes(weekday) ? current.filter((item) => item !== weekday) : [...current, weekday],
    );
  }

  async function handleImportPreview() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!draft?.id) {
      setImportError('请先保存这套模板，再使用文字导入。');
      return;
    }
    if (!importRawText.trim()) {
      setImportError('先贴入训练文本，再开始解析。');
      return;
    }

    setImportParsing(true);
    setImportError('');

    try {
      const preview = await importTrainingTemplatePreview(session.accessToken, {
        templateId: draft.id,
        rawText: importRawText,
      });
      setImportPreview(preview);
      setImportSelectedWeekdays(
        preview.parsedDays.filter((day) => day.selectable).map((day) => day.weekday),
      );
    } catch (requestError) {
      setImportPreview(null);
      setImportSelectedWeekdays([]);
      setImportError(normalizeError(requestError));
    } finally {
      setImportParsing(false);
    }
  }

  async function handleApplyImport() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!draft?.id || !importPreview) {
      setImportError('请先完成一次解析预览。');
      return;
    }
    if (importSelectedWeekdays.length === 0) {
      setImportError('至少勾选一天，再执行覆盖。');
      return;
    }

    setImportApplying(true);
    setImportError('');
    setMessage('');
    setError('');

    try {
      await applyTrainingTemplateImport(session.accessToken, draft.id, {
        previewToken: importPreview.previewToken,
        selectedWeekdays: importSelectedWeekdays,
      });
      setImportOpen(false);
      resetImportState();
      await loadTemplates(draft.id);
      setMessage(`已更新 ${importSelectedWeekdays.length} 天训练模板。`);
    } catch (requestError) {
      setImportError(normalizeError(requestError));
    } finally {
      setImportApplying(false);
    }
  }

  return (
    <DashboardShell
      currentPath="/account"
      sidebarHint="把你的长期周节奏先定下来，today 页面再负责按天执行。"
      primaryCta={{ label: '返回今日页', href: '/today' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Training Templates</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">
              个人训练模板
            </h1>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-[#5f768d]">
              先维护周一到周日的长期模板，再回到 today 页面按自然日预览，或手动切星期后应用到今天。
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
            setImportOpen(false);
            resetImportState();
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
          onOpenImport={handleOpenImport}
          disabled={saving || importParsing || importApplying}
          importDisabled={!draft?.id}
          importHint={
            draft?.id
              ? '支持把训练文本解析成周模板，确认后只覆盖勾选的周几。'
              : '先保存这套模板，再用文字导入覆盖对应的周几。'
          }
        />
      </section>
      <TrainingTemplateImportDrawer
        open={importOpen}
        templateName={draft?.name ?? '未命名模板'}
        rawText={importRawText}
        preview={importPreview}
        parsing={importParsing}
        applying={importApplying}
        error={importError}
        selectedWeekdays={importSelectedWeekdays}
        onClose={handleCloseImport}
        onRawTextChange={handleImportRawTextChange}
        onPreview={() => void handleImportPreview()}
        onToggleWeekday={handleToggleImportWeekday}
        onApply={() => void handleApplyImport()}
        onUseExample={() => handleImportRawTextChange(importExampleText)}
      />
    </DashboardShell>
  );
}
