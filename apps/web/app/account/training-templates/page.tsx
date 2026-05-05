'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  createTrainingTemplate,
  enableTrainingTemplate,
  fetchTrainingTemplateDetail,
  fetchTrainingTemplates,
  importTrainingTemplatePreview,
  setDefaultTrainingTemplate,
  type TrainingTemplateDetail,
  type TrainingTemplateImportPreview,
  type TrainingTemplatePayload,
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
import { buildDraftFromImportPreview } from '@/lib/training-template-import-draft';
import {
  buildEmptyTrainingTemplateDraft,
  DEFAULT_TRAINING_DURATION_MINUTES,
  DEFAULT_TRAINING_INTENSITY_LEVEL,
  DEFAULT_TRAINING_REST_SECONDS,
  DEFAULT_TRAINING_SPLIT_TYPE,
  normalizeTrainingTemplateDraftForSave,
  TRAINING_TEMPLATE_WEEKDAY_ORDER,
} from '@/lib/training-template-draft';
import { describeUserFacingError } from '@/lib/user-facing-error';

type DraftItem = TrainingTemplateDraft['days'][number]['items'][number];

const importExampleText = `周一 休息

周二 胸肩三头
杠铃卧推 8×4
自重臂屈伸 8×3（下胸）
龙门架绳索下压 12×3（三头外侧）

周三 背二头
引体向上 8×4
宽距高位下拉 10×3
二头超级组（站姿+坐姿 10+10×3）`;

function normalizeError(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '训练模板页面暂时没有完成同步。',
    nextStep: '稍后刷新页面重试，或重新进入训练模板页。',
    dataStatus: '你已经保存的模板不会因为这次失败丢失。',
  });
}

function validateDraft(draft: TrainingTemplateDraft) {
  const normalizedDraft = normalizeTrainingTemplateDraftForSave(draft);

  if (!normalizedDraft.name.trim()) {
    return '模板名称不能为空。';
  }

  for (const day of normalizedDraft.days) {
    if (!day.title.trim()) {
      return `${day.weekday} 的标题不能为空。`;
    }

    if (day.dayType === 'rest') {
      continue;
    }

    if (!day.splitType?.trim()) {
      return `${day.title} 还没有填写训练类型。`;
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
  const normalizedDraft = normalizeTrainingTemplateDraftForSave(draft);

  return {
    name: normalizedDraft.name,
    status: normalizedDraft.status,
    isEnabled: normalizedDraft.isEnabled,
    isDefault: normalizedDraft.isDefault,
    notes: normalizedDraft.notes,
    days: normalizedDraft.days.map((day) => ({
      ...day,
      items: day.items.map((item) => ({
        ...item,
        repText: item.repText ?? item.reps,
        sourceType: item.sourceType === 'free_text' ? 'free_text' : 'standard',
        rawInput: item.rawInput ?? null,
      })),
    })),
  };
}

function hasUnsavedDraftChanges(draft: TrainingTemplateDraft | null, dirty: boolean) {
  return Boolean(draft && dirty);
}

function confirmImportReplacement(draft: TrainingTemplateDraft | null, dirty: boolean) {
  if (!hasUnsavedDraftChanges(draft, dirty)) {
    return true;
  }

  return window.confirm('继续后会替换当前未保存内容，是否继续？');
}

export default function TrainingTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TrainingTemplateDetail[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrainingTemplateDraft | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importPreview, setImportPreview] = useState<TrainingTemplateImportPreview | null>(null);
  const [importError, setImportError] = useState('');
  const [importParsing, setImportParsing] = useState(false);

  function resetImportState(options?: { keepText?: boolean }) {
    setImportPreview(null);
    setImportError('');
    if (!options?.keepText) {
      setImportRawText('');
    }
  }

  function applyDraft(nextDraft: TrainingTemplateDraft | null, dirty = false) {
    setDraft(nextDraft);
    setDraftDirty(dirty);
  }

  function handleDraftChange(nextDraft: TrainingTemplateDraft) {
    applyDraft(nextDraft, true);
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

      if (!targetId) {
        applyDraft(null, false);
        return;
      }

      const detail = await fetchTrainingTemplateDetail(session.accessToken, targetId);
      applyDraft(toDraft(detail), false);
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
    setMessage('');

    try {
      const detail = await fetchTrainingTemplateDetail(session.accessToken, templateId);
      applyDraft(toDraft(detail), false);
    } catch (loadError) {
      setError(normalizeError(loadError));
    }
  }

  function handleCreateTemplate() {
    setImportOpen(false);
    resetImportState();
    setSelectedTemplateId(null);
    applyDraft(buildEmptyTrainingTemplateDraft(), false);
    setMessage('');
    setError('');
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
    if (!confirmImportReplacement(draft, draftDirty)) {
      return;
    }

    setMessage('');
    setError('');
    resetImportState();
    setImportOpen(true);
  }

  function handleCloseImport() {
    setImportOpen(false);
    resetImportState();
  }

  function handleImportRawTextChange(value: string) {
    setImportRawText(value);
    setImportPreview(null);
    setImportError('');
  }

  async function handleGenerateImportDraft() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    if (!importRawText.trim()) {
      setImportError('请先粘贴训练文字，再生成草稿模板。');
      return;
    }

    setImportParsing(true);
    setImportError('');

    try {
      const preview = await importTrainingTemplatePreview(session.accessToken, {
        templateId: draft?.id ?? selectedTemplateId ?? undefined,
        rawText: importRawText,
      });

      const nextDraft = buildDraftFromImportPreview(preview, {
        baseName: draft?.name ?? '训练模板',
      });

      setImportPreview(preview);
      setSelectedTemplateId(null);
      applyDraft(nextDraft, true);
      setImportOpen(false);
      resetImportState();

      if (preview.summary.warningLines > 0 || preview.summary.blockingLines > 0) {
        setMessage('草稿模板已生成，部分动作需要你手动补充。');
      } else {
        setMessage('已根据文本生成新的草稿模板，你现在可以继续调整后再保存。');
      }
    } catch (requestError) {
      setImportPreview(null);
      setImportError(normalizeError(requestError));
    } finally {
      setImportParsing(false);
    }
  }

  return (
    <DashboardShell
      currentPath="/account"
      sidebarHint="先维护长期周模板，再按需要应用到 today 页的自然日训练。"
      primaryCta={{ label: '返回 today 页', href: '/today' }}
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
          onCreateTemplate={handleCreateTemplate}
          onEnableTemplate={(templateId) => void handleEnableTemplate(templateId)}
          onSetDefaultTemplate={(templateId) => void handleSetDefaultTemplate(templateId)}
          disabled={saving}
        />

        <TrainingTemplateEditor
          draft={draft}
          onChange={handleDraftChange}
          onSave={() => void handleSaveDraft()}
          onOpenImport={handleOpenImport}
          disabled={saving || importParsing}
          importHint="文字导入会根据你粘贴的训练文字生成一份新的未保存草稿，调整后再手动保存。"
        />
      </section>

      <TrainingTemplateImportDrawer
        open={importOpen}
        templateName={draft?.name ?? '未命名模板'}
        rawText={importRawText}
        preview={importPreview}
        parsing={importParsing}
        error={importError}
        onClose={handleCloseImport}
        onRawTextChange={handleImportRawTextChange}
        onGenerateDraft={() => void handleGenerateImportDraft()}
        onUseExample={() => handleImportRawTextChange(importExampleText)}
      />
    </DashboardShell>
  );
}
