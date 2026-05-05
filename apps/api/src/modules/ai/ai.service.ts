import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { getJwtSecret } from '../../config/security.config';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PlansRepository } from '../plans/plans.repository';
import { TrainingOverridesRepository } from '../training-overrides/training-overrides.repository';
import type { AiConversationContext } from './dto/ai-context.dto';
import type { CreateConversationDto } from './dto/create-conversation.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import { AiRepository } from './ai.repository';

interface RagAnswerResult {
  answer: string;
  tips?: string[];
  risk_note?: string;
  citations?: Array<Record<string, unknown>>;
  trace?: Array<Record<string, unknown>>;
}

interface RagStreamChunkEvent {
  event: 'chunk';
  data: {
    content: string;
  };
}

interface RagStreamDoneEvent {
  event: 'done';
  data: RagAnswerResult;
}

type RagStreamEvent = RagStreamChunkEvent | RagStreamDoneEvent;

interface ConversationRow {
  id: string;
  title: string;
  context: unknown;
  created_at: Date;
  updated_at: Date;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  citations: unknown;
  trace: unknown;
  created_at: Date;
}

export type AiMessageStreamEvent =
  | {
      type: 'start';
      conversationId: string;
      userMessage: {
        id: string;
        role: string;
        content: string;
        citations: Array<Record<string, unknown>>;
        trace: Array<Record<string, unknown>>;
        createdAt: Date;
      };
      assistantMessageId: string;
    }
  | {
      type: 'chunk';
      assistantMessageId: string;
      content: string;
    }
  | {
      type: 'done';
      conversationId: string;
      assistantMessage: {
        id: string;
        role: string;
        content: string;
        citations: Array<Record<string, unknown>>;
        trace: Array<Record<string, unknown>>;
        createdAt: Date;
      };
    };

function resolveAiServiceTimeoutMs() {
  const raw = Number(process.env.AI_SERVICE_TIMEOUT_MS ?? '60000');
  if (!Number.isFinite(raw) || raw <= 0) {
    return 60000;
  }
  return raw;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function compactContext(context?: AiConversationContext | null): AiConversationContext {
  return Object.fromEntries(Object.entries(context ?? {}).filter(([, value]) => Boolean(value))) as AiConversationContext;
}

function buildConversationTitle(title: string | undefined, content?: string) {
  const resolved = title?.trim() || content?.trim() || 'CampusFit AI 助手';
  return resolved.slice(0, 64);
}

function isEphemeralConversationId(conversationId: string) {
  return conversationId.startsWith('ephemeral:');
}

function buildEphemeralConversationId() {
  return `ephemeral:${randomUUID()}`;
}

function mapActiveTrainingPlan(trainingPlan: any) {
  if (!trainingPlan) {
    return null;
  }

  return {
    plan_id: trainingPlan.id,
    title: trainingPlan.title,
    split_type: trainingPlan.splitType,
    duration_min: trainingPlan.durationMinutes,
    summary: trainingPlan.notes,
    items: (trainingPlan.items ?? []).map((item: any) => ({
      name: item.exerciseName,
      sets: item.sets,
      reps: item.reps,
      equipment: null,
      note: item.notes,
    })),
  };
}

@Injectable()
export class AiService {
  constructor(
    private readonly aiRepository: AiRepository,
    private readonly prisma: PrismaService,
    private readonly plansRepository: PlansRepository,
    private readonly trainingOverridesRepository: TrainingOverridesRepository,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const title = buildConversationTitle(dto.title);
    const context = compactContext(dto.context);

    try {
      const conversation = await this.aiRepository.createConversation(userId, title, context);
      return serializeValue(this.mapConversation(conversation as ConversationRow | null));
    } catch {
      const now = new Date();

      return serializeValue({
        id: buildEphemeralConversationId(),
        title,
        context,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async sendMessage(user: CurrentUserPayload, conversationId: string, dto: SendMessageDto) {
    const userId = user.userId;

    if (isEphemeralConversationId(conversationId)) {
      return serializeValue(await this.sendEphemeralMessage(user, conversationId, dto));
    }

    const conversation = await this.aiRepository.findConversationByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppException('NOT_FOUND', 'AI 会话不存在', 404);
    }

    const mergedContext = compactContext({
      ...compactContext(parseJson<AiConversationContext>(conversation.context, {})),
      ...compactContext(dto.context),
    });
    const title = buildConversationTitle(conversation.title, dto.content);

    const userMessage = await this.aiRepository.createMessage(conversation.id, 'user', dto.content);
    const aiResult = await this.askAi(user, dto.content, mergedContext);
    const assistantMessage = await this.aiRepository.createMessage(
      conversation.id,
      'assistant',
      aiResult.answer,
      aiResult.citations ?? [],
      aiResult.trace ?? [],
    );
    await this.aiRepository.updateConversation(conversation.id, title, mergedContext);

    return serializeValue({
      conversationId: conversation.id,
      userMessage: this.mapMessage(userMessage as MessageRow | null),
      assistantMessage: this.mapMessage(assistantMessage as MessageRow | null),
    });
  }

  async *sendMessageStream(
    user: CurrentUserPayload,
    conversationId: string,
    dto: SendMessageDto,
    assistantMessageId = randomUUID(),
    signal?: AbortSignal,
  ): AsyncGenerator<AiMessageStreamEvent> {
    const userId = user.userId;

    if (isEphemeralConversationId(conversationId)) {
      const now = new Date();
      const userMessage = {
        id: randomUUID(),
        role: 'user',
        content: dto.content,
        citations: [],
        trace: [],
        createdAt: now,
      };
      yield {
        type: 'start',
        conversationId,
        userMessage,
        assistantMessageId,
      };

      let answer = '';
      let finalMeta: RagAnswerResult = { answer: '', citations: [], trace: [] };
      for await (const event of this.askAiStream(user, dto.content, compactContext(dto.context), signal)) {
        if (event.event === 'chunk') {
          answer += event.data.content;
          yield { type: 'chunk', assistantMessageId, content: event.data.content };
          continue;
        }
        finalMeta = event.data;
      }

      yield {
        type: 'done',
        conversationId,
        assistantMessage: {
          id: assistantMessageId,
          role: 'assistant',
          content: answer,
          citations: finalMeta.citations ?? [],
          trace: finalMeta.trace ?? [],
          createdAt: new Date(),
        },
      };
      return;
    }

    const conversation = await this.aiRepository.findConversationByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppException('NOT_FOUND', 'AI 会话不存在', 404);
    }

    const mergedContext = compactContext({
      ...compactContext(parseJson<AiConversationContext>(conversation.context, {})),
      ...compactContext(dto.context),
    });
    const title = buildConversationTitle(conversation.title, dto.content);
    const userMessageRow = await this.aiRepository.createMessage(conversation.id, 'user', dto.content);
    const userMessage = this.mapMessage(userMessageRow as MessageRow | null);

    yield {
      type: 'start',
      conversationId: conversation.id,
      userMessage,
      assistantMessageId,
    };

    let answer = '';
    let finalMeta: RagAnswerResult = { answer: '', citations: [], trace: [] };
    for await (const event of this.askAiStream(user, dto.content, mergedContext, signal)) {
      if (event.event === 'chunk') {
        answer += event.data.content;
        yield { type: 'chunk', assistantMessageId, content: event.data.content };
        continue;
      }
      finalMeta = event.data;
    }

    const assistantMessageRow = await this.aiRepository.createMessage(
      conversation.id,
      'assistant',
      answer,
      finalMeta.citations ?? [],
      finalMeta.trace ?? [],
      assistantMessageId,
    );
    await this.aiRepository.updateConversation(conversation.id, title, mergedContext);

    yield {
      type: 'done',
      conversationId: conversation.id,
      assistantMessage: this.mapMessage(assistantMessageRow as MessageRow | null),
    };
  }

  async listMessages(userId: string, conversationId: string) {
    if (isEphemeralConversationId(conversationId)) {
      return serializeValue({
        conversationId,
        messages: [],
      });
    }

    const conversation = await this.aiRepository.findConversationByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppException('NOT_FOUND', 'AI 会话不存在', 404);
    }

    const messages = await this.aiRepository.listMessages(conversationId);

    return serializeValue({
      conversationId,
      messages: messages.map((message: MessageRow) => this.mapMessage(message)),
    });
  }

  private async sendEphemeralMessage(user: CurrentUserPayload, conversationId: string, dto: SendMessageDto) {
    const now = new Date();
    const aiResult = await this.askAi(user, dto.content, compactContext(dto.context));

    return {
      conversationId,
      userMessage: {
        id: randomUUID(),
        role: 'user',
        content: dto.content,
        citations: [],
        trace: [],
        createdAt: now,
      },
      assistantMessage: {
        id: randomUUID(),
        role: 'assistant',
        content: aiResult.answer,
        citations: aiResult.citations ?? [],
        trace: aiResult.trace ?? [],
        createdAt: new Date(),
      },
    };
  }

  private async askAi(currentUser: CurrentUserPayload, question: string, context: AiConversationContext): Promise<RagAnswerResult> {
    const requestBody = await this.buildAiRequestBody(currentUser, question, context);
    const response = await fetch(`${process.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:8001'}/api/v1/rag/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CampusFit-Service-Token': getJwtSecret(),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(resolveAiServiceTimeoutMs()),
    }).catch(() => {
      throw new AppException('AI_TIMEOUT', 'AI 服务响应超时，请稍后重试', 504);
    });

    const payload = (await response.json()) as {
      code?: string;
      message?: string;
      data?: RagAnswerResult;
    };

    if (!response.ok || payload.code !== 'OK' || !payload.data) {
      if (response.status === 401 || response.status === 403) {
        throw new AppException('AI_TIMEOUT', 'AI 服务认证配置异常，请稍后再试', 502);
      }

      const code = payload.code === 'AI_SAFETY_BLOCKED' ? 'AI_SAFETY_BLOCKED' : 'AI_TIMEOUT';
      throw new AppException(code, payload.message ?? 'AI 服务返回异常', response.status || 502);
    }

    return payload.data;
  }

  private async *askAiStream(
    currentUser: CurrentUserPayload,
    question: string,
    context: AiConversationContext,
    signal?: AbortSignal,
  ): AsyncGenerator<RagStreamEvent> {
    const requestBody = await this.buildAiRequestBody(currentUser, question, context);
    const response = await fetch(`${process.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:8001'}/api/v1/rag/ask/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CampusFit-Service-Token': getJwtSecret(),
      },
      body: JSON.stringify(requestBody),
      signal: signal ?? AbortSignal.timeout(resolveAiServiceTimeoutMs()),
    }).catch(() => {
      throw new AppException('AI_TIMEOUT', 'AI 鏈嶅姟鍝嶅簲瓒呮椂锛岃绋嶅悗閲嶈瘯', 504);
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
      if (response.status === 401 || response.status === 403) {
        throw new AppException('AI_TIMEOUT', 'AI 鏈嶅姟璁よ瘉閰嶇疆寮傚父锛岃绋嶅悗鍐嶈瘯', 502);
      }
      const code = payload?.code === 'AI_SAFETY_BLOCKED' ? 'AI_SAFETY_BLOCKED' : 'AI_TIMEOUT';
      throw new AppException(code, payload?.message ?? 'AI 鏈嶅姟杩斿洖寮傚父', response.status || 502);
    }

    if (!response.body) {
      throw new AppException('AI_TIMEOUT', 'AI 鏈嶅姟杩斿洖寮傚父', 502);
    }

    for await (const frame of this.readSseFrames(response.body as AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>)) {
      if (!frame.data) {
        continue;
      }
      const parsed = JSON.parse(frame.data) as RagStreamEvent['data'];
      if (frame.event === 'chunk') {
        yield { event: 'chunk', data: parsed as RagStreamChunkEvent['data'] };
        continue;
      }
      if (frame.event === 'done') {
        yield { event: 'done', data: parsed as RagStreamDoneEvent['data'] };
      }
    }
  }

  private async buildAiRequestBody(currentUser: CurrentUserPayload, question: string, context: AiConversationContext) {
    const userId = currentUser.userId;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.profile) {
      throw new AppException('CONFLICT', '鐢ㄦ埛灏氭湭瀹屾垚寤烘。', 409);
    }

    const dietPlan = context.dietPlanId
      ? await this.plansRepository.findDietPlanByIdAndUser(context.dietPlanId, userId)
      : null;
    const activeTrainingOverride = context.dailyPlanId
      ? await this.trainingOverridesRepository.findActiveByDailyPlanIdAndUser(context.dailyPlanId, userId)
      : null;
    const trainingPlan = activeTrainingOverride
      ? activeTrainingOverride
      : context.trainingPlanId
        ? await this.plansRepository.findTrainingPlanByIdAndUser(context.trainingPlanId, userId)
        : null;

    return {
      question,
      top_k: 3,
      user_profile: {
        user_id: user.id,
        goal: user.profile.targetType,
        diet_scene: user.profile.dietScene,
        training_level: user.profile.trainingExperience,
        supplement_opt_in: user.profile.supplementOptIn,
        note: `training_days_per_week=${user.profile.trainingDaysPerWeek}`,
      },
      diet_plan: dietPlan
        ? {
            plan_id: dietPlan.id,
            title: dietPlan.summary.slice(0, 32),
            summary: dietPlan.summary,
            targets: {
              calories: dietPlan.dailyPlan.calorieTarget,
              protein_g: dietPlan.dailyPlan.proteinTargetG,
              carb_g: dietPlan.dailyPlan.carbTargetG,
              fat_g: dietPlan.dailyPlan.fatTargetG,
            },
            meals: dietPlan.items.map((item: {
              title: string;
              suggestionText: string;
            }) => ({
              meal_name: item.title,
              foods: [],
              note: item.suggestionText,
            })),
          }
        : null,
      training_plan: mapActiveTrainingPlan(trainingPlan),
    };
  }

  private async *readSseFrames(body: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>) {
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of this.toAsyncIterable(body)) {
      buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const parsed = this.parseSseFrame(frame);
        if (parsed) {
          yield parsed;
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const parsed = this.parseSseFrame(buffer);
      if (parsed) {
        yield parsed;
      }
    }
  }

  private async *toAsyncIterable(body: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>) {
    if (Symbol.asyncIterator in body) {
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        yield chunk;
      }
      return;
    }

    const reader = (body as ReadableStream<Uint8Array>).getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          yield value;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseSseFrame(frame: string) {
    const eventMatch = frame.match(/^event:\s*(.+)$/m);
    const dataLines = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());
    if (!eventMatch || dataLines.length === 0) {
      return null;
    }
    return {
      event: eventMatch[1].trim(),
      data: dataLines.join('\n'),
    };
  }

  private mapConversation(conversation: ConversationRow | null) {
    if (!conversation) {
      throw new AppException('INTERNAL_ERROR', 'AI 会话创建失败', 500);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      context: parseJson<AiConversationContext>(conversation.context, {}),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    };
  }

  private mapMessage(message: MessageRow | null) {
    if (!message) {
      throw new AppException('INTERNAL_ERROR', 'AI 消息写入失败', 500);
    }

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      citations: parseJson<Array<Record<string, unknown>>>(message.citations, []),
      trace: parseJson<Array<Record<string, unknown>>>(message.trace, []),
      createdAt: message.created_at,
    };
  }
}
