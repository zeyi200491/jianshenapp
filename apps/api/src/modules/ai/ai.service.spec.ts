const fs = require('fs');
const path = require('path');
const { Readable } = require('node:stream');
const { AiService } = require(path.join(__dirname, 'ai.service.ts'));

describe('AiService', () => {
  const originalFetch = global.fetch;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'service-token-secret';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
      return;
    }
    process.env.JWT_SECRET = originalJwtSecret;
  });

  function createService() {
    const aiRepository = {
      findConversationByIdAndUser: jest.fn().mockResolvedValue({
        id: 'conversation-1',
        title: '今日会话',
        context: {},
      }),
      createMessage: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'user-message-1',
          role: 'user',
          content: '今天训练后特别饿，晚餐怎么调整？',
          citations: [],
          trace: [],
          created_at: new Date('2026-05-04T08:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          id: 'assistant-message-1',
          role: 'assistant',
          content: '先补蛋白，再按训练量补主食。',
          citations: [],
          trace: [],
          created_at: new Date('2026-05-04T08:00:01.000Z'),
        }),
      updateConversation: jest.fn().mockResolvedValue({}),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          profile: {
            targetType: 'cut',
            dietScene: 'canteen',
            trainingExperience: 'beginner',
            supplementOptIn: true,
            trainingDaysPerWeek: 4,
          },
        }),
      },
    };
    const plansRepository = {
      findDietPlanByIdAndUser: jest.fn().mockResolvedValue(null),
      findTrainingPlanByIdAndUser: jest.fn().mockResolvedValue(null),
    };
    const trainingOverridesRepository = {
      findActiveByDailyPlanIdAndUser: jest.fn().mockResolvedValue(null),
    };

    return {
      service: new AiService(aiRepository, prisma, plansRepository, trainingOverridesRepository),
      aiRepository,
    };
  }

  it('keeps user-facing Chinese messages readable', () => {
    const source = fs.readFileSync(path.join(__dirname, 'ai.service.ts'), 'utf8');

    expect(source).toContain('AI 会话不存在');
    expect(source).toContain('AI 服务响应超时，请稍后重试');
    expect(source).not.toContain('浼氳瘽涓嶅瓨鍦');
    expect(source).not.toContain('閺堝秴濮');
  });

  it('uses an internal service token instead of forwarding the caller jwt to ai-service', async () => {
    const { service } = createService();
    const abortSpy = jest.spyOn(AbortSignal, 'timeout').mockReturnValue('mock-signal');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 'OK',
        data: {
          answer: '先补蛋白，再按训练量补主食。',
          citations: [],
          trace: [],
        },
      }),
    });

    await service.sendMessage(
      { userId: 'user-1' },
      'conversation-1',
      {
        content: '今天训练后特别饿，晚餐怎么调整？',
        context: {},
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/rag/ask'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-CampusFit-Service-Token': 'service-token-secret',
        },
        signal: 'mock-signal',
      }),
    );
    expect(abortSpy).toHaveBeenCalledWith(60000);
  });

  it('maps ai-service auth failures to upstream errors instead of 401', async () => {
    const { service } = createService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        code: 'UNAUTHORIZED',
        message: '缺少认证令牌',
      }),
    });

    try {
      await service.sendMessage(
        { userId: 'user-1' },
        'conversation-1',
        {
          content: '今天训练后特别饿，晚餐怎么调整？',
          context: {},
        },
      );
      throw new Error('expected sendMessage to fail');
    } catch (error) {
      expect(error.code).toBe('AI_TIMEOUT');
      expect(error.getStatus()).toBe(502);
    }
  });

  it('streams assistant chunks and persists the final assistant message once completed', async () => {
    const { service, aiRepository } = createService();
    const encoder = new TextEncoder();
    const assistantId = '77777777-7777-4777-8777-777777777777';
    let createMessageCallCount = 0;
    aiRepository.createMessage = jest.fn().mockImplementation(async (...args) => {
      createMessageCallCount += 1;
      if (createMessageCallCount === 1) {
        return {
          id: 'user-message-1',
          role: 'user',
          content: args[2],
          citations: [],
          trace: [],
          created_at: new Date('2026-05-04T08:00:00.000Z'),
        };
      }

      return {
        id: args[5],
        role: 'assistant',
        content: args[2],
        citations: args[3],
        trace: args[4],
        created_at: new Date('2026-05-04T08:00:01.000Z'),
      };
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: Readable.from([
        encoder.encode('event: chunk\n'),
        encoder.encode('data: {"content":"先保蛋白"}\n\n'),
        encoder.encode('event: chunk\n'),
        encoder.encode('data: {"content":"，再补主食。"}\n\n'),
        encoder.encode('event: done\n'),
        encoder.encode('data: {"citations":[],"trace":[]}\n\n'),
      ]),
    });

    const events = [];
    for await (const event of service.sendMessageStream(
      { userId: 'user-1' },
      'conversation-1',
      {
        content: '晚饭怎么调？',
        context: {},
      },
      assistantId,
    )) {
      events.push(event);
    }

    expect(events).toEqual([
      expect.objectContaining({ type: 'start', assistantMessageId: assistantId }),
      { type: 'chunk', assistantMessageId: assistantId, content: '先保蛋白' },
      { type: 'chunk', assistantMessageId: assistantId, content: '，再补主食。' },
      expect.objectContaining({
        type: 'done',
        assistantMessage: expect.objectContaining({
          id: assistantId,
          content: '先保蛋白，再补主食。',
        }),
      }),
    ]);
    expect(aiRepository.createMessage).toHaveBeenNthCalledWith(
      2,
      'conversation-1',
      'assistant',
      '先保蛋白，再补主食。',
      [],
      [],
      assistantId,
    );
  });
});
