const path = require('path');
const { AppException } = require(path.join(__dirname, '../../common/utils/app.exception.ts'));
const { TrainingTemplatesService } = require(path.join(__dirname, 'training-templates.service.ts'));

describe('TrainingTemplatesService', () => {
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  function createItem(overrides = {}) {
    return {
      id: 'item-1',
      exerciseCode: 'bench_press',
      exerciseName: 'Bench Press',
      sets: 4,
      reps: '8-10',
      repText: '8-10',
      sourceType: 'standard',
      rawInput: null,
      restSeconds: 180,
      notes: 'Control the eccentric',
      displayOrder: 0,
      ...overrides,
    };
  }

  function createDay(overrides = {}) {
    return {
      id: 'day-1',
      weekday: 'monday',
      dayType: 'training',
      title: 'Upper A',
      splitType: 'push_pull_legs',
      durationMinutes: 60,
      intensityLevel: 'medium',
      notes: 'Main strength day',
      items: [createItem()],
      ...overrides,
    };
  }

  function createWeek() {
    return weekdayOrder.map((weekday, index) => {
      const isRestDay = weekday === 'wednesday' || weekday === 'sunday';
      return createDay({
        id: `day-${weekday}`,
        weekday,
        dayType: isRestDay ? 'rest' : 'training',
        title: isRestDay ? `${weekday} Recovery` : `${weekday} Session`,
        splitType: isRestDay ? null : 'push_pull_legs',
        durationMinutes: isRestDay ? null : 60,
        intensityLevel: isRestDay ? null : 'medium',
        items: isRestDay
          ? []
          : [
              createItem({
                id: `item-${weekday}`,
                exerciseCode: `exercise_${index + 1}`,
                exerciseName: `Exercise ${index + 1}`,
              }),
            ],
      });
    });
  }

  function createTemplate(overrides = {}) {
    return {
      id: 'template-1',
      userId: 'user-1',
      name: 'My Weekly Template',
      status: 'active',
      isEnabled: true,
      isDefault: false,
      notes: 'Long-term cycle',
      updatedAt: new Date('2026-04-29T10:00:00.000Z'),
      days: createWeek(),
      ...overrides,
    };
  }

  function createRepository() {
    return {
      findManyByUserId: jest.fn(),
      findByIdAndUserId: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      replaceTemplateDaysFromImport: jest.fn(),
      setEnabledTemplate: jest.fn(),
      setDefaultTemplate: jest.fn(),
      findEnabledByUserId: jest.fn(),
    };
  }

  function createPreviewStore() {
    return {
      save: jest.fn().mockReturnValue('preview-token'),
      consume: jest.fn(),
    };
  }

  function createService(repository = createRepository(), previewStore = createPreviewStore()) {
    return {
      repository,
      previewStore,
      service: new TrainingTemplatesService(repository, previewStore),
    };
  }

  it('creates a template for the current user', async () => {
    const { repository, service } = createService();
    repository.createTemplate.mockResolvedValue(createTemplate());

    const result = await service.create('user-1', {
      name: 'My Weekly Template',
      status: 'active',
      isEnabled: false,
      isDefault: false,
      notes: 'Long-term cycle',
      days: createWeek().map(({ id, items, ...day }) => ({
        ...day,
        items: items.map(({ id: itemId, displayOrder, ...item }) => item),
      })),
    });

    expect(repository.createTemplate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'My Weekly Template' }),
    );
    expect(result.id).toBe('template-1');
  });

  it('lists templates of the current user', async () => {
    const { repository, service } = createService();
    repository.findManyByUserId.mockResolvedValue([createTemplate()]);

    const result = await service.list('user-1');

    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Weekly Template');
  });

  it('returns detail when the template belongs to the current user', async () => {
    const { repository, service } = createService();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate());

    const result = await service.getDetail('user-1', 'template-1');

    expect(repository.findByIdAndUserId).toHaveBeenCalledWith('template-1', 'user-1');
    expect(result.days[0].items[0].exerciseName).toBe('Exercise 1');
  });

  it('updates template days with overwrite semantics', async () => {
    const { repository, service } = createService();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate());
    repository.updateTemplate.mockResolvedValue(
      createTemplate({
        name: 'Updated Template',
        status: 'active',
        isEnabled: false,
        isDefault: true,
        notes: 'Replaced the whole week',
      }),
    );
    repository.setDefaultTemplate.mockResolvedValue(
      createTemplate({
        name: 'Updated Template',
        status: 'active',
        isEnabled: false,
        isDefault: true,
        notes: 'Replaced the whole week',
      }),
    );

    const result = await service.update('user-1', 'template-1', {
      name: 'Updated Template',
      status: 'active',
      isEnabled: false,
      isDefault: true,
      notes: 'Replaced the whole week',
      days: createWeek().map(({ id, items, ...day }) => ({
        ...day,
        items: items.map(({ id: itemId, displayOrder, ...item }) => item),
      })),
    });

    expect(repository.updateTemplate).toHaveBeenCalledWith(
      'template-1',
      'user-1',
      expect.objectContaining({ name: 'Updated Template' }),
    );
    expect(repository.setDefaultTemplate).toHaveBeenCalledWith('user-1', 'template-1');
    expect(result.name).toBe('Updated Template');
  });

  it('previews the natural weekday when weekday is omitted', async () => {
    const { repository, service } = createService();
    repository.findEnabledByUserId.mockResolvedValue(
      createTemplate({
        days: createWeek().map((day) =>
          day.weekday === 'monday'
            ? {
                ...day,
                title: 'Monday Recovery',
                dayType: 'rest',
                splitType: null,
                durationMinutes: null,
                intensityLevel: null,
                items: [],
              }
            : day,
        ),
      }),
    );

    const result = await service.preview('user-1', {
      date: '2026-04-27',
    });

    expect(repository.findEnabledByUserId).toHaveBeenCalledWith('user-1');
    expect(result.weekday).toBe('monday');
    expect(result.day.title).toBe('Monday Recovery');
  });

  it('imports preview text and returns a preview token', async () => {
    const { repository, previewStore, service } = createService();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate());

    const result = await service.importPreview('user-1', {
      templateId: 'template-1',
      rawText: '周二 胸肩三头\n杠铃卧推 8×4',
    });

    expect(previewStore.save).toHaveBeenCalledWith(
      'template-1',
      '2026-04-29T10:00:00.000Z',
      expect.objectContaining({
        summary: expect.objectContaining({ detectedDays: 1 }),
      }),
    );
    expect(result.previewToken).toBe('preview-token');
    expect(result.parsedDays[0].weekday).toBe('tuesday');
  });

  it('applies only selected weekdays from a valid preview token', async () => {
    const { repository, previewStore, service } = createService();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate());
    repository.replaceTemplateDaysFromImport.mockResolvedValue(
      createTemplate({
        days: createWeek().map((day) =>
          day.weekday === 'tuesday'
            ? {
                ...day,
                title: '胸肩三头',
                items: [
                  createItem({
                    exerciseCode: 'free-text/barbell-bench-press',
                    exerciseName: '杠铃卧推',
                    reps: '8',
                    repText: '8',
                    sourceType: 'free_text',
                    rawInput: '杠铃卧推 8×4',
                  }),
                ],
              }
            : day,
        ),
      }),
    );
    previewStore.consume.mockReturnValue({
      templateId: 'template-1',
      templateUpdatedAt: '2026-04-29T10:00:00.000Z',
      payload: {
        summary: {
          detectedDays: 1,
          successfulLines: 1,
          warningLines: 0,
          blockingLines: 0,
        },
        parsedDays: [
          {
            weekday: 'tuesday',
            title: '胸肩三头',
            dayType: 'training',
            selectable: true,
            warnings: [],
            items: [
              {
                rawLine: '杠铃卧推 8×4',
                exerciseName: '杠铃卧推',
                matchedExerciseCode: null,
                sets: 4,
                reps: '8',
                repText: '8',
                notes: '',
                matchStatus: 'free_text',
              },
            ],
          },
        ],
        errors: [],
      },
    });

    const result = await service.applyImport('user-1', 'template-1', {
      previewToken: 'preview-token',
      selectedWeekdays: ['tuesday'],
    });

    expect(repository.replaceTemplateDaysFromImport).toHaveBeenCalledWith(
      'template-1',
      'user-1',
      ['tuesday'],
      [
        expect.objectContaining({
          weekday: 'tuesday',
          dayType: 'training',
          items: [
            expect.objectContaining({
              exerciseCode: 'free-text/杠铃卧推',
              exerciseName: '杠铃卧推',
              sourceType: 'free_text',
              repText: '8',
              rawInput: '杠铃卧推 8×4',
            }),
          ],
        }),
      ],
    );
    expect(result.days.find((day) => day.weekday === 'tuesday').title).toBe('胸肩三头');
  });

  it('rejects import apply when preview token is stale', async () => {
    const { repository, previewStore, service } = createService();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate());
    previewStore.consume.mockReturnValue({
      templateId: 'template-1',
      templateUpdatedAt: '2026-04-28T10:00:00.000Z',
      payload: { summary: {}, parsedDays: [], errors: [] },
    });

    await expect(
      service.applyImport('user-1', 'template-1', {
        previewToken: 'preview-token',
        selectedWeekdays: ['tuesday'],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects templates that do not cover all seven weekdays', async () => {
    const { service } = createService();

    await expect(
      service.create('user-1', {
        name: 'Incomplete',
        days: createWeek()
          .slice(0, 6)
          .map(({ id, items, ...day }) => ({
            ...day,
            items: items.map(({ id: itemId, displayOrder, ...item }) => item),
          })),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects blank exercise names and exercise codes', async () => {
    const { service } = createService();
    const invalidDays = createWeek().map(({ id, items, ...day }) => ({
      ...day,
      items: items.map(({ id: itemId, displayOrder, ...item }) => item),
    }));
    invalidDays[0].items = [
      {
        exerciseCode: '   ',
        exerciseName: '   ',
        sets: 4,
        reps: '8-10',
        restSeconds: 120,
        notes: '',
      },
    ];

    await expect(
      service.create('user-1', {
        name: 'Bad Template',
        days: invalidDays,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects detail lookup when the template does not belong to the current user', async () => {
    const { repository, service } = createService();
    repository.findByIdAndUserId.mockResolvedValue(null);

    await expect(service.getDetail('user-1', 'template-x')).rejects.toBeInstanceOf(AppException);
  });
});
