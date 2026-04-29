import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
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

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    if (isEphemeralConversationId(conversationId)) {
      return serializeValue(await this.sendEphemeralMessage(userId, conversationId, dto));
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
    const aiResult = await this.askAi(userId, dto.content, mergedContext);
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

  private async sendEphemeralMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const now = new Date();
    const aiResult = await this.askAi(userId, dto.content, compactContext(dto.context));

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

  private async askAi(userId: string, question: string, context: AiConversationContext): Promise<RagAnswerResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.profile) {
      throw new AppException('CONFLICT', '用户尚未完成建档', 409);
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

    const response = await fetch(`${process.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:8001'}/api/v1/rag/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => {
      throw new AppException('AI_TIMEOUT', 'AI 服务暂时不可用，请稍后再试', 504);
    });

    const payload = (await response.json()) as {
      code?: string;
      message?: string;
      data?: RagAnswerResult;
    };

    if (!response.ok || payload.code !== 'OK' || !payload.data) {
      const code = payload.code === 'AI_SAFETY_BLOCKED' ? 'AI_SAFETY_BLOCKED' : 'AI_TIMEOUT';
      throw new AppException(code, payload.message ?? 'AI 服务返回异常', response.status || 502);
    }

    return payload.data;
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
