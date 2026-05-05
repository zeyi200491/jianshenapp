const crypto = require('node:crypto');
const path = require('path');
const { AiRepository } = require(path.join(__dirname, 'ai.repository.ts'));

describe('AiRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createRepository() {
    const prisma = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn(),
    };
    return {
      repository: new AiRepository(prisma),
      prisma,
    };
  }

  it('writes explicit ids when creating a conversation', async () => {
    const { repository, prisma } = createRepository();
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        user_id: '22222222-2222-4222-8222-222222222222',
        title: '今日会话',
        context: {},
        created_at: new Date('2026-05-04T08:00:00.000Z'),
        updated_at: new Date('2026-05-04T08:00:00.000Z'),
      },
    ]);

    await repository.createConversation('22222222-2222-4222-8222-222222222222', '今日会话', {});

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_conversations (id, user_id, title, context)'),
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '今日会话',
      '{}',
    );
  });

  it('writes explicit ids when creating a message', async () => {
    const { repository, prisma } = createRepository();
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('33333333-3333-4333-8333-333333333333');
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        conversation_id: '44444444-4444-4444-8444-444444444444',
        role: 'assistant',
        content: '先补蛋白。',
        citations: [],
        trace: [],
        created_at: new Date('2026-05-04T08:00:01.000Z'),
      },
    ]);

    await repository.createMessage('44444444-4444-4444-8444-444444444444', 'assistant', '先补蛋白。');

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_messages (id, conversation_id, role, content, citations, trace)'),
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'assistant',
      '先补蛋白。',
      '[]',
      '[]',
    );
  });

  it('reuses a provided message id when creating a message', async () => {
    const { repository, prisma } = createRepository();
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: '55555555-5555-4555-8555-555555555555',
        conversation_id: '44444444-4444-4444-8444-444444444444',
        role: 'assistant',
        content: '分两步执行。',
        citations: [],
        trace: [],
        created_at: new Date('2026-05-04T08:00:01.000Z'),
      },
    ]);

    await repository.createMessage(
      '44444444-4444-4444-8444-444444444444',
      'assistant',
      '分两步执行。',
      [],
      [],
      '55555555-5555-4555-8555-555555555555',
    );

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ai_messages (id, conversation_id, role, content, citations, trace)'),
      '55555555-5555-4555-8555-555555555555',
      '44444444-4444-4444-8444-444444444444',
      'assistant',
      '分两步执行。',
      '[]',
      '[]',
    );
  });
});
