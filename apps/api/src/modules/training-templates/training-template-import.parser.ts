const WEEKDAY_ENTRIES = [
  ['周一', 'monday'],
  ['星期一', 'monday'],
  ['周二', 'tuesday'],
  ['星期二', 'tuesday'],
  ['周三', 'wednesday'],
  ['星期三', 'wednesday'],
  ['周四', 'thursday'],
  ['星期四', 'thursday'],
  ['周五', 'friday'],
  ['星期五', 'friday'],
  ['周六', 'saturday'],
  ['星期六', 'saturday'],
  ['周日', 'sunday'],
  ['星期日', 'sunday'],
  ['周天', 'sunday'],
  ['星期天', 'sunday'],
] as const;

const MULTIPLIER_SYMBOLS = ['×', 'x', 'X', '*', '✖', '✖️', '✕'] as const;
const MULTIPLIER_PATTERN = '(?:×|x|X|\\*|✖️|✖|✕)';
const TRAILING_NOTE_PATTERN = /^(.*?)(?:\s*[（(]([^（）()]*)[)）]\s*)$/u;
const STRUCTURED_REP_PATTERN = new RegExp(
  `^(?<exerciseName>.+?)\\s+(?<repText>\\d+(?:\\+\\d+)*)\\s*(?<multiplier>${MULTIPLIER_PATTERN})\\s*(?<sets>\\d+)$`,
  'u',
);
const AMBIGUOUS_STRUCTURE_PATTERN = new RegExp(
  `\\d+\\s*${MULTIPLIER_PATTERN}\\s*\\d+\\s*${MULTIPLIER_PATTERN}\\s*\\d+`,
  'u',
);
const MALFORMED_STRUCTURED_SUFFIX_PATTERN = new RegExp(
  `(?:^|\\s)${MULTIPLIER_PATTERN}\\s*\\d*$|(?:^|\\s)\\d+(?:\\+\\d+)*\\s*${MULTIPLIER_PATTERN}\\s*$|^\\d+(?:\\+\\d+)*\\s*${MULTIPLIER_PATTERN}\\s*\\d+$`,
  'u',
);

export type ParsedImportMatchStatus = 'matched' | 'free_text' | 'warning' | 'invalid';

export type ParsedImportItem = {
  rawLine: string;
  exerciseName: string;
  matchedExerciseCode: string | null;
  sets: number | null;
  reps: string | null;
  repText: string | null;
  notes: string;
  matchStatus: ParsedImportMatchStatus;
};

export type ParsedImportError = {
  lineNumber: number;
  weekday: string | null;
  rawLine: string;
  message: string;
  blocking: boolean;
};

export type ParsedImportDay = {
  weekday: string;
  title: string;
  dayType: 'training' | 'rest';
  selectable: boolean;
  warnings: string[];
  items: ParsedImportItem[];
};

export type ParsedImportSummary = {
  detectedDays: number;
  successfulLines: number;
  warningLines: number;
  blockingLines: number;
};

export type ParsedImportPreview = {
  summary: ParsedImportSummary;
  parsedDays: ParsedImportDay[];
  errors: ParsedImportError[];
};

type ParsedLineResult =
  | {
      kind: 'item';
      item: ParsedImportItem;
      warnings: string[];
    }
  | {
      kind: 'error';
      message: string;
    };

type StructuredTail = {
  exerciseName: string;
  leadingNote: string;
  repText: string;
  multiplier: string;
  sets: number;
};

export function parseTrainingTemplateImportText(rawText: string): ParsedImportPreview {
  const lines = rawText.split(/\r?\n/).flatMap((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return [];
    }

    return [
      {
        rawLine: trimmedLine,
        lineNumber: index + 1,
      },
    ];
  });

  const parsedDays: ParsedImportDay[] = [];
  const dayByWeekday = new Map<string, ParsedImportDay>();
  const errors: ParsedImportError[] = [];
  let currentDay: ParsedImportDay | null = null;

  lines.forEach(({ rawLine, lineNumber }) => {
    const header = parseWeekdayHeader(rawLine);
    if (header) {
      const duplicatedDay = dayByWeekday.get(header.weekday);
      if (duplicatedDay) {
        duplicatedDay.selectable = false;
        errors.push({
          lineNumber,
          weekday: header.weekday,
          rawLine,
          blocking: true,
          message: '同一周几重复出现，当前版本不支持自动合并。',
        });
        currentDay = null;
        return;
      }

      const nextDay: ParsedImportDay = {
        weekday: header.weekday,
        title: header.title,
        dayType: header.dayType,
        selectable: true,
        warnings: [],
        items: [],
      };

      parsedDays.push(nextDay);
      dayByWeekday.set(nextDay.weekday, nextDay);
      currentDay = nextDay;
      return;
    }

    if (!currentDay) {
      errors.push({
        lineNumber,
        weekday: null,
        rawLine,
        blocking: true,
        message: '该行没有归属到任何周几。',
      });
      return;
    }

    if (currentDay.dayType === 'rest') {
      currentDay.selectable = false;
      errors.push({
        lineNumber,
        weekday: currentDay.weekday,
        rawLine,
        blocking: true,
        message: '休息日不应包含训练动作。',
      });
      return;
    }

    const parsedLine = parseExerciseLine(rawLine);
    if (parsedLine.kind === 'error') {
      currentDay.selectable = false;
      errors.push({
        lineNumber,
        weekday: currentDay.weekday,
        rawLine,
        blocking: true,
        message: parsedLine.message,
      });
      return;
    }

    currentDay.items.push(parsedLine.item);
    currentDay.warnings.push(...parsedLine.warnings);
  });

  const warningLines = parsedDays.reduce(
    (total, day) => total + day.items.filter((item) => item.matchStatus === 'warning').length,
    0,
  );
  const successfulLines = parsedDays.reduce(
    (total, day) => total + day.items.filter((item) => item.matchStatus !== 'warning').length,
    0,
  );

  return {
    summary: {
      detectedDays: parsedDays.length,
      successfulLines,
      warningLines,
      blockingLines: errors.filter((error) => error.blocking).length,
    },
    parsedDays,
    errors,
  };
}

function parseWeekdayHeader(rawLine: string) {
  const matchedEntry = WEEKDAY_ENTRIES.find(([label]) => {
    if (!rawLine.startsWith(label)) {
      return false;
    }

    const suffix = rawLine.slice(label.length);
    if (!suffix) {
      return true;
    }

    return /^\s+/u.test(suffix);
  });

  if (!matchedEntry) {
    return null;
  }

  const [label, weekday] = matchedEntry;
  const title = rawLine.slice(label.length).trim() || '未命名训练日';
  const dayType = title.includes('休息') ? 'rest' : 'training';

  return {
    weekday,
    title,
    dayType,
  } as const;
}

function parseExerciseLine(rawLine: string): ParsedLineResult {
  const { body, note } = splitTrailingNote(rawLine);
  const directStructured = parseStructuredTail(body);
  if (directStructured) {
    return buildStructuredItemResult(rawLine, directStructured.exerciseName, note, directStructured);
  }

  if (note) {
    const structuredFromNote = parseStructuredTail(note);
    if (structuredFromNote) {
      return buildStructuredItemResult(
        rawLine,
        body.trim(),
        structuredFromNote.exerciseName,
        structuredFromNote,
        true,
      );
    }
  }

  if (AMBIGUOUS_STRUCTURE_PATTERN.test(rawLine) || looksLikeBrokenStructuredLine(rawLine)) {
    return {
      kind: 'error',
      message: '无法识别训练动作结构。',
    };
  }

  const exerciseName = body.trim();
  if (!exerciseName) {
    return {
      kind: 'error',
      message: '无法识别训练动作结构。',
    };
  }

  return {
    kind: 'item',
    item: {
      rawLine,
      exerciseName,
      matchedExerciseCode: null,
      sets: null,
      reps: null,
      repText: null,
      notes: note,
      matchStatus: 'free_text',
    },
    warnings: [],
  };
}

function buildStructuredItemResult(
  rawLine: string,
  exerciseName: string,
  trailingNote: string,
  parsed: StructuredTail | null,
  noteCarriesStructure = false,
): ParsedLineResult {
  if (!parsed || !exerciseName.trim()) {
    return {
      kind: 'error',
      message: '无法识别训练动作结构。',
    };
  }

  const warnings: string[] = [];
  if (parsed.repText.includes('+')) {
    warnings.push('复合次数已按原文保存。');
  }
  if (parsed.multiplier !== '×') {
    warnings.push('乘号已按兼容规则解析。');
  }
  if (noteCarriesStructure) {
    warnings.push('组合动作细节已保存在备注中。');
  }

  const notes = [parsed.leadingNote, trailingNote].filter(Boolean).join('；');

  return {
    kind: 'item',
    item: {
      rawLine,
      exerciseName: exerciseName.trim(),
      matchedExerciseCode: null,
      sets: parsed.sets,
      reps: parsed.repText.includes('+') ? null : parsed.repText,
      repText: parsed.repText,
      notes,
      matchStatus: warnings.length > 0 ? 'warning' : 'free_text',
    },
    warnings,
  };
}

function splitTrailingNote(rawLine: string) {
  const matched = rawLine.match(TRAILING_NOTE_PATTERN);
  if (!matched) {
    return {
      body: rawLine.trim(),
      note: '',
    };
  }

  return {
    body: matched[1].trim(),
    note: matched[2].trim(),
  };
}

function parseStructuredTail(rawLine: string): StructuredTail | null {
  const matched = rawLine.trim().match(STRUCTURED_REP_PATTERN);
  if (!matched?.groups) {
    return null;
  }

  return {
    exerciseName: matched.groups.exerciseName.trim(),
    leadingNote: '',
    repText: matched.groups.repText,
    multiplier: matched.groups.multiplier,
    sets: Number(matched.groups.sets),
  };
}

function looksLikeBrokenStructuredLine(rawLine: string) {
  const trimmed = rawLine.trim();
  const hasMultiplier = MULTIPLIER_SYMBOLS.some((symbol) => trimmed.includes(symbol));
  if (!hasMultiplier) {
    return false;
  }

  if (!/\d/u.test(trimmed)) {
    return false;
  }

  return MALFORMED_STRUCTURED_SUFFIX_PATTERN.test(trimmed);
}
