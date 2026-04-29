import { parseTrainingTemplateImportText } from './training-template-import.parser';
import { TrainingTemplateImportPreviewStore } from './training-template-import-preview.store';

describe('TrainingTemplateImportParser', () => {
  it('parses partial weekdays with rest days, compound reps and warnings', () => {
    const result = parseTrainingTemplateImportText(
      `
周一 休息
周二 胸 肩 三头
杠铃卧推 8✖️4
哑铃飞鸟 8+10+15✖️2（10kg+7.5kg+5kg）
周天 背二头
二头超级组（站姿+坐姿 10+10✖️3）
`.trim(),
    );

    expect(result.summary.detectedDays).toBe(3);
    expect(result.parsedDays).toHaveLength(3);
    expect(result.parsedDays[0]).toMatchObject({
      weekday: 'monday',
      dayType: 'rest',
      title: '休息',
      selectable: true,
    });
    expect(result.parsedDays[1].items[0]).toMatchObject({
      exerciseName: '杠铃卧推',
      sets: 4,
      reps: '8',
      repText: '8',
      matchStatus: 'warning',
    });
    expect(result.parsedDays[1].items[1]).toMatchObject({
      exerciseName: '哑铃飞鸟',
      sets: 2,
      reps: null,
      repText: '8+10+15',
      notes: '10kg+7.5kg+5kg',
      matchStatus: 'warning',
    });
    expect(result.parsedDays[2].items[0]).toMatchObject({
      exerciseName: '二头超级组',
      sets: 3,
      repText: '10+10',
      notes: '站姿+坐姿',
      matchStatus: 'warning',
    });
    expect(result.errors).toEqual([]);
  });

  it('recognizes weekday aliases and common multiplication symbols', () => {
    const result = parseTrainingTemplateImportText(
      `
星期三 背 二头
引体向上 10x4
面拉 15*3(顶峰停顿)
周日 休息
`.trim(),
    );

    expect(result.parsedDays).toHaveLength(2);
    expect(result.parsedDays[0]).toMatchObject({
      weekday: 'wednesday',
      dayType: 'training',
      title: '背 二头',
    });
    expect(result.parsedDays[0].items[0]).toMatchObject({
      exerciseName: '引体向上',
      sets: 4,
      reps: '10',
      repText: '10',
    });
    expect(result.parsedDays[0].items[1]).toMatchObject({
      exerciseName: '面拉',
      sets: 3,
      reps: '15',
      repText: '15',
      notes: '顶峰停顿',
    });
    expect(result.parsedDays[1]).toMatchObject({
      weekday: 'sunday',
      dayType: 'rest',
      title: '休息',
    });
  });

  it('marks orphan lines as blocking errors', () => {
    const result = parseTrainingTemplateImportText('杠铃卧推 8×4');

    expect(result.errors[0]).toMatchObject({
      lineNumber: 1,
      weekday: null,
      rawLine: '杠铃卧推 8×4',
      blocking: true,
      message: '该行没有归属到任何周几。',
    });
  });

  it('does not mistake exercise names that start with weekday text for a new header', () => {
    const result = parseTrainingTemplateImportText(
      `
周二 胸肩三头
周二划船 12次
`.trim(),
    );

    expect(result.parsedDays).toHaveLength(1);
    expect(result.parsedDays[0].weekday).toBe('tuesday');
    expect(result.parsedDays[0].items[0]).toMatchObject({
      exerciseName: '周二划船 12次',
      matchStatus: 'free_text',
    });
    expect(result.errors).toEqual([]);
  });

  it('keeps original line numbers when blank lines exist', () => {
    const result = parseTrainingTemplateImportText(`

周二 胸肩三头

杠铃卧推 8×4

8×4
`.trimStart());

    expect(result.errors[0]).toMatchObject({
      lineNumber: 5,
      weekday: 'tuesday',
      rawLine: '8×4',
    });
  });

  it('keeps number-based free-text movements instead of blocking them', () => {
    const result = parseTrainingTemplateImportText(
      `
周四 机动恢复
90/90呼吸
平板支撑 30秒
`.trim(),
    );

    expect(result.errors).toEqual([]);
    expect(result.parsedDays[0].items).toEqual([
      expect.objectContaining({
        exerciseName: '90/90呼吸',
        matchStatus: 'free_text',
      }),
      expect.objectContaining({
        exerciseName: '平板支撑 30秒',
        matchStatus: 'free_text',
      }),
    ]);
  });

  it('marks duplicated weekday headers as blocking errors', () => {
    const result = parseTrainingTemplateImportText(
      `
周二 胸肩三头
杠铃卧推 8×4
周二 再来一次
哑铃飞鸟 12×3
`.trim(),
    );

    expect(result.parsedDays).toHaveLength(1);
    expect(result.parsedDays[0]).toMatchObject({
      weekday: 'tuesday',
      selectable: false,
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineNumber: 3,
          weekday: 'tuesday',
          blocking: true,
          message: '同一周几重复出现，当前版本不支持自动合并。',
        }),
      ]),
    );
  });
});

describe('TrainingTemplateImportPreviewStore', () => {
  it('consumes a preview token only once', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));

    const store = new TrainingTemplateImportPreviewStore();
    const token = store.save('template-1', '2026-04-29T10:00:00.000Z', {
      summary: {
        detectedDays: 1,
        successfulLines: 1,
        warningLines: 0,
        blockingLines: 0,
      },
      parsedDays: [
        {
          weekday: 'monday',
          title: '休息',
          dayType: 'rest',
          selectable: true,
          warnings: [],
          items: [],
        },
      ],
      errors: [],
    });

    expect(store.consume(token)).toMatchObject({
      templateId: 'template-1',
      payload: {
        summary: {
          detectedDays: 1,
        },
      },
    });
    expect(store.consume(token)).toBeNull();

    jest.useRealTimers();
  });

  it('cleans expired tokens even if they were never consumed', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-29T10:00:00.000Z'));

    const store = new TrainingTemplateImportPreviewStore();
    const expiredToken = store.save('template-1', '2026-04-29T10:00:00.000Z', {
      summary: {
        detectedDays: 1,
        successfulLines: 1,
        warningLines: 0,
        blockingLines: 0,
      },
      parsedDays: [],
      errors: [],
    });

    jest.advanceTimersByTime(15 * 60 * 1000 + 1);

    const freshToken = store.save('template-2', '2026-04-29T10:15:00.001Z', {
      summary: {
        detectedDays: 1,
        successfulLines: 1,
        warningLines: 0,
        blockingLines: 0,
      },
      parsedDays: [],
      errors: [],
    });

    expect(store.consume(expiredToken)).toBeNull();
    expect(store.consume(freshToken)).toMatchObject({
      templateId: 'template-2',
    });

    jest.useRealTimers();
  });
});
