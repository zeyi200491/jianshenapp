import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AiConversationContext } from './dto/ai-context.dto';

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  context: AiConversationContext | string | null;
  created_at: Date;
  updated_at: Date;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  citations: unknown;
  trace: unknown;
  created_at: Date;
}

interface RawExecutor {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
}

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get raw(): RawExecutor {
    return this.prisma as unknown as RawExecutor;
  }

  async createConversation(userId: string, title: string, context: AiConversationContext) {
    const rows = await this.raw.$queryRawUnsafe<ConversationRow[]>(
      `
        INSERT INTO ai_conversations (user_id, title, context)
        VALUES ($1::uuid, $2, $3::jsonb)
        RETURNING id, user_id, title, context, created_at, updated_at
      `,
      userId,
      title,
      JSON.stringify(context ?? {}),
    );

    return rows[0] ?? null;
  }

  async findConversationByIdAndUser(id: string, userId: string) {
    const rows = await this.raw.$queryRawUnsafe<ConversationRow[]>(
      `
        SELECT id, user_id, title, context, created_at, updated_at
        FROM ai_conversations
        WHERE id = $1::uuid AND user_id = $2::uuid
        LIMIT 1
      `,
      id,
      userId,
    );

    return rows[0] ?? null;
  }

  async updateConversation(id: string, title: string, context: AiConversationContext) {
    const rows = await this.raw.$queryRawUnsafe<ConversationRow[]>(
      `
        UPDATE ai_conversations
        SET title = $2,
            context = $3::jsonb,
            updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING id, user_id, title, context, created_at, updated_at
      `,
      id,
      title,
      JSON.stringify(context ?? {}),
    );

    return rows[0] ?? null;
  }

  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    citations: unknown[] = [],
    trace: unknown[] = [],
  ) {
    const rows = await this.raw.$queryRawUnsafe<MessageRow[]>(
      `
        INSERT INTO ai_messages (conversation_id, role, content, citations, trace)
        VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)
        RETURNING id, conversation_id, role, content, citations, trace, created_at
      `,
      conversationId,
      role,
      content,
      JSON.stringify(citations),
      JSON.stringify(trace),
    );

    return rows[0] ?? null;
  }

  listMessages(conversationId: string) {
    return this.raw.$queryRawUnsafe<MessageRow[]>(
      `
        SELECT id, conversation_id, role, content, citations, trace, created_at
        FROM ai_messages
        WHERE conversation_id = $1::uuid
        ORDER BY created_at ASC
      `,
      conversationId,
    );
  }
}

