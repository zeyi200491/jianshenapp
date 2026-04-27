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
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

@Injectable()
export class AiRepository {
  private ensureTablesPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private get raw(): RawExecutor {
    return this.prisma as unknown as RawExecutor;
  }

  private async ensureTables() {
    if (!this.ensureTablesPromise) {
      this.ensureTablesPromise = this.ensureTablesInternal().catch((error) => {
        this.ensureTablesPromise = null;
        throw error;
      });
    }

    await this.ensureTablesPromise;
  }

  private async ensureTablesInternal() {
    await this.raw.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(128) NOT NULL DEFAULT '',
        context JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.raw.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id
        ON ai_conversations(user_id)
    `);

    await this.raw.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role VARCHAR(16) NOT NULL,
        content TEXT NOT NULL,
        citations JSONB NOT NULL DEFAULT '[]'::jsonb,
        trace JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.raw.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id_created_at
        ON ai_messages(conversation_id, created_at)
    `);
  }

  async createConversation(userId: string, title: string, context: AiConversationContext) {
    await this.ensureTables();

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
    await this.ensureTables();

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
    await this.ensureTables();

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
    await this.ensureTables();

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

  async listMessages(conversationId: string) {
    await this.ensureTables();

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

