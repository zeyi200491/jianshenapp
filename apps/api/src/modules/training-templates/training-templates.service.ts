import { Injectable } from '@nestjs/common';
import { parseDateOnly, toDateOnlyString } from '../../common/utils/date.util';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
import {
  TEMPLATE_DAY_TYPES,
  TEMPLATE_INTENSITY_LEVELS,
  TEMPLATE_STATUSES,
  TEMPLATE_WEEKDAYS,
  type CreateTrainingTemplateDayDto,
  type CreateTrainingTemplateDto,
} from './dto/create-training-template.dto';
import type { PreviewTrainingTemplateDto } from './dto/preview-training-template.dto';
import type { UpdateTrainingTemplateDayDto, UpdateTrainingTemplateDto } from './dto/update-training-template.dto';
import { TrainingTemplatesRepository } from './training-templates.repository';

const WEEKDAY_ORDER = TEMPLATE_WEEKDAYS;
const TEMPLATE_STATUS_SET = new Set<string>(TEMPLATE_STATUSES);
const TEMPLATE_DAY_TYPE_SET = new Set<string>(TEMPLATE_DAY_TYPES);
const TEMPLATE_INTENSITY_SET = new Set<string>(TEMPLATE_INTENSITY_LEVELS);

function weekdayFromDate(date: Date) {
  const day = date.getUTCDay();
  return WEEKDAY_ORDER[(day + 6) % 7];
}

function hasUniqueWeekdays(days: Array<{ weekday: string }>) {
  return new Set(days.map((day) => day.weekday)).size === days.length;
}

function hasCompleteWeekdays(days: Array<{ weekday: string }>) {
  if (days.length !== WEEKDAY_ORDER.length) {
    return false;
  }

  const weekdaySet = new Set(days.map((day) => day.weekday));
  return WEEKDAY_ORDER.every((weekday) => weekdaySet.has(weekday));
}

type PersistedTemplateInput = {
  name: string;
  status?: string;
  isEnabled?: boolean;
  isDefault?: boolean;
  notes?: string;
  days: CreateTrainingTemplateDayDto[];
};

@Injectable()
export class TrainingTemplatesService {
  constructor(private readonly repository: TrainingTemplatesRepository) {}

  async list(userId: string) {
    return serializeValue(await this.repository.findManyByUserId(userId));
  }

  async create(userId: string, dto: CreateTrainingTemplateDto) {
    const payload = this.normalizeCreatePayload(dto);
    const template = await this.repository.createTemplate(userId, payload);
    const syncedTemplate = await this.applyTemplateFlags(userId, template.id, template, payload);
    return serializeValue(syncedTemplate);
  }

  async getDetail(userId: string, templateId: string) {
    const template = await this.repository.findByIdAndUserId(templateId, userId);
    if (!template) {
      throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
    }
    return serializeValue(template);
  }

  async update(userId: string, templateId: string, dto: UpdateTrainingTemplateDto) {
    const existing = await this.repository.findByIdAndUserId(templateId, userId);
    if (!existing) {
      throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
    }

    const payload = this.normalizeUpdatePayload(dto, existing);
    const template = await this.repository.updateTemplate(templateId, userId, payload);
    const syncedTemplate = await this.applyTemplateFlags(userId, templateId, template, payload);
    return serializeValue(syncedTemplate);
  }

  async enable(userId: string, templateId: string) {
    const existing = await this.repository.findByIdAndUserId(templateId, userId);
    if (!existing) {
      throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
    }
    if (existing.status !== 'active') {
      throw new AppException('VALIDATION_ERROR', '只有启用状态的模板才能设为 today 来源。', 400);
    }

    return serializeValue(await this.repository.setEnabledTemplate(userId, templateId));
  }

  async setDefault(userId: string, templateId: string) {
    const existing = await this.repository.findByIdAndUserId(templateId, userId);
    if (!existing) {
      throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
    }
    if (existing.status !== 'active') {
      throw new AppException('VALIDATION_ERROR', '只有启用状态的模板才能设为长期默认模板。', 400);
    }

    return serializeValue(await this.repository.setDefaultTemplate(userId, templateId));
  }

  async preview(userId: string, dto: PreviewTrainingTemplateDto) {
    const targetDate = parseDateOnly(dto.date);
    const template = dto.templateId
      ? await this.repository.findByIdAndUserId(dto.templateId, userId)
      : await this.repository.findEnabledByUserId(userId);

    if (!template && dto.templateId) {
      throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
    }

    if (!template) {
      return null;
    }

    const weekday = dto.weekday ?? weekdayFromDate(targetDate);
    const day = template.days.find((item: { weekday: string }) => item.weekday === weekday);
    if (!day) {
      throw new AppException(
        'VALIDATION_ERROR',
        `当前启用模板没有配置${this.getWeekdayLabel(weekday)}，请先到“个人训练模板”页补齐周模板。`,
        400,
      );
    }

    return serializeValue({
      templateId: template.id,
      templateName: template.name,
      date: toDateOnlyString(targetDate),
      weekday,
      day,
    });
  }

  private normalizeCreatePayload(dto: CreateTrainingTemplateDto): PersistedTemplateInput {
    if (!dto.days.length) {
      throw new AppException('VALIDATION_ERROR', '训练模板至少需要 1 天配置。', 400);
    }
    this.assertTemplateDays(dto.days);

    const name = dto.name.trim();
    if (!name) {
      throw new AppException('VALIDATION_ERROR', '模板名称不能为空。', 400);
    }

    const status = dto.status ?? 'active';
    if (status === 'archived' && (dto.isEnabled || dto.isDefault)) {
      throw new AppException('VALIDATION_ERROR', '归档模板不能设为 today 来源或长期默认模板。', 400);
    }

    return {
      name,
      status,
      isEnabled: dto.isEnabled ?? false,
      isDefault: dto.isDefault ?? false,
      notes: dto.notes?.trim() ?? '',
      days: dto.days.map((day) => this.normalizeDay(day)),
    };
  }

  private normalizeUpdatePayload(
    dto: UpdateTrainingTemplateDto,
    existing: {
      name: string;
      status?: string;
      isEnabled?: boolean;
      isDefault?: boolean;
      notes?: string;
      days: CreateTrainingTemplateDayDto[];
    },
  ) {
    const payload: UpdateTrainingTemplateDto & { days?: CreateTrainingTemplateDayDto[] } = {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
    };

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new AppException('VALIDATION_ERROR', '模板名称不能为空。', 400);
      }
      payload.name = name;
    }

    const nextStatus = payload.status ?? existing.status ?? 'active';
    if (nextStatus === 'archived') {
      payload.isEnabled = false;
      payload.isDefault = false;
    }

    if (dto.days) {
      if (!dto.days.length) {
        throw new AppException('VALIDATION_ERROR', '训练模板至少需要 1 天配置。', 400);
      }
      this.assertTemplateDays(dto.days);
      payload.days = dto.days.map((day) => this.normalizeDay(day));
    } else {
      payload.days = existing.days;
    }

    return payload;
  }

  private normalizeDay(day: CreateTrainingTemplateDayDto | UpdateTrainingTemplateDayDto): CreateTrainingTemplateDayDto {
    const title = String(day.title).trim();
    if (!title) {
      throw new AppException('VALIDATION_ERROR', '模板日标题不能为空。', 400);
    }

    return {
      weekday: String(day.weekday),
      dayType: String(day.dayType),
      title,
      splitType: day.splitType?.trim() ? day.splitType.trim() : null,
      durationMinutes: day.durationMinutes ?? null,
      intensityLevel: day.intensityLevel ?? null,
      notes: day.notes?.trim() ?? '',
      items: (day.items ?? []).map((item) => {
        const exerciseCode = item.exerciseCode.trim();
        const exerciseName = item.exerciseName.trim();
        const reps = item.reps.trim();

        if (!exerciseCode) {
          throw new AppException('VALIDATION_ERROR', '训练动作编码不能为空。', 400);
        }
        if (!exerciseName) {
          throw new AppException('VALIDATION_ERROR', '训练动作名称不能为空。', 400);
        }
        if (!reps) {
          throw new AppException('VALIDATION_ERROR', '动作 reps 不能为空。', 400);
        }

        return {
          exerciseCode,
          exerciseName,
          sets: item.sets,
          reps,
          restSeconds: item.restSeconds,
          notes: item.notes?.trim() ?? '',
        };
      }),
    };
  }

  private assertTemplateDays(days: Array<CreateTrainingTemplateDayDto | UpdateTrainingTemplateDayDto>) {
    if (!hasUniqueWeekdays(days as Array<{ weekday: string }>)) {
      throw new AppException('VALIDATION_ERROR', 'weekday 不能重复。', 400);
    }
    if (!hasCompleteWeekdays(days as Array<{ weekday: string }>)) {
      throw new AppException('VALIDATION_ERROR', '训练模板必须完整覆盖周一到周日 7 天。', 400);
    }

    for (const day of days) {
      if (!TEMPLATE_DAY_TYPE_SET.has(String(day.dayType))) {
        throw new AppException('VALIDATION_ERROR', 'dayType 不合法。', 400);
      }
      if (day.dayType === 'rest') {
        if ((day.items ?? []).length > 0) {
          throw new AppException('VALIDATION_ERROR', '休息日不能包含训练动作。', 400);
        }
        continue;
      }

      if (!day.splitType || !day.durationMinutes || !day.intensityLevel) {
        throw new AppException('VALIDATION_ERROR', '训练日必须包含分化类型、时长和强度。', 400);
      }
      if (!TEMPLATE_INTENSITY_SET.has(day.intensityLevel)) {
        throw new AppException('VALIDATION_ERROR', '训练强度不合法。', 400);
      }
      if ((day.items ?? []).length === 0) {
        throw new AppException('VALIDATION_ERROR', '训练日至少需要 1 个动作。', 400);
      }
    }
  }

  private async applyTemplateFlags(
    userId: string,
    templateId: string,
    template: {
      id: string;
      isEnabled?: boolean;
      isDefault?: boolean;
    },
    payload: {
      status?: string;
      isEnabled?: boolean;
      isDefault?: boolean;
    },
  ) {
    if (payload.status && !TEMPLATE_STATUS_SET.has(payload.status)) {
      throw new AppException('VALIDATION_ERROR', '模板状态不合法。', 400);
    }

    let current = template;
    if (payload.isEnabled === true) {
      current = await this.repository.setEnabledTemplate(userId, templateId);
    }
    if (payload.isDefault === true) {
      current = await this.repository.setDefaultTemplate(userId, templateId);
    }
    return current;
  }

  private getWeekdayLabel(weekday: string) {
    const labels: Record<string, string> = {
      monday: '周一',
      tuesday: '周二',
      wednesday: '周三',
      thursday: '周四',
      friday: '周五',
      saturday: '周六',
      sunday: '周日',
    };
    return labels[weekday] ?? weekday;
  }
}
