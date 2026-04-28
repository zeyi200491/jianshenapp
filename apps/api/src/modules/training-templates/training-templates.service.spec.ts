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
      setEnabledTemplate: jest.fn(),
      setDefaultTemplate: jest.fn(),
      findEnabledByUserId: jest.fn(),
    };
  }

  it('creates a template for the current user', async () => {
    const repository = createRepository();
    repository.createTemplate.mockResolvedValue(createTemplate());
    const service = new TrainingTemplatesService(repository);

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
    const repository = createRepository();
    repository.findManyByUserId.mockResolvedValue([createTemplate()]);
    const service = new TrainingTemplatesService(repository);

    const result = await service.list('user-1');

    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Weekly Template');
  });

  it('returns detail when the template belongs to the current user', async () => {
    const repository = createRepository();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate());
    const service = new TrainingTemplatesService(repository);

    const result = await service.getDetail('user-1', 'template-1');

    expect(repository.findByIdAndUserId).toHaveBeenCalledWith('template-1', 'user-1');
    expect(result.days[0].items[0].exerciseName).toBe('Exercise 1');
  });

  it('updates template days with overwrite semantics', async () => {
    const repository = createRepository();
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
        id: 'template-1',
        name: 'Updated Template',
        status: 'active',
        isEnabled: false,
        isDefault: true,
        notes: 'Replaced the whole week',
      }),
    );
    const service = new TrainingTemplatesService(repository);

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

  it('enables the selected template and disables others in one transaction', async () => {
    const repository = createRepository();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate({ id: 'template-2', isEnabled: false }));
    repository.setEnabledTemplate.mockResolvedValue(createTemplate({ id: 'template-2', isEnabled: true }));
    const service = new TrainingTemplatesService(repository);

    const result = await service.enable('user-1', 'template-2');

    expect(repository.setEnabledTemplate).toHaveBeenCalledWith('user-1', 'template-2');
    expect(result.isEnabled).toBe(true);
  });

  it('sets the selected template as default and clears other defaults', async () => {
    const repository = createRepository();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate({ id: 'template-3', isDefault: false }));
    repository.setDefaultTemplate.mockResolvedValue(createTemplate({ id: 'template-3', isDefault: true }));
    const service = new TrainingTemplatesService(repository);

    const result = await service.setDefault('user-1', 'template-3');

    expect(repository.setDefaultTemplate).toHaveBeenCalledWith('user-1', 'template-3');
    expect(result.isDefault).toBe(true);
  });

  it('rejects enabling an archived template', async () => {
    const repository = createRepository();
    repository.findByIdAndUserId.mockResolvedValue(createTemplate({ id: 'template-4', status: 'archived', isEnabled: false }));
    const service = new TrainingTemplatesService(repository);

    await expect(service.enable('user-1', 'template-4')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('previews the natural weekday when weekday is omitted', async () => {
    const repository = createRepository();
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
    const service = new TrainingTemplatesService(repository);

    const result = await service.preview('user-1', {
      date: '2026-04-27',
    });

    expect(repository.findEnabledByUserId).toHaveBeenCalledWith('user-1');
    expect(result.weekday).toBe('monday');
    expect(result.day.title).toBe('Monday Recovery');
  });

  it('returns null when preview has no templateId and no enabled template', async () => {
    const repository = createRepository();
    repository.findEnabledByUserId.mockResolvedValue(null);
    const service = new TrainingTemplatesService(repository);

    const result = await service.preview('user-1', {
      date: '2026-04-28',
    });

    expect(result).toBeNull();
  });

  it('rejects detail lookup when the template does not belong to the current user', async () => {
    const repository = createRepository();
    repository.findByIdAndUserId.mockResolvedValue(null);
    const service = new TrainingTemplatesService(repository);

    await expect(service.getDetail('user-1', 'template-x')).rejects.toBeInstanceOf(AppException);
  });

  it('rejects templates that do not cover all seven weekdays', async () => {
    const repository = createRepository();
    const service = new TrainingTemplatesService(repository);

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
    const repository = createRepository();
    const service = new TrainingTemplatesService(repository);
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

  it('clears enabled/default flags when a template is archived', async () => {
    const repository = createRepository();
    repository.findByIdAndUserId.mockResolvedValue(
      createTemplate({ id: 'template-5', status: 'active', isEnabled: true, isDefault: true }),
    );
    repository.updateTemplate.mockResolvedValue(
      createTemplate({ id: 'template-5', status: 'archived', isEnabled: false, isDefault: false }),
    );
    const service = new TrainingTemplatesService(repository);

    await service.update('user-1', 'template-5', {
      status: 'archived',
      days: createWeek().map(({ id, items, ...day }) => ({
        ...day,
        items: items.map(({ id: itemId, displayOrder, ...item }) => item),
      })),
    });

    expect(repository.updateTemplate).toHaveBeenCalledWith(
      'template-5',
      'user-1',
      expect.objectContaining({ status: 'archived', isEnabled: false, isDefault: false }),
    );
  });
});
